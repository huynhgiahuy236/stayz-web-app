const jwt = require("jsonwebtoken");
const { SECRET } = require("../constants/app.constant");
const { UnauthorizedError } = require("../helpers/error.helper");
const redis = require("../config/redis.config");
const usersModel = require("../models/users.model");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!accessToken) {
      throw new UnauthorizedError("Vui lòng cung cấp token để tiếp tục");
    }

    // Kiểm tra token có bị blacklist (đã logout) chưa
    const isBlacklisted = await redis.get(`blacklist:${accessToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedError("Token đã bị thu hồi. Vui lòng đăng nhập lại");
    }

    const decoded = jwt.verify(accessToken, SECRET);

    // Always resolve the current account and role. A deleted or demoted admin
    // must lose access immediately instead of retaining JWT privileges for 24h.
    const currentUser = await usersModel.findById(decoded.userId).select("role is_active");
    if (!currentUser || currentUser.is_active === false) {
      throw new UnauthorizedError("Tai khoan khong con ton tai");
    }

    req.user = {
      userId: String(currentUser._id),
      role: currentUser.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = protect;
