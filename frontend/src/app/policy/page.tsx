import Link from "next/link";
import { ShieldCheck, Lock, FileText, CreditCard, RefreshCw } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách & Điều khoản — StayZ",
  description: "Các quy định đặt phòng, hủy phòng, bảo mật thông tin và thanh toán tại StayZ.",
};

export default function PolicyPage() {
  return (
    <main id="main-content" style={{ background: "var(--color-bg)", minHeight: "100dvh" }}>
      <SiteHeader />
      <section className="hero-policy" style={{ background: "linear-gradient(135deg, var(--navy), var(--navy-light))", color: "white", padding: "var(--sp-16) 0" }}>
        <div className="shell">
          <p className="eyebrow" style={{ color: "#e5b66d" }}>StayZ Policy & Terms</p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 54px)", fontWeight: 800, letterSpacing: "-.04em" }}>
            Chính sách & Điều khoản dịch vụ
          </h1>
          <p style={{ opacity: .8, fontSize: 16, maxWidth: 600 }}>
            Cam kết minh bạch về quyền lợi, quy định đặt hủy phòng và bảo mật dữ liệu khách hàng.
          </p>
        </div>
      </section>

      <div className="shell" style={{ padding: "var(--sp-12) 0 var(--sp-24)", display: "grid", gridTemplateColumns: "1fr", gap: "var(--sp-8)", maxWidth: 900 }}>
        {/* Section 1 */}
        <div className="book-section">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
            <FileText size={24} style={{ color: "var(--navy)" }} aria-hidden="true" />
            <h2 style={{ borderBottom: 0, paddingBottom: 0, margin: 0 }}>1. Quy định đặt phòng</h2>
          </div>
          <p style={{ color: "var(--color-ink-2)", fontSize: 15, lineHeight: 1.7 }}>
            Khách hàng có thể tìm kiếm và thực hiện đặt phòng trực tuyến thông qua nền tảng StayZ. Khi hoàn tất đặt phòng,
            thông tin booking sẽ được ghi nhận vào hệ thống và mã nhận phòng sẽ được tạo tự động. Quý khách vui lòng cung cấp
            đúng số lượng người lưu trú theo quy định của từng loại phòng.
          </p>
        </div>

        {/* Section 2 */}
        <div className="book-section">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
            <RefreshCw size={24} style={{ color: "var(--navy)" }} aria-hidden="true" />
            <h2 style={{ borderBottom: 0, paddingBottom: 0, margin: 0 }}>2. Chính sách hủy phòng & Hoàn tiền</h2>
          </div>
          <ul style={{ color: "var(--color-ink-2)", fontSize: 15, lineHeight: 1.8, paddingLeft: 20 }}>
            <li><strong>Hủy trước 7 ngày check-in:</strong> Hoàn tiền 100% số tiền đã thanh toán.</li>
            <li><strong>Hủy từ 3 - 7 ngày trước check-in:</strong> Hoàn tiền 50% số tiền đã thanh toán.</li>
            <li><strong>Hủy trong vòng 3 ngày hoặc không đến (No-show):</strong> Không áp dụng hoàn tiền.</li>
            <li>Mọi yêu cầu hủy phòng được thực hiện trực tiếp trên trang <strong>Đặt phòng của tôi</strong>.</li>
          </ul>
        </div>

        {/* Section 3 */}
        <div className="book-section">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
            <CreditCard size={24} style={{ color: "var(--navy)" }} aria-hidden="true" />
            <h2 style={{ borderBottom: 0, paddingBottom: 0, margin: 0 }}>3. Phương thức thanh toán</h2>
          </div>
          <p style={{ color: "var(--color-ink-2)", fontSize: 15, lineHeight: 1.7 }}>
            StayZ hỗ trợ cổng thanh toán bảo mật <strong>PayOS</strong> (Mã QR VietQR, thẻ ATM nội địa, thẻ quốc tế).
            Khách hàng có thể lựa chọn:
          </p>
          <ul style={{ color: "var(--color-ink-2)", fontSize: 15, lineHeight: 1.8, paddingLeft: 20, marginTop: 10 }}>
            <li><strong>Thanh toán 100%:</strong> Xác nhận ngay lập tức.</li>
            <li><strong>Đặt cọc 30%:</strong> Giữ phòng và thanh toán 70% còn lại khi làm thủ tục nhận phòng tại khách sạn.</li>
          </ul>
        </div>

        {/* Section 4 */}
        <div className="book-section">
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-3)" }}>
            <Lock size={24} style={{ color: "var(--navy)" }} aria-hidden="true" />
            <h2 style={{ borderBottom: 0, paddingBottom: 0, margin: 0 }}>4. Bảo mật thông tin cá nhân</h2>
          </div>
          <p style={{ color: "var(--color-ink-2)", fontSize: 15, lineHeight: 1.7 }}>
            StayZ cam kết bảo vệ dữ liệu cá nhân của người dùng. Mật khẩu được mã hóa an toàn, mã OTP xác thực email được giới hạn thời gian và số lần gửi.
            Thông tin thanh toán được xử lý thông qua đối tác thanh toán đạt chuẩn PCI-DSS.
          </p>
        </div>
      </div>

      <footer className="footer">
        <div className="shell footer-inner">
          <Link href="/" className="brand brand-light">Stay<span className="z">Z</span></Link>
          <p>© 2026 StayZ · Stay somewhere unforgettable.</p>
        </div>
      </footer>
    </main>
  );
}
