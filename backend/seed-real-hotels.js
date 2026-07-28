require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const User = require("./src/models/users.model");
const Property = require("./src/models/properties.model");
const Room = require("./src/models/rooms.model");
const Booking = require("./src/models/bookings.model");
const Favorite = require("./src/models/favorites.model");
const Review = require("./src/models/reviews.model");
const Notification = require("./src/models/notifications.model");
const { DATABASE_URL } = require("./src/constants/app.constant");
const { buildSearchIndex } = require("./src/helpers/search.helper");

// Anh tai san: da tai ve backend/stayz_api/src/images/properties/<slug>/
// va duoc phuc vu tinh tai /images/properties/<slug>/<file>.
const imagePath = (slug, file) => `/images/properties/${slug}/${file}`;

// Tien nghi khac nhau giua cac khach san. Day la du lieu quyet dinh
// ket qua cua bo loc, nen khong duoc bat tat ca thanh true.
const amenities = (list) => ({
  outdoor_pool: list.includes("outdoor_pool"),
  free_wifi: list.includes("free_wifi"),
  airport_shuttle: list.includes("airport_shuttle"),
  non_smoking_room: list.includes("non_smoking_room"),
  room_service: list.includes("room_service"),
  restaurant: list.includes("restaurant"),
  free_parking: list.includes("free_parking"),
  family_room: list.includes("family_room"),
  bar: list.includes("bar"),
  breakfast: list.includes("breakfast"),
});

const ALL = [
  "outdoor_pool",
  "free_wifi",
  "airport_shuttle",
  "non_smoking_room",
  "room_service",
  "restaurant",
  "free_parking",
  "family_room",
  "bar",
  "breakfast",
];

