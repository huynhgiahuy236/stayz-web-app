const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
  {
    title: String,
    slug: { type: String, unique: true },

    address: String,
    city: {
      type: String,
      enum: ["da-lat", "da-nang", "ha-noi", "ho-chi-minh", "vung-tau"],
    },
    country: String,
    latitude: {
      type: Number,
      default: 0,
    },
    longitude: {
      type: Number,
      default: 0,
    },

    type: {
      type: String,
      enum: ["hotel", "resort", "villa", "hostel", "apartment", "business"],
      default: "hotel",
    },
    base_price: Number,
    description: String,
    // English copy is stored separately so the API never guesses or
    // machine-translates factual hotel information at display time.
    description_en: { type: String, default: "", trim: true },

    // Chuoi da bo dau, chu thuong: dung cho tim kiem khong dau va go sai chinh ta.
    search_index: {
      type: String,
      default: "",
      index: true,
    },
    amenities: {
      outdoor_pool: Boolean,
      free_wifi: Boolean,
      airport_shuttle: Boolean,
      non_smoking_room: Boolean,
      room_service: Boolean,
      restaurant: Boolean,
      free_parking: Boolean,
      family_room: Boolean,
      bar: Boolean,
      breakfast: Boolean,
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
    is_preferred: Boolean,
    is_active: { type: Boolean, default: true, index: true },

    max_stay_days: {
      type: Number,
      default: 30,
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Property", propertySchema);
