import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { getHotel, resolveImage } from "@/lib/api";

const amenityNames: Record<string, string> = {
  outdoor_pool: "Hồ bơi ngoài trời",
  free_wifi: "Wi-Fi miễn phí",
  airport_shuttle: "Đưa đón sân bay",
  non_smoking_room: "Phòng không hút thuốc",
  room_service: "Dịch vụ phòng",
  restaurant: "Nhà hàng",
  free_parking: "Bãi đỗ xe miễn phí",
  family_room: "Phòng gia đình",
  bar: "Quầy bar",
  breakfast: "Bữa sáng",
};

export default async function HotelDetail({ params }: { params: Promise<{ city: string; slug: string }> }) {
  const { city, slug } = await params;
  const hotel = await getHotel(city, slug);
  if (!hotel) notFound();
  const images = [hotel.main_image_url, ...(hotel.gallery_images?.map((item) => item.url) ?? [])].filter(Boolean);
  const price = hotel.min_price ?? hotel.base_price;

  return (
    <main id="main-content">
      <SiteHeader />
      <div className="shell detail-shell">
        <Link href="/search" className="back-link">← Quay lại danh sách</Link>
        <div className="detail-title">
          <div>
            <p className="eyebrow dark">{hotel.type ?? "Nơi lưu trú"} · {hotel.city}</p>
            <h1>{hotel.title}</h1>
            <p>{hotel.address}</p>
          </div>
          <div>{hotel.rating ? `★ ${hotel.rating} · ${hotel.review_count} đánh giá` : "Mới trên StayZ"}</div>
        </div>
        <div className="detail-gallery">
          <div><Image src={resolveImage(images[0])} alt={hotel.title} fill sizes="70vw" priority /></div>
          <div><Image src={resolveImage(images[1] ?? images[0])} alt={`Không gian tại ${hotel.title}`} fill sizes="30vw" /></div>
        </div>
        <div className="detail-copy">
          <div>
            <p className="eyebrow dark">Về nơi lưu trú</p>
            <h2>Một kỳ nghỉ đáng nhớ đang chờ bạn</h2>
            <p>{hotel.description || `${hotel.title} mang đến không gian nghỉ dưỡng chỉn chu và vị trí thuận tiện cho hành trình của bạn.`}</p>
            <div className="amenities">
              {Object.entries(hotel.amenities ?? {}).filter(([, enabled]) => enabled).map(([key]) => (
                <span className="amenity" key={key}>✓ {amenityNames[key] ?? key}</span>
              ))}
            </div>
          </div>
          <aside className="booking-card">
            <p>Giá từ</p>
            <strong>{price ? new Intl.NumberFormat("vi-VN").format(price) + " ₫" : "Liên hệ"}</strong>
            <span> / đêm</span>
            <p>{hotel.available_rooms ?? 0} phòng đang hiển thị · tối đa {hotel.max_capacity ?? "—"} khách/phòng</p>
            <Link href="/login" className="booking-button">Chọn phòng</Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
