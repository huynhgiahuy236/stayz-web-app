const payOS = require("../config/payos.config");
const { BadRequestException, ServiceUnavailableException } = require("../helpers/error.helper");
const bookingModel = require("../models/bookings.model");
const paymentsModel = require("../models/payments.model");
const redis = require("../config/redis.config");
const mongoose = require("mongoose");
const { default: Redlock } = require("redlock");
const { PAYOS_RETURN_URL, PAYOS_CANCEL_URL } = require("../constants/app.constant");
const { calculatePaymentQuote, normalizePaymentPlan } = require("../utils/paymentQuote.util");
const notificationsService = require("./notifications.service");

const paymentRedlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 50,
});

const assertProductionPaymentUrls = () => {
  if (process.env.NODE_ENV !== "production") return;
  if (!PAYOS_RETURN_URL || !PAYOS_CANCEL_URL) {
    throw new ServiceUnavailableException(
      "He thong thanh toan chua duoc cau hinh day du",
    );
  }
};

const commitPaymentCancellation = async (paymentId) => {
  const session = await mongoose.startSession();
  let updatedPayment;
  try {
    await session.withTransaction(async () => {
      updatedPayment = await paymentsModel.findOneAndUpdate(
        { _id: paymentId, status: "pending" },
        { status: "CANCELLED" },
        { new: true, session },
      );
      if (!updatedPayment) {
        throw new BadRequestException("Giao dich khong con o trang thai cho thanh toan");
      }
      const booking = await bookingModel.findByIdAndUpdate(
        updatedPayment.booking_id,
        { payment_status: "failed", payment_expires_at: null },
        { new: true, session },
      );
      if (!booking) {
        throw new BadRequestException("Booking cua giao dich khong con ton tai");
      }
    });
    return updatedPayment;
  } finally {
    await session.endSession();
  }
};

