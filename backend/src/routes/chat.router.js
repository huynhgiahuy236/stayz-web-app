const express = require("express");
const chatController = require("../controllers/chat.controller");
const protect = require("../middlewares/protect.middleware");

const chatRouter = express.Router();

chatRouter.use(protect); // Tất cả route chat đều yêu cầu login

chatRouter.post("/conversations", chatController.getOrCreateConversation);
chatRouter.get("/conversations", chatController.getMyConversations);
chatRouter.get("/conversations/:conversationId/messages", chatController.getMessages);
chatRouter.post("/conversations/:conversationId/messages", chatController.sendMessage);
chatRouter.patch("/conversations/:conversationId/read", chatController.markAsRead);

module.exports = chatRouter;
