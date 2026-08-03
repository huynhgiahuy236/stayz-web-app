"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getHotel, getRoomsByProperty, createBooking, createPayment } from "@/lib/api";
import type { Hotel, Room } from "@/lib/types";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_access_token="));
  return m ? m.split("=").slice(1).join("=") : null;
}

function fmtPrice(n: number) { return new Intl.NumberFormat("vi-VN").format(n) + " ₫"; }

function BookContent({ city, slug }: { city: string; slug: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const preselectedRoomId = sp.get("roomId") ?? "";

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [selectedRoom, setSelectedRoom] = useState<string>(preselectedRoomId);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [roomsCount, setRoomsCount] = useState(1);
  const [paymentPlan, setPaymentPlan] = useState<"deposit_30" | "full_100">("full_100");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace(`/login?redirect=/hotels/${city}/${slug}/book${preselectedRoomId ? `?roomId=${preselectedRoomId}` : ""}`);
      return;
    }
    (async () => {
      const h = await getHotel(city, slug);
      if (!h) { router.replace("/search"); return; }
      setHotel(h);
      const r = await getRoomsByProperty(h._id);
      const active = r.filter((rm) => rm.is_active);
      setRooms(active);
      if (!selectedRoom && active.length > 0) {
        setSelectedRoom(active[0]._id);
      }
      setLoading(false);
    })();
  }, [city, slug]);

  const room = rooms.find((r) => r._id === selectedRoom);

  // Compute nights
  const nights = checkIn && checkOut
    ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
    : 0;
  const pricePerNight = room?.price ?? 0;
  const totalPrice = pricePerNight * nights * roomsCount;
  const depositAmount = Math.round(totalPrice * 0.3);
  const payNow = paymentPlan === "deposit_30" ? depositAmount : totalPrice;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const token = getToken();
    if (!token) { router.replace("/login"); return; }
    if (!selectedRoom) { setError("Vui lòng chọn loại phòng."); return; }
    if (!checkIn || !checkOut) { setError("Vui lòng chọn ngày nhận và trả phòng."); return; }
    if (nights < 1) { setError("Ngày trả phòng phải sau ngày nhận phòng."); return; }

    setSubmitting(true);
    const { data: booking, error: bErr } = await createBooking(token, {
      property_id: hotel!._id,
      room_id: selectedRoom,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      rooms_count: roomsCount,
      payment_plan: paymentPlan,
    });
    if (bErr || !booking) { setError(bErr ?? "Không thể tạo đặt phòng."); setSubmitting(false); return; }

    // Create payment link
    const { data: payment, error: pErr } = await createPayment(token, booking._id);
    if (pErr || !payment?.checkout_url) {
      router.push("/profile/bookings");
      return;
    }
    window.location.href = payment.checkout_url;
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-24)" }}>
        <Loader2 size={32} style={{ animation: "spin .7s linear infinite", color: "var(--navy)" }} aria-label="Đang tải..." />
      </div>
    );
  }
  if (!hotel) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="shell book-layout" style={{ paddingTop: "var(--sp-8)", paddingBottom: "var(--sp-24)" }}>
      {/* Left: Form */}
      <div>
        <Link href={`/hotels/${city}/${slug}`} className="back-link">
          <ArrowLeft size={14} aria-hidden="true" /> Quay lại {hotel.title}
        </Link>
        <h1>Đặt phòng</h1>

        <form onSubmit={handleSubmit} noValidate>
          {/* Room selection */}
          <div className="book-section">
            <h2>Chọn loại phòng</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              {rooms.map((r) => (
                <label
                  key={r._id}
                  className={`plan-card ${selectedRoom === r._id ? "selected" : ""}`}
                  style={{ cursor: "pointer", display: "block" }}
                  aria-label={r.name}
                >
                  <input type="radio" name="room" value={r._id} checked={selectedRoom === r._id} onChange={() => setSelectedRoom(r._id)} style={{ display: "none" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h4 style={{ margin: "0 0 4px", fontWeight: 700 }}>{r.name}</h4>
                      <p style={{ fontSize: 12, color: "var(--color-ink-3)", margin: 0 }}>
                        {r.bed_info} · {r.capacity} khách · {r.area ? `${r.area} m²` : ""}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {r.discount_percent > 0 && (
                        <p style={{ fontSize: 12, textDecoration: "line-through", color: "var(--color-ink-3)", margin: 0 }}>
                          {fmtPrice(r.original_price)}
                        </p>
                      )}
                      <p style={{ fontWeight: 800, fontSize: 16, color: "var(--navy)", margin: 0 }}>
                        {fmtPrice(r.price)}<span style={{ fontWeight: 400, fontSize: 12, color: "var(--color-ink-3)" }}>/đêm</span>
                      </p>
                    </div>
                  </div>
                </label>
              ))}
              {rooms.length === 0 && (
                <p style={{ color: "var(--color-ink-3)", fontSize: 14 }}>Hiện không có phòng trống.</p>
              )}
            </div>
          </div>

          {/* Dates & Guests */}
          <div className="book-section">
            <h2>Ngày lưu trú & Số khách</h2>
            <div className="date-row">
              <div className="form-group">
                <label className="form-label" htmlFor="book-checkin">Nhận phòng</label>
                <input id="book-checkin" type="date" className="form-input" value={checkIn} min={todayStr} onChange={(e) => setCheckIn(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="book-checkout">Trả phòng</label>
                <input id="book-checkout" type="date" className="form-input" value={checkOut} min={checkIn || todayStr} onChange={(e) => setCheckOut(e.target.value)} required />
              </div>
            </div>
            <div className="date-row">
              <div className="form-group">
                <label className="form-label" htmlFor="book-guests">Số khách</label>
                <input id="book-guests" type="number" className="form-input" min={1} max={room?.capacity ?? 10} value={guests} onChange={(e) => setGuests(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="book-rooms">Số phòng</label>
                <input id="book-rooms" type="number" className="form-input" min={1} max={10} value={roomsCount} onChange={(e) => setRoomsCount(Number(e.target.value))} />
              </div>
            </div>
          </div>

          {/* Payment plan */}
          <div className="book-section">
            <h2>Phương thức thanh toán</h2>
            <div className="payment-plan-group">
              <label className={`plan-card ${paymentPlan === "full_100" ? "selected" : ""}`} style={{ cursor: "pointer" }}>
                <input type="radio" name="plan" value="full_100" checked={paymentPlan === "full_100"} onChange={() => setPaymentPlan("full_100")} style={{ display: "none" }} />
                <h4>Toàn bộ</h4>
                <p>Thanh toán 100% ngay bây giờ</p>
              </label>
              <label className={`plan-card ${paymentPlan === "deposit_30" ? "selected" : ""}`} style={{ cursor: "pointer" }}>
                <input type="radio" name="plan" value="deposit_30" checked={paymentPlan === "deposit_30"} onChange={() => setPaymentPlan("deposit_30")} style={{ display: "none" }} />
                <h4>Đặt cọc 30%</h4>
                <p>Trả phần còn lại tại khách sạn</p>
              </label>
            </div>
          </div>

          {error && <p className="form-error" role="alert" style={{ margin: "var(--sp-4) 0" }}>{error}</p>}

          <button type="submit" className="form-submit" disabled={submitting || !room || nights < 1} aria-busy={submitting}>
            {submitting
              ? <><Loader2 size={18} aria-hidden="true" /> Đang xử lý...</>
              : `Thanh toán ${nights > 0 && room ? fmtPrice(payNow) : "—"}`}
          </button>
          <p style={{ fontSize: 12, color: "var(--color-ink-3)", textAlign: "center", marginTop: "var(--sp-3)" }}>
            Bạn sẽ được chuyển đến cổng thanh toán PayOS an toàn.
          </p>
        </form>
      </div>

      {/* Right: Summary */}
      <aside className="book-summary" aria-label="Tóm tắt đặt phòng">
        <h3>{hotel.title}</h3>
        {room ? (
          <>
            <div className="summary-row"><span>Phòng:</span><strong>{room.name}</strong></div>
            <div className="summary-row"><span>Giá/đêm:</span><strong>{fmtPrice(room.price)}</strong></div>
            <div className="summary-row"><span>Số đêm:</span><strong>{nights}</strong></div>
            <div className="summary-row"><span>Số phòng:</span><strong>{roomsCount}</strong></div>
            <div className="summary-row"><span>Số khách:</span><strong>{guests}</strong></div>
            {checkIn && <div className="summary-row"><span>Nhận phòng:</span><strong>{new Date(checkIn).toLocaleDateString("vi-VN")}</strong></div>}
            {checkOut && <div className="summary-row"><span>Trả phòng:</span><strong>{new Date(checkOut).toLocaleDateString("vi-VN")}</strong></div>}
            <div className="summary-total">
              <span>{paymentPlan === "deposit_30" ? "Thanh toán trước (30%)" : "Tổng thanh toán"}</span>
              <span className="price">{nights > 0 ? fmtPrice(payNow) : "—"}</span>
            </div>
            {paymentPlan === "deposit_30" && nights > 0 && (
              <p style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: "var(--sp-3)" }}>
                Còn lại {fmtPrice(totalPrice - payNow)} thanh toán tại khách sạn
              </p>
            )}
          </>
        ) : (
          <p style={{ color: "var(--color-ink-3)", fontSize: 14 }}>Chưa chọn phòng</p>
        )}
      </aside>
    </div>
  );
}

export default function BookPage({ params }: { params: Promise<{ city: string; slug: string }> }) {
  const [resolved, setResolved] = useState<{ city: string; slug: string } | null>(null);

  useEffect(() => {
    params.then(setResolved);
  }, [params]);

  return (
    <main id="main-content" className="book-page">
      <SiteHeader />
      {resolved ? (
        <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-24)" }}><Loader2 size={32} style={{ animation: "spin .7s linear infinite", color: "var(--navy)" }} /></div>}>
          <BookContent city={resolved.city} slug={resolved.slug} />
        </Suspense>
      ) : null}
    </main>
  );
}
