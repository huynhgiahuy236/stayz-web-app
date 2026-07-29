"use client";
import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { addFavorite, removeFavorite, checkIsFavorite } from "@/lib/api";

interface Props {
  propertyId: string;
  initialFav?: boolean;
}

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_access_token="));
  return m ? m.split("=").slice(1).join("=") : null;
}

export function FavoriteButton({ propertyId, initialFav = false }: Props) {
  const [isFav, setIsFav] = useState(initialFav);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecked(true); return; }
    checkIsFavorite(token, propertyId).then((res) => {
      if (res) setIsFav(res.is_favorite);
      setChecked(true);
    });
  }, [propertyId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const token = getToken();
    if (!token) {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setLoading(true);
    if (isFav) {
      await removeFavorite(token, propertyId);
      setIsFav(false);
    } else {
      await addFavorite(token, propertyId);
      setIsFav(true);
    }
    setLoading(false);
  }

  if (!checked) return null;

  return (
    <button
      className={`fav-btn ${isFav ? "active" : ""}`}
      onClick={toggle}
      disabled={loading}
      aria-label={isFav ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"}
      aria-pressed={isFav}
    >
      <Heart
        size={17}
        fill={isFav ? "currentColor" : "none"}
        aria-hidden="true"
        style={{ transition: "transform 200ms", transform: loading ? "scale(.85)" : "scale(1)" }}
      />
    </button>
  );
}
