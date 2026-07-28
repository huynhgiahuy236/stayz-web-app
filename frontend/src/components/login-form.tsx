"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Đăng nhập không thành công.");
      const session = body.metaData;
      if (!session?.accessToken) throw new Error("Phản hồi đăng nhập không hợp lệ.");
      sessionStorage.setItem("stayz_access_token", session.accessToken);
      sessionStorage.setItem("stayz_user", JSON.stringify(session.user ?? {}));
      router.push("/");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={submit}>
      <p className="eyebrow dark">Tài khoản StayZ</p>
      <h2>Đăng nhập</h2>
      <label htmlFor="email">Email</label>
      <input id="email" name="email" type="email" placeholder="ban@example.com" autoComplete="email" required />
      <label htmlFor="password">Mật khẩu</label>
      <input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required />
      {error && <p className="form-error" role="alert">{error}</p>}
      <button type="submit" disabled={loading}>{loading ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      <p className="form-note">Chưa có tài khoản? Tính năng đăng ký sẽ được bổ sung ở chặng tiếp theo.</p>
    </form>
  );
}
