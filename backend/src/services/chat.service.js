const { BadRequestException } = require("../helpers/error.helper");
const conversationModel = require("../models/conversations.model");
const messageModel = require("../models/messages.model");

const chatService = {
  // Lấy hoặc tạo phòng chat giữa 2 user (ví dụ: User và Admin/Host)
  getOrCreateConversation: async (userId, targetId) => {
    if (!targetId) {
      throw new BadRequestException("Thiếu targetId người nhận chat");
    }

    let conversation = await conversationModel.findOne({
      participants: { $all: [userId, targetId] },
    });

    if (!conversation) {
      conversation = await conversationModel.create({
        participants: [userId, targetId],
      });
    }

    return conversation;
  },

  // Lấy danh sách conversations của 1 user
  getMyConversations: async (userId) => {
    return await conversationModel
      .find({ participants: userId })
      .populate("participants", "full_name email avatar role")
      .sort({ last_message_at: -1, updatedAt: -1 });
  },

  // Lấy danh sách tin nhắn trong conversation (có phân trang)
  getMessages: async (conversationId, { page = 1, limit = 50 } = {}) => {
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      messageModel
        .find({ conversation_id: conversationId })
        .sort({ createdAt: 1 }) // Sắp xếp từ cũ đến mới để hiển thị kiểu chat timeline
        .skip(skip)
        .limit(Number(limit)),
      messageModel.countDocuments({ conversation_id: conversationId }),
    ]);

    return {
      messages,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Lưu tin nhắn mới vào database
  saveMessage: async (conversationId, senderId, content) => {
    if (!content || !content.trim()) {
      throw new BadRequestException("Nội dung tin nhắn trống");
    }

    // 1. Tạo tin nhắn
    const message = await messageModel.create({
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
    });

    // 2. Cập nhật preview tin nhắn cuối cùng trong conversation
    await conversationModel.findByIdAndUpdate(conversationId, {
      last_message: content.trim(),
      last_message_at: message.createdAt,
    });

    return message;
  },

  // Đánh dấu tất cả tin nhắn trong conversation là đã đọc (ngoại trừ tin nhắn của sender)
  markAsRead: async (conversationId, userId) => {
    return await messageModel.updateMany(
      {
        conversation_id: conversationId,
        sender_id: { $ne: userId },
        is_read: false,
      },
      { is_read: true }
    );
  },
};

module.exports = chatService;
