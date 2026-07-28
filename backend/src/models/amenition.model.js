const mongoose = require("mongoose");

const amenitionSchema = new mongoose.Schema(
  {
    property_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    name: {
      type: String,
      trim: true,
      required: true,
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      default: "general",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Amenition", amenitionSchema);
