import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thanh toán thành công — StayZ",
  description: "Đặt phòng của bạn đã được xác nhận.",
};

export default function PaymentReturnPage() {
  return (
    <main id="main-content">
      <SiteHeader />
      <div className="payment-page">
        <div className="payment-card">
          <div className="payment-icon success" aria-hidden="true">
            <CheckCircle2 size={36} />
          </div>
          <h1>Thanh toán thành công!</h1>
          <p>
            Đặt phòng của bạn đã được xác nhận. Chúng tôi sẽ gửi thông tin chi tiết
            qua email trong ít phút.
          </p>
          <p style={{ marginTop: "var(--sp-4)", fontSize: 13, color: "var(--color-ink-3)" }}>
            Cảm ơn bạn đã chọn StayZ cho hành trình của mình! 🎉
          </p>
          <div style={{ display: "flex", gap: "var(--sp-3)", justifyContent: "center", marginTop: "var(--sp-8)", flexWrap: "wrap" }}>
            <Link href="/profile/bookings" className="btn-primary" style={{ textDecoration: "none" }}>
              Xem đặt phòng của tôi
            </Link>
            <Link href="/" className="btn-outline" style={{ textDecoration: "none", color: "var(--navy)", border: "1.5px solid var(--navy)" }}>
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
