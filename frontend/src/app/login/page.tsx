import { LoginForm } from "@/components/login-form";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <main className="login-page">
      <SiteHeader />
      <section className="login-layout shell">
        <div className="login-story">
          <p className="eyebrow">Chào mừng trở lại</p>
          <h1>Hành trình tiếp theo đang chờ.</h1>
          <p>Đăng nhập để quản lý chuyến đi, lưu nơi yêu thích và nhận những gợi ý dành riêng cho bạn.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
