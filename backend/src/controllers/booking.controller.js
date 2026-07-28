const { responseSuccess } = require("../helpers/response.helper");
const { ForbiddenException } = require("../helpers/error.helper");
const bookingService = require("../services/booking.service");

const isAdmin = (req) => req.user?.role === "admin";

const bookingController = {
  getCancellationQuote: async (req, res, next) => {
    try {
      const data = await bookingService.getCancellationQuote(
        req.params.bookingId,
        req.user,
      );
      const response = responseSuccess(data, "Lay bao gia huy booking thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getAll: async (req, res, next) => {
    try {
      // Danh sach toan he thong chi danh cho admin. Nguoi dung thuong
      // chi duoc thay booking cua chinh minh.
      const data = isAdmin(req)
        ? await bookingService.getAll()
        : await bookingService.getByUserId(req.user.userId);
      const response = responseSuccess(data, "Lấy danh sách booking thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getByUserId: async (req, res, next) => {
    const userId = req.params.userId;
    try {
      if (!isAdmin(req) && userId !== req.user.userId) {
        throw new ForbiddenException("Bạn không thể xem booking của người dùng khác");
      }
      const data = await bookingService.getByUserId(userId);
      const response = responseSuccess(data, "Lấy Booking thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    try {
      const newBooking = {
        ...req.body,
        user_id: isAdmin(req) && req.body.user_id ? req.body.user_id : req.user.userId,
      };
      const data = await bookingService.create(newBooking);
      const response = responseSuccess(data, "Tạo booking thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    const bookingId = req.params.bookingId;
    const payload = req.body;
    try {
      const data = await bookingService.update(bookingId, payload, req.user);
      const response = responseSuccess(data, "Cập nhật Booking thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  delete: async (req, res, next) => {
    const bookingId = req.params.bookingId;
    try {
      const data = await bookingService.delete(bookingId, req.user);
      const response = responseSuccess(data, "Xóa booking thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  updateStatus: async (req, res, next) => {
    const bookingId = req.params.bookingId;
    const { status } = req.body;

    try {
      const data = await bookingService.updateStatus(bookingId, status, req.user);
      const response = responseSuccess(
        data,
        "Cập nhật trạng thái booking thành công",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  updateAttendance: async (req, res, next) => {
    const bookingId = req.params.bookingId;
    const { attendance_status, note } = req.body;
    try {
      const data = await bookingService.updateAttendance(
        bookingId,
        attendance_status,
        note,
        req.user,
      );
      const response = responseSuccess(data, "Cập nhật trạng thái nhận phòng thành công", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  findByCheckInCode: async (req, res, next) => {
    try {
      const data = await bookingService.findByCheckInCode(req.params.code, req.user);
      const response = responseSuccess(data, "Tra cứu mã nhận phòng thành công", 200);
      res.status(response.code).json(response);
    } catch (err) { next(err); }
  },
};

module.exports = bookingController;
