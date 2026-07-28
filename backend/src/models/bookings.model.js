const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
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

    room_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },

    check_in: {
      type: Date,
      required: true,
    },

    check_out: {
      type: Date,
      required: true,
    },

    guests: {
      type: Number,
      required: true,
      min: 1,
    },

    rooms_count: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    nights: {
      type: Number,
      required: true,
      min: 1,
    },

    price_per_night: {
      type: Number,
      required: true,
    },

    total_price: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    payment_status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },

    // Thanh toan mo phong (fake): phuong an + so tien.
    payment_plan: {
      type: String,
      enum: ["deposit_30", "full_100", ""],
      default: "",
    },
    amount_paid: { type: Number, default: 0 },
    remaining_at_hotel: { type: Number, default: 0 },

    // Hoan tien khi huy (fake): so tien va ti le da ap dung.
    refund_amount: { type: Number, default: 0 },
    refund_rate: { type: Number, default: 0 },
    refund_status: {
      type: String,
      enum: ["none", "pending_manual", "completed", "failed"],
      default: "none",
    },
    payment_expires_at: { type: Date, default: null },
    attendance_status: {
      type: String,
      enum: ["pending", "checked_in", "no_show"],
      default: "pending",
    },
    attendance_note: { type: String, trim: true, default: "" },
    attendance_confirmed_at: { type: Date, default: null },
    attendance_confirmed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancellation_reason: {
      type: String,
      enum: ["", "guest_cancelled", "admin_cancelled", "no_show"],
      default: "",
    },
    check_in_code: { type: String, uppercase: true, trim: true, unique: true, sparse: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

bookingSchema.virtual("check_in_date").get(function () {
  return this.check_in;
});

bookingSchema.virtual("check_out_date").get(function () {
  return this.check_out;
});

bookingSchema.virtual("guest_count").get(function () {
  return this.guests;
});

bookingSchema.virtual("room_quantity").get(function () {
  return this.rooms_count;
});

module.exports = mongoose.model("Booking", bookingSchema);
