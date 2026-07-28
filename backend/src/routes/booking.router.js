const express = require("express");

const bookingController = require("../controllers/booking.controller");
const protect = require("../middlewares/protect.middleware");
const adminAudit = require("../middlewares/adminAudit.middleware");
const bookingRouter = express.Router();

// Truoc day nhom route nay khong co protect va tin user_id gui tu client,
// nen bat ky ai cung xem/huy duoc booking cua nguoi khac.
bookingRouter.use(protect, adminAudit);

bookingRouter.get("/getAll", bookingController.getAll);
bookingRouter.get("/user/:userId", bookingController.getByUserId);
bookingRouter.get("/:bookingId/cancellation-quote", bookingController.getCancellationQuote);
bookingRouter.post("/create", bookingController.create);
bookingRouter.put("/update/:bookingId", bookingController.update);
bookingRouter.delete("/delete/:bookingId", bookingController.delete);
bookingRouter.patch("/:bookingId/status", bookingController.updateStatus);
bookingRouter.patch("/:bookingId/attendance", bookingController.updateAttendance);
bookingRouter.get("/admin/check-in/:code", bookingController.findByCheckInCode);

module.exports = bookingRouter;
