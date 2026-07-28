const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    property_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    room_type: {
      type: String,
      enum: ["standard_room", "deluxe_room", "suite"],
      required: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },
    description_en: {
      type: String,
      default: "",
      trim: true,
    },

    // Giá hiện tại sau khi giảm
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Giá gốc trước khi giảm
    original_price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Phần trăm giảm
    discount_percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 0,
    },

    main_image_url: {
      type: String,
      default: "",
    },

    main_image_public_id: {
      type: String,
      default: "",
    },

    gallery_images: [
      {
        url: { type: String, default: "" },
        public_id: { type: String, default: "" },
      },
    ],

    is_active: {
      type: Boolean,
      default: true,
    },

    bed_info: {
      type: String,
      required: true,
      trim: true,
    },

    area: {
      type: Number,
      default: 0,
      min: 0,
    },

    view: {
      type: String,
      default: "",
      trim: true,
    },

    badges: {
      balcony: { type: Boolean, default: false },
      air_conditioning: { type: Boolean, default: false },
      private_bathroom: { type: Boolean, default: false },
      terrace: { type: Boolean, default: false },
      free_wifi: { type: Boolean, default: false },
      garden_view: { type: Boolean, default: false },
      courtyard_view: { type: Boolean, default: false },
    },

    amenities: {
      toiletries: { type: Boolean, default: false },
      shower: { type: Boolean, default: false },
      toilet: { type: Boolean, default: false },
      towels: { type: Boolean, default: false },
      socket_near_bed: { type: Boolean, default: false },
      sitting_area: { type: Boolean, default: false },
      private_entrance: { type: Boolean, default: false },
      slippers: { type: Boolean, default: false },
      hair_dryer: { type: Boolean, default: false },
      fan: { type: Boolean, default: false },
      electric_kettle: { type: Boolean, default: false },
      wardrobe: { type: Boolean, default: false },
      clothes_rack: { type: Boolean, default: false },
      toilet_paper: { type: Boolean, default: false },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

roomSchema.virtual("price_per_night").get(function () {
  return this.price;
});

roomSchema.virtual("available_rooms").get(function () {
  return this.quantity;
});

module.exports = mongoose.model("Room", roomSchema);
