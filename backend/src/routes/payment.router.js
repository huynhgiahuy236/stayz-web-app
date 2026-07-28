const express = require("express");
const paymentController = require("../controllers/payment.controller");
const adminOnly = require("../middlewares/admin.middleware");
const protect = require("../middlewares/protect.middleware");

const paymentRouter = express.Router();

// Webhook endpoint: Cần gọi công khai không có JWT, PayOS sẽ POST đến đây
paymentRouter.post("/webhook", paymentController.handleWebhook);
paymentRouter.get("/return", paymentController.paymentReturn);
paymentRouter.get("/cancel", paymentController.paymentCancel);

// Các endpoint khách hàng cần đăng nhập để thao tác
paymentRouter.use(protect);
paymentRouter.post("/create/:bookingId", paymentController.createPayment);
paymentRouter.get("/getAll", adminOnly, paymentController.getAll);
paymentRouter.post("/admin/:paymentId/cancel", adminOnly, paymentController.cancelPaymentByAdmin);
paymentRouter.get("/booking/:bookingId", paymentController.getPaymentDetails);
paymentRouter.post("/cancel/:bookingId", paymentController.cancelPayment);

module.exports = paymentRouter;
