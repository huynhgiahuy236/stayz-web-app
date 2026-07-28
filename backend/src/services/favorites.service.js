const { BadRequestException, ConflictException } = require("../helpers/error.helper");
const favoritesModel = require("../models/favorites.model");
const redis = require("../config/redis.config");

const CACHE_TTL = 120; // 2 phút

const favoritesService = {
  // Lấy danh sách yêu thích của user
  getByUser: async (userId) => {
    const cacheKey = `favorites:user:${userId}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const data = await favoritesModel
      .find({ user_id: userId })
      .populate({
        path: "property_id",
        populate: { path: "user_id", select: "full_name email avatar" },
      })
      .sort({ createdAt: -1 });

    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(data));
    return data;
  },

  // Thêm vào yêu thích
  add: async (userId, propertyId) => {
    try {
      const favorite = await favoritesModel.create({
        user_id: userId,
        property_id: propertyId,
      });

      // Invalidate cache
      await redis.del(`favorites:user:${userId}`);

      return favorite;
    } catch (err) {
      // Lỗi duplicate key (đã tồn tại)
      if (err.code === 11000) {
        throw new ConflictException("Property này đã có trong danh sách yêu thích");
      }
      throw err;
    }
  },

  // Xóa khỏi yêu thích
  remove: async (userId, propertyId) => {
    const favorite = await favoritesModel.findOneAndDelete({
      user_id: userId,
      property_id: propertyId,
    });

    if (!favorite) {
      throw new BadRequestException("Không tìm thấy trong danh sách yêu thích");
    }

    // Invalidate cache
    await redis.del(`favorites:user:${userId}`);

    return favorite;
  },

  // Kiểm tra 1 property có trong yêu thích của user không
  checkIsFavorite: async (userId, propertyId) => {
    const favorite = await favoritesModel.findOne({
      user_id: userId,
      property_id: propertyId,
    });
    return { is_favorite: !!favorite };
  },
};

module.exports = favoritesService;