const paymentService = {
  getAll: async () =>
    paymentsModel
      .find()
      .populate("user_id", "full_name email")
      .populate({
        path: "booking_id",
        populate: [
          { path: "property_id", select: "title" },
          { path: "room_id", select: "name" },
        ],
      })
      .sort({ createdAt: -1 }),
  // Tạo liên kết thanh toán PayOS từ một Booking
  createPaymentLink: async (bookingId, userId, requestedPlan) => {
    let lock;
    try {
      lock = await paymentRedlock.acquire([`lock:payment:${bookingId}`], 60000);
    } catch {
      throw new BadRequestException(
        "He thong dang tao giao dich cho booking nay. Vui long thu lai.",
      );
    }
    try {
      return await paymentService._createPaymentLinkUnlocked(
        bookingId,
        userId,
        requestedPlan,
      );
    } finally {
      if (lock) await lock.release();
    }
  },

  _createPaymentLinkUnlocked: async (bookingId, userId, requestedPlan) => {
    assertProductionPaymentUrls();
    if (!payOS) {
      throw new BadRequestException("Cổng thanh toán PayOS hiện chưa được cấu hình key.");
    }

    const booking = await bookingModel.findById(bookingId).populate("room_id property_id");
    if (!booking) {
      throw new BadRequestException("Booking không tồn tại");
    }

    // Đảm bảo chỉ user chủ booking mới thanh toán được
    if (booking.user_id.toString() !== userId.toString()) {
      throw new BadRequestException("Bạn không được phép thanh toán cho booking này");
    }

    if (booking.status === "confirmed" || booking.status === "completed") {
      throw new BadRequestException("Booking này đã được thanh toán rồi");
    }

    const nextPlan = normalizePaymentPlan(requestedPlan || booking.payment_plan);
    const paymentQuote = calculatePaymentQuote(nextPlan, booking.total_price);

    const existingPayment = await paymentsModel
      .findOne({ booking_id: bookingId })
      .sort({ createdAt: -1 });
    if (existingPayment) {
      const expiresAt = new Date(
        existingPayment.createdAt.getTime() + 15 * 60 * 1000,
      );
      const canReuse =
        existingPayment.status === "PAID" ||
        (existingPayment.status === "pending" &&
          expiresAt > new Date() &&
          Number(existingPayment.amount) === Number(paymentQuote.payNow));

      if (!canReuse) {
        if (
          existingPayment.status === "pending" &&
          existingPayment.payment_link_id
        ) {
          try {
            await payOS.paymentRequests.cancel(
              existingPayment.payment_link_id,
              "Expired StayZ payment",
            );
          } catch (err) {
            console.warn("PayOS expired link cleanup error:", err.message);
          }
        }
        if (existingPayment.status === "pending") {
          existingPayment.status = "CANCELLED";
          await existingPayment.save();
        }
      } else {
        if (!existingPayment.qr_code && existingPayment.payment_link_id) {
          const current = await payOS.paymentRequests.get(existingPayment.payment_link_id);
          existingPayment.qr_code = current.qrCode;
          existingPayment.bank_bin = current.bin || "";
          existingPayment.account_number = current.accountNumber || "";
          existingPayment.account_name = current.accountName || "";
          existingPayment.transfer_description = current.description || `STAYZ${existingPayment.order_code}`;
          existingPayment.qr_image_url = "";
          existingPayment.currency = current.currency || "VND";
          await existingPayment.save();
        }
        return existingPayment;
      }
    }

    // Tạo mã đơn hàng ngẫu nhiên duy nhất (PayOS yêu cầu định dạng số)
    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(1000 + Math.random() * 9000));

    const description = `Thanh toan StayZ`;
    const transferDescription = `STAYZ${orderCode}`;
    // Tạo request data theo chuẩn PayOS
    const requestData = {
      orderCode,
      amount: paymentQuote.payNow,
      description: description.substring(0, 25), // PayOS giới hạn 25 ký tự không dấu
      cancelUrl: PAYOS_CANCEL_URL || "http://localhost:5173/payment/cancel",
      returnUrl: PAYOS_RETURN_URL || "http://localhost:5173/payment/success",
      expiredAt: Math.floor(Date.now() / 1000) + 15 * 60,
    };

    const paymentLinkRes = await payOS.paymentRequests.create(requestData);

    // Lưu thông tin thanh toán vào DB
    const payment = await paymentsModel.create({
      booking_id: bookingId,
      user_id: userId,
      order_code: orderCode,
      amount: paymentQuote.payNow,
      payment_link_id: paymentLinkRes.paymentLinkId,
      checkout_url: paymentLinkRes.checkoutUrl,
      qr_code: paymentLinkRes.qrCode,
      qr_image_url: "",
      bank_bin: paymentLinkRes.bin || "",
      account_number: paymentLinkRes.accountNumber || "",
      account_name: paymentLinkRes.accountName || "",
      transfer_description: paymentLinkRes.description || transferDescription,
      currency: paymentLinkRes.currency || "VND",
      status: "pending",
    });

    booking.payment_expires_at = new Date(Date.now() + 15 * 60 * 1000);
    booking.payment_plan = nextPlan;
    booking.remaining_at_hotel = paymentQuote.remaining;
    booking.payment_status = "pending";
    booking.status = "pending";
    await booking.save();

    return payment;
  },

  // Xử lý callback/webhook khi PayOS xác nhận đã nhận thanh toán thành công
  handleWebhook: async (webhookBody) => {
    if (!payOS) return null;

    // Xác thực webhook từ PayOS gửi đến
    const verifiedData = await payOS.webhooks.verify(webhookBody);

    const { orderCode } = verifiedData;

    // Tìm giao dịch thanh toán
    const payment = await paymentsModel.findOne({ order_code: orderCode });
    if (!payment) {
      return null;
    }

    if (verifiedData.code === "00") {
      if (Number(verifiedData.amount) !== Number(payment.amount)) {
        throw new BadRequestException("So tien webhook khong khop giao dich");
      }
      if (payment.status === "PAID") return payment;
      // 1. Cập nhật trạng thái Payment là PAID
      payment.status = "PAID";
      await payment.save();

      // 2. Cập nhật trạng thái Booking là confirmed
      const booking = await bookingModel.findById(payment.booking_id);
      const paymentQuote = calculatePaymentQuote(booking?.payment_plan, booking?.total_price);
      await bookingModel.findByIdAndUpdate(payment.booking_id, {
        status: "confirmed",
        payment_status: "paid",
        amount_paid: payment.amount,
        remaining_at_hotel: paymentQuote.remaining,
        payment_expires_at: null,
      });
      const depositPaid = booking.payment_plan === "deposit_30";
      notificationsService.createInternal({
        userId: booking.user_id,
        type: "booking_status",
        event: depositPaid ? "deposit_paid" : "paid_in_full",
        title: depositPaid ? "Đã thanh toán cọc 30%" : "Đã thanh toán toàn bộ",
        body: depositPaid
          ? `Booking #${booking._id} đã thanh toán cọc 30% và được xác nhận. Phần còn lại thanh toán tại khách sạn.`
          : `Booking #${booking._id} đã thanh toán đầy đủ và được xác nhận.`,
        titleEn: depositPaid ? "30% deposit paid" : "Paid in full",
        bodyEn: depositPaid
          ? `Booking #${booking._id} has a 30% deposit and is confirmed. The remainder is due at the property.`
          : `Booking #${booking._id} has been paid in full and confirmed.`,
        refId: booking._id,
        refType: "Booking",
      }).catch(() => {});
    } else {
      // 1. Cập nhật trạng thái Payment là CANCELLED
      payment.status = "CANCELLED";
      await payment.save();
    }

    return payment;
  },

  // Lấy chi tiết thông tin thanh toán cho booking
  getPaymentByBooking: async (bookingId, userId) => {
    const payment = await paymentsModel
      .findOne({ booking_id: bookingId })
      .sort({ createdAt: -1 });
    if (payment && payment.user_id.toString() !== userId.toString()) {
      throw new BadRequestException("Bạn không được phép xem giao dịch này");
    }
    return payment;
  },

  // Hủy thanh toán / Link thanh toán
  cancelPaymentLink: async (bookingId, userId) => {
    const payment = await paymentsModel.findOne({ booking_id: bookingId, user_id: userId });
    if (!payment) {
      throw new BadRequestException("Không tìm thấy giao dịch thanh toán của booking này");
    }

    if (payment.status !== "pending") {
      throw new BadRequestException(`Không thể hủy giao dịch ở trạng thái: ${payment.status}`);
    }
    if (!(await bookingModel.exists({ _id: bookingId, user_id: userId }))) {
      throw new BadRequestException("Booking cua giao dich khong con ton tai");
    }

    if (payOS) {
      try {
        await payOS.paymentRequests.cancel(payment.payment_link_id, "Cancelled by StayZ user");
      } catch (err) {
        console.warn("PayOS SDK cancel link error:", err.message);
        throw new BadRequestException(
          "Khong the huy giao dich tren PayOS; trang thai chua duoc thay doi",
        );
      }
    }

    return await commitPaymentCancellation(payment._id);
  },
  cancelPaymentByAdmin: async (paymentId) => {
    const payment = await paymentsModel.findById(paymentId);
    if (!payment) throw new BadRequestException("Không tìm thấy giao dịch");
    if (payment.status !== "pending") {
      throw new BadRequestException("Chỉ có thể huỷ giao dịch đang chờ thanh toán");
    }
    if (!(await bookingModel.exists({ _id: payment.booking_id }))) {
      throw new BadRequestException("Booking cua giao dich khong con ton tai");
    }
    if (payOS && payment.payment_link_id) {
      try {
        await payOS.paymentRequests.cancel(payment.payment_link_id, "Cancelled by StayZ admin");
      } catch (err) {
        console.warn("PayOS SDK cancel link error:", err.message);
        throw new BadRequestException(
          "Khong the huy giao dich tren PayOS; trang thai chua duoc thay doi",
        );
      }
    }
    return await commitPaymentCancellation(payment._id);
  },
};

module.exports = paymentService;
