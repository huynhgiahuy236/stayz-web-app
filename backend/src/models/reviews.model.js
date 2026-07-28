const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    property_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },

    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    rating: Number,
    comment: String,
  },
  { timestamps: true },
);

reviewSchema.index(
  { user_id: 1, booking_id: 1 },
  { unique: true, partialFilterExpression: { booking_id: { $exists: true } } },
);

module.exports = mongoose.model("Review", reviewSchema);
