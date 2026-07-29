import Link from "next/link";
import { HotelCard } from "@/components/hotel-card";
import { SearchBar } from "@/components/search-bar";
import { SiteHeader } from "@/components/site-header";
import { getFeaturedHotels } from "@/lib/api";
import { ArrowRight, ArrowUpRight, BadgeCheck, Headphones, ShieldCheck, Sparkles } from "lucide-react";

const destinations = [
  { name: "Đà Nẵng", slug: "da-nang", note: "Biển xanh & nghỉ dưỡng", tone: "sunset" },
  { name: "Đà Lạt", slug: "da-lat", note: "Thành phố ngàn hoa", tone: "forest" },
  { name: "Hà Nội", slug: "ha-noi", note: "Tinh hoa phố cổ", tone: "amber" },
  { name: "Vũng Tàu", slug: "vung-tau", note: "Chạm biển cuối tuần", tone: "ocean" },
];

export default async function Home() {
  const hotels = await getFeaturedHotels();

  return (
    <main id="main-content">
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="hero" aria-label="Trang chủ StayZ">
        <SiteHeader transparent />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-content shell">
          <p className="eyebrow">Khám phá Việt Nam theo cách của bạn</p>
          <h1>
            Nơi nghỉ hoàn hảo<br />
            <em>cho hành trình của bạn.</em>
          </h1>
          <p className="hero-copy">
            Từ những căn phòng nhìn ra biển đến góc nhỏ giữa lòng phố cổ —
            tìm kỳ nghỉ được tuyển chọn riêng cho bạn.
          </p>
          <SearchBar />
          <div className="trust-row">
            <span><BadgeCheck size={14} aria-hidden="true" /> Giá tốt, không phí ẩn</span>
            <span><ShieldCheck size={14} aria-hidden="true" /> Thanh toán bảo mật</span>
            <span><Headphones size={14} aria-hidden="true" /> Hỗ trợ 24/7</span>
          </div>
        </div>
      </section>

      {/* ── DESTINATIONS ─────────────────────────────────────── */}
      <section className="section shell" aria-labelledby="destinations-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow dark">Đi đâu tiếp theo?</p>
            <h2 id="destinations-heading">Điểm đến được yêu thích</h2>
          </div>
          <Link href="/search" className="text-link">
            Xem tất cả điểm đến <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="destination-grid">
          {destinations.map((destination, index) => (
            <Link
              href={`/search?city=${destination.slug}`}
              className={`destination-card ${destination.tone} destination-${index + 1}`}
              key={destination.slug}
              aria-label={`Khám phá ${destination.name}`}
            >
              <span className="destination-count">StayZ chọn lọc</span>
              <div>
                <h3>{destination.name}</h3>
                <p>{destination.note}</p>
              </div>
              <span className="round-arrow" aria-hidden="true">
                <ArrowUpRight size={16} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED HOTELS ──────────────────────────────────── */}
      <section className="section warm" aria-labelledby="featured-heading">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow dark">Được khách hàng lựa chọn</p>
              <h2 id="featured-heading">Nơi lưu trú nổi bật</h2>
            </div>
            <Link href="/search" className="text-link">
              Khám phá thêm <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          {hotels.length ? (
            <div className="hotel-grid">
              {hotels.slice(0, 6).map((hotel) => (
                <HotelCard hotel={hotel} key={hotel._id} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>Đang chuẩn bị những nơi lưu trú tuyệt nhất</h3>
              <p>Máy chủ có thể đang khởi động. Hãy thử lại sau ít phút.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── PROMISE ──────────────────────────────────────────── */}
      <section className="promise shell" aria-labelledby="promise-heading">
        <div>
          <span className="promise-icon" aria-hidden="true"><Sparkles size={22} /></span>
          <h3 id="promise-heading">Tuyển chọn có gu</h3>
          <p>Mỗi nơi lưu trú đều được chọn để mang đến một trải nghiệm đáng nhớ.</p>
        </div>
        <div>
          <span className="promise-icon" aria-hidden="true"><ShieldCheck size={22} /></span>
          <h3>Đặt phòng an tâm</h3>
          <p>Thông tin minh bạch, thanh toán bảo mật và xác nhận ngay lập tức.</p>
        </div>
        <div>
          <span className="promise-icon" aria-hidden="true"><Headphones size={22} /></span>
          <h3>Đồng hành 24/7</h3>
          <p>Đội ngũ StayZ luôn sẵn sàng trước, trong và sau chuyến đi của bạn.</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="footer">
        <div className="shell footer-inner">
          <Link href="/" className="brand brand-light">Stay<span className="z">Z</span></Link>
          <div className="footer-links">
            <Link href="/search">Khám phá</Link>
            <Link href="/login">Đăng nhập</Link>
            <Link href="/auth/register">Đăng ký</Link>
          </div>
          <p>© 2026 StayZ · Stay somewhere unforgettable.</p>
        </div>
      </footer>
    </main>
  );
}
