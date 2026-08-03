const { responseSuccess } = require("../helpers/response.helper");
const paymentService = require("../services/payment.service");
const { WEB_CLIENT_URL } = require("../constants/app.constant");

const redirectPaymentResult = (res, path, query) => {
  if (!WEB_CLIENT_URL) return false;
  const target = new URL(path, `${WEB_CLIENT_URL.replace(/\/$/, "")}/`);
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => target.searchParams.append(key, item));
    else if (value != null) target.searchParams.set(key, value);
  }
  res.redirect(target.toString());
  return true;
};

const paymentController = {
  getAll: async (_req, res, next) => {
    try {
      const data = await paymentService.getAll();
      const response = responseSuccess(data, "Lấy danh sách giao dịch thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  // POST /payment/create/:bookingId
  createPayment: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { bookingId } = req.params;
      const data = await paymentService.createPaymentLink(
        bookingId,
        userId,
        req.body?.payment_plan,
      );
      const response = responseSuccess(data, "Tạo link thanh toán PayOS thành công", 201);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // GET /payment/booking/:bookingId
  getPaymentDetails: async (req, res, next) => {
    try {
      const { bookingId } = req.params;
      const data = await paymentService.getPaymentByBooking(
        bookingId,
        req.user.userId,
      );
      const response = responseSuccess(data, "Lấy thông tin thanh toán thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // POST /payment/cancel/:bookingId
  cancelPayment: async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { bookingId } = req.params;
      const data = await paymentService.cancelPaymentLink(bookingId, userId);
      const response = responseSuccess(data, "Đã hủy giao dịch thanh toán", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  cancelPaymentByAdmin: async (req, res, next) => {
    try {
      const data = await paymentService.cancelPaymentByAdmin(req.params.paymentId);
      const response = responseSuccess(data, "Đã huỷ giao dịch PayOS", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },

  // POST /payment/webhook
  // Endpoint nhận webhook từ PayOS (không cần protect JWT)
  handleWebhook: async (req, res, next) => {
    try {
      const data = await paymentService.handleWebhook(req.body);
      const response = responseSuccess(data, "Xử lý webhook PayOS thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  paymentReturn: (req, res) => {
    if (redirectPaymentResult(res, "/payment/return", req.query)) return;
    res.status(200).json({ status: "return", query: req.query });
  },
  paymentCancel: (req, res) => {
    if (redirectPaymentResult(res, "/payment/cancel", req.query)) return;
    res.status(200).json({ status: "cancel", query: req.query });
  },
};

module.exports = paymentController;