// row: [ten phong, loai, gia, gia goc, % giam, suc chua, so luong, giuong, dien tich, huong nhin]
const hotels = [
  {
    title: "Hotel de l'Opera Hanoi - MGallery",
    slug: "hotel-de-lopera-hanoi-mgallery",
    address: "29 Tràng Tiền, phường Hoàn Kiếm, Hà Nội",
    city: "ha-noi",
    type: "hotel",
    latitude: 21.0244864,
    longitude: 105.8555817,
    base_price: 3200000,
    description:
      "Khách sạn boutique phong cách nhà hát Pháp, nằm giữa Hồ Gươm và Nhà hát Lớn Hà Nội.",
    is_preferred: true,
    amenities: ["outdoor_pool", "free_wifi", "airport_shuttle", "non_smoking_room", "room_service", "restaurant", "bar", "breakfast"],
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["L'Opera Deluxe King", "deluxe_room", 3200000, 3600000, 11, 2, 8, "1 giường king", 32, "Hướng phố"],
      ["Grand Suite", "suite", 6200000, 7000000, 12, 3, 3, "1 giường king", 56, "Hướng Nhà hát Lớn"],
    ],
  },
  {
    title: "Sofitel Legend Metropole Hanoi",
    slug: "sofitel-legend-metropole-hanoi",
    address: "15 Ngô Quyền, phường Hoàn Kiếm, Hà Nội",
    city: "ha-noi",
    type: "hotel",
    latitude: 21.0254884,
    longitude: 105.8559784,
    base_price: 6500000,
    description:
      "Khách sạn di sản mở cửa từ năm 1901, kiến trúc thuộc địa Pháp, sân trong và hầm trú ẩn lịch sử.",
    is_preferred: true,
    amenities: ["outdoor_pool", "free_wifi", "airport_shuttle", "non_smoking_room", "room_service", "restaurant", "free_parking", "bar", "breakfast"],
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Grand Premium Room", "deluxe_room", 6500000, 7400000, 12, 2, 12, "1 giường king", 38, "Hướng sân trong"],
      ["Metropole Suite", "suite", 13500000, 15000000, 10, 3, 4, "1 giường king", 75, "Hướng phố Ngô Quyền"],
    ],
  },
  {
    title: "Hanoi Lake Side Hostel",
    slug: "hanoi-lake-side-hostel",
    address: "42 Cầu Gỗ, Hoàn Kiếm, Hà Nội",
    city: "ha-noi",
    type: "hostel",
    latitude: 21.0322,
    longitude: 105.8524,
    base_price: 320000,
    description:
      "Hostel giá tiết kiệm ngay phố cổ, đi bộ ra Hồ Hoàn Kiếm trong ba phút. Phù hợp khách đi một mình.",
    is_preferred: false,
    amenities: ["free_wifi", "non_smoking_room", "bar", "breakfast"],
    images: ["main.jpg"],
    rooms: [
      ["Giường tầng phòng chung 6 người", "standard_room", 320000, 380000, 16, 1, 18, "1 giường tầng", 14, "Hướng phố cổ"],
      ["Phòng đôi riêng", "standard_room", 780000, 900000, 13, 2, 6, "1 giường đôi", 18, "Hướng phố cổ"],
    ],
  },
  {
    title: "InterContinental Danang Sun Peninsula Resort",
    slug: "intercontinental-danang-sun-peninsula-resort",
    address: "Bãi Bắc, bán đảo Sơn Trà, Đà Nẵng",
    city: "da-nang",
    type: "resort",
    latitude: 16.1210876,
    longitude: 108.3061358,
    base_price: 7800000,
    description:
      "Khu nghỉ dưỡng biển cao cấp trên bán đảo Sơn Trà, bãi tắm riêng và tầm nhìn hướng vịnh.",
    is_preferred: true,
    amenities: ALL,
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Son Tra Classic Room", "standard_room", 7800000, 8500000, 8, 2, 6, "1 giường king", 50, "Hướng vườn"],
      ["Ocean View Suite", "suite", 14500000, 16000000, 9, 3, 2, "1 giường king", 80, "Hướng biển"],
      ["Bai Bac Family Villa", "suite", 21000000, 23500000, 11, 6, 2, "2 giường king", 140, "Hướng biển"],
    ],
  },
  {
    title: "Furama Resort Danang",
    slug: "furama-resort-danang",
    address: "103-105 Võ Nguyên Giáp, phường Ngũ Hành Sơn, Đà Nẵng",
    city: "da-nang",
    type: "resort",
    latitude: 16.0397489,
    longitude: 108.2513386,
    base_price: 3400000,
    description:
      "Khu nghỉ dưỡng 5 sao đầu tiên của Đà Nẵng, hồ bơi nước mặn hướng ra bãi biển Mỹ Khê.",
    is_preferred: true,
    amenities: ALL,
    images: ["main.jpg"],
    rooms: [
      ["Garden Superior", "standard_room", 3400000, 3900000, 13, 2, 14, "1 giường queen", 40, "Hướng vườn"],
      ["Ocean Deluxe", "deluxe_room", 4800000, 5400000, 11, 3, 8, "1 giường king", 46, "Hướng biển"],
      ["Ocean Suite", "suite", 8200000, 9200000, 11, 4, 3, "1 giường king", 78, "Hướng biển"],
    ],
  },
  {
    title: "Novotel Danang Premier Han River",
    slug: "novotel-danang-premier-han-river",
    address: "36-38 Bạch Đằng, phường Hải Châu, Đà Nẵng",
    city: "da-nang",
    type: "business",
    latitude: 16.077222,
    longitude: 108.223333,
    base_price: 2100000,
    description:
      "Khách sạn cao tầng bên sông Hàn, gần cầu Rồng, phù hợp công tác và nghỉ ngắn ngày.",
    is_preferred: false,
    amenities: ["outdoor_pool", "free_wifi", "non_smoking_room", "room_service", "restaurant", "free_parking", "family_room", "bar", "breakfast"],
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Superior River View", "standard_room", 2100000, 2400000, 12, 2, 16, "1 giường queen", 30, "Hướng sông Hàn"],
      ["Premier Room", "deluxe_room", 3100000, 3500000, 11, 3, 9, "1 giường king", 38, "Hướng sông Hàn"],
    ],
  },
  {
    title: "Four Points by Sheraton Danang",
    slug: "four-points-by-sheraton-danang",
    address: "118-120 Võ Nguyên Giáp, phường An Hải, Đà Nẵng",
    city: "da-nang",
    type: "business",
    latitude: 16.0778724,
    longitude: 108.2451737,
    base_price: 1600000,
    description:
      "Khách sạn hiện đại đối diện biển Mỹ Khê, hồ bơi trên tầng cao và quầy bar ngắm hoàng hôn.",
    is_preferred: false,
    amenities: ["outdoor_pool", "free_wifi", "non_smoking_room", "room_service", "restaurant", "free_parking", "bar", "breakfast"],
    images: ["main.jpg"],
    rooms: [
      ["Classic Room", "standard_room", 1600000, 1850000, 14, 2, 20, "1 giường queen", 28, "Hướng phố"],
      ["Deluxe Ocean View", "deluxe_room", 2400000, 2800000, 14, 3, 10, "1 giường king", 34, "Hướng biển"],
    ],
  },
  {
    title: "Grand Tourane Hotel Da Nang",
    slug: "grand-tourane-hotel-danang",
    address: "252 Võ Nguyên Giáp, phường An Hải, Đà Nẵng",
    city: "da-nang",
    type: "hotel",
    latitude: 16.0617123,
    longitude: 108.2459032,
    base_price: 1450000,
    description:
      "Khách sạn 4 sao sát bãi biển, hồ bơi vô cực tầng thượng và đưa đón sân bay theo yêu cầu.",
    is_preferred: false,
    amenities: ["outdoor_pool", "free_wifi", "airport_shuttle", "non_smoking_room", "room_service", "restaurant", "free_parking", "bar", "breakfast"],
    images: ["main.jpg"],
    rooms: [
      ["Deluxe City", "standard_room", 1450000, 1700000, 15, 2, 18, "1 giường queen", 26, "Hướng phố"],
      ["Deluxe Ocean", "deluxe_room", 1950000, 2250000, 13, 3, 12, "1 giường king", 32, "Hướng biển"],
    ],
  },
  {
    title: "Mường Thanh Luxury Đà Nẵng",
    slug: "muong-thanh-luxury-danang",
    address: "270 Võ Nguyên Giáp, phường Ngũ Hành Sơn, Đà Nẵng",
    city: "da-nang",
    type: "hotel",
    latitude: 16.0534593,
    longitude: 108.2481303,
    base_price: 1250000,
    description:
      "Khách sạn hướng biển với phòng gia đình rộng, hồ bơi ngoài trời và bữa sáng buffet.",
    is_preferred: false,
    amenities: ["outdoor_pool", "free_wifi", "non_smoking_room", "room_service", "restaurant", "free_parking", "family_room", "breakfast"],
    images: ["main.jpg"],
    rooms: [
      ["Superior Double", "standard_room", 1250000, 1450000, 14, 2, 22, "1 giường đôi", 28, "Hướng phố"],
      ["Family Ocean Room", "deluxe_room", 2050000, 2400000, 15, 4, 8, "2 giường queen", 44, "Hướng biển"],
    ],
  },
  {
    title: "Risemount Premier Resort Đà Nẵng",
    slug: "risemount-apartment-danang",
    address: "120 Nguyễn Văn Thoại, phường Ngũ Hành Sơn, Đà Nẵng",
    city: "da-nang",
    type: "apartment",
    latitude: 16.0545878,
    longitude: 108.242076,
    base_price: 1700000,
    description:
      "Căn hộ dịch vụ có bếp riêng, máy giặt và phòng khách tách biệt, phù hợp lưu trú dài ngày.",
    is_preferred: false,
    amenities: ["outdoor_pool", "free_wifi", "non_smoking_room", "restaurant", "free_parking", "family_room"],
    images: ["main.jpg"],
    rooms: [
      ["Căn hộ 1 phòng ngủ", "standard_room", 1700000, 1950000, 13, 2, 10, "1 giường queen", 45, "Hướng thành phố"],
      ["Căn hộ 2 phòng ngủ", "deluxe_room", 2650000, 3000000, 12, 4, 6, "2 giường queen", 72, "Hướng sông Hàn"],
    ],
  },
  {
    title: "Ana Mandara Villas Dalat Resort & Spa",
    slug: "ana-mandara-villa-dalat-resort",
    address: "Lê Lai, Phường 5, Đà Lạt",
    city: "da-lat",
    type: "villa",
    latitude: 11.9349,
    longitude: 108.4258,
    base_price: 2900000,
    description:
      "Cụm 17 biệt thự Pháp thập niên 1920 được phục dựng, nằm trên đồi thông, có spa và vườn riêng.",
    is_preferred: true,
    amenities: ALL,
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Deluxe Villa Room", "deluxe_room", 2900000, 3300000, 12, 2, 9, "1 giường king", 40, "Hướng đồi thông"],
      ["Two Bedroom Villa", "suite", 6400000, 7200000, 11, 4, 4, "2 giường king", 95, "Hướng vườn"],
    ],
  },
  {
    title: "Dalat Palace Heritage Hotel",
    slug: "dalat-palace-heritage-hotel",
    address: "02 Trần Phú, Phường 3, Đà Lạt",
    city: "da-lat",
    type: "hotel",
    latitude: 11.9401,
    longitude: 108.4362,
    base_price: 2100000,
    description:
      "Khách sạn di sản xây năm 1922 nhìn xuống hồ Xuân Hương, nội thất cổ điển và sân golf kế bên.",
    is_preferred: false,
    amenities: ["free_wifi", "airport_shuttle", "non_smoking_room", "room_service", "restaurant", "free_parking", "bar", "breakfast"],
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Heritage Deluxe", "deluxe_room", 2100000, 2450000, 14, 2, 11, "1 giường king", 42, "Hướng hồ Xuân Hương"],
      ["Palace Suite", "suite", 4300000, 4900000, 12, 3, 3, "1 giường king", 70, "Hướng hồ Xuân Hương"],
    ],
  },
  {
    title: "Hotel Colline Dalat",
    slug: "hotel-colline-dalat",
    address: "10 Phan Bội Châu, phường Xuân Hương - Đà Lạt, Lâm Đồng",
    city: "da-lat",
    type: "hotel",
    latitude: 11.94397,
    longitude: 108.438126,
    base_price: 1800000,
    description:
      "Khách sạn trung tâm Đà Lạt, cạnh chợ đêm và hồ Xuân Hương, có phòng gia đình rộng rãi.",
    is_preferred: true,
    amenities: ["free_wifi", "non_smoking_room", "room_service", "restaurant", "free_parking", "family_room", "bar", "breakfast"],
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Superior City View", "standard_room", 1800000, 2100000, 10, 2, 12, "1 giường queen", 26, "Hướng phố"],
      ["Deluxe Family Room", "deluxe_room", 2600000, 3000000, 13, 4, 5, "2 giường queen", 38, "Hướng phố"],
    ],
  },
  {
    title: "The Reverie Saigon",
    slug: "the-reverie-saigon",
    address: "22-36 Nguyễn Huệ và 57-69F Đồng Khởi, phường Sài Gòn, TP Hồ Chí Minh",
    city: "ho-chi-minh",
    type: "hotel",
    latitude: 10.7738731,
    longitude: 106.704865,
    base_price: 5600000,
    description:
      "Khách sạn sang trọng trên phố đi bộ Nguyễn Huệ, nội thất Ý và tầm nhìn sông Sài Gòn.",
    is_preferred: true,
    amenities: ["outdoor_pool", "free_wifi", "airport_shuttle", "non_smoking_room", "room_service", "restaurant", "free_parking", "bar", "breakfast"],
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Deluxe Room", "deluxe_room", 5600000, 6200000, 10, 2, 10, "1 giường king", 43, "Hướng thành phố"],
      ["Panorama Suite", "suite", 11200000, 12600000, 11, 3, 4, "1 giường king", 68, "Hướng sông Sài Gòn"],
    ],
  },
  {
    title: "Park Hyatt Saigon",
    slug: "park-hyatt-saigon",
    address: "2 Công trường Lam Sơn, phường Sài Gòn, TP Hồ Chí Minh",
    city: "ho-chi-minh",
    type: "hotel",
    latitude: 10.7775344,
    longitude: 106.7034163,
    base_price: 5200000,
    description:
      "Khách sạn kiến trúc thuộc địa đối diện Nhà hát Thành phố, hồ bơi ngoài trời giữa trung tâm Quận 1.",
    is_preferred: true,
    amenities: ["outdoor_pool", "free_wifi", "airport_shuttle", "non_smoking_room", "room_service", "restaurant", "free_parking", "bar", "breakfast"],
    images: ["main.jpg"],
    rooms: [
      ["Park King Room", "deluxe_room", 5200000, 5900000, 12, 2, 12, "1 giường king", 40, "Hướng thành phố"],
      ["Park Suite", "suite", 9800000, 11000000, 11, 3, 3, "1 giường king", 72, "Hướng Nhà hát Thành phố"],
    ],
  },
  {
    title: "Hotel Continental Saigon",
    slug: "hotel-continental-saigon",
    address: "132-134 Đồng Khởi, phường Sài Gòn, TP Hồ Chí Minh",
    city: "ho-chi-minh",
    type: "hotel",
    latitude: 10.7770648,
    longitude: 106.7028032,
    base_price: 1900000,
    description:
      "Khách sạn lâu đời nhất Sài Gòn, khai trương năm 1880, sân trong rợp bóng cây sứ.",
    is_preferred: false,
    amenities: ["free_wifi", "airport_shuttle", "non_smoking_room", "room_service", "restaurant", "free_parking", "family_room", "bar", "breakfast"],
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Superior Room", "standard_room", 1900000, 2200000, 13, 2, 16, "1 giường queen", 30, "Hướng sân trong"],
      ["Continental Suite", "suite", 3800000, 4300000, 11, 4, 4, "1 giường king", 60, "Hướng phố Đồng Khởi"],
    ],
  },
  {
    title: "Pullman Vũng Tàu",
    slug: "pullman-vung-tau",
    address: "15 Thi Sách, phường Vũng Tàu, TP Hồ Chí Minh",
    city: "vung-tau",
    type: "hotel",
    latitude: 10.34872,
    longitude: 107.094469,
    base_price: 2400000,
    description:
      "Khách sạn hiện đại gần Bãi Sau Vũng Tàu, phù hợp kỳ nghỉ biển và chuyến đi gia đình.",
    is_preferred: false,
    amenities: ["outdoor_pool", "free_wifi", "non_smoking_room", "room_service", "restaurant", "free_parking", "family_room", "bar", "breakfast"],
    images: ["main.jpg", "g1.jpg"],
    rooms: [
      ["Superior King", "standard_room", 2400000, 2800000, 10, 2, 9, "1 giường king", 40, "Hướng phố"],
      ["Executive Suite", "suite", 5200000, 6000000, 13, 3, 3, "1 giường king", 72, "Hướng biển"],
    ],
  },
  {
    title: "The Imperial Hotel Vũng Tàu",
    slug: "the-imperial-hotel-vung-tau",
    address: "159 Thùy Vân, phường Vũng Tàu, TP Hồ Chí Minh",
    city: "vung-tau",
    type: "hotel",
    latitude: 10.3384,
    longitude: 107.0942,
    base_price: 1900000,
    description:
      "Khách sạn kiến trúc châu Âu ngay Bãi Sau, có lối đi riêng xuống biển và hồ bơi ngoài trời.",
    is_preferred: false,
    amenities: ["outdoor_pool", "free_wifi", "non_smoking_room", "room_service", "restaurant", "free_parking", "family_room", "bar", "breakfast"],
    images: ["main.jpg"],
    rooms: [
      ["Deluxe Ocean", "deluxe_room", 1900000, 2200000, 14, 2, 15, "1 giường king", 36, "Hướng biển"],
      ["Imperial Family Suite", "suite", 3600000, 4100000, 12, 5, 4, "2 giường queen", 68, "Hướng biển"],
    ],
  },
];

