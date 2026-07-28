const { responseSuccess } = require("../helpers/response.helper");
const notificationsService = require("../services/notifications.service");

const notificationsController = {
  // GET /notifications?page=1&limit=20
  getMyNotifications: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { page, limit } = req.query;
      const data = await notificationsService.getByUser(userId, { page, limit });
      const response = responseSuccess(data, "Lấy thông báo thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /notifications/:id/read
  markAsRead: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const data = await notificationsService.markAsRead(id, userId);
      const response = responseSuccess(data, "Đã đánh dấu đã đọc", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // PATCH /notifications/read-all
  markAllAsRead: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const data = await notificationsService.markAllAsRead(userId);
      const response = responseSuccess(data, "Đã đọc tất cả thông báo", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /notifications/:id
  delete: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const data = await notificationsService.delete(id, userId);
      const response = responseSuccess(data, "Đã xóa thông báo", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = notificationsController;
