const mongoose = require("mongoose");
const { BadRequestException } = require("../helpers/error.helper");
const bookingModel = require("../models/bookings.model");
const conversationModel = require("../models/conversations.model");
const messageModel = require("../models/messages.model");
const propertyModel = require("../models/properties.model");
const reviewModel = require("../models/reviews.model");
const roomModel = require("../models/rooms.model");
const userModel = require("../models/users.model");

const activeBookingStatus = ["pending", "confirmed"];
const assistantEmail = "ai-assistant@stayz.local";
const maxRecommendations = 3;

const systemPrompt = `You are StayZ AI assistant, a friendly hotel booking assistant in Vietnamese.
Use only the provided database context.
Help users find suitable hotels and rooms.
If user gives city, budget, dates, guests, or amenities, use them to filter suggestions.
If required information is missing, ask one clear follow-up question.
Never invent unavailable hotels, prices, rooms, amenities, images, or availability.
Keep answers concise and natural.`;

const cityAliases = [
  { slug: "da-nang", terms: ["da nang", "danang", "đà nẵng"] },
  { slug: "da-lat", terms: ["da lat", "dalat", "đà lạt"] },
  { slug: "ha-noi", terms: ["ha noi", "hanoi", "hà nội"] },
  { slug: "ho-chi-minh", terms: ["ho chi minh", "sai gon", "saigon", "tp hcm", "hcm", "hồ chí minh", "sài gòn"] },
  { slug: "vung-tau", terms: ["vung tau", "vũng tàu"] },
];

const amenityAliases = [
  { key: "outdoor_pool", scope: "property", terms: ["ho boi", "hồ bơi", "pool", "swimming"] },
  { key: "free_wifi", scope: "both", terms: ["wifi", "wi-fi", "internet"] },
  { key: "airport_shuttle", scope: "property", terms: ["dua don san bay", "đưa đón sân bay", "airport"] },
  { key: "non_smoking_room", scope: "property", terms: ["khong hut thuoc", "không hút thuốc", "non smoking"] },
  { key: "room_service", scope: "property", terms: ["room service", "phuc vu phong", "phục vụ phòng"] },
  { key: "restaurant", scope: "property", terms: ["nha hang", "nhà hàng", "restaurant"] },
  { key: "free_parking", scope: "property", terms: ["bai dau xe", "bãi đậu xe", "parking", "do xe", "đỗ xe"] },
  { key: "family_room", scope: "property", terms: ["gia dinh", "gia đình", "family"] },
  { key: "bar", scope: "property", terms: ["bar"] },
  { key: "breakfast", scope: "property", terms: ["an sang", "ăn sáng", "breakfast"] },
  { key: "balcony", scope: "roomBadge", terms: ["ban cong", "ban công", "balcony"] },
  { key: "air_conditioning", scope: "roomBadge", terms: ["dieu hoa", "điều hòa", "may lanh", "máy lạnh", "air conditioning"] },
  { key: "private_bathroom", scope: "roomBadge", terms: ["phong tam rieng", "phòng tắm riêng", "private bathroom"] },
  { key: "garden_view", scope: "roomBadge", terms: ["view vuon", "view vườn", "garden view"] },
  { key: "terrace", scope: "roomBadge", terms: ["san hien", "sân hiên", "terrace"] },
  { key: "hair_dryer", scope: "room", terms: ["may say toc", "máy sấy tóc", "hair dryer"] },
  { key: "electric_kettle", scope: "room", terms: ["am dun", "ấm đun", "kettle"] },
];

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const stripAccents = (value = "") =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const normalizeText = (value = "") => stripAccents(String(value).toLowerCase());

const formatVnd = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

const hasAnyTerm = (text, terms) => terms.some((term) => text.includes(normalizeText(term)));

const detectIntent = (message = "") => {
  const text = normalizeText(message);
  if (hasAnyTerm(text, ["huy", "cancel", "hoan tien", "doi lich", "chinh sua booking"])) return "cancellation_help";
  if (hasAnyTerm(text, ["con phong", "trong", "available", "availability", "kiem tra phong"])) return "ask_room_availability";
  if (hasAnyTerm(text, ["dat phong", "booking", "book", "giu phong", "thanh toan"])) return "booking_help";
  if (hasAnyTerm(text, ["gia", "tien", "duoi", "tren", "khoang", "budget", "price", "gia re", "re tien"])) return "filter_by_price";
  if (amenityAliases.some((item) => hasAnyTerm(text, item.terms))) return "filter_by_amenities";
  if (cityAliases.some((item) => hasAnyTerm(text, item.terms))) return "filter_by_city";
  if (hasAnyTerm(text, ["goi y", "de xuat", "recommend", "nen o", "phu hop", "tot nhat"])) return "recommend_hotel";
  if (hasAnyTerm(text, ["tim", "search", "khach san", "hotel", "resort", "cho nghi", "noi luu tru", "phong"])) return "search_hotel";
  return "recommend_hotel";
};

