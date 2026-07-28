const { responseSuccess } = require("../helpers/response.helper");
const propertiesService = require("../services/properties.service");
const redis = require("../config/redis.config");

const propertiesController = {
  getAll: async (req, res, next) => {
    try {
      const data = await propertiesService.getAll();
      const response = responseSuccess(data, "Lấy danh sách Properties thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getAllForAdmin: async (_req, res, next) => {
    try {
      const data = await propertiesService.getAll({ includeInactive: true });
      const response = responseSuccess(data, "Lay tat ca properties cho admin thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getFeatured: async (req, res, next) => {
    try {
      const data = await propertiesService.getFeatured();
      const response = responseSuccess(data, "Lấy danh sách Properties nổi bật thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getCity: async (req, res, next) => {
    const city = req.params.city;
    try {
      const data = await propertiesService.getCity(city);
      const response = responseSuccess(data, "Tạo Properties thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getBySlug: async (req, res, next) => {
    const city = req.params.city;
    const slug = req.params.slug;
    try {
      const data = await propertiesService.getBySlug(slug, city);
      const response = responseSuccess(data, "Tạo Properties thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    const newProperties = req.body;
    try {
      const data = await propertiesService.create(newProperties);
      const response = responseSuccess(data, "Tạo Properties thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    const id = req.params.id;
    const body = req.body;
    try {
      const data = await propertiesService.update(id, body);
      const response = responseSuccess(
        data,
        "Cập nhật Properties thành công",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  delete: async (req, res, next) => {
    const id = req.params.id;
    try {
      const data = await propertiesService.delete(id);
      const response = responseSuccess(data, "Xóa Properties thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  uploadMainImageLocal: async (req, res, next) => {
    const id = req.params.id;
    try {
      const data = await propertiesService.uploadMainImageLocal(id, req.file);
      const response = responseSuccess(
        data,
        "Upload main image local thành công",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  uploadMainImageCloud: async (req, res, next) => {
    const id = req.params.id;
    try {
      const data = await propertiesService.uploadMainImageCloud(id, req.file);
      const response = responseSuccess(
        data,
        "Upload main image cloud thành công",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  uploadGalleryCloud: async (req, res, next) => {
    const id = req.params.id;
    try {
      const data = await propertiesService.uploadGalleryCloud(id, req.files);
      const response = responseSuccess(
        data,
        "Upload gallery cloud thành công",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // GET /properties/search?keyword=&city=&minPrice=&maxPrice=&amenities=&isPreferred=
  search: async (req, res, next) => {
    try {
      const filters = req.query;

      // Lưu search history vào Redis (nếu có user đăng nhập và có keyword)
      if (req.user?.userId && filters.keyword?.trim()) {
        const historyKey = `search:history:${req.user.userId}`;
        await redis.lrem(historyKey, 0, filters.keyword.trim());       // xóa nếu đã tồn tại
        await redis.lpush(historyKey, filters.keyword.trim());         // thêm vào đầu
        await redis.ltrim(historyKey, 0, 9);                           // giữ tối đa 10 từ khóa
        await redis.expire(historyKey, 7 * 24 * 60 * 60);             // TTL 7 ngày
      }

      const data = await propertiesService.search(filters);
      const response = responseSuccess(data, "Tìm kiếm thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // GET /properties/search/history
  getSearchHistory: async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(200).json(responseSuccess([], "Lịch sử tìm kiếm", 200));
      }
      const historyKey = `search:history:${userId}`;
      const history = await redis.lrange(historyKey, 0, -1);
      const response = responseSuccess(history, "Lấy lịch sử tìm kiếm thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /properties/search/history
  clearSearchHistory: async (req, res, next) => {
    try {
      const userId = req.user?.userId;
      if (userId) {
        await redis.del(`search:history:${userId}`);
      }
      const response = responseSuccess(null, "Xóa lịch sử tìm kiếm thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
};
module.exports = propertiesController;
