import Image from "next/image";
import { Bed, Users, Maximize2, Eye, Wind, Star } from "lucide-react";
import type { Room } from "@/lib/types";
import { resolveImage } from "@/lib/api";

interface Props {
  room: Room;
  propertyCity: string;
  propertySlug: string;
}

const roomTypeLabels: Record<string, string> = {
  standard_room: "Standard",
  deluxe_room: "Deluxe",
  suite: "Suite",
};

export function RoomCard({ room, propertyCity, propertySlug }: Props) {
  const imageSrc = resolveImage(room.main_image_url);

  return (
    <div className="room-card">
      <div className="room-card-img">
        <Image
          src={imageSrc}
          alt={room.name}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          style={{ objectFit: "cover" }}
          loading="lazy"
        />
      </div>
      <div className="room-card-body">
        <span className="room-type-badge">
          {roomTypeLabels[room.room_type] ?? room.room_type}
        </span>
        <p className="room-name">{room.name}</p>
        <div className="room-details">
          <span className="room-detail" title="Sức chứa">
            <Users size={13} aria-hidden="true" /> {room.capacity} khách
          </span>
          <span className="room-detail" title="Giường">
            <Bed size={13} aria-hidden="true" /> {room.bed_info}
          </span>
          {room.area ? (
            <span className="room-detail" title="Diện tích">
              <Maximize2 size={13} aria-hidden="true" /> {room.area} m²
            </span>
          ) : null}
          {room.view ? (
            <span className="room-detail" title="Tầm nhìn">
              <Eye size={13} aria-hidden="true" /> {room.view}
            </span>
          ) : null}
          {room.badges?.air_conditioning && (
            <span className="room-detail" title="Điều hòa">
              <Wind size={13} aria-hidden="true" /> Điều hòa
            </span>
          )}
        </div>

        <div className="room-price-row">
          <div className="room-price">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              {room.discount_percent > 0 && (
                <>
                  <span className="room-original-price">
                    {new Intl.NumberFormat("vi-VN").format(room.original_price)} ₫
                  </span>
                  <span className="room-discount-badge">-{room.discount_percent}%</span>
                </>
              )}
            </div>
            <strong>{new Intl.NumberFormat("vi-VN").format(room.price)} ₫</strong>
            <span style={{ marginLeft: 4 }}>/ đêm</span>
          </div>
          <a
            href={`/hotels/${encodeURIComponent(propertyCity)}/${propertySlug}/book?roomId=${room._id}`}
            className="btn-book"
            aria-label={`Đặt phòng ${room.name}`}
          >
            Đặt ngay
          </a>
        </div>
      </div>
    </div>
  );
}
