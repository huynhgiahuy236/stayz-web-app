const { responseSuccess } = require("../helpers/response.helper");
const chatService = require("../services/chat.service");

const chatController = {
  // Lấy hoặc tạo phòng chat với một user khác
  getOrCreateConversation: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { targetId } = req.body;
      const data = await chatService.getOrCreateConversation(userId, targetId);
      const response = responseSuccess(data, "Lấy hoặc tạo phòng chat thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // Lấy danh sách phòng chat của tôi
  getMyConversations: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const data = await chatService.getMyConversations(userId);
      const response = responseSuccess(data, "Lấy danh sách phòng chat thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // Lấy tin nhắn trong cuộc trò chuyện
  getMessages: async (req, res, next) => {
    try {
      const { conversationId } = req.params;
      const { page, limit } = req.query;
      const data = await chatService.getMessages(conversationId, { page, limit });
      const response = responseSuccess(data, "Lấy danh sách tin nhắn thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // Gửi tin nhắn qua REST API (fallback/độc lập)
  sendMessage: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;
      const { content } = req.body;
      const data = await chatService.saveMessage(conversationId, userId, content);
      const response = responseSuccess(data, "Gửi tin nhắn thành công", 201);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // Đánh dấu đã đọc tất cả tin nhắn nhận được
  markAsRead: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { conversationId } = req.params;
      const data = await chatService.markAsRead(conversationId, userId);
      const response = responseSuccess(data, "Đã đánh dấu đã đọc", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = chatController;