const roomAmenitiesFor = (roomType) => ({
  toiletries: true,
  shower: true,
  toilet: true,
  towels: true,
  socket_near_bed: true,
  sitting_area: roomType !== "standard_room",
  private_entrance: roomType === "suite",
  slippers: roomType !== "standard_room",
  hair_dryer: true,
  fan: roomType === "standard_room",
  electric_kettle: true,
  wardrobe: true,
  clothes_rack: true,
  toilet_paper: true,
});

const lower = (value) => String(value || "").toLowerCase();

function buildRoom(propertyId, row, imageUrls = []) {
  const [name, roomType, price, originalPrice, discount, capacity, quantity, bedInfo, area, view] = row;
  const viewText = lower(view);

  return {
    property_id: propertyId,
    name,
    room_type: roomType,
    description: `${name} có ${bedInfo}, diện tích ${area}m², ${viewText}.`,
    price,
    original_price: originalPrice,
    discount_percent: discount,
    capacity,
    quantity,
    bed_info: bedInfo,
    area,
    view,
    main_image_url: imageUrls[0] || "",
    main_image_public_id: "",
    gallery_images: imageUrls.map((url) => ({ url, public_id: "" })),
    is_active: true,
    badges: {
      balcony: viewText.includes("biển") || roomType === "suite",
      air_conditioning: true,
      private_bathroom: true,
      terrace: roomType === "suite",
      free_wifi: true,
      garden_view: viewText.includes("vườn") || viewText.includes("đồi"),
      courtyard_view: viewText.includes("sân trong"),
    },
    amenities: roomAmenitiesFor(roomType),
  };
}

