const { BadRequestException } = require("../helpers/error.helper");
const notificationsModel = require("../models/notifications.model");

const notificationsService = {
  // Lấy tất cả thông báo của user (mới nhất trước)
  getByUser: async (userId, { limit = 20, page = 1 } = {}) => {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      notificationsModel
        .find({ user_id: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      notificationsModel.countDocuments({ user_id: userId }),
      notificationsModel.countDocuments({ user_id: userId, is_read: false }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
      unread_count: unreadCount,
    };
  },

  // Đánh dấu 1 thông báo đã đọc
  markAsRead: async (notificationId, userId) => {
    const notification = await notificationsModel.findOne({
      _id: notificationId,
      user_id: userId,
    });

    if (!notification) {
      throw new BadRequestException("Không tìm thấy thông báo");
    }

    notification.is_read = true;
    await notification.save();
    return notification;
  },

  // Đánh dấu tất cả đã đọc
  markAllAsRead: async (userId) => {
    const result = await notificationsModel.updateMany(
      { user_id: userId, is_read: false },
      { is_read: true },
    );
    return { modified_count: result.modifiedCount };
  },

  // Xóa 1 thông báo
  delete: async (notificationId, userId) => {
    const notification = await notificationsModel.findOneAndDelete({
      _id: notificationId,
      user_id: userId,
    });

    if (!notification) {
      throw new BadRequestException("Không tìm thấy thông báo");
    }

    return notification;
  },

  // [Internal] Tạo thông báo — dùng nội bộ khi booking thay đổi
  createInternal: async ({ userId, type, event = null, title, body, titleEn = "", bodyEn = "", refId = null, refType = null }) => {
    return await notificationsModel.create({
      user_id: userId,
      type,
      event,
      title,
      body,
      title_en: titleEn,
      body_en: bodyEn,
      ref_id: refId,
      ref_type: refType,
    });
  },
};

module.exports = notificationsService;
