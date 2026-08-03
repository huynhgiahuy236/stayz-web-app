import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Star, ArrowLeft, Users, Bed } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { FavoriteButton } from "@/components/hotel/FavoriteButton";
import { RoomCard } from "@/components/hotel/RoomCard";
import { ReviewCard } from "@/components/hotel/ReviewCard";
import { getHotel, resolveImage, getRoomsByProperty, getReviews } from "@/lib/api";

const amenityNames: Record<string, string> = {
  outdoor_pool: "Hồ bơi ngoài trời",
  indoor_pool: "Hồ bơi trong nhà",
  free_wifi: "Wi-Fi miễn phí",
  airport_shuttle: "Đưa đón sân bay",
  non_smoking_room: "Phòng không hút thuốc",
  room_service: "Dịch vụ phòng",
  restaurant: "Nhà hàng",
  free_parking: "Bãi đỗ xe miễn phí",
  family_room: "Phòng gia đình",
  bar: "Quầy bar",
  breakfast: "Bữa sáng",
  gym: "Phòng gym",
  spa: "Spa",
  concierge: "Lễ tân 24/7",
  laundry: "Giặt ủi",
  elevator: "Thang máy",
};

export async function generateMetadata({ params }: { params: Promise<{ city: string; slug: string }> }) {
  const { city, slug } = await params;
  const hotel = await getHotel(city, slug);
  return {
    title: hotel ? `${hotel.title} — StayZ` : "Khách sạn — StayZ",
    description: hotel?.description ?? `Đặt phòng tại ${hotel?.title ?? "khách sạn"} qua StayZ.`,
  };
}

