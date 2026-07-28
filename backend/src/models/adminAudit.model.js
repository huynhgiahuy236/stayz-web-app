const mongoose = require("mongoose");

const adminAuditSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    method: { type: String, required: true },
    path: { type: String, required: true },
    status_code: { type: Number, required: true },
    target: { type: Object, default: {} },
    changes: { type: Object, default: {} },
    ip_address: { type: String, default: "" },
  },
  { timestamps: true },
);

adminAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminAudit", adminAuditSchema);