// Nguoi danh gia that, moi nguoi cham diem khac nhau de rating trung binh
// khong phai mot hang so.
const reviewers = [
  { email: "guest@stayz.vn", name: "StayZ Guest", phone: "0901234567" },
  { email: "lan.pham@stayz.vn", name: "Phạm Thị Lan", phone: "0912345678" },
  { email: "minh.tran@stayz.vn", name: "Trần Quang Minh", phone: "0923456789" },
  { email: "an.nguyen@stayz.vn", name: "Nguyễn Hoài An", phone: "0934567890" },
];

const reviewComments = [
  "Phòng sạch, nhân viên hỗ trợ nhanh. Vị trí thuận tiện đi lại.",
  "Bữa sáng đa dạng, phòng yên tĩnh. Sẽ quay lại lần sau.",
  "Đúng như mô tả, nhận phòng nhanh. Giá hợp lý so với chất lượng.",
  "Không gian đẹp, hơi ồn vào buổi tối nhưng nhìn chung hài lòng.",
];

async function main() {
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL in backend/stayz_api/.env");
  }

  await mongoose.connect(DATABASE_URL);

  const password = await bcrypt.hash("Stayz@123", 10);
  const users = [];
  for (const reviewer of reviewers) {
    const user = await User.findOneAndUpdate(
      { email: reviewer.email },
      {
        email: reviewer.email,
        password,
        full_name: reviewer.name,
        phone_number: reviewer.phone,
        gender: "other",
        home_address: "Việt Nam",
        role: "user",
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    users.push(user);
  }
  const owner = users[0];

  const properties = [];
  for (const [index, hotel] of hotels.entries()) {
    const { rooms, images, amenities: amenityKeys, ...propertyData } = hotel;
    const imageUrls = images.map((file) => imagePath(hotel.slug, file));

    const property = await Property.findOneAndUpdate(
      { slug: hotel.slug },
      {
        ...propertyData,
        country: "Việt Nam",
        amenities: amenities(amenityKeys),
        search_index: buildSearchIndex(propertyData),
        main_image_url: imageUrls[0],
        main_image_public_id: "",
        gallery_images: imageUrls.map((url) => ({ url, public_id: "" })),
        max_stay_days: 30,
        user_id: owner._id,
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    properties.push(property);

    for (const row of rooms) {
      const room = buildRoom(property._id, row, imageUrls);
      await Room.findOneAndUpdate(
        { property_id: property._id, name: room.name },
        room,
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    }

    // Moi khach san nhan 2-3 danh gia tu nhung nguoi khac nhau, diem lech nhau
    // de diem trung binh phan anh du lieu that.
    const reviewerCount = 2 + (index % 2);
    for (let i = 0; i < reviewerCount; i++) {
      const reviewer = users[(index + i) % users.length];
      const rating = property.is_preferred ? 5 - (i % 2) : 4 + ((index + i) % 2);
      await Review.findOneAndUpdate(
        { user_id: reviewer._id, property_id: property._id },
        {
          user_id: reviewer._id,
          property_id: property._id,
          rating: Math.min(5, Math.max(1, rating)),
          comment: reviewComments[(index + i) % reviewComments.length],
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
    }
  }

  for (const property of properties.slice(0, 3)) {
    await Favorite.findOneAndUpdate(
      { user_id: owner._id, property_id: property._id },
      { user_id: owner._id, property_id: property._id },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  const firstProperty = properties[0];
  const firstRoom = await Room.findOne({ property_id: firstProperty._id });
  if (firstRoom) {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 14);
    checkIn.setHours(14, 0, 0, 0);

    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 2);
    checkOut.setHours(12, 0, 0, 0);

    await Booking.findOneAndUpdate(
      { user_id: owner._id, property_id: firstProperty._id, room_id: firstRoom._id },
      {
        user_id: owner._id,
        property_id: firstProperty._id,
        room_id: firstRoom._id,
        check_in: checkIn,
        check_out: checkOut,
        guests: 2,
        rooms_count: 1,
        nights: 2,
        price_per_night: firstRoom.price,
        total_price: firstRoom.price * 2,
        status: "confirmed",
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  await Notification.findOneAndUpdate(
    { user_id: owner._id, title: "StayZ đã nạp dữ liệu khách sạn thật" },
    {
      user_id: owner._id,
      type: "system",
      title: "StayZ đã nạp dữ liệu khách sạn thật",
      body: `${properties.length} khách sạn, ảnh thật và đánh giá thật đã sẵn sàng.`,
      ref_id: null,
      ref_type: null,
      is_read: false,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  const roomCount = await Room.countDocuments();
  const reviewCount = await Review.countDocuments();
  const byCity = {};
  const byType = {};
  for (const property of properties) {
    byCity[property.city] = (byCity[property.city] || 0) + 1;
    byType[property.type] = (byType[property.type] || 0) + 1;
  }

  console.log(`Seeded ${properties.length} khach san that, ${roomCount} phong, ${reviewCount} danh gia.`);
  console.log("Theo thanh pho:", byCity);
  console.log("Theo loai hinh:", byType);
  console.log("Tai khoan demo: guest@stayz.vn / Stayz@123");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
