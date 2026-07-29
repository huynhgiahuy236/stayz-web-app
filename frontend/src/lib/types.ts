// ─── Hotel / Property ─────────────────────────────────────────────────────────
export type Hotel = {
  _id: string;
  title: string;
  slug: string;
  city: string;
  address: string;
  country?: string;
  description?: string;
  type?: string;
  main_image_url?: string;
  gallery_images?: { url: string; _id?: string }[];
  min_price?: number | null;
  base_price?: number | null;
  rating?: number | null;
  review_count?: number;
  available_rooms?: number;
  max_capacity?: number | null;
  is_preferred?: boolean;
  amenities?: Record<string, boolean>;
};

export type SearchResponse = {
  items?: Hotel[];
  data?: Hotel[];
  properties?: Hotel[];
  total?: number;
  page?: number;
};

// ─── Room ─────────────────────────────────────────────────────────────────────
export type Room = {
  _id: string;
  property_id: string;
  name: string;
  room_type: "standard_room" | "deluxe_room" | "suite";
  description?: string;
  description_en?: string;
  price: number;
  original_price: number;
  discount_percent: number;
  capacity: number;
  quantity: number;
  main_image_url?: string;
  gallery_images?: { url: string; public_id?: string }[];
  is_active: boolean;
  bed_info: string;
  area?: number;
  view?: string;
  badges?: {
    balcony?: boolean;
    air_conditioning?: boolean;
    private_bathroom?: boolean;
    terrace?: boolean;
    free_wifi?: boolean;
    garden_view?: boolean;
    courtyard_view?: boolean;
  };
  amenities?: {
    toiletries?: boolean;
    shower?: boolean;
    toilet?: boolean;
    towels?: boolean;
    socket_near_bed?: boolean;
    sitting_area?: boolean;
    private_entrance?: boolean;
    slippers?: boolean;
    hair_dryer?: boolean;
    fan?: boolean;
    electric_kettle?: boolean;
    wardrobe?: boolean;
    clothes_rack?: boolean;
    toilet_paper?: boolean;
  };
};

// ─── User ─────────────────────────────────────────────────────────────────────
export type User = {
  _id: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  gender?: "" | "male" | "female" | "other";
  home_address?: string;
  date_of_birth?: string | null;
  avatar?: { url?: string; public_id?: string };
  role: "admin" | "user";
  is_active?: boolean;
  createdAt?: string;
};

// ─── Booking ─────────────────────────────────────────────────────────────────
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type AttendanceStatus = "pending" | "checked_in" | "no_show";

export type Booking = {
  _id: string;
  user_id: User | string;
  property_id: Hotel | string;
  room_id: Room | string;
  check_in: string;
  check_out: string;
  guests: number;
  rooms_count: number;
  nights: number;
  price_per_night: number;
  total_price: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_plan?: "deposit_30" | "full_100" | "";
  amount_paid?: number;
  remaining_at_hotel?: number;
  refund_amount?: number;
  refund_rate?: number;
  refund_status?: "none" | "pending_manual" | "completed" | "failed";
  attendance_status?: AttendanceStatus;
  check_in_code?: string;
  cancellation_reason?: string;
  createdAt?: string;
};

export type CancellationQuote = {
  refund_amount: number;
  refund_rate: number;
  message: string;
};

// ─── Review ───────────────────────────────────────────────────────────────────
export type Review = {
  _id: string;
  user_id: User | string;
  property_id: string;
  booking_id?: string;
  rating: number;
  comment?: string;
  createdAt?: string;
};

// ─── Payment ─────────────────────────────────────────────────────────────────
export type Payment = {
  _id: string;
  booking_id: string;
  amount: number;
  status: "pending" | "paid" | "cancelled" | "failed";
  payment_link_id?: string;
  checkout_url?: string;
  createdAt?: string;
};

// ─── Notification ─────────────────────────────────────────────────────────────
export type Notification = {
  _id: string;
  user_id: string;
  title: string;
  message: string;
  type?: string;
  is_read: boolean;
  createdAt?: string;
};

// ─── Favorite ─────────────────────────────────────────────────────────────────
export type Favorite = {
  _id: string;
  user_id: string;
  property_id: Hotel | string;
  createdAt?: string;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
};
