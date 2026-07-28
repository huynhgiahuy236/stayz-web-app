const { BadRequestException } = require("../helpers/error.helper");
const propertiesModel = require("../models/properties.model");
const roomsModel = require("../models/rooms.model");
const reviewsModel = require("../models/reviews.model");
const bookingModel = require("../models/bookings.model");
const favoritesModel = require("../models/favorites.model");
const cloudinary = require("../config/cloudinary.config");
const streamifier = require("streamifier");
const redis = require("../config/redis.config");
const { buildSearchIndex, scoreMatch } = require("../helpers/search.helper");

const CACHE_TTL = 300; // 5 phút

// Doi tien to khi hinh dang du lieu tra ve thay doi, de cache cu tu het han.
const CACHE_VERSION = "v2";
const cacheKeyFor = (suffix) => `properties:${CACHE_VERSION}:${suffix}`;

// Cac thanh pho co bien: dung cho bo loc "Bien" o man hinh chinh.
const BEACH_CITIES = ["da-nang", "vung-tau"];

const coordinate = (value, min, max, label) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new BadRequestException(`${label} khong hop le`);
  }
  return parsed;
};

// Moi thay doi property deu lam sai lech ca danh sach lan bo loc,
// nen xoa het cac cache lien quan thay vi doan xem cai nao con dung.
const invalidateCache = async (property) => {
  const keys = [cacheKeyFor("all"), cacheKeyFor("featured")];
  if (property?.city) {
    keys.push(cacheKeyFor(`city:${property.city}`));
    if (property.slug) keys.push(cacheKeyFor(`slug:${property.slug}:${property.city}`));
  }
  await Promise.all(keys.map((key) => redis.del(key)));
};

/**
 * Gan them du lieu thuc te ma client can nhung khong nam trong property:
 * diem danh gia trung binh that, so luot danh gia, gia phong thap nhat,
 * suc chua lon nhat va so phong con hoat dong.
 *
 * Truoc day client phai tai toan bo /room/getAll roi tu join, va rating
 * la hang so 4.7. Gop vao day de sua ca hai van de cung luc.
 */
