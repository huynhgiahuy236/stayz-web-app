const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    property_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
  },
  { timestamps: true },
);

// Đảm bảo mỗi user chỉ có 1 bản ghi yêu thích cho mỗi property
favoriteSchema.index({ user_id: 1, property_id: 1 }, { unique: true });

module.exports = mongoose.model("Favorite", favoriteSchema);