const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
};

const enabledKeys = (value) => {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value)
    .filter(([, enabled]) => enabled === true)
    .map(([key]) => key);
};

const parseCity = (message, explicitCity) => {
  if (explicitCity) return explicitCity;
  const raw = String(message || "").toLowerCase();
  const normalized = normalizeText(raw);
  return cityAliases.find((city) => city.terms.some((term) => raw.includes(term.toLowerCase()) || normalized.includes(normalizeText(term))))?.slug || null;
};

const parseBudget = (message, body = {}) => {
  const minPrice = body.minPrice == null ? null : Number(body.minPrice);
  const maxPrice = body.maxPrice == null ? null : Number(body.maxPrice);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    return {
      minPrice: Number.isFinite(minPrice) ? minPrice : null,
      maxPrice: Number.isFinite(maxPrice) ? maxPrice : null,
    };
  }

  const text = normalizeText(message);
  const priceMatches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(trieu|tr|m|k|nghin|ngan|vnd|d|đ)?/g)]
    .map((match) => {
      const rawNumber = Number(match[1].replace(",", "."));
      const unit = match[2] || "";
      if (!Number.isFinite(rawNumber)) return null;
      if (["trieu", "tr", "m"].includes(unit)) return rawNumber * 1000000;
      if (["k", "nghin", "ngan"].includes(unit)) return rawNumber * 1000;
      return rawNumber >= 100000 ? rawNumber : null;
    })
    .filter((value) => value != null);

  if (!priceMatches.length) return { minPrice: null, maxPrice: null };
  const value = Math.max(...priceMatches);
  const wantsMinimum = hasAnyTerm(text, ["tren", "tu", "hon", "cao cap"]);
  const wantsRange = hasAnyTerm(text, ["khoang", "tu", "den"]) && priceMatches.length > 1;

  if (wantsRange) return { minPrice: Math.min(...priceMatches), maxPrice: Math.max(...priceMatches) };
  if (wantsMinimum) return { minPrice: value, maxPrice: null };
  return { minPrice: null, maxPrice: value };
};

const parseAmenities = (message, explicitAmenities) => {
  const requested = new Set(Array.isArray(explicitAmenities) ? explicitAmenities : []);
  const text = normalizeText(message);
  amenityAliases.forEach((amenity) => {
    if (hasAnyTerm(text, amenity.terms)) requested.add(amenity.key);
  });
  return [...requested];
};

const parseRequest = (message, body = {}) => {
  const budget = parseBudget(message, body);
  const checkIn = body.checkIn || body.checkInDate || null;
  const checkOut = body.checkOut || body.checkOutDate || null;
  const guests = body.guests == null ? body.guestCount : body.guests;
  return {
    intent: detectIntent(message),
    city: parseCity(message, body.city),
    amenities: parseAmenities(message, body.amenities),
    minPrice: budget.minPrice,
    maxPrice: budget.maxPrice,
    checkIn,
    checkOut,
    guests: guests == null ? null : Number(guests),
    propertyId: body.propertyId || null,
    roomId: body.roomId || null,
    nights: calculateNights(checkIn, checkOut),
  };
};

const buildPropertyQuery = (request) => {
  const query = {};
  if (request.propertyId && isObjectId(request.propertyId)) query._id = request.propertyId;
  if (request.city) query.city = request.city;
  if (request.minPrice != null || request.maxPrice != null) {
    query.base_price = {};
    if (request.minPrice != null) query.base_price.$gte = request.minPrice;
    if (request.maxPrice != null) query.base_price.$lte = request.maxPrice;
  }
  request.amenities.forEach((amenity) => {
    const meta = amenityAliases.find((item) => item.key === amenity);
    if (!meta || meta.scope === "property" || meta.scope === "both") query[`amenities.${amenity}`] = true;
  });
  return query;
};

const buildRoomQuery = (request, propertyIds = []) => {
  const query = { is_active: { $ne: false } };
  if (request.roomId && isObjectId(request.roomId)) query._id = request.roomId;
  if (request.propertyId && isObjectId(request.propertyId)) query.property_id = request.propertyId;
  if (!query.property_id && propertyIds.length) query.property_id = { $in: propertyIds };
  if (request.guests != null && Number.isFinite(request.guests)) query.capacity = { $gte: request.guests };
  if (request.minPrice != null || request.maxPrice != null) {
    query.price = {};
    if (request.minPrice != null) query.price.$gte = request.minPrice;
    if (request.maxPrice != null) query.price.$lte = request.maxPrice;
  }
  request.amenities.forEach((amenity) => {
    const meta = amenityAliases.find((item) => item.key === amenity);
    if (meta?.scope === "room") query[`amenities.${amenity}`] = true;
    if (meta?.scope === "roomBadge") query[`badges.${amenity}`] = true;
  });
  return query;
};

