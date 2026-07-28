const express = require("express");
const notificationsController = require("../controllers/notifications.controller");
const protect = require("../middlewares/protect.middleware");

const notificationsRouter = express.Router();

// Tất cả route notifications đều yêu cầu đăng nhập
notificationsRouter.use(protect);

notificationsRouter.get("/", notificationsController.getMyNotifications);
notificationsRouter.patch("/read-all", notificationsController.markAllAsRead);
notificationsRouter.patch("/:id/read", notificationsController.markAsRead);
notificationsRouter.delete("/:id", notificationsController.delete);

module.exports = notificationsRouter;
