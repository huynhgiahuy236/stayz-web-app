const { responseSuccess } = require("../helpers/response.helper");
const userService = require("../services/users.service");
const adminAuditModel = require("../models/adminAudit.model");

const buildRefreshCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax",
  secure: false,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
});

const userController = {
  getAdminAudit: async (req, res, next) => {
    try {
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
      const data = await adminAuditModel
        .find()
        .populate("admin_id", "full_name email role")
        .sort({ createdAt: -1 })
        .limit(limit);
      const response = responseSuccess(data, "Lay nhat ky quan tri thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getAll: async (req, res, next) => {
    try {
      const data = await userService.getAll();
      const response = responseSuccess(data, "Lay danh sach user thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  getById: async (req, res, next) => {
    const id = req.params.id;
    try {
      if (req.user?.userId !== id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Ban khong co quyen xem tai khoan nay" });
      }
      const data = await userService.getById(id);
      const response = responseSuccess(data, "Lay user theo id thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  delete: async (req, res, next) => {
    const id = req.params.id;
    try {
      const data = await userService.delete(id, req.user);
      const response = responseSuccess(data, "Xoa user thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  update: async (req, res, next) => {
    const id = req.params.id;
    const payload = req.body;
    try {
      if (req.user?.userId !== id && req.user?.role !== "admin") {
        return res.status(403).json({ message: "Ban khong co quyen cap nhat tai khoan nay" });
      }
      const safePayload = req.user?.role === "admin"
        ? payload
        : Object.fromEntries(
            Object.entries(payload).filter(([key]) => key !== "role"),
          );
      const data = await userService.update(id, safePayload, req.user);
      const response = responseSuccess(data, "Cap nhat user thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  create: async (req, res, next) => {
    const newUser = req.body;
    try {
      const data = await userService.create(newUser);
      const response = responseSuccess(data, "Tao user thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  createByAdmin: async (req, res, next) => {
    try {
      const data = await userService.createByAdmin(req.body);
      const response = responseSuccess(data, "Tạo tài khoản thành công", 201);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  login: async (req, res, next) => {
    const user = req.body;
    try {
      const data = await userService.login(user);
      res.cookie("refreshToken", data.refreshToken, buildRefreshCookieOptions());
      const response = responseSuccess(
        {
          accessToken: data.accessToken,
          user: data.user,
        },
        "Dang nhap thanh cong",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  refreshAccessToken: async (req, res, next) => {
    try {
      const data = await userService.refreshAccessToken(req);
      const response = responseSuccess(
        data,
        "Lay access token moi thanh cong",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  logout: async (req, res, next) => {
    try {
      const data = await userService.logout(req);
      res.clearCookie("refreshToken", buildRefreshCookieOptions());
      const response = responseSuccess(data, "Dang xuat thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  requestPasswordReset: async (req, res, next) => {
    try {
      const data = await userService.requestPasswordReset(req.body.email);
      const response = responseSuccess(
        data,
        "Neu email ton tai trong he thong, ma xac thuc da duoc gui",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  requestRegisterOtp: async (req, res, next) => {
    try {
      const data = await userService.requestRegisterOtp(req.body.email);
      const response = responseSuccess(data, "Ma xac thuc dang ky da duoc gui", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  verifyRegisterOtp: async (req, res, next) => {
    try {
      const data = await userService.verifyRegisterOtp(req.body);
      const response = responseSuccess(data, "Xac thuc ma dang ky thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  verifyPasswordResetCode: async (req, res, next) => {
    try {
      const data = await userService.verifyPasswordResetCode(req.body);
      const response = responseSuccess(
        data,
        "Xac thuc ma khoi phuc thanh cong",
        200,
      );
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  resetPasswordWithCode: async (req, res, next) => {
    try {
      const data = await userService.resetPasswordWithCode(req.body);
      const response = responseSuccess(data, "Doi mat khau moi thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  uploadLocal: async (req, res, next) => {
    try {
      const data = await userService.uploadLocal(req);
      const response = responseSuccess(data, "Upload avatar local thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
  uploadCloud: async (req, res, next) => {
    try {
      const data = await userService.uploadCloud(req);
      const response = responseSuccess(data, "Upload avatar cloud thanh cong", 200);
      res.status(response.code).json(response);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userController;
