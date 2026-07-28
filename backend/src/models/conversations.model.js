const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    // 2 người tham gia: [user_id, admin_id hoặc user_id khác]
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Tin nhắn cuối cùng — để hiển thị preview trong danh sách chat
    last_message: {
      type: String,
      default: "",
    },
    last_message_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Đảm bảo mỗi cặp user chỉ có 1 conversation
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
