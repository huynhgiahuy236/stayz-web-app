"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Calendar, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getBookingsByUser, getCancellationQuote, cancelBooking } from "@/lib/api";
import { resolveImage } from "@/lib/api";
import type { Booking, Hotel, Room } from "@/lib/types";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_access_token="));
  return m ? m.split("=").slice(1).join("=") : null;
}
function getStoredUser() {
  if (typeof document === "undefined") return null;
  try {
    const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_user="));
    if (!m) return null;
    return JSON.parse(decodeURIComponent(m.split("=").slice(1).join("=")));
  } catch { return null; }
}
function fmtDate(d: string) { return new Intl.DateTimeFormat("vi-VN").format(new Date(d)); }
function fmtPrice(n: number) { return new Intl.NumberFormat("vi-VN").format(n) + " ₫"; }

const STATUS_LABELS: Record<string, string> = {
  pending: "Chờ thanh toán",
  confirmed: "Đã xác nhận",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [quoteMap, setQuoteMap] = useState<Record<string, { refund_amount: number; message: string } | null>>({});

  useEffect(() => {
    const token = getToken();
    const u = getStoredUser();
    if (!token || !u) { router.replace("/login?redirect=/profile/bookings"); return; }
    getBookingsByUser(token, u._id).then((data) => {
      setBookings(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  async function showCancelQuote(bookingId: string) {
    if (quoteMap[bookingId] !== undefined) { setCancellingId(bookingId); return; }
    const token = getToken();
    if (!token) return;
    const quote = await getCancellationQuote(token, bookingId);
    setQuoteMap((m) => ({ ...m, [bookingId]: quote }));
    setCancellingId(bookingId);
  }

  async function confirmCancel(bookingId: string) {
    const token = getToken();
    if (!token) return;
    const { error } = await cancelBooking(token, bookingId);
    if (!error) {
      setBookings((prev) => prev.map((b) => b._id === bookingId ? { ...b, status: "cancelled" } : b));
    }
    setCancellingId(null);
  }

  if (loading) return (
    <main id="main-content" className="profile-page">
      <SiteHeader />
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-24)" }}>
        <Loader2 size={32} style={{ animation: "spin .7s linear infinite", color: "var(--navy)" }} />
      </div>
    </main>
  );

  return (
    <main id="main-content" className="profile-page">
      <SiteHeader />
      <div className="profile-hero">
        <div className="shell">
          <h1>Đặt phòng của tôi</h1>
          <p style={{ opacity: .8, fontSize: 14 }}>{bookings.length} đặt phòng</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="shell">
          <div className="profile-grid">
            <nav className="profile-nav" aria-label="Điều hướng tài khoản">
              <Link href="/profile" className="profile-nav-item">
                👤 Thông tin cá nhân
              </Link>
              <Link href="/profile/bookings" className="profile-nav-item active">
                📅 Đặt phòng của tôi
              </Link>
              <Link href="/favorites" className="profile-nav-item">
                ❤️ Yêu thích
              </Link>
            </nav>

            <div>
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <Calendar size={40} style={{ color: "var(--color-ink-3)", margin: "0 auto var(--sp-4)" }} aria-hidden="true" />
                  <h3>Chưa có đặt phòng nào</h3>
                  <p>Khám phá và đặt những nơi lưu trú tuyệt vời trên khắp Việt Nam.</p>
                  <Link href="/search" className="btn-primary" style={{ display: "inline-flex", marginTop: "var(--sp-6)", textDecoration: "none" }}>
                    Tìm khách sạn
                  </Link>
                </div>
              ) : (
                bookings.map((booking) => {
                  const hotel = typeof booking.property_id === "object" ? (booking.property_id as Hotel) : null;
                  const room = typeof booking.room_id === "object" ? (booking.room_id as Room) : null;
                  const canCancel = booking.status === "pending" || booking.status === "confirmed";

                  return (
                    <div key={booking._id} className="booking-item" role="article" aria-label={`Đặt phòng ${hotel?.title ?? "khách sạn"}`}>
                      <div className="booking-item-inner">
                        {/* Image */}
                        <div className="booking-img">
                          {hotel?.main_image_url ? (
                            <Image
                              src={resolveImage(hotel.main_image_url)}
                              alt={hotel.title}
                              fill
                              style={{ objectFit: "cover" }}
                              sizes="140px"
                            />
                          ) : (
                            <div style={{ height: "100%", background: "var(--color-muted)" }} />
                          )}
                        </div>

                        {/* Info */}
                        <div>
                          <p className="booking-name">{hotel?.title ?? "Khách sạn"}</p>
                          <p className="booking-dates">
                            <Calendar size={13} aria-hidden="true" style={{ display: "inline", marginRight: 4 }} />
                            {fmtDate(booking.check_in)} → {fmtDate(booking.check_out)} · {booking.nights} đêm
                          </p>
                          <p style={{ fontSize: 12, color: "var(--color-ink-3)", marginBottom: "var(--sp-2)" }}>
                            {room?.name ?? "Phòng"} · {booking.guests} khách · {booking.rooms_count} phòng
                          </p>
                          <span className={`booking-status-badge ${booking.status}`}>
                            {STATUS_LABELS[booking.status] ?? booking.status}
                          </span>
                        </div>

                        {/* Price + Actions */}
                        <div style={{ textAlign: "right" }}>
                          <p className="booking-price">{fmtPrice(booking.total_price)}</p>
                          <p style={{ fontSize: 11, color: "var(--color-ink-3)", marginBottom: "var(--sp-4)" }}>
                            {booking.payment_status === "paid" ? "Đã thanh toán" : "Chờ thanh toán"}
                          </p>
                          {canCancel && (
                            <button
                              className="btn-outline"
                              style={{ fontSize: 12, padding: "6px 14px", color: "var(--color-destructive)", borderColor: "var(--color-destructive)" }}
                              onClick={() => showCancelQuote(booking._id)}
                              aria-label={`Hủy đặt phòng ${hotel?.title}`}
                            >
                              <XCircle size={13} style={{ display: "inline", marginRight: 4 }} aria-hidden="true" />
                              Hủy đặt phòng
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Cancel confirmation */}
                      {cancellingId === booking._id && (
                        <div style={{ padding: "var(--sp-5)", background: "#fff5f5", borderTop: "1px solid #fecaca" }}>
                          {quoteMap[booking._id] ? (
                            <>
                              <p style={{ fontSize: 14, marginBottom: "var(--sp-3)" }}>
                                {quoteMap[booking._id]?.message}
                              </p>
                              {(quoteMap[booking._id]?.refund_amount ?? 0) > 0 && (
                                <p style={{ fontSize: 13, color: "var(--color-success)", marginBottom: "var(--sp-3)" }}>
                                  Hoàn tiền: {fmtPrice(quoteMap[booking._id]!.refund_amount)}
                                </p>
                              )}
                            </>
                          ) : (
                            <p style={{ fontSize: 14, marginBottom: "var(--sp-3)" }}>Bạn có chắc muốn hủy đặt phòng này không?</p>
                          )}
                          <div style={{ display: "flex", gap: "var(--sp-3)" }}>
                            <button className="form-submit" style={{ background: "var(--color-destructive)", maxWidth: 160, padding: "10px 20px", fontSize: 13 }} onClick={() => confirmCancel(booking._id)}>
                              Xác nhận hủy
                            </button>
                            <button className="btn-ghost" style={{ color: "var(--color-ink-3)", border: "1px solid var(--color-border)" }} onClick={() => setCancellingId(null)}>
                              Giữ lại
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
