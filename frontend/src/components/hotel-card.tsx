import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { Hotel } from "@/lib/types";
import { resolveImage } from "@/lib/api";

interface Props {
  hotel: Hotel;
}

const typeLabels: Record<string, string> = {
  resort: "Resort",
  villa: "Villa",
  hotel: "Khách sạn",
  homestay: "Homestay",
};

export function HotelCard({ hotel }: Props) {
  const price = hotel.min_price ?? hotel.base_price;
  const imageSrc = resolveImage(hotel.main_image_url);
  const typeLabel = typeLabels[hotel.type?.toLowerCase() ?? ""] ?? hotel.type ?? "Nơi lưu trú";

  return (
    <Link href={`/hotels/${encodeURIComponent(hotel.city.toLowerCase().replace(/\s+/g, "-"))}/${hotel.slug}`} className="hotel-card" aria-label={`Xem ${hotel.title}`}>
      <div className="hotel-image-wrap">
        <Image
          src={imageSrc}
          alt={hotel.title}
          fill
          sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw"
          className="hotel-image"
          loading="lazy"
        />
        {hotel.is_preferred && (
          <div className="hotel-badge" aria-label="Được StayZ chọn lọc">StayZ Pick</div>
        )}
      </div>
      <div className="hotel-meta">
        <span>{typeLabel}</span>
        {hotel.rating && (
          <span className="star-rating" aria-label={`Đánh giá ${hotel.rating} sao`}>
            <Star size={11} fill="currentColor" aria-hidden="true" />
            {hotel.rating.toFixed(1)}
            {hotel.review_count != null && (
              <span style={{ color: "var(--color-ink-3)", fontWeight: 400 }}>
                ({hotel.review_count})
              </span>
            )}
          </span>
        )}
      </div>
      <h3>{hotel.title}</h3>
      <p className="hotel-location">
        <MapPin size={12} style={{ display: "inline", marginRight: 4 }} aria-hidden="true" />
        {hotel.address}
      </p>
      <div className="hotel-price">
        <strong>
          {price
            ? new Intl.NumberFormat("vi-VN").format(price) + " ₫"
            : "Liên hệ"}
        </strong>
        {price && <span>/ đêm</span>}
      </div>
    </Link>
  );
}
