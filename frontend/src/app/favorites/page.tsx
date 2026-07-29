"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Loader2, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { HotelCard } from "@/components/hotel-card";
import { getMyFavorites, removeFavorite } from "@/lib/api";
import type { Favorite, Hotel } from "@/lib/types";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_access_token="));
  return m ? m.split("=").slice(1).join("=") : null;
}

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/login?redirect=/favorites"); return; }
    getMyFavorites(token).then((data) => {
      setFavorites(data);
      setLoading(false);
    });
  }, []);

  async function handleRemove(propertyId: string) {
    const token = getToken();
    if (!token) return;
    setRemoving(propertyId);
    await removeFavorite(token, propertyId);
    setFavorites((prev) => prev.filter((f) => {
      const pid = typeof f.property_id === "object" ? (f.property_id as Hotel)._id : f.property_id;
      return pid !== propertyId;
    }));
    setRemoving(null);
  }

  const hotels = favorites
    .map((f) => (typeof f.property_id === "object" ? (f.property_id as Hotel) : null))
    .filter(Boolean) as Hotel[];

  if (loading) return (
    <main id="main-content" className="favorites-page">
      <SiteHeader />
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-24)" }}>
        <Loader2 size={32} style={{ animation: "spin .7s linear infinite", color: "var(--navy)" }} />
      </div>
    </main>
  );

  return (
    <main id="main-content" className="favorites-page">
      <SiteHeader />
      <div className="favorites-hero">
        <div className="shell">
          <h1>Nơi lưu trú yêu thích</h1>
          <p style={{ opacity: .8, fontSize: 14 }}>{hotels.length} nơi lưu trú đã lưu</p>
        </div>
      </div>

      <div className="shell" style={{ paddingTop: "var(--sp-10)", paddingBottom: "var(--sp-24)" }}>
        {hotels.length === 0 ? (
          <div className="empty-state" style={{ marginTop: "var(--sp-10)" }}>
            <Heart size={40} style={{ color: "var(--color-ink-3)", margin: "0 auto var(--sp-4)" }} aria-hidden="true" />
            <h3>Chưa có nơi lưu trú yêu thích</h3>
            <p>Nhấn vào biểu tượng trái tim khi xem khách sạn để lưu lại.</p>
            <Link href="/search" className="btn-primary" style={{ display: "inline-flex", marginTop: "var(--sp-6)", textDecoration: "none" }}>
              Khám phá khách sạn
            </Link>
          </div>
        ) : (
          <div className="hotel-grid">
            {hotels.map((hotel) => {
              const fav = favorites.find((f) => {
                const pid = typeof f.property_id === "object" ? (f.property_id as Hotel)._id : f.property_id;
                return pid === hotel._id;
              });
              return (
                <div key={hotel._id} style={{ position: "relative" }}>
                  <HotelCard hotel={hotel} />
                  <button
                    onClick={() => handleRemove(hotel._id)}
                    disabled={removing === hotel._id}
                    aria-label={`Xóa ${hotel.title} khỏi yêu thích`}
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      zIndex: 10,
                      width: 36,
                      height: 36,
                      border: 0,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,.92)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--color-destructive)",
                      transition: "background var(--t-fast)",
                    }}
                  >
                    {removing === hotel._id
                      ? <Loader2 size={16} style={{ animation: "spin .7s linear infinite" }} aria-hidden="true" />
                      : <Trash2 size={16} aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
