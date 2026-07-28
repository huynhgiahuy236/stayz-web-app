const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    booking_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order_code: {
      type: Number,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "PAID", "CANCELLED"],
      default: "pending",
    },
    payment_link_id: {
      type: String,
    },
    checkout_url: {
      type: String,
    },
    qr_code: String,
    qr_image_url: String,
    bank_bin: String,
    account_number: String,
    account_name: String,
    transfer_description: String,
    currency: { type: String, default: "VND" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
