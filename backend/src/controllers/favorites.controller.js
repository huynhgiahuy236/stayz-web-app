const { responseSuccess } = require("../helpers/response.helper");
const favoritesService = require("../services/favorites.service");

const favoritesController = {
  // GET /favorites — lấy danh sách yêu thích của user đang đăng nhập
  getMyFavorites: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const data = await favoritesService.getByUser(userId);
      const response = responseSuccess(data, "Lấy danh sách yêu thích thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // POST /favorites/:propertyId — thêm vào yêu thích
  add: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { propertyId } = req.params;
      const data = await favoritesService.add(userId, propertyId);
      const response = responseSuccess(data, "Đã thêm vào yêu thích", 201);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /favorites/:propertyId — xóa khỏi yêu thích
  remove: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { propertyId } = req.params;
      const data = await favoritesService.remove(userId, propertyId);
      const response = responseSuccess(data, "Đã xóa khỏi yêu thích", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // GET /favorites/check/:propertyId — kiểm tra đã thích chưa
  checkIsFavorite: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { propertyId } = req.params;
      const data = await favoritesService.checkIsFavorite(userId, propertyId);
      const response = responseSuccess(data, "Kiểm tra yêu thích thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = favoritesController;
