const { BadRequestException, ForbiddenException } = require("../helpers/error.helper");
const bookingModel = require("../models/bookings.model");
const roomsModel = require("../models/rooms.model");
const redis = require("../config/redis.config");
const { default: Redlock } = require("redlock");
const notificationsService = require("./notifications.service");
const paymentsModel = require("../models/payments.model");
const reviewsModel = require("../models/reviews.model");
const { normalizePaymentPlan, calculatePaymentQuote } = require("../utils/paymentQuote.util");
const crypto = require("node:crypto");

const redlock = new Redlock([redis], {
  retryCount: 3,       // thử lại 3 lần nếu lock đang bị giữ
  retryDelay: 200,     // chờ 200ms giữa mỗi lần thử
  retryJitter: 50,     // jitter ngẫu nhiên để tránh thundering herd
});

const activeStatus = ["pending", "confirmed"];
const allStatus = ["pending", "confirmed", "completed", "cancelled"];

// Trang thai duoc phep dat NGAY LUC TAO don. "completed"/"cancelled"
// chi den tu chuyen trang thai ve sau, khong bao gio tu client.
const creatableStatus = ["pending", "confirmed"];

// Chu don duoc tu huy. Cac chuyen trang thai con lai thuoc ve admin.
const guestAllowedStatus = ["cancelled"];
const attendanceStatuses = ["pending", "checked_in", "no_show"];
const newCheckInCode = () => crypto.randomBytes(4).toString("hex").toUpperCase();
const BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";
const businessDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const businessDateKey = (value = new Date()) => {
  const parts = Object.fromEntries(
    businessDateFormatter
      .formatToParts(new Date(value))
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const calculateCancellationQuote = (booking, now = new Date()) => {
  const paid = Number(booking.amount_paid) || 0;
  const checkInAt = new Date(booking.check_in).getTime();
  const hoursBeforeCheckIn = checkInAt <= now.getTime()
    ? 0
    : Math.floor((checkInAt - now.getTime()) / 3600000);
  const isFull = booking.payment_plan === "full_100";
  const refundRate = hoursBeforeCheckIn >= 168
    ? 100
    : hoursBeforeCheckIn >= 48
      ? (isFull ? 90 : 70)
      : hoursBeforeCheckIn > 0
        ? (isFull ? 70 : 50)
        : 0;
  return {
    refund_amount: Math.round((paid * refundRate) / 100),
    refund_rate: refundRate,
    hours_before_check_in: hoursBeforeCheckIn,
    processing: "manual",
  };
};

const ensureCheckInCodes = async (bookings) => {
  for (const booking of bookings) {
    if (!booking.check_in_code) {
      booking.check_in_code = newCheckInCode();
      await booking.save();
    }
  }
  return bookings;
};

const isOwner = (booking, user) =>
  String(booking.user_id?._id || booking.user_id) === String(user?.userId);

// Admin lam gi cung duoc; nguoi dung thuong chi thao tac tren don cua minh.
const assertOwnership = (booking, user) => {
  if (!user) throw new ForbiddenException("Vui long dang nhap de tiep tuc");
  if (user.role === "admin") return;
  if (!isOwner(booking, user)) {
    throw new ForbiddenException("Ban khong co quyen thao tac booking nay");
  }
};
const EDIT_LOCK_HOURS = 24;

const parseDate = (value, label) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${label} khong hop le`);
  }
  return date;
};

const calculateNights = (checkIn, checkOut) => {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const rawNights = Math.ceil((checkOut - checkIn) / millisecondsPerDay);
  return Math.max(1, rawNights);
};

const populateBooking = (query) =>
  query
    .populate("user_id", "full_name email avatar role")
    .populate({
      path: "property_id",
      populate: {
        path: "user_id",
        select: "full_name email avatar role",
      },
    })
    .populate("room_id");

const settleExpiredBookings = async (userId = null) => {
  // Dates are business dates. A stay only expires after its checkout date has
  // fully passed in Viet Nam, regardless of the server's local timezone.
  const todayBusinessDate = new Date(`${businessDateKey()}T00:00:00.000Z`);
  const query = {
    status: "confirmed",
    check_out: { $lt: todayBusinessDate },
    attendance_status: { $in: ["checked_in", "no_show"] },
  };
  if (userId) query.user_id = userId;
  const bookings = await bookingModel.find(query);
  for (const booking of bookings) {
    if (booking.attendance_status === "checked_in") {
      booking.status = "completed";
    } else {
      booking.status = "cancelled";
      booking.cancellation_reason = "no_show";
      booking.refund_amount = 0;
      booking.refund_rate = 0;
      booking.refund_status = "none";
    }
    await booking.save();

    const noShow = booking.attendance_status === "no_show";
    notificationsService.createInternal({
      userId: booking.user_id,
      type: "booking_status",
      event: noShow ? "no_show" : "completed",
      title: noShow ? "Đã hủy do không đến nhận phòng" : "Chuyến đi đã hoàn tất",
      body: noShow
        ? `Booking #${booking._id} đã hủy do không đến nhận phòng. Không hoàn tiền theo chính sách.`
        : `Booking #${booking._id} đã hoàn tất. Hãy để lại đánh giá của bạn nhé!`,
      titleEn: noShow ? "Cancelled due to no-show" : "Trip completed",
      bodyEn: noShow
        ? `Booking #${booking._id} was cancelled because the guest did not check in. No refund applies.`
        : `Booking #${booking._id} is complete. Please leave a review!`,
      refId: booking._id,
      refType: "Booking",
    }).catch(() => {});
  }
};

