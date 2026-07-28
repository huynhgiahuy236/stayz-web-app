const express = require("express");
const userController = require("../controllers/users.controller");

const protect = require("../middlewares/protect.middleware");
const adminOnly = require("../middlewares/admin.middleware");
const uploadLocalMiddleware = require("../middlewares/uploadLocal.middleware");
const uploadCloud = require("../middlewares/uploadCloud.middleware");
const { rateLimiter } = require("../middlewares/rateLimit.middleware");
const adminAudit = require("../middlewares/adminAudit.middleware");
const userRouter = express.Router();

userRouter.get("/admin/audit", protect, adminOnly, userController.getAdminAudit);
userRouter.get("/getAll", protect, adminOnly, userController.getAll);
userRouter.get("/getById/:id", protect, userController.getById);
userRouter.delete("/delete/:id", protect, adminOnly, userController.delete);
userRouter.patch("/update/:id", protect, adminAudit, userController.update);
// Rate limit: đăng ký tối đa 5 lần / 15 phút, chặn spam tạo tài khoản
userRouter.post("/create", rateLimiter(5, 900), userController.create);
userRouter.post("/admin/create", protect, adminOnly, userController.createByAdmin);

// Rate limit: login tối đa 5 lần / 60 giây
userRouter.post("/login", rateLimiter(5, 60), userController.login);
userRouter.post("/refresh-token", userController.refreshAccessToken);
userRouter.post("/logout", userController.logout);
userRouter.post("/request-register-otp", rateLimiter(3, 900), userController.requestRegisterOtp);
userRouter.post("/verify-register-otp", rateLimiter(5, 900), userController.verifyRegisterOtp);

// Rate limit: reset password tối đa 3 lần / 15 phút
userRouter.post("/request-password-reset", rateLimiter(3, 900), userController.requestPasswordReset);
// Mã OTP chỉ có 6 chữ số: không giới hạn thì dò hết trong vài phút.
userRouter.post("/verify-reset-code", rateLimiter(5, 900), userController.verifyPasswordResetCode);
userRouter.post("/reset-password", rateLimiter(3, 900), userController.resetPasswordWithCode);

userRouter.patch(
  "/avatar/local",
  protect,
  uploadLocalMiddleware.single("avatar"),
  userController.uploadLocal,
);
userRouter.patch(
  "/avatar/cloud",
  protect,
  uploadCloud.single("avatar"),
  userController.uploadCloud,
);
userRouter.patch(
  "/avatar/cloud/:id",
  protect,
  adminAudit,
  uploadCloud.single("avatar"),
  userController.uploadCloud,
);
module.exports = userRouter;
