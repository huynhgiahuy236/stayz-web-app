const roomModel = require("../models/rooms.model");
const bookingModel = require("../models/bookings.model");
const redis = require("../config/redis.config");
const cloudinary = require("../config/cloudinary.config");
const streamifier = require("streamifier");
const { BadRequestException } = require("../helpers/error.helper");

const activeBookingStatus = ["pending", "confirmed"];

const calculatePrice = (originalPrice, discountPercent) => {
  const safeOriginalPrice = Number(originalPrice) || 0;
  const safeDiscountPercent = Number(discountPercent) || 0;

  const finalPrice = safeOriginalPrice * (1 - safeDiscountPercent / 100);
  return Math.round(finalPrice);
};

const normalizeGallery = (galleryImages) => {
  if (!Array.isArray(galleryImages)) return [];
  return galleryImages
    .map((item) => {
      if (typeof item === "string") return { url: item, public_id: "" };
      return {
        url: item?.url || "",
        public_id: item?.public_id || "",
      };
    })
    .filter((item) => item.url);
};

const clearRoomCache = async (propertyId) => {
  try {
    await redis.del("rooms:all");
    if (propertyId) await redis.del(`rooms:property:${propertyId}`);
  } catch (err) {
    console.warn("Room cache delete skipped:", err.message);
  }
};

const parseDateRange = ({ checkIn, checkOut, checkInDate, checkOutDate } = {}) => {
  const rawCheckIn = checkIn || checkInDate;
  const rawCheckOut = checkOut || checkOutDate;
  if (!rawCheckIn || !rawCheckOut) return null;
  const start = new Date(rawCheckIn);
  const end = new Date(rawCheckOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return { start, end };
};

const attachAvailability = async (rooms, filters = {}) => {
  const range = parseDateRange(filters);
  if (!range) return rooms;

  return await Promise.all(
    rooms.map(async (room) => {
      const bookedRooms = await bookingModel
        .find({
          room_id: room._id,
          status: { $in: activeBookingStatus },
          check_in: { $lt: range.end },
          check_out: { $gt: range.start },
        })
        .select("rooms_count");

      const bookedCount = bookedRooms.reduce(
        (sum, booking) => sum + (Number(booking.rooms_count) || 0),
        0,
      );
      const availableRooms = Math.max(0, (Number(room.quantity) || 0) - bookedCount);
      const data = room.toObject({ virtuals: true });
      data.available_rooms = availableRooms;
      return data;
    }),
  );
};

const roomService = {
  getAll: async (filters = {}, { includeInactive = false } = {}) => {
    const query = includeInactive ? {} : { is_active: { $ne: false } };
    const rooms = await roomModel.find(query).populate("property_id");
    return await attachAvailability(rooms, filters);
  },

  getByPropertyId: async (propertyId, filters = {}) => {
    const rooms = await roomModel.find({ property_id: propertyId, is_active: { $ne: false } }).populate("property_id");
    return await attachAvailability(rooms, filters);
  },

  getById: async (id) => {
    return await roomModel.findById(id).populate("property_id");
  },

  create: async (data) => {
    const {
      property_id,
      name,
      room_type,
      description,
      original_price,
      discount_percent,
      capacity,
      quantity,
      bed_info,
      area,
      view,
      badges,
      amenities,
      main_image_url,
      gallery_images,
      is_active,
    } = data;

    const finalPrice = calculatePrice(original_price, discount_percent);

    const room = await roomModel.create({
      property_id,
      name,
      room_type,
      description,
      price: finalPrice,
      original_price: Number(original_price) || 0,
      discount_percent: Number(discount_percent) || 0,
      capacity: Number(capacity) || 1,
      quantity: Number(quantity) || 1,
      bed_info,
      area: Number(area) || 0,
      view,
      badges,
      amenities,
      main_image_url: main_image_url || "",
      gallery_images: normalizeGallery(gallery_images),
      is_active: is_active !== false,
    });

    await clearRoomCache(property_id);

    return room;
  },

  update: async (id, data) => {
    const nextData = { ...data };

    if (nextData.price_per_night != null && nextData.price == null) {
      nextData.price = Number(nextData.price_per_night) || 0;
    } else if (nextData.original_price != null || nextData.discount_percent != null) {
      const originalPrice = Number(nextData.original_price) || 0;
      const discountPercent = Number(nextData.discount_percent) || 0;
      nextData.price = calculatePrice(originalPrice, discountPercent);
      nextData.original_price = originalPrice;
      nextData.discount_percent = discountPercent;
    }

    if (nextData.available_rooms != null && nextData.quantity == null) {
      nextData.quantity = nextData.available_rooms;
    }
    if (nextData.gallery_images != null) {
      nextData.gallery_images = normalizeGallery(nextData.gallery_images);
    }
    if (nextData.capacity != null) nextData.capacity = Number(nextData.capacity) || 1;
    if (nextData.quantity != null) nextData.quantity = Number(nextData.quantity) || 1;
    if (nextData.area != null) nextData.area = Number(nextData.area) || 0;

    const room = await roomModel.findByIdAndUpdate(id, nextData, {
      new: true,
      runValidators: true,
    });

    await clearRoomCache(room?.property_id);

    return room;
  },

  delete: async (id) => {
    const room = await roomModel.findById(id);
    if (!room) throw new BadRequestException("Khong tim thay phong");
    if (await bookingModel.exists({ room_id: id })) {
      room.is_active = false;
      await room.save();
      await clearRoomCache(room.property_id);
      return room;
    }
    if (room?.main_image_public_id) {
      await cloudinary.uploader.destroy(room.main_image_public_id);
    }
    if (room?.gallery_images?.length) {
      await Promise.all(
        room.gallery_images
          .filter((image) => image.public_id)
          .map((image) => cloudinary.uploader.destroy(image.public_id)),
      );
    }
    const result = await roomModel.findByIdAndDelete(id);

    await clearRoomCache(room?.property_id);

    return result;
  },
  uploadMainImageCloud: async (id, file) => {
    if (!file) throw new BadRequestException("Vui lòng chọn ảnh phòng");
    const room = await roomModel.findById(id);
    if (!room) throw new BadRequestException("Không tìm thấy phòng");

    if (room.main_image_public_id) {
      await cloudinary.uploader.destroy(room.main_image_public_id);
    }
    const uploaded = await uploadCloudinary(file, `rooms/${id}/main`);
    room.main_image_url = uploaded.secure_url;
    room.main_image_public_id = uploaded.public_id;
    await room.save();
    await clearRoomCache(room.property_id);
    return room;
  },
  uploadGalleryCloud: async (id, files) => {
    if (!files?.length) throw new BadRequestException("Vui lòng chọn ảnh phòng");
    const room = await roomModel.findById(id);
    if (!room) throw new BadRequestException("Không tìm thấy phòng");

    const uploaded = await Promise.all(
      files.map(async (file) => {
        const result = await uploadCloudinary(file, `rooms/${id}/gallery`);
        return { url: result.secure_url, public_id: result.public_id };
      }),
    );
    room.gallery_images = [...(room.gallery_images || []), ...uploaded];
    await room.save();
    await clearRoomCache(room.property_id);
    return room;
  },
};

const uploadCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => (error ? reject(error) : resolve(result)),
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });

module.exports = roomService;
