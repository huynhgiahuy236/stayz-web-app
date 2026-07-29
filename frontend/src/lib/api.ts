import type {
  Hotel,
  SearchResponse,
  Room,
  Booking,
  CancellationQuote,
  Review,
  Favorite,
  Notification,
  Payment,
  LoginResponse,
  User,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_STAYZ_API_URL ?? "https://stayz-api.onrender.com/api";

// ─── Envelope & Helpers ──────────────────────────────────────────────────────

type ApiEnvelope<T> = { metaData: T };

/** GET — no auth */
async function apiGet<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as ApiEnvelope<T>;
    return body.metaData;
  } catch {
    return null;
  }
}

/** GET — with Bearer token (client-side) */
async function apiGetAuth<T>(path: string, token: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as ApiEnvelope<T>;
    return body.metaData;
  } catch {
    return null;
  }
}

/** POST/PUT/PATCH/DELETE — JSON */
async function apiMutate<T>(
  method: string,
  path: string,
  token: string | null,
  body?: unknown
): Promise<{ data: T | null; error: string | null }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: json?.message ?? "Đã có lỗi xảy ra" };
    return { data: (json as ApiEnvelope<T>).metaData, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Network error" };
  }
}

/** POST with FormData (file upload) */
async function apiUpload<T>(
  path: string,
  token: string,
  formData: FormData
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) return { data: null, error: json?.message ?? "Upload lỗi" };
    return { data: (json as ApiEnvelope<T>).metaData, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : "Network error" };
  }
}

export function resolveImage(path?: string) {
  if (!path) return "/hotel-placeholder.svg";
  if (/^https?:\/\//.test(path)) return path;
  const origin = new URL(API_URL).origin;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

// ─── Properties ──────────────────────────────────────────────────────────────

export async function getFeaturedHotels() {
  return (await apiGet<Hotel[]>("/properties/featured")) ?? [];
}

export async function searchHotels(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const result = await apiGet<Hotel[] | SearchResponse>(`/properties/search?${query}`);
  if (Array.isArray(result)) return result;
  return result?.items ?? result?.data ?? result?.properties ?? [];
}

export async function getHotel(city: string, slug: string) {
  return apiGet<Hotel>(`/properties/${encodeURIComponent(city)}/${encodeURIComponent(slug)}`);
}

export async function getAllHotels() {
  return (await apiGet<Hotel[]>("/properties/getAll")) ?? [];
}

// ─── Rooms ───────────────────────────────────────────────────────────────────

export async function getRoomsByProperty(propertyId: string) {
  return (await apiGet<Room[]>(`/room/${propertyId}`)) ?? [];
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function getReviews(propertyId: string) {
  return (await apiGet<Review[]>(`/review/getAll?property_id=${propertyId}`)) ?? [];
}

export async function createReview(
  token: string,
  data: { property_id: string; booking_id?: string; rating: number; comment?: string }
) {
  return apiMutate<Review>("POST", "/review/create", token, data);
}

export async function deleteReview(token: string, reviewId: string) {
  return apiMutate<Review>("DELETE", `/review/delete/${reviewId}`, token);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  return apiMutate<LoginResponse>("POST", "/users/login", null, { email, password });
}

export async function register(data: { email: string; password: string; full_name: string }) {
  return apiMutate<LoginResponse>("POST", "/users/create", null, data);
}

export async function logout(refreshToken: string) {
  return apiMutate<null>("POST", "/users/logout", null, { refreshToken });
}

export async function refreshAccessToken(refreshToken: string) {
  return apiMutate<{ accessToken: string }>("POST", "/users/refresh-token", null, { refreshToken });
}

export async function requestRegisterOtp(email: string) {
  return apiMutate<null>("POST", "/users/request-register-otp", null, { email });
}

export async function verifyRegisterOtp(email: string, otp: string) {
  return apiMutate<null>("POST", "/users/verify-register-otp", null, { email, otp });
}

export async function requestPasswordReset(email: string) {
  return apiMutate<null>("POST", "/users/request-password-reset", null, { email });
}

export async function verifyResetCode(email: string, code: string) {
  return apiMutate<null>("POST", "/users/verify-reset-code", null, { email, code });
}

export async function resetPasswordWithCode(email: string, code: string, new_password: string) {
  return apiMutate<null>("POST", "/users/reset-password", null, { email, code, new_password });
}

// ─── User Profile ────────────────────────────────────────────────────────────

export async function getUserById(token: string, userId: string) {
  return apiGetAuth<User>(`/users/getById/${userId}`, token);
}

export async function updateUser(
  token: string,
  userId: string,
  data: Partial<{ full_name: string; phone_number: string; gender: string; home_address: string; date_of_birth: string }>
) {
  return apiMutate<User>("PATCH", `/users/update/${userId}`, token, data);
}

export async function uploadAvatar(token: string, formData: FormData) {
  return apiUpload<User>("/users/avatar/cloud", token, formData);
}

// ─── Booking ─────────────────────────────────────────────────────────────────

export async function createBooking(
  token: string,
  data: {
    property_id: string;
    room_id: string;
    check_in: string;
    check_out: string;
    guests: number;
    rooms_count: number;
    payment_plan: "deposit_30" | "full_100";
  }
) {
  return apiMutate<Booking>("POST", "/booking/create", token, data);
}

export async function getBookingsByUser(token: string, userId: string) {
  return apiGetAuth<Booking[]>(`/booking/user/${userId}`, token) ?? [];
}

export async function getCancellationQuote(token: string, bookingId: string) {
  return apiGetAuth<CancellationQuote>(`/booking/${bookingId}/cancellation-quote`, token);
}

export async function cancelBooking(token: string, bookingId: string) {
  return apiMutate<Booking>("PATCH", `/booking/${bookingId}/status`, token, { status: "cancelled" });
}

// ─── Payment ─────────────────────────────────────────────────────────────────

export async function createPayment(token: string, bookingId: string) {
  return apiMutate<{ checkout_url: string; payment_link_id: string }>(
    "POST",
    `/payment/create/${bookingId}`,
    token
  );
}

export async function getPaymentDetails(token: string, bookingId: string) {
  return apiGetAuth<Payment>(`/payment/booking/${bookingId}`, token);
}

export async function cancelPayment(token: string, bookingId: string) {
  return apiMutate<Payment>("POST", `/payment/cancel/${bookingId}`, token);
}

// ─── Favorites ───────────────────────────────────────────────────────────────

export async function getMyFavorites(token: string) {
  return (await apiGetAuth<Favorite[]>("/favorites/", token)) ?? [];
}

export async function checkIsFavorite(token: string, propertyId: string) {
  return apiGetAuth<{ is_favorite: boolean }>(`/favorites/check/${propertyId}`, token);
}

export async function addFavorite(token: string, propertyId: string) {
  return apiMutate<Favorite>("POST", `/favorites/${propertyId}`, token);
}

export async function removeFavorite(token: string, propertyId: string) {
  return apiMutate<Favorite>("DELETE", `/favorites/${propertyId}`, token);
}

// ─── Notifications ───────────────────────────────────────────────────────────

export async function getMyNotifications(token: string) {
  return (await apiGetAuth<Notification[]>("/notifications/", token)) ?? [];
}

export async function markNotificationRead(token: string, notifId: string) {
  return apiMutate<Notification>("PATCH", `/notifications/${notifId}/read`, token);
}

export async function markAllNotificationsRead(token: string) {
  return apiMutate<null>("PATCH", "/notifications/read-all", token);
}
