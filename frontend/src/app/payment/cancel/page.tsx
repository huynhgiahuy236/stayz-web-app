import Link from "next/link";
import { XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thanh toán bị hủy — StayZ",
  description: "Thanh toán đã bị hủy. Bạn có thể thử lại.",
};

export default function PaymentCancelPage() {
  return (
    <main id="main-content">
      <SiteHeader />
      <div className="payment-page">
        <div className="payment-card">
          <div className="payment-icon cancel" aria-hidden="true">
            <XCircle size={36} />
          </div>
          <h1>Thanh toán bị hủy</h1>
          <p>
            Bạn đã hủy quá trình thanh toán. Đặt phòng của bạn vẫn còn ở trạng thái
            <strong> chờ thanh toán</strong> trong vòng 15 phút.
          </p>
          <p style={{ marginTop: "var(--sp-4)", fontSize: 13, color: "var(--color-ink-3)" }}>
            Bạn có thể quay lại để hoàn tất thanh toán bất cứ lúc nào.
          </p>
          <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "center", marginTop: "var(--sp-8)", flexWrap: "wrap" }}>
            <Link href="/profile/bookings" className="btn-primary" style={{ textDecoration: "none" }}>
              Xem đặt phòng của tôi
            </Link>
            <Link href="/search" className="btn-outline" style={{ textDecoration: "none", color: "var(--navy)", border: "1.5px solid var(--navy)" }}>
              Tìm khách sạn khác
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
