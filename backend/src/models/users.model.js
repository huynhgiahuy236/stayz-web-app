const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: String,
    full_name: String,
    phone_number: {
      type: String,
      default: "",
    },
    gender: {
      type: String,
      enum: ["", "male", "female", "other"],
      default: "",
    },
    home_address: {
      type: String,
      default: "",
    },
    date_of_birth: {
      type: Date,
      default: null,
    },
    avatar: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    is_active: { type: Boolean, default: true, index: true },
    reset_password: {
      code_hash: {
        type: String,
        default: "",
      },
      expires_at: {
        type: Date,
        default: null,
      },
      requested_at: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true },
);

userSchema.index(
  { phone_number: 1 },
  { unique: true, partialFilterExpression: { phone_number: { $type: "string", $gt: "" } } },
);

module.exports = mongoose.model("User", userSchema);