const getOverlappingBookedRooms = async ({
  roomId,
  checkIn,
  checkOut,
  excludeBookingId = null,
}) => {
  const query = {
    room_id: roomId,
    $or: [
      { status: "confirmed" },
      { status: "pending", payment_expires_at: { $gt: new Date() } },
    ],
    check_in: { $lt: checkOut },
    check_out: { $gt: checkIn },
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlappingBookings = await bookingModel.find(query).select("rooms_count");

  return overlappingBookings.reduce(
    (total, booking) => total + (Number(booking.rooms_count) || 0),
    0,
  );
};

const validateDateRange = (checkIn, checkOut) => {
  if (businessDateKey(checkIn) < businessDateKey()) {
    throw new BadRequestException("Ngay check_in khong duoc nho hon ngay hien tai");
  }

  if (checkOut <= checkIn) {
    throw new BadRequestException("Ngay check_out phai lon hon check_in");
  }
};

const acquireBookingLock = async (lockKey) => {
  try {
    return await redlock.acquire([lockKey], 5000);
  } catch (err) {
    console.warn("Booking lock skipped:", err.message);
    return null;
  }
};

const bookingService = {
  getCancellationQuote: async (bookingId, user) => {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) throw new BadRequestException("Booking khong ton tai");
    assertOwnership(booking, user);
    if (["cancelled", "completed"].includes(booking.status)) {
      throw new BadRequestException("Booking khong con co the huy");
    }
    return calculateCancellationQuote(booking);
  },
  settleExpiredBookings: async () => settleExpiredBookings(),
  getAll: async () => {
    await settleExpiredBookings();
    const bookings = await populateBooking(bookingModel.find());
    return ensureCheckInCodes(bookings);
  },
  getByUserId: async (userId) => {
    await settleExpiredBookings(userId);
    const bookings = await populateBooking(bookingModel.find({ user_id: userId }));
    return ensureCheckInCodes(bookings);
  },
  create: async (data) => {
    const { user_id, property_id, room_id, check_in, check_out } = data;
    if (!user_id || !property_id || !room_id || !check_in || !check_out) {
      throw new BadRequestException("Thieu thong tin bat buoc khi dat phong");
    }

    const room = await roomsModel.findById(room_id);
    if (!room) {
      throw new BadRequestException("Phong khong ton tai");
    }

    if (
      property_id &&
      room.property_id?.toString() !== property_id.toString()
    ) {
      throw new BadRequestException("Phong khong thuoc cho nghi da chon");
    }

    const roomsCount = Number(data.rooms_count) || 1;
    if (roomsCount < 1) {
      throw new BadRequestException("So luong phong khong hop le");
    }

    const checkInDate = parseDate(check_in, "Ngay check_in");
    const checkOutDate = parseDate(check_out, "Ngay check_out");
    validateDateRange(checkInDate, checkOutDate);

    // Distributed Lock: chỉ 1 request xử lý tại một thời điểm cho cùng phòng + ngày
    const lockKey = `lock:room:${room._id}:${checkInDate.toISOString()}:${checkOutDate.toISOString()}`;
    let lock;
    try {
      lock = await acquireBookingLock(lockKey); // giữ lock tối đa 5 giây
    } catch {
      throw new BadRequestException("Hệ thống đang xử lý yêu cầu khác cho phòng này. Vui lòng thử lại.");
    }

    try {
      const bookedRooms = await getOverlappingBookedRooms({
        roomId: room._id,
        checkIn: checkInDate,
        checkOut: checkOutDate,
      });
      const availableRooms = (Number(room.quantity) || 0) - bookedRooms;

      if (availableRooms < roomsCount) {
        throw new BadRequestException("So luong phong khong du");
      }

      const nights = calculateNights(checkInDate, checkOutDate);
      const pricePerNight = Number(room.price) || 0;
      const totalPrice = pricePerNight * nights * roomsCount;
      const maxGuests = (Number(room.capacity) || 1) * roomsCount;

      const requestGuests = Number(data.guests);
      const guests =
        Number.isFinite(requestGuests) && requestGuests > 0
          ? requestGuests
          : maxGuests;

      if (guests > maxGuests) {
        throw new BadRequestException("So khach vuot qua suc chua phong");
      }

      // Khi tao moi chi cho phep pending hoac confirmed. Truoc day
      // `allStatus.includes(...)` cho phep client tao thang mot booking
      // da "completed" hoac "cancelled".
      // Booking luon cho thanh toan. PayOS webhook moi duoc quyen confirm.
      const status = "pending";
      const paymentPlan = normalizePaymentPlan(data.payment_plan);
      const paymentQuote = calculatePaymentQuote(paymentPlan, totalPrice);

      const booking = await bookingModel.create({
        user_id,
        property_id,
        room_id,
        check_in: checkInDate,
        check_out: checkOutDate,
        guests,
        rooms_count: roomsCount,
        nights: nights,
        price_per_night: pricePerNight,
        total_price: totalPrice,
        status,
        payment_status: "pending",
        payment_expires_at: new Date(Date.now() + 15 * 60 * 1000),
        payment_plan: paymentPlan,
        amount_paid: 0,
        remaining_at_hotel: paymentQuote.remaining,
        check_in_code: newCheckInCode(),
      });

      // Tao thong bao khi dat phong. Truoc day chi co thong bao luc doi
      // trang thai (xac nhan/hoan tat/huy), con luc DAT thi khong co gi.
      notificationsService.createInternal({
        userId: booking.user_id,
        type: "booking_status",
        event: "awaiting_payment",
        title: "Booking đang chờ thanh toán",
        body: `Booking #${booking._id} đã được giữ trong 15 phút. Vui lòng hoàn tất thanh toán PayOS.`,
        titleEn: "Booking awaiting payment",
        bodyEn: `Booking #${booking._id} is held for 15 minutes. Please complete the PayOS payment.`,
        refId: booking._id,
        refType: "Booking",
      }).catch(() => {}); // fire-and-forget, khong chan response

      return await populateBooking(bookingModel.findById(booking._id));
    } finally {
      // Luôn giải phóng lock dù thành công hay lỗi
      if (lock) await lock.release();
    }
  },
  updateStatus: async (bookingId, status, user, extra = {}) => {
    const booking = await bookingModel.findById(bookingId);

    if (!booking) {
      throw new BadRequestException("Booking khong ton tai");
    }

    assertOwnership(booking, user);

    const room = await roomsModel.findById(booking.room_id);

    if (!room) {
      throw new BadRequestException("Phong khong ton tai");
    }

    if (!allStatus.includes(status)) {
      throw new BadRequestException("Trang thai booking khong hop le");
    }

    if (status === "confirmed" && booking.payment_status !== "paid") {
      throw new BadRequestException("Khong the xac nhan booking chua thanh toan");
    }
    if (booking.status === "confirmed" && status === "pending") {
      throw new BadRequestException("Khong the dua booking da xac nhan ve cho thanh toan");
    }

    // Chu don chi duoc tu huy. Xac nhan/hoan tat la viec cua he thong.
    if (user?.role !== "admin" && !guestAllowedStatus.includes(status)) {
      throw new ForbiddenException("Ban chi co the huy booking cua minh");
    }

    if (booking.status === "cancelled") {
      throw new BadRequestException("Booking nay da bi huy truoc do");
    }
    if (booking.status === "completed") {
      throw new BadRequestException("Khong the thay doi booking da hoan tat");
    }
    if (
      status === "completed" &&
      (booking.attendance_status !== "checked_in" || businessDateKey(booking.check_out) >= businessDateKey())
    ) {
      throw new BadRequestException("Chi hoan tat sau checkout khi khach da nhan phong");
    }

    if (!activeStatus.includes(booking.status) && activeStatus.includes(status)) {
      const bookedRooms = await getOverlappingBookedRooms({
        roomId: room._id,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        excludeBookingId: booking._id,
      });
      const availableRooms = (Number(room.quantity) || 0) - bookedRooms;

      if (availableRooms < booking.rooms_count) {
        throw new BadRequestException("So luong phong khong du");
      }
    }

    booking.status = status;

    // Khi huy: luu so tien hoan (fake) do client tinh theo ma tran, danh dau
    // payment_status = refunded neu co hoan.
    if (status === "cancelled") {
      booking.cancellation_reason = user?.role === "admin" ? "admin_cancelled" : "guest_cancelled";
      const quote = calculateCancellationQuote(booking);
      booking.refund_amount = quote.refund_amount;
      booking.refund_rate = quote.refund_rate;
      if (booking.payment_status === "paid" && quote.refund_amount > 0) {
        booking.refund_status = "pending_manual";
      }
    }

    await booking.save();

    const formatVnd = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;
    const cancelBody =
      booking.refund_amount > 0
        ? `Booking #${booking._id} đã hủy. Yêu cầu hoàn ${formatVnd(booking.refund_amount)} (${booking.refund_rate}%) đang chờ xử lý thủ công.`
        : `Booking #${booking._id} đã hủy. Không có khoản hoàn theo chính sách.`;
    const cancelBodyEn =
      booking.refund_amount > 0
        ? `Booking #${booking._id} was cancelled. The ${formatVnd(booking.refund_amount)} refund request (${booking.refund_rate}%) is awaiting manual processing.`
        : `Booking #${booking._id} was cancelled. No refund applies under the policy.`;

    // Tự động tạo thông báo cho user khi trạng thái booking thay đổi
    const statusMessages = {
      confirmed: { title: "Booking đã được xác nhận! 🎉", body: `Booking #${booking._id} của bạn đã được xác nhận thành công.`, titleEn: "Booking confirmed! 🎉", bodyEn: `Booking #${booking._id} has been confirmed successfully.` },
      completed:  { title: "Chúc bạn có chuyến đi vui vẻ! ✈️", body: `Booking #${booking._id} đã hoàn thành. Hãy để lại đánh giá của bạn nhé!`, titleEn: "We hope you enjoyed your stay! ✈️", bodyEn: `Booking #${booking._id} is complete. Please leave a review!` },
      cancelled:  { title: "Đã hủy đặt phòng", body: cancelBody, titleEn: "Booking cancelled", bodyEn: cancelBodyEn },
      pending:    { title: "Booking đang chờ xác nhận ⏳", body: `Booking #${booking._id} đang được xử lý.`, titleEn: "Booking awaiting confirmation ⏳", bodyEn: `Booking #${booking._id} is being processed.` },
    };
    const msg = statusMessages[status];
    if (msg) {
      notificationsService.createInternal({
        userId: booking.user_id,
        type: "booking_status",
        event: status === "confirmed"
          ? (booking.payment_plan === "deposit_30" ? "deposit_paid" : "paid_in_full")
          : status,
        title: msg.title,
        body: msg.body,
        titleEn: msg.titleEn,
        bodyEn: msg.bodyEn,
        refId: booking._id,
        refType: "Booking",
      }).catch(() => {}); // fire-and-forget, không block response
    }

    return await populateBooking(bookingModel.findById(booking._id));
  },

  updateAttendance: async (bookingId, attendanceStatus, note, user) => {
    if (user?.role !== "admin") {
      throw new ForbiddenException("Chi admin duoc xac nhan trang thai nhan phong");
    }
    if (!attendanceStatuses.includes(attendanceStatus)) {
      throw new BadRequestException("Trang thai nhan phong khong hop le");
    }

    const booking = await bookingModel.findById(bookingId);
    if (!booking) throw new BadRequestException("Booking khong ton tai");
    if (booking.status === "cancelled" || booking.status === "completed") {
      throw new BadRequestException("Khong the thay doi booking da ket thuc");
    }
    if (booking.status !== "confirmed") {
      throw new BadRequestException("Booking phai duoc xac nhan thanh toan truoc");
    }

    const today = businessDateKey();
    if (today < businessDateKey(booking.check_in) || today > businessDateKey(booking.check_out)) {
      throw new BadRequestException("Chi duoc cap nhat nhan phong trong thoi gian luu tru");
    }

    booking.attendance_status = attendanceStatus;
    booking.attendance_note = String(note || "").trim();
    booking.attendance_confirmed_at = attendanceStatus === "pending" ? null : new Date();
    booking.attendance_confirmed_by = attendanceStatus === "pending" ? null : user.userId;
    await booking.save();

    if (attendanceStatus !== "pending") {
      const checkedIn = attendanceStatus === "checked_in";
      notificationsService.createInternal({
        userId: booking.user_id,
        type: "booking_status",
        event: checkedIn ? "checked_in" : "no_show",
        title: checkedIn ? "Đã xác nhận nhận phòng" : "Ghi nhận không đến nhận phòng",
        body: checkedIn
          ? `Booking #${booking._id}: khách sạn đã xác nhận bạn nhận phòng.`
          : `Booking #${booking._id}: khách sạn ghi nhận bạn không đến nhận phòng. Booking sẽ bị hủy sau checkout và không hoàn tiền.`,
        titleEn: checkedIn ? "Check-in confirmed" : "No-show recorded",
        bodyEn: checkedIn
          ? `Booking #${booking._id}: the property confirmed your check-in.`
          : `Booking #${booking._id}: the property recorded a no-show. The booking will be cancelled after checkout with no refund.`,
        refId: booking._id,
        refType: "Booking",
      }).catch(() => {});
    }
    await settleExpiredBookings(String(booking.user_id));
    return await populateBooking(bookingModel.findById(booking._id));
  },
  findByCheckInCode: async (code, user) => {
    if (user?.role !== "admin") throw new ForbiddenException("Chi admin duoc tra cuu ma nhan phong");
    const normalized = String(code || "").replace(/^STAYZ-CHECKIN:/i, "").trim().toUpperCase();
    if (!/^[A-F0-9]{8}$/.test(normalized)) throw new BadRequestException("Ma nhan phong khong hop le");
    const booking = await populateBooking(bookingModel.findOne({ check_in_code: normalized }));
    if (!booking) throw new BadRequestException("Khong tim thay booking theo ma nhan phong");
    return booking;
  },
  update: async (bookingId, data, user) => {
    const booking = await bookingModel.findById(bookingId);

    if (!booking) {
      throw new BadRequestException("Booking khong ton tai");
    }

    assertOwnership(booking, user);

    if (["cancelled", "completed"].includes(booking.status)) {
      throw new BadRequestException("Khong the chinh sua booking da ket thuc");
    }

    const now = new Date();
    const editDeadline = new Date(booking.check_in);
    editDeadline.setHours(editDeadline.getHours() - EDIT_LOCK_HOURS);
    if (user?.role !== "admin" && now > editDeadline) {
      throw new BadRequestException("Chi duoc chinh sua booking truoc check-in it nhat 24 gio");
    }

    const nextRoomId = data.room_id || booking.room_id.toString();
    const nextRoomsCount = Number(data.rooms_count ?? booking.rooms_count);
    const nextStatus = data.status || booking.status;
    if (!allStatus.includes(nextStatus)) {
      throw new BadRequestException("Trang thai booking khong hop le");
    }
    if (user?.role !== "admin") {
      if (data.user_id != null && String(data.user_id) !== String(booking.user_id)) {
        throw new ForbiddenException("Ban khong the chuyen booking cho tai khoan khac");
      }
      if (nextStatus !== booking.status && nextStatus !== "cancelled") {
        throw new ForbiddenException("Ban chi co the huy booking cua minh");
      }
    }
    if (
      nextStatus === "completed" &&
      (booking.attendance_status !== "checked_in" || businessDateKey(booking.check_out) >= businessDateKey())
    ) {
      throw new BadRequestException("Chi hoan tat sau checkout khi khach da nhan phong");
    }
    if (nextStatus === "confirmed" && booking.payment_status !== "paid") {
      throw new BadRequestException("Khong the xac nhan booking chua thanh toan");
    }
    if (booking.status === "confirmed" && nextStatus === "pending") {
      throw new BadRequestException("Khong the dua booking da xac nhan ve cho thanh toan");
    }

    if (booking.payment_status === "paid") {
      const changesPaidContract =
        (data.user_id != null && String(data.user_id) !== String(booking.user_id)) ||
        (data.property_id != null && String(data.property_id) !== String(booking.property_id)) ||
        (data.room_id != null && String(data.room_id) !== String(booking.room_id)) ||
        (data.check_in != null && new Date(data.check_in).getTime() !== new Date(booking.check_in).getTime()) ||
        (data.check_out != null && new Date(data.check_out).getTime() !== new Date(booking.check_out).getTime()) ||
        (data.rooms_count != null && Number(data.rooms_count) !== Number(booking.rooms_count)) ||
        (data.guests != null && Number(data.guests) !== Number(booking.guests));
      if (changesPaidContract) {
        throw new BadRequestException(
          "Khong the thay doi khach, phong, ngay hoac so luong cua booking da thanh toan",
        );
      }
    }

    const currentRoom = await roomsModel.findById(booking.room_id);
    const nextRoom = await roomsModel.findById(nextRoomId);

    if (!currentRoom || !nextRoom) {
      throw new BadRequestException("Phong khong ton tai");
    }

    if (nextRoomsCount < 1) {
      throw new BadRequestException("So luong phong khong hop le");
    }

    const nextPropertyId = data.property_id || booking.property_id;
    if (
      nextPropertyId &&
      nextRoom.property_id?.toString() !== nextPropertyId.toString()
    ) {
      throw new BadRequestException("Phong khong thuoc cho nghi da chon");
    }

    const nextCheckIn = parseDate(data.check_in || booking.check_in, "Ngay check_in");
    const nextCheckOut = parseDate(
      data.check_out || booking.check_out,
      "Ngay check_out",
    );
    validateDateRange(nextCheckIn, nextCheckOut);

    if (activeStatus.includes(nextStatus)) {
      const bookedRooms = await getOverlappingBookedRooms({
        roomId: nextRoom._id,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        excludeBookingId: booking._id,
      });
      const availableRooms = (Number(nextRoom.quantity) || 0) - bookedRooms;

      if (availableRooms < nextRoomsCount) {
        throw new BadRequestException("So luong phong khong du");
      }
    }

    const nights = calculateNights(nextCheckIn, nextCheckOut);
    const pricePerNight = Number(nextRoom.price) || 0;
    const totalPrice = pricePerNight * nights * nextRoomsCount;
    const maxGuests = (Number(nextRoom.capacity) || 1) * nextRoomsCount;

    const requestedGuests = Number(data.guests ?? booking.guests);
    const guests =
      Number.isFinite(requestedGuests) && requestedGuests > 0
        ? requestedGuests
        : maxGuests;

    if (guests > maxGuests) {
      throw new BadRequestException("So khach vuot qua suc chua phong");
    }

    if (user?.role === "admin" && data.user_id) booking.user_id = data.user_id;
    booking.property_id = nextPropertyId;
    booking.room_id = nextRoomId;
    booking.check_in = nextCheckIn;
    booking.check_out = nextCheckOut;
    booking.guests = guests;
    booking.rooms_count = nextRoomsCount;
    booking.nights = nights;
    booking.price_per_night = pricePerNight;
    booking.total_price = totalPrice;
    booking.status = nextStatus;

    await booking.save();

    return await populateBooking(bookingModel.findById(bookingId));
  },
  delete: async (bookingId, user) => {
    const booking = await bookingModel.findById(bookingId);

    if (!booking) {
      throw new BadRequestException("Booking khong ton tai");
    }

    assertOwnership(booking, user);

    const [hasPayment, hasReview] = await Promise.all([
      paymentsModel.exists({ booking_id: bookingId }),
      reviewsModel.exists({ booking_id: bookingId }),
    ]);
    if (hasPayment || hasReview || booking.payment_status === "paid") {
      throw new BadRequestException(
        "Booking da co thanh toan hoac danh gia; hay huy va luu lich su thay vi xoa",
      );
    }

    return await bookingModel.findByIdAndDelete(bookingId);
  },
};

module.exports = bookingService;
