"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { requestRegisterOtp, verifyRegisterOtp, register } from "@/lib/api";
import type { Metadata } from "next";

type Step = "email" | "otp" | "password";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step 1: Request OTP
  async function handleEmailStep(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !fullName) { setError("Vui lòng nhập đầy đủ thông tin."); return; }
    setLoading(true);
    const { error: err } = await requestRegisterOtp(email);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep("otp");
  }

  // Step 2: Verify OTP
  async function handleOtpStep(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Nhập đầy đủ 6 chữ số OTP."); return; }
    setLoading(true);
    const { error: err } = await verifyRegisterOtp(email, code);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep("password");
  }

  // Step 3: Register
  async function handlePasswordStep(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Mật khẩu phải ít nhất 6 ký tự."); return; }
    if (password !== confirmPw) { setError("Mật khẩu xác nhận không khớp."); return; }
    setLoading(true);
    const { data, error: err } = await register({ email, password, full_name: fullName });
    setLoading(false);
    if (err || !data) { setError(err ?? "Đăng ký thất bại. Vui lòng thử lại."); return; }
    // Save tokens
    const maxAge30d = 60 * 60 * 24 * 30;
    document.cookie = `stayz_access_token=${data.accessToken}; max-age=${60 * 15}; path=/; samesite=lax`;
    document.cookie = `stayz_refresh_token=${data.refreshToken}; max-age=${maxAge30d}; path=/; samesite=lax`;
    document.cookie = `stayz_user=${encodeURIComponent(JSON.stringify(data.user))}; max-age=${maxAge30d}; path=/; samesite=lax`;
    router.push("/");
    router.refresh();
  }

  function handleOtpChange(idx: number, val: string) {
    const v = val.replace(/\D/, "").slice(-1);
    const next = [...otp];
    next[idx] = v;
    setOtp(next);
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!v && idx > 0) otpRefs.current[idx - 1]?.focus();
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  async function resendOtp() {
    setError("");
    setLoading(true);
    await requestRegisterOtp(email);
    setLoading(false);
    setOtp(["", "", "", "", "", ""]);
    otpRefs.current[0]?.focus();
  }

  const stepIndex = step === "email" ? 0 : step === "otp" ? 1 : 2;

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-visual" aria-hidden="true">
        <div>
          <h2>Bắt đầu hành trình<br />của bạn ngay hôm nay</h2>
          <p>Đăng ký để lưu những nơi yêu thích và đặt phòng dễ dàng hơn bao giờ hết.</p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-form-wrap">
          <Link href="/" className="auth-logo">Stay<span className="z">Z</span></Link>

          {/* Step indicator */}
          <div className="step-indicator" aria-label="Tiến trình đăng ký" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemax={3}>
            {["Thông tin", "Xác thực", "Mật khẩu"].map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={`step-dot ${i < stepIndex ? "done" : i === stepIndex ? "active" : ""}`} title={label} />
                <span style={{ fontSize: 11, color: i === stepIndex ? "var(--navy)" : "var(--color-ink-3)", fontWeight: i === stepIndex ? 700 : 400 }}>
                  {label}
                </span>
                {i < 2 && <span style={{ color: "var(--color-border)", margin: "0 4px" }}>—</span>}
              </div>
            ))}
          </div>

          {/* Step 1: Email + Name */}
          {step === "email" && (
            <>
              <h1 className="auth-title">Tạo tài khoản</h1>
              <p className="auth-sub">Nhập thông tin để bắt đầu. Chúng tôi sẽ gửi mã xác thực qua email.</p>
              <form onSubmit={handleEmailStep} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-name">Họ và tên</label>
                  <input id="reg-name" type="text" className="form-input" placeholder="Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-email">Email</label>
                  <input id="reg-email" type="email" className="form-input" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? <><Loader2 size={18} aria-hidden="true" /> Đang gửi...</> : "Gửi mã xác thực"}
                </button>
              </form>
            </>
          )}

          {/* Step 2: OTP */}
          {step === "otp" && (
            <>
              <h1 className="auth-title">Xác thực email</h1>
              <p className="auth-sub">Nhập mã 6 chữ số đã gửi đến <strong>{email}</strong></p>
              <form onSubmit={handleOtpStep} noValidate>
                <div className="otp-inputs" role="group" aria-label="Mã OTP 6 chữ số">
                  {otp.map((v, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      className="otp-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={v}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      aria-label={`Số ${i + 1}`}
                    />
                  ))}
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? <><Loader2 size={18} aria-hidden="true" /> Đang xác thực...</> : "Xác nhận mã"}
                </button>
                <p style={{ textAlign: "center", marginTop: "var(--sp-5)", fontSize: 13, color: "var(--color-ink-3)" }}>
                  Chưa nhận được? <button type="button" className="resend-link" onClick={resendOtp} disabled={loading}>Gửi lại</button>
                </p>
              </form>
            </>
          )}

          {/* Step 3: Password */}
          {step === "password" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-5)" }}>
                <CheckCircle2 size={28} style={{ color: "var(--color-success)", flexShrink: 0 }} aria-hidden="true" />
                <div>
                  <h1 className="auth-title" style={{ marginBottom: 0 }}>Email đã xác thực!</h1>
                  <p style={{ fontSize: 13, color: "var(--color-ink-3)" }}>Tạo mật khẩu để hoàn tất đăng ký.</p>
                </div>
              </div>
              <form onSubmit={handlePasswordStep} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-pw">Mật khẩu</label>
                  <div style={{ position: "relative" }}>
                    <input id="reg-pw" type={showPw ? "text" : "password"} className="form-input" placeholder="Ít nhất 6 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPw((p) => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer", color: "var(--color-ink-3)" }} aria-label={showPw ? "Ẩn" : "Hiện"}>
                      {showPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="reg-confirm-pw">Xác nhận mật khẩu</label>
                  <input id="reg-confirm-pw" type="password" className="form-input" placeholder="Nhập lại mật khẩu" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" required />
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? <><Loader2 size={18} aria-hidden="true" /> Đang tạo tài khoản...</> : "Hoàn tất đăng ký"}
                </button>
              </form>
            </>
          )}

          <p className="auth-alt">Đã có tài khoản? <Link href="/login">Đăng nhập</Link></p>
        </div>
      </div>
    </main>
  );
}