const getBookedRoomCount = async ({ roomId, checkIn, checkOut }) => {
  if (!roomId || !checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

  const overlapping = await bookingModel
    .find({
      room_id: roomId,
      status: { $in: activeBookingStatus },
      check_in: { $lt: end },
      check_out: { $gt: start },
    })
    .select("rooms_count");

  return overlapping.reduce((sum, booking) => sum + (Number(booking.rooms_count) || 0), 0);
};

const publicProperty = (property, reviews = []) => {
  const propertyReviews = reviews.filter((review) => review.property_id?.toString() === property._id.toString());
  const averageRating = propertyReviews.length
    ? propertyReviews.reduce((sum, review) => sum + (Number(review.rating) || 0), 0) / propertyReviews.length
    : null;

  return {
    id: property._id.toString(),
    title: property.title,
    city: property.city,
    address: property.address,
    base_price: Number(property.base_price) || 0,
    amenities: enabledKeys(property.amenities),
    rating: averageRating == null ? null : Number(averageRating.toFixed(1)),
    review_count: propertyReviews.length,
  };
};

const publicRoom = async (room, request) => {
  const booked = await getBookedRoomCount({ roomId: room._id, checkIn: request.checkIn, checkOut: request.checkOut });
  const availableRooms = booked == null ? null : Math.max(0, (Number(room.quantity) || 0) - booked);
  return {
    id: room._id.toString(),
    property_id: (room.property_id?._id || room.property_id)?.toString(),
    property_title: room.property_id?.title || null,
    property_city: room.property_id?.city || null,
    property_address: room.property_id?.address || null,
    name: room.name,
    room_type: room.room_type,
    price_per_night: Number(room.price) || 0,
    capacity: Number(room.capacity) || 0,
    available_rooms: availableRooms,
    quantity: Number(room.quantity) || 0,
    total_price: request.nights == null ? null : (Number(room.price) || 0) * request.nights,
    amenities: enabledKeys(room.amenities),
    badges: enabledKeys(room.badges),
  };
};

const buildDatabaseContext = async (request) => {
  const propertyQuery = buildPropertyQuery(request);
  const properties = await propertyModel.find(propertyQuery).sort({ is_preferred: -1, base_price: 1, createdAt: -1 }).limit(8);

  const propertyIds = properties.map((property) => property._id);
  const roomQuery = buildRoomQuery(request, propertyIds);
  const rooms = await roomModel.find(roomQuery).populate("property_id").sort({ price: 1 }).limit(12);

  const contextPropertyIds = new Set([
    ...propertyIds.map((id) => id.toString()),
    ...rooms.map((room) => (room.property_id?._id || room.property_id)?.toString()).filter(Boolean),
  ]);
  const reviews = contextPropertyIds.size
    ? await reviewModel.find({ property_id: { $in: [...contextPropertyIds] } }).select("property_id rating comment createdAt")
    : [];

  const roomContexts = [];
  for (const room of rooms) roomContexts.push(await publicRoom(room, request));

  const propertyContexts = properties.map((property) => publicProperty(property, reviews));
  const recommendations = roomContexts.slice(0, maxRecommendations).map((room) => {
    const property = propertyContexts.find((item) => item.id === room.property_id);
    return {
      property: property || {
        id: room.property_id,
        title: room.property_title,
        city: room.property_city,
        address: room.property_address,
        base_price: room.price_per_night,
        amenities: [],
        rating: null,
        review_count: 0,
      },
      room,
    };
  });

  return {
    request,
    rules: {
      max_recommendations: maxRecommendations,
      use_only_this_context: true,
      availability_note: "available_rooms is null when dates are missing or invalid, so do not confirm availability.",
    },
    properties: propertyContexts.slice(0, maxRecommendations),
    rooms: roomContexts.slice(0, maxRecommendations),
    recommendations,
  };
};

const describeFilters = (request) => {
  const parts = [];
  if (request.city) parts.push(`ở ${request.city}`);
  if (request.maxPrice != null) parts.push(`dưới ${formatVnd(request.maxPrice)}/đêm`);
  if (request.minPrice != null) parts.push(`từ ${formatVnd(request.minPrice)}/đêm`);
  if (request.guests) parts.push(`cho ${request.guests} khách`);
  if (request.amenities.length) parts.push(`có ${request.amenities.join(", ")}`);
  return parts.length ? parts.join(", ") : "phù hợp với yêu cầu của bạn";
};

const fallbackReply = (context) => {
  const { request, recommendations, properties } = context;
  if (!recommendations.length && !properties.length) {
    return `Mình chưa tìm thấy khách sạn/phòng ${describeFilters(request)} trong dữ liệu hiện tại. Bạn cho mình một thành phố hoặc khoảng giá khác để mình lọc lại nhé?`;
  }

  const lines = [];
  const options = recommendations.length
    ? recommendations
    : properties.slice(0, maxRecommendations).map((property) => ({ property, room: null }));

  options.slice(0, maxRecommendations).forEach((item, index) => {
    const property = item.property;
    const room = item.room;
    const price = room?.price_per_night ?? property.base_price;
    const availability =
      room?.available_rooms == null
        ? "Mình chưa thể xác nhận còn phòng vì thiếu ngày nhận/trả phòng."
        : room.available_rooms > 0
          ? `Hiện còn khoảng ${room.available_rooms} phòng theo ngày bạn chọn.`
          : "Theo ngày bạn chọn hiện chưa thấy phòng trống.";
    const roomText = room ? `, phòng ${room.name} cho tối đa ${room.capacity} khách` : "";
    const amenities = [...new Set([...(property.amenities || []), ...(room?.amenities || []), ...(room?.badges || [])])].slice(0, 4);
    lines.push(
      `${index + 1}. ${property.title || room?.property_title} ở ${property.city || room?.property_city || "khu vực này"}${roomText}. Giá từ ${formatVnd(price)}/đêm${amenities.length ? `, có ${amenities.join(", ")}` : ""}. ${availability}`,
    );
  });

  const followUp =
    request.checkIn && request.checkOut
      ? "Bạn muốn mình hướng dẫn bước đặt phòng cho lựa chọn nào?"
      : "Bạn đi ngày nào để mình kiểm tra phòng trống chính xác hơn?";

  return `Mình tìm được vài lựa chọn thật từ StayZ:\n${lines.join("\n")}\n${followUp}`;
};

const OPENAI_TIMEOUT_MS = 12000;

const callOpenAi = async ({ message, context }) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallbackReply(context);

  // Timeout cho request OpenAI: neu OpenAI cham/bi chan (vi du o VN khong VPN),
  // huy sau 12s va tra ve cau tra loi dua tren du lieu that thay vi treo den
  // khi app het thoi gian cho.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.6,
        max_tokens: 500,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `DATABASE_CONTEXT:\n${JSON.stringify(context, null, 2)}\n\nUSER_MESSAGE:\n${message}`,
          },
        ],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return fallbackReply(context);
    return data?.choices?.[0]?.message?.content?.trim() || fallbackReply(context);
  } catch (error) {
    // Timeout hoac loi mang toi OpenAI -> dung cau tra loi tu du lieu StayZ.
    if (error.name === "AbortError") {
      console.warn("OpenAI timeout, dung fallbackReply");
    }
    return fallbackReply(context);
  } finally {
    clearTimeout(timer);
  }
};

