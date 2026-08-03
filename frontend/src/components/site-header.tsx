"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LogOut, User, Heart, Calendar, ChevronDown, ShieldCheck, ShieldAlert } from "lucide-react";
import type { User as UserType } from "@/lib/types";

interface Props {
  transparent?: boolean;
}

function getUserFromCookie(): UserType | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.split("; ").find((c) => c.startsWith("stayz_user="));
    if (!match) return null;
    return JSON.parse(decodeURIComponent(match.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

function getInitials(name?: string): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function SiteHeader({ transparent = false }: Props) {
  const [user, setUser] = useState<UserType | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [solid, setSolid] = useState(!transparent);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getUserFromCookie());
  }, []);

  useEffect(() => {
    if (!transparent) return;
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [transparent]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    document.cookie = "stayz_access_token=; Max-Age=0; path=/";
    document.cookie = "stayz_refresh_token=; Max-Age=0; path=/";
    document.cookie = "stayz_user=; Max-Age=0; path=/";
    setUser(null);
    setDropOpen(false);
    window.location.href = "/";
  }

  const isAdmin = user?.role === "admin";

  return (
    <header className={`site-header ${solid ? "solid" : "transparent"}`}>
      <nav className="nav shell" aria-label="Điều hướng chính">
        {/* Brand */}
        <Link href="/" className="brand">
          Stay<span className="z">Z</span>
        </Link>

        {/* Nav links */}
        <div className="nav-links" role="menubar">
          <Link href="/search" role="menuitem">Khám phá</Link>
          <Link href="/search?type=resort" role="menuitem">Resort</Link>
          <Link href="/search?type=villa" role="menuitem">Villa</Link>
          <Link href="/favorites" role="menuitem" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Heart size={14} aria-hidden="true" /> Yêu thích
          </Link>
          <Link href="/policy" role="menuitem" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <ShieldCheck size={14} aria-hidden="true" /> Chính sách
          </Link>
          {isAdmin && (
            <Link href="/admin" role="menuitem" style={{ color: "var(--gold)", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ShieldAlert size={14} aria-hidden="true" /> Quản trị
            </Link>
          )}
        </div>

        {/* Actions */}
        <div className="nav-actions">
          {user ? (
            <div className="nav-dropdown" ref={dropRef}>
              <button
                className="nav-avatar-btn"
                onClick={() => setDropOpen((p) => !p)}
                aria-haspopup="true"
                aria-expanded={dropOpen}
                aria-label={`Tài khoản của ${user.full_name ?? user.email}`}
              >
                {user.avatar?.url ? (
                  <img
                    src={user.avatar.url}
                    alt={user.full_name ?? "Avatar"}
                    className="nav-avatar-img"
                  />
                ) : (
                  <span className="nav-avatar-initials" aria-hidden="true">
                    {getInitials(user.full_name)}
                  </span>
                )}
                <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.full_name?.split(" ").slice(-1)[0] ?? "Tài khoản"}
                </span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              {dropOpen && (
                <div className="nav-dropdown-menu" role="menu">
                  <Link href="/profile" className="nav-dropdown-item" role="menuitem" onClick={() => setDropOpen(false)}>
                    <User size={16} aria-hidden="true" /> Thông tin cá nhân
                  </Link>
                  <Link href="/profile/bookings" className="nav-dropdown-item" role="menuitem" onClick={() => setDropOpen(false)}>
                    <Calendar size={16} aria-hidden="true" /> Đặt phòng của tôi
                  </Link>
                  <Link href="/favorites" className="nav-dropdown-item" role="menuitem" onClick={() => setDropOpen(false)}>
                    <Heart size={16} aria-hidden="true" /> Yêu thích
                  </Link>
                  <Link href="/policy" className="nav-dropdown-item" role="menuitem" onClick={() => setDropOpen(false)}>
                    <ShieldCheck size={16} aria-hidden="true" /> Điều khoản & Chính sách
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="nav-dropdown-item" role="menuitem" onClick={() => setDropOpen(false)} style={{ color: "var(--gold)", fontWeight: 700 }}>
                      <ShieldAlert size={16} aria-hidden="true" /> Trang Quản trị (Admin)
                    </Link>
                  )}
                  <div className="nav-dropdown-divider" role="separator" />
                  <button className="nav-dropdown-item danger" role="menuitem" onClick={handleLogout}>
                    <LogOut size={16} aria-hidden="true" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Đăng nhập</Link>
              <Link href="/auth/register" className="btn-primary">Đăng ký</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
