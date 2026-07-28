const adminAuditModel = require("../models/adminAudit.model");

const redact = (value) => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(redact);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      /password|token|secret|code/i.test(key) ? "[REDACTED]" : redact(item),
    ]),
  );
};

const adminAudit = async (req, res, next) => {
  if (req.user?.role !== "admin" || ["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  try {
    // Persist the audit intent before executing the sensitive operation. If
    // audit storage is unavailable, the admin mutation is not allowed through.
    const audit = await adminAuditModel.create({
      admin_id: req.user.userId,
      method: req.method,
      path: req.originalUrl,
      status_code: 0,
      target: redact(req.params || {}),
      changes: redact(req.body || {}),
      ip_address: req.ip || req.socket?.remoteAddress || "",
    });

    res.once("finish", () => {
      adminAuditModel
        .findByIdAndUpdate(audit._id, { status_code: res.statusCode })
        .catch((error) => console.error("Admin audit status update error:", error.message));
    });

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = adminAudit;
