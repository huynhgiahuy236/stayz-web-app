import Image from "next/image";
import Link from "next/link";
import { resolveImage } from "@/lib/api";
import { Hotel } from "@/lib/types";
import { Heart, MapPin, Star } from "lucide-react";

const cityNames: Record<string, string> = {
  "da-nang": "Đà Nẵng",
  "da-lat": "Đà Lạt",
  "ha-noi": "Hà Nội",
  "ho-chi-minh": "TP. Hồ Chí Minh",
  "vung-tau": "Vũng Tàu",
};

function money(value?: number | null) {
  if (!value) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
}

export function HotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <article className="hotel-card">
      <div className="hotel-image-wrap">
        <Link href={`/hotels/${hotel.city}/${hotel.slug}`} aria-label={`Xem ${hotel.title}`}>
          <Image className="hotel-image" src={resolveImage(hotel.main_image_url)} alt={hotel.title} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw" />
        </Link>
        {hotel.is_preferred && <span className="hotel-badge">StayZ tuyển chọn</span>}
        <button className="favorite" type="button" aria-label={`Thêm ${hotel.title} vào yêu thích`}><Heart aria-hidden="true" /></button>
      </div>
      <Link href={`/hotels/${hotel.city}/${hotel.slug}`}>
        <div className="hotel-meta">
          <span>{cityNames[hotel.city] ?? hotel.city}</span>
          <span>{hotel.rating ? <><Star aria-hidden="true" /> {hotel.rating} ({hotel.review_count ?? 0})</> : "Mới trên StayZ"}</span>
        </div>
        <h3>{hotel.title}</h3>
        <p className="hotel-location"><MapPin aria-hidden="true" /> {hotel.address}</p>
        <div className="hotel-price">
          <strong>{money(hotel.min_price ?? hotel.base_price)}</strong>
          <span>/ đêm</span>
        </div>
      </Link>
    </article>
  );
}