const enrichProperties = async (properties) => {
  if (!properties.length) return [];

  const ids = properties.map((property) => property._id);

  const [roomStats, reviewStats] = await Promise.all([
    roomsModel.aggregate([
      { $match: { property_id: { $in: ids }, is_active: { $ne: false } } },
      {
        $group: {
          _id: "$property_id",
          min_price: { $min: "$price" },
          max_price: { $max: "$price" },
          max_capacity: { $max: "$capacity" },
          available_rooms: { $sum: "$quantity" },
          room_count: { $sum: 1 },
          room_types: { $addToSet: "$room_type" },
        },
      },
    ]),
    reviewsModel.aggregate([
      { $match: { property_id: { $in: ids } } },
      {
        $group: {
          _id: "$property_id",
          rating: { $avg: "$rating" },
          review_count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const roomsById = new Map(roomStats.map((row) => [String(row._id), row]));
  const reviewsById = new Map(reviewStats.map((row) => [String(row._id), row]));

  return properties.map((property) => {
    const plain = typeof property.toObject === "function" ? property.toObject() : { ...property };
    const rooms = roomsById.get(String(property._id));
    const reviews = reviewsById.get(String(property._id));

    return {
      ...plain,
      // null khi chua co phong/danh gia: client phai hien thi "chua co",
      // tuyet doi khong duoc bia mot con so mac dinh.
      min_price: rooms?.min_price ?? null,
      max_price: rooms?.max_price ?? null,
      max_capacity: rooms?.max_capacity ?? null,
      available_rooms: rooms?.available_rooms ?? 0,
      room_count: rooms?.room_count ?? 0,
      room_types: rooms?.room_types ?? [],
      rating: reviews ? Number(reviews.rating.toFixed(1)) : null,
      review_count: reviews?.review_count ?? 0,
    };
  });
};

const propertiesService = {
  getAll: async ({ includeInactive = false } = {}) => {
    if (includeInactive) {
      const rows = await propertiesModel
        .find()
        .populate("user_id", "full_name email avatar role");
      return await enrichProperties(rows);
    }
    const cacheKey = cacheKeyFor("all");
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rows = await propertiesModel
      .find({ is_active: { $ne: false } })
      .populate("user_id", "full_name email avatar role");
    const data = await enrichProperties(rows);

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    return data;
  },
  getFeatured: async () => {
    const cacheKey = cacheKeyFor("featured");
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rows = await propertiesModel
      .find({ is_preferred: true, is_active: { $ne: false } })
      .populate("user_id", "full_name email avatar role");
    const data = await enrichProperties(rows);

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    return data;
  },
  getBySlug: async (slug, city) => {
    const cacheKey = cacheKeyFor(`slug:${slug}:${city}`);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await propertiesModel
      .findOne({ slug: slug, city: city, is_active: { $ne: false } })
      .populate("user_id", "full_name email avatar role");

    if (data) await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    return data;
  },
  getCity: async (city) => {
    const cacheKey = cacheKeyFor(`city:${city}`);
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await propertiesModel
      .find({ city: city, is_active: { $ne: false } })
      .populate("user_id", "full_name email avatar role");

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    return data;
  },
  /**
   * Tìm kiếm nâng cao với bộ lọc đa tiêu chí.
   *
   * @param {object} filters
   *  keyword     - không dấu, sai chính tả nhẹ vẫn khớp
   *  city        - một slug thành phố
   *  nearBeach   - true: chỉ lấy thành phố có biển (Đà Nẵng, Vũng Tàu)
   *  type        - hotel | resort | villa | hostel | apartment | business
   *  roomType    - standard_room | deluxe_room | suite
   *  minPrice/maxPrice - so sánh với GIÁ PHÒNG THẤP NHẤT (đúng con số hiển thị
   *                trên thẻ khách sạn), không phải base_price như trước
   *  guests      - số khách tối thiểu một phòng phải chứa được
   *  amenities[] - property phải có ĐỦ các tiện ích này
   *  isPreferred - chỉ khách sạn nổi bật
   */
  search: async (filters = {}) => {
    const {
      keyword,
      city,
      nearBeach,
      type,
      roomType,
      minPrice,
      maxPrice,
      guests,
      amenities,
      isPreferred,
      page = 1,
      limit = 50,
    } = filters;

    const asBool = (value) => value === true || value === "true";
    const asNumber = (value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    // Phần lọc chạy được ở tầng Mongo.
    const query = { is_active: { $ne: false } };
    if (city) query.city = city;
    else if (asBool(nearBeach)) query.city = { $in: BEACH_CITIES };

    if (type) query.type = type;
    if (asBool(isPreferred)) query.is_preferred = true;

    if (amenities) {
      const amenityList = Array.isArray(amenities)
        ? amenities
        : String(amenities).split(",").map((item) => item.trim()).filter(Boolean);
      amenityList.forEach((amenity) => {
        query[`amenities.${amenity}`] = true;
      });
    }

    const rows = await propertiesModel
      .find(query)
      .populate("user_id", "full_name email avatar role");

    let results = await enrichProperties(rows);

    // Lọc theo giá/sức chứa/loại phòng: cần dữ liệu phòng nên chạy sau khi enrich.
    const min = asNumber(minPrice);
    const max = asNumber(maxPrice);
    const minGuests = asNumber(guests);

    if (min != null) results = results.filter((item) => item.min_price != null && item.min_price >= min);
    if (max != null) results = results.filter((item) => item.min_price != null && item.min_price <= max);
    if (minGuests != null) results = results.filter((item) => (item.max_capacity ?? 0) >= minGuests);
    if (roomType) results = results.filter((item) => item.room_types.includes(roomType));

    // Từ khoá: chấm điểm mờ, bỏ những bản ghi không khớp.
    const trimmedKeyword = String(keyword || "").trim();
    if (trimmedKeyword) {
      results = results
        .map((item) => ({
          item,
          score: scoreMatch(trimmedKeyword, item.search_index || buildSearchIndex(item)),
        }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (a.item.is_preferred !== b.item.is_preferred) return a.item.is_preferred ? -1 : 1;
          return (a.item.min_price ?? 0) - (b.item.min_price ?? 0);
        })
        .map((entry) => entry.item);
    } else {
      results.sort((a, b) => {
        if (a.is_preferred !== b.is_preferred) return a.is_preferred ? -1 : 1;
        return (a.min_price ?? 0) - (b.min_price ?? 0);
      });
    }

    const total = results.length;
    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.max(1, Number(limit) || 50);
    const skip = (pageNumber - 1) * pageSize;

    return {
      data: results.slice(skip, skip + pageSize),
      pagination: {
        total,
        page: pageNumber,
        limit: pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  },
  create: async (data) => {
    const {
      title,
      slug,
      address,
      city,
      country,
      latitude,
      longitude,
      type,
      base_price,
      description,
      amenities,
      main_image_url,
      main_image_public_id,
      gallery_images,
      is_preferred,
      max_stay_days,
      user_id,
      is_active,
    } = data;
    const properties = await propertiesModel.create({
      title: title,
      slug: slug,
      address: address,
      city: city,
      country: country,
      latitude: coordinate(latitude ?? 0, -90, 90, "Vi do"),
      longitude: coordinate(longitude ?? 0, -180, 180, "Kinh do"),
      type: type,
      base_price: base_price,
      description: description,
      amenities: amenities,
      search_index: buildSearchIndex({ title, address, city, type, description }),
      main_image_url: main_image_url,
      main_image_public_id: main_image_public_id,
      gallery_images: gallery_images,
      is_preferred: is_preferred,
      max_stay_days: max_stay_days,
      user_id: user_id,
      is_active: is_active !== false,
    });

    // Xóa cache sau khi tạo mới
    await invalidateCache(properties);

    return properties;
  },
  update: async (id, data) => {
    const existing = await propertiesModel.findById(id);
    if (!existing) throw new BadRequestException("Khong tim thay property");

    // Bat ky truong nao trong search_index thay doi thi phai dung lai chuoi tim kiem,
    // neu khong khach san se bien mat khoi ket qua tim theo ten moi.
    const merged = {
      title: data.title ?? existing.title,
      address: data.address ?? existing.address,
      city: data.city ?? existing.city,
      type: data.type ?? existing.type,
      description: data.description ?? existing.description,
    };

    const nextData = { ...data };
    if (data.latitude !== undefined) {
      nextData.latitude = coordinate(data.latitude, -90, 90, "Vi do");
    }
    if (data.longitude !== undefined) {
      nextData.longitude = coordinate(data.longitude, -180, 180, "Kinh do");
    }
    const properties = await propertiesModel.findByIdAndUpdate(
      id,
      { ...nextData, search_index: buildSearchIndex(merged) },
      { new: true, runValidators: true },
    );

    // Xóa toàn bộ cache liên quan
    await invalidateCache(properties);
    await invalidateCache(existing);

    return properties;
  },
  delete: async (id) => {
    const properties = await propertiesModel.findById(id);
    if (!properties) throw new BadRequestException("Khong tim thay property");
    const [rooms, bookings, reviews, favorites] = await Promise.all([
      roomsModel.countDocuments({ property_id: id }),
      bookingModel.countDocuments({ property_id: id }),
      reviewsModel.countDocuments({ property_id: id }),
      favoritesModel.countDocuments({ property_id: id }),
    ]);
    if (rooms || bookings || reviews || favorites) {
      properties.is_active = false;
      await properties.save();
      await invalidateCache(properties);
      return properties;
    }
    if (properties?.main_image_public_id) {
      await cloudinary.uploader.destroy(properties.main_image_public_id);
    }
    if (properties?.gallery_images?.length) {
      await Promise.all(
        properties.gallery_images
          .filter((image) => image.public_id)
          .map((image) => cloudinary.uploader.destroy(image.public_id)),
      );
    }
    const result = await propertiesModel.findByIdAndDelete(id);

    // Xóa cache sau khi xóa
    await invalidateCache(properties);
    
    

    return result;
  },
  uploadMainImageLocal: async (id, file) => {
    if (!file) {
      throw new BadRequestException("Vui long gui file bang key image");
    }

    const properties = await propertiesModel.findById(id);
    if (!properties) {
      throw new BadRequestException("Khong tim thay property");
    }

    properties.main_image_url = `/images/properties/${id}/main/${file.filename}`;
    properties.main_image_public_id = "";
    await properties.save();

    // Invalidate cache
    await invalidateCache(properties);
    
    

    return properties;
  },
  uploadMainImageCloud: async (id, file) => {
    if (!file) {
      throw new BadRequestException("Vui long gui file bang key image");
    }

    const properties = await propertiesModel.findById(id);
    if (!properties) {
      throw new BadRequestException("Khong tim thay property");
    }

    if (properties.main_image_public_id) {
      await cloudinary.uploader.destroy(properties.main_image_public_id);
    }

    const uploaded = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `properties/${id}/main`, resource_type: "image" },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });

    properties.main_image_url = uploaded.secure_url;
    properties.main_image_public_id = uploaded.public_id;
    await properties.save();

    // Invalidate cache
    await invalidateCache(properties);
    
    

    return properties;
  },
  uploadGalleryCloud: async (id, files) => {
    if (!files || files.length === 0) {
      throw new BadRequestException("Vui long gui file bang key images");
    }

    const properties = await propertiesModel.findById(id);
    if (!properties) {
      throw new BadRequestException("Khong tim thay property");
    }

    const uploadedFiles = await Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: `properties/${id}/gallery`, resource_type: "image" },
              (error, result) => {
                if (error) return reject(error);
                resolve({
                  url: result.secure_url,
                  public_id: result.public_id,
                });
              },
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
          }),
      ),
    );

    properties.gallery_images = [
      ...(properties.gallery_images || []),
      ...uploadedFiles,
    ];
    await properties.save();

    // Invalidate cache
    await invalidateCache(properties);
    
    

    return properties;
  },
};
module.exports = propertiesService;
