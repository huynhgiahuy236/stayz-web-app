const { ForbiddenException } = require("../helpers/error.helper");
const adminAudit = require("./adminAudit.middleware");

const adminOnly = (req, _res, next) => {
  if (req.user?.role !== "admin") {
    return next(new ForbiddenException("Chỉ quản trị viên mới được thực hiện thao tác này"));
  }
  return adminAudit(req, _res, next);
};

module.exports = adminOnly;
