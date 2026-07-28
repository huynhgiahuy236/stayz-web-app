const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { SECRET } = require("../constants/app.constant");
const chatService = require("../services/chat.service");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Cho phép mọi kết nối từ client React/Mobile
      methods: ["GET", "POST"],
    },
  });

  // Middleware xác thực JWT khi bắt đầu kết nối Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, SECRET);
      socket.user = {
        userId: decoded.userId,
        role: decoded.role_user,
      };
      next();
    } catch (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Client connected via Socket.io: ${socket.user.userId}`);

    // Join vào một cuộc trò chuyện cụ thể (room socket)
    socket.on("join_conversation", ({ conversationId }) => {
      socket.join(conversationId);
      console.log(`👤 User ${socket.user.userId} joined room ${conversationId}`);
    });

    // Rời khỏi phòng chat
    socket.on("leave_conversation", ({ conversationId }) => {
      socket.leave(conversationId);
      console.log(`👤 User ${socket.user.userId} left room ${conversationId}`);
    });

    // Khi client gửi tin nhắn realtime qua Socket
    socket.on("send_message", async ({ conversationId, content }) => {
      try {
        const senderId = socket.user.userId;
        // 1. Lưu tin nhắn vào Database
        const message = await chatService.saveMessage(conversationId, senderId, content);

        // 2. Phát tán (broadcast) tin nhắn đến tất cả thành viên trong Room đó
        io.to(conversationId).emit("message_received", message);
      } catch (err) {
        socket.emit("error", { message: err.message });
      }
    });

    // Sự kiện typing: báo cho đầu bên kia biết mình đang soạn tin
    socket.on("typing", ({ conversationId }) => {
      socket.to(conversationId).emit("typing", { userId: socket.user.userId });
    });

    socket.on("stop_typing", ({ conversationId }) => {
      socket.to(conversationId).emit("stop_typing", { userId: socket.user.userId });
    });

    socket.on("disconnect", () => {
      console.log(`⚡ Client disconnected: ${socket.user.userId}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized!");
  }
  return io;
};

module.exports = { initSocket, getIO };