export default async function HotelDetail({ params }: { params: Promise<{ city: string; slug: string }> }) {
  const { city, slug } = await params;
  const hotel = await getHotel(city, slug);
  if (!hotel) notFound();

  const [rooms, reviews] = await Promise.all([
    getRoomsByProperty(hotel._id),
    getReviews(hotel._id),
  ]);

  const images = [hotel.main_image_url, ...(hotel.gallery_images?.map((g) => g.url) ?? [])].filter(Boolean) as string[];
  const price = hotel.min_price ?? hotel.base_price;
  const enabledAmenities = Object.entries(hotel.amenities ?? {}).filter(([, v]) => v).map(([k]) => k);
  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;
  const activeRooms = rooms.filter((r) => r.is_active);

  return (
    <main id="main-content">
      <SiteHeader />
      <div className="shell detail-shell">
        <Link href="/search" className="back-link">
          <ArrowLeft size={14} aria-hidden="true" /> Quay lại danh sách
        </Link>

        {/* Title row */}
        <div className="detail-title">
          <div>
            <p className="eyebrow dark">{hotel.type ?? "Nơi lưu trú"} · {hotel.city}</p>
            <h1>{hotel.title}</h1>
            <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={14} aria-hidden="true" /> {hotel.address}
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--sp-3)" }}>
            {hotel.rating || avgRating ? (
              <div className="star-rating" style={{ fontSize: 14 }}>
                <Star size={16} fill="currentColor" aria-hidden="true" />
                <span>{hotel.rating?.toFixed(1) ?? avgRating}</span>
                <span style={{ color: "var(--color-ink-3)", fontWeight: 400 }}>
                  · {hotel.review_count ?? reviews.length} đánh giá
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 13, color: "var(--color-ink-3)" }}>Mới trên StayZ</span>
            )}
          </div>
        </div>

        {/* Gallery */}
        <div className="detail-gallery">
          <div style={{ position: "relative" }}>
            <Image src={resolveImage(images[0])} alt={hotel.title} fill sizes="70vw" priority style={{ objectFit: "cover" }} />
            <FavoriteButton propertyId={hotel._id} />
          </div>
          <div style={{ position: "relative" }}>
            <Image src={resolveImage(images[1] ?? images[0])} alt={`Không gian tại ${hotel.title}`} fill sizes="30vw" style={{ objectFit: "cover" }} />
          </div>
        </div>

        {/* Main content + booking card */}
        <div className="detail-copy">
          {/* Left: Description + Amenities */}
          <div>
            <p className="eyebrow dark">Về nơi lưu trú</p>
            <h2>Một kỳ nghỉ đáng nhớ đang chờ bạn</h2>
            <p>
              {hotel.description ||
                `${hotel.title} mang đến không gian nghỉ dưỡng chỉn chu và vị trí thuận tiện cho hành trình của bạn.`}
            </p>
            {enabledAmenities.length > 0 && (
              <div className="amenities" aria-label="Tiện nghi">
                {enabledAmenities.map((key) => (
                  <span className="amenity" key={key}>✓ {amenityNames[key] ?? key}</span>
                ))}
              </div>
            )}

            {/* Quick hotel info */}
            <div style={{ display: "flex", gap: "var(--sp-8)", marginTop: "var(--sp-8)", paddingTop: "var(--sp-6)", borderTop: "1px solid var(--color-border)" }}>
              {hotel.max_capacity && (
                <div style={{ textAlign: "center" }}>
                  <Users size={22} style={{ color: "var(--navy)", margin: "0 auto var(--sp-2)" }} aria-hidden="true" />
                  <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>Tối đa</p>
                  <strong style={{ fontSize: 18 }}>{hotel.max_capacity}</strong>
                  <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>khách/phòng</p>
                </div>
              )}
              {hotel.available_rooms != null && (
                <div style={{ textAlign: "center" }}>
                  <Bed size={22} style={{ color: "var(--navy)", margin: "0 auto var(--sp-2)" }} aria-hidden="true" />
                  <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>Phòng trống</p>
                  <strong style={{ fontSize: 18 }}>{hotel.available_rooms}</strong>
                  <p style={{ fontSize: 12, color: "var(--color-ink-3)" }}>phòng</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking card */}
          <aside className="booking-card" aria-label="Thông tin đặt phòng">
            <p>Giá từ</p>
            <strong>
              {price ? new Intl.NumberFormat("vi-VN").format(price) + " ₫" : "Liên hệ"}
            </strong>
            {price && <span style={{ display: "block", marginBottom: "var(--sp-4)" }}>/ đêm · đã bao gồm thuế</span>}
            <p style={{ fontSize: 12, color: "var(--color-ink-3)", marginBottom: "var(--sp-6)" }}>
              {hotel.available_rooms ?? 0} phòng đang hiển thị
              {hotel.max_capacity ? ` · tối đa ${hotel.max_capacity} khách/phòng` : ""}
            </p>
            {activeRooms.length > 0 ? (
              <a
                href="#rooms"
                className="booking-button"
                aria-label="Xem danh sách phòng để đặt"
                style={{ textAlign: "center", display: "block" }}
              >
                Chọn phòng
              </a>
            ) : (
              <Link href="/login" className="booking-button" style={{ textAlign: "center", display: "block" }}>
                Liên hệ
              </Link>
            )}
          </aside>
        </div>

        {/* Rooms section */}
        {activeRooms.length > 0 && (
          <section className="rooms-section" id="rooms" aria-labelledby="rooms-heading">
            <h2 id="rooms-heading">Chọn phòng của bạn</h2>
            <div className="room-grid">
              {activeRooms.map((room) => (
                <RoomCard
                  key={room._id}
                  room={room}
                  propertyCity={city}
                  propertySlug={slug}
                />
              ))}
            </div>
          </section>
        )}

        {/* Reviews section */}
        <section className="reviews-section" aria-labelledby="reviews-heading">
          <div className="reviews-header">
            <h2 id="reviews-heading">Đánh giá từ khách hàng</h2>
            {reviews.length > 0 && (
              <div className="reviews-avg" aria-label={`Điểm trung bình ${avgRating} sao`}>
                <span className="reviews-avg-num">{avgRating}</span>
                <div>
                  <div className="star-rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={16} fill={i < Math.round(Number(avgRating)) ? "var(--gold)" : "none"} stroke={i < Math.round(Number(avgRating)) ? "var(--gold)" : "var(--color-ink-3)"} aria-hidden="true" />
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 3 }}>
                    {reviews.length} đánh giá
                  </p>
                </div>
              </div>
            )}
          </div>

          {reviews.length > 0 ? (
            <div className="reviews-grid">
              {reviews.slice(0, 6).map((review) => (
                <ReviewCard key={review._id} review={review} />
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "var(--sp-10)" }}>
              <p style={{ color: "var(--color-ink-3)", fontSize: 14 }}>
                Chưa có đánh giá nào cho nơi lưu trú này.
              </p>
            </div>
          )}
        </section>
      </div>

      <footer className="footer">
        <div className="shell footer-inner">
          <Link href="/" className="brand brand-light">Stay<span className="z">Z</span></Link>
          <p>Stay somewhere unforgettable.</p>
          <p>© 2026 StayZ</p>
        </div>
      </footer>
    </main>
  );
}
