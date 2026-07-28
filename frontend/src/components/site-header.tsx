import Link from "next/link";
import { Menu, UserRound, X } from "lucide-react";

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  return (
    <header className={`site-header ${transparent ? "" : "solid"}`}>
      <nav className="nav shell">
        <Link href="/" className="brand">Stay<span>Z</span></Link>
        <div className="nav-links">
          <Link href="/search">Khách sạn</Link>
          <Link href="/search?type=resort">Khu nghỉ dưỡng</Link>
          <Link href="/search?city=da-nang">Điểm đến</Link>
          <Link href="/#about">Về StayZ</Link>
          <Link href="/login" className="nav-action"><UserRound aria-hidden="true" /> Đăng nhập</Link>
        </div>
        <details className="mobile-nav">
          <summary aria-label="Mở menu"><Menu aria-hidden="true" /></summary>
          <div className="mobile-nav-panel">
            <div className="mobile-nav-head">
              <span>Điều hướng</span>
              <X aria-hidden="true" />
            </div>
            <Link href="/search">Khách sạn</Link>
            <Link href="/search?type=resort">Khu nghỉ dưỡng</Link>
            <Link href="/search?city=da-nang">Điểm đến</Link>
            <Link href="/login">Đăng nhập</Link>
          </div>
        </details>
      </nav>
    </header>
  );
}
