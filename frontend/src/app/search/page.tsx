import { HotelCard } from "@/components/hotel-card";
import { SearchBar } from "@/components/search-bar";
import { SiteHeader } from "@/components/site-header";
import { searchHotels } from "@/lib/api";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tìm kiếm khách sạn — StayZ",
  description: "Tìm và đặt những nơi lưu trú được tuyển chọn trên khắp Việt Nam.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const hotels = await searchHotels({
    keyword: params.keyword,
    city: params.city,
    guests: params.guests,
    type: params.type,
  });

  const hasFilters = !!(params.keyword || params.city || params.guests || params.type);

  return (
    <main className="listing-page" id="main-content">
      <SiteHeader />
      <section className="listing-hero">
        <div className="shell">
          <p className="eyebrow" style={{ color: "rgba(255,255,255,.7)" }}>StayZ collection</p>
          <h1>Tìm nơi dành cho bạn</h1>
          <p>Những kỳ nghỉ được tuyển chọn trên khắp Việt Nam.</p>
          <div className="listing-search">
            <SearchBar
              initialCity={params.city}
              initialKeyword={params.keyword}
            />
          </div>
        </div>
      </section>

      <section className="listing-content shell" aria-label="Kết quả tìm kiếm">
        <p className="result-count">
          {hasFilters
            ? `${hotels.length} nơi lưu trú phù hợp với tìm kiếm của bạn`
            : `${hotels.length} nơi lưu trú`}
        </p>
        {hotels.length ? (
          <div className="hotel-grid">
            {hotels.map((hotel) => (
              <HotelCard hotel={hotel} key={hotel._id} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Chưa tìm thấy nơi phù hợp</h3>
            <p>Thử một điểm đến khác hoặc bỏ bớt điều kiện tìm kiếm.</p>
          </div>
        )}
      </section>

      <footer className="footer" style={{ marginTop: "var(--sp-16)" }}>
        <div className="shell footer-inner">
          <span className="brand brand-light">Stay<span style={{ color: "#e7b76b" }}>Z</span></span>
          <p>© 2026 StayZ</p>
        </div>
      </footer>
    </main>
  );
}
