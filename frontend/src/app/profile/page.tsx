"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, Camera, Loader2, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { getUserById, updateUser, uploadAvatar } from "@/lib/api";
import { resolveImage } from "@/lib/api";
import type { User as UserType } from "@/lib/types";

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_access_token="));
  return m ? m.split("=").slice(1).join("=") : null;
}
function getStoredUser(): UserType | null {
  if (typeof document === "undefined") return null;
  try {
    const m = document.cookie.split("; ").find((c) => c.startsWith("stayz_user="));
    if (!m) return null;
    return JSON.parse(decodeURIComponent(m.split("=").slice(1).join("=")));
  } catch { return null; }
}
function saveUserCookie(u: UserType) {
  document.cookie = `stayz_user=${encodeURIComponent(JSON.stringify(u))}; max-age=${60 * 60 * 24 * 30}; path=/; samesite=lax`;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female" | "other">("");
  const [address, setAddress] = useState("");
  const [dob, setDob] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/login?redirect=/profile"); return; }
    const stored = getStoredUser();
    if (!stored) { router.replace("/login?redirect=/profile"); return; }
    getUserById(token, stored._id).then((u) => {
      if (u) {
        setUser(u);
        setFullName(u.full_name ?? "");
        setPhone(u.phone_number ?? "");
        setGender((u.gender ?? "") as typeof gender);
        setAddress(u.home_address ?? "");
        setDob(u.date_of_birth ? u.date_of_birth.slice(0, 10) : "");
      }
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false);
    const token = getToken();
    if (!token || !user) return;
    setSaving(true);
    const { data: updated, error: err } = await updateUser(token, user._id, {
      full_name: fullName,
      phone_number: phone,
      gender,
      home_address: address,
      date_of_birth: dob || undefined,
    });
    setSaving(false);
    if (err || !updated) { setError(err ?? "Lưu thất bại."); return; }
    setUser(updated);
    saveUserCookie(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getToken();
    if (!token || !user) return;
    setUploading(true);
    const form = new FormData();
    form.append("avatar", file);
    const { data: updated } = await uploadAvatar(token, form);
    setUploading(false);
    if (updated) {
      setUser(updated);
      saveUserCookie(updated);
    }
  }

  if (loading) return (
    <main id="main-content" className="profile-page">
      <SiteHeader />
      <div style={{ display: "flex", justifyContent: "center", padding: "var(--sp-24)" }}>
        <Loader2 size={32} style={{ animation: "spin .7s linear infinite", color: "var(--navy)" }} />
      </div>
    </main>
  );

  return (
    <main id="main-content" className="profile-page">
      <SiteHeader />
      <div className="profile-hero">
        <div className="shell">
          <div className="profile-avatar-wrap">
            {uploading ? (
              <div className="profile-avatar" style={{ display: "grid", placeItems: "center", background: "var(--color-muted)" }}>
                <Loader2 size={24} style={{ animation: "spin .7s linear infinite" }} />
              </div>
            ) : user?.avatar?.url ? (
              <img src={resolveImage(user.avatar.url)} alt="Avatar" className="profile-avatar" />
            ) : (
              <div className="profile-avatar" style={{ display: "grid", placeItems: "center", background: "rgba(255,255,255,.2)" }}>
                <User size={40} aria-hidden="true" />
              </div>
            )}
            <label className="profile-avatar-change" htmlFor="avatar-upload" aria-label="Đổi ảnh đại diện" style={{ cursor: "pointer" }}>
              <Camera size={14} aria-hidden="true" />
              <input id="avatar-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
            </label>
          </div>
          <h1>{user?.full_name ?? user?.email ?? "Tài khoản"}</h1>
          <p style={{ opacity: .8, fontSize: 14 }}>{user?.email}</p>
        </div>
      </div>

      <div className="profile-content">
        <div className="shell">
          <div className="profile-grid">
            {/* Sidebar nav */}
            <nav className="profile-nav" aria-label="Điều hướng tài khoản">
              <Link href="/profile" className="profile-nav-item active">
                <User size={16} aria-hidden="true" /> Thông tin cá nhân
              </Link>
              <Link href="/profile/bookings" className="profile-nav-item">
                📅 Đặt phòng của tôi
              </Link>
              <Link href="/favorites" className="profile-nav-item">
                ❤️ Yêu thích
              </Link>
            </nav>

            {/* Profile form */}
            <div className="profile-card">
              <h2>Thông tin cá nhân</h2>
              <form onSubmit={handleSave} noValidate>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-5)" }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-name">Họ và tên</label>
                    <input id="p-name" type="text" className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-phone">Số điện thoại</label>
                    <input id="p-phone" type="tel" className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="0901234567" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-gender">Giới tính</label>
                    <select id="p-gender" className="form-input" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
                      <option value="">Không xác định</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="p-dob">Ngày sinh</label>
                    <input id="p-dob" type="date" className="form-input" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().split("T")[0]} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="p-address">Địa chỉ</label>
                  <input id="p-address" type="text" className="form-input" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" placeholder="Số nhà, đường, thành phố..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={user?.email ?? ""} disabled style={{ opacity: .6, cursor: "not-allowed" }} aria-label="Email không thể thay đổi" />
                  <p style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 4 }}>Email không thể thay đổi.</p>
                </div>
                {error && <p className="form-error" role="alert">{error}</p>}
                {saved && (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", color: "var(--color-success)", fontSize: 14, marginBottom: "var(--sp-3)" }}>
                    <CheckCircle2 size={16} aria-hidden="true" /> Đã lưu thành công!
                  </div>
                )}
                <button type="submit" className="form-submit" style={{ maxWidth: 200 }} disabled={saving} aria-busy={saving}>
                  {saving ? <><Loader2 size={16} aria-hidden="true" /> Đang lưu...</> : "Lưu thay đổi"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
