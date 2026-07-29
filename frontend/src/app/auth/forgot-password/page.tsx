"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { requestPasswordReset, verifyResetCode, resetPasswordWithCode } from "@/lib/api";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email) { setError("Nhập email của bạn."); return; }
    setLoading(true);
    const { error: err } = await requestPasswordReset(email);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep("otp");
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Nhập đủ 6 chữ số."); return; }
    setLoading(true);
    const { error: err } = await verifyResetCode(email, code);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep("password");
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Mật khẩu phải ít nhất 6 ký tự."); return; }
    if (password !== confirmPw) { setError("Mật khẩu xác nhận không khớp."); return; }
    setLoading(true);
    const { error: err } = await resetPasswordWithCode(email, otp.join(""), password);
    setLoading(false);
    if (err) { setError(err); return; }
    setStep("done");
  }

  function handleOtpChange(idx: number, val: string) {
    const v = val.replace(/\D/, "").slice(-1);
    const next = [...otp]; next[idx] = v; setOtp(next);
    if (v && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!v && idx > 0) otpRefs.current[idx - 1]?.focus();
  }

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-visual" aria-hidden="true">
        <div>
          <h2>Đặt lại mật khẩu<br />an toàn & nhanh chóng</h2>
          <p>Chúng tôi sẽ gửi mã xác thực đến email của bạn.</p>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-form-wrap">
          <Link href="/" className="auth-logo">Stay<span className="z">Z</span></Link>

          {step === "email" && (
            <>
              <h1 className="auth-title">Quên mật khẩu?</h1>
              <p className="auth-sub">Nhập email của bạn để nhận mã đặt lại mật khẩu.</p>
              <form onSubmit={handleEmail} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="fp-email">Email</label>
                  <input id="fp-email" type="email" className="form-input" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? <><Loader2 size={18} aria-hidden="true" /> Đang gửi...</> : "Gửi mã đặt lại"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h1 className="auth-title">Nhập mã xác thực</h1>
              <p className="auth-sub">Mã 6 chữ số đã gửi đến <strong>{email}</strong></p>
              <form onSubmit={handleOtp} noValidate>
                <div className="otp-inputs" role="group" aria-label="OTP">
                  {otp.map((v, i) => (
                    <input key={i} ref={(el) => { otpRefs.current[i] = el; }} className="otp-input" type="text" inputMode="numeric" maxLength={1} value={v} onChange={(e) => handleOtpChange(i, e.target.value)} aria-label={`Số ${i + 1}`} />
                  ))}
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? <><Loader2 size={18} aria-hidden="true" /> Đang xác thực...</> : "Xác nhận"}
                </button>
              </form>
            </>
          )}

          {step === "password" && (
            <>
              <h1 className="auth-title">Mật khẩu mới</h1>
              <p className="auth-sub">Tạo mật khẩu mới cho tài khoản của bạn.</p>
              <form onSubmit={handlePassword} noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="fp-pw">Mật khẩu mới</label>
                  <div style={{ position: "relative" }}>
                    <input id="fp-pw" type={showPw ? "text" : "password"} className="form-input" placeholder="Ít nhất 6 ký tự" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ paddingRight: 44 }} />
                    <button type="button" onClick={() => setShowPw((p) => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer", color: "var(--color-ink-3)" }} aria-label={showPw ? "Ẩn" : "Hiện"}>
                      {showPw ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="fp-confirm">Xác nhận mật khẩu</label>
                  <input id="fp-confirm" type="password" className="form-input" placeholder="Nhập lại" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                <button type="submit" className="form-submit" disabled={loading}>
                  {loading ? <><Loader2 size={18} aria-hidden="true" /> Đang cập nhật...</> : "Cập nhật mật khẩu"}
                </button>
              </form>
            </>
          )}

          {step === "done" && (
            <div style={{ textAlign: "center", paddingTop: "var(--sp-8)" }}>
              <CheckCircle2 size={56} style={{ color: "var(--color-success)", margin: "0 auto var(--sp-5)" }} aria-hidden="true" />
              <h1 className="auth-title">Đặt lại thành công!</h1>
              <p className="auth-sub">Mật khẩu của bạn đã được cập nhật. Hãy đăng nhập lại.</p>
              <Link href="/login" className="form-submit" style={{ display: "flex", textDecoration: "none", justifyContent: "center", marginTop: "var(--sp-8)" }}>
                Đăng nhập ngay
              </Link>
            </div>
          )}

          <p className="auth-alt"><Link href="/login">← Quay lại đăng nhập</Link></p>
        </div>
      </div>
    </main>
  );
}
