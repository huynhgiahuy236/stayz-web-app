"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { login } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Vui lòng nhập đầy đủ thông tin."); return; }
    setLoading(true);
    const { data, error: err } = await login(email, password);
    setLoading(false);
    if (err || !data) { setError(err ?? "Đăng nhập thất bại. Vui lòng thử lại."); return; }

    // Save tokens to cookies
    const maxAge15m = 60 * 15;
    const maxAge30d = 60 * 60 * 24 * 30;
    document.cookie = `stayz_access_token=${data.accessToken}; max-age=${maxAge15m}; path=/; samesite=lax`;
    document.cookie = `stayz_refresh_token=${data.refreshToken}; max-age=${maxAge30d}; path=/; samesite=lax`;
    document.cookie = `stayz_user=${encodeURIComponent(JSON.stringify(data.user))}; max-age=${maxAge30d}; path=/; samesite=lax`;
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="auth-form-wrap">
      <Link href="/" className="auth-logo">Stay<span className="z">Z</span></Link>
      <h1 className="auth-title">Chào mừng trở lại</h1>
      <p className="auth-sub">Đăng nhập để tiếp tục hành trình của bạn.</p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className={`form-input ${error ? "error" : ""}`}
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="login-password">Mật khẩu</label>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              type={showPw ? "text" : "password"}
              className={`form-input ${error ? "error" : ""}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((p) => !p)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer", color: "var(--color-ink-3)" }}
              aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert" aria-live="polite">{error}</p>
        )}

        <div style={{ textAlign: "right", marginTop: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
          <Link href="/auth/forgot-password" style={{ fontSize: 13, color: "var(--navy)", fontWeight: 600 }}>
            Quên mật khẩu?
          </Link>
        </div>

        <button type="submit" className="form-submit" disabled={loading} aria-busy={loading}>
          {loading ? <><Loader2 size={18} className="spinner" aria-hidden="true" /> Đang đăng nhập...</> : "Đăng nhập"}
        </button>
      </form>

      <p className="auth-alt">
        Chưa có tài khoản? <Link href="/auth/register">Đăng ký ngay</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="auth-page" id="main-content">
      {/* Left visual panel */}
      <div className="auth-visual" aria-hidden="true">
        <div>
          <h2>Khám phá những<br />nơi lưu trú đáng nhớ</h2>
          <p>Hơn 100 điểm đến được tuyển chọn trên khắp Việt Nam đang chờ bạn.</p>
        </div>
      </div>
      {/* Right form panel */}
      <div className="auth-panel">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
