import { HotelCard } from "@/components/hotel-card";
import { SearchBar } from "@/components/search-bar";
import { SiteHeader } from "@/components/site-header";
import { searchHotels } from "@/lib/api";

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

  return (
    <main className="listing-page" id="main-content">
      <SiteHeader />
      <section className="listing-hero">
        <div className="shell">
          <p className="eyebrow dark">StayZ collection</p>
          <h1>Tìm nơi dành cho bạn</h1>
          <p>Những kỳ nghỉ được tuyển chọn trên khắp Việt Nam.</p>
          <div className="listing-search">
            <SearchBar initialCity={params.city} initialKeyword={params.keyword} />
          </div>
        </div>
      </section>
      <section className="listing-content shell">
        <p className="result-count">{hotels.length} nơi lưu trú phù hợp</p>
        {hotels.length ? (
          <div className="hotel-grid">
            {hotels.map((hotel) => <HotelCard hotel={hotel} key={hotel._id} />)}
          </div>
        ) : (
          <div className="empty-state">
            <h3>Chưa tìm thấy nơi phù hợp</h3>
            <p>Thử một điểm đến khác hoặc bỏ bớt điều kiện tìm kiếm.</p>
          </div>
        )}
      </section>
    </main>
  );
}