const ensureAssistantUser = async () => {
  let assistant = await userModel.findOne({ email: assistantEmail });
  if (!assistant) {
    assistant = await userModel.create({
      email: assistantEmail,
      password: "",
      full_name: "StayZ AI Assistant",
      role: "admin",
    });
  }
  return assistant;
};

const ensureConversation = async ({ userId, conversationId, assistantId }) => {
  if (conversationId) {
    if (!isObjectId(conversationId)) throw new BadRequestException("conversationId khong hop le");
    const existing = await conversationModel.findById(conversationId);
    if (existing) return existing;
  }

  return await conversationModel.create({
    participants: [userId, assistantId],
  });
};

const aiService = {
  chat: async ({ userId, body }) => {
    const message = body?.message?.trim();
    if (!message) throw new BadRequestException("message la bat buoc");
    if (body?.propertyId && !isObjectId(body.propertyId)) throw new BadRequestException("propertyId khong hop le");
    if (body?.roomId && !isObjectId(body.roomId)) throw new BadRequestException("roomId khong hop le");

    const assistant = await ensureAssistantUser();
    const conversation = await ensureConversation({
      userId,
      conversationId: body.conversationId,
      assistantId: assistant._id,
    });

    const request = parseRequest(message, body);
    const context = await buildDatabaseContext(request);

    await messageModel.create({
      conversation_id: conversation._id,
      sender_id: userId,
      content: message,
    });

    const reply = await callOpenAi({ message, context });

    const assistantMessage = await messageModel.create({
      conversation_id: conversation._id,
      sender_id: assistant._id,
      content: reply,
    });

    await conversationModel.findByIdAndUpdate(conversation._id, {
      last_message: reply,
      last_message_at: assistantMessage.createdAt,
    });

    return {
      success: true,
      reply,
      conversationId: conversation._id.toString(),
      intent: request.intent,
      suggestions: context.recommendations,
    };
  },
};

module.exports = aiService;
