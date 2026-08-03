"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function GoogleLoginCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const invalidCallback = !params.get("accessToken") || !params.get("refreshToken") || !params.get("userId") || !params.get("email");

  useEffect(() => {
    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    const userId = params.get("userId");
    const email = params.get("email");
    const name = params.get("name");
    const avatar = params.get("avatar");
    const role = params.get("role") === "admin" ? "admin" : "user";

    if (!accessToken || !refreshToken || !userId || !email) {
      return;
    }

    const secure = window.location.protocol === "https:" ? "; secure" : "";
    const user = {
      _id: userId,
      email,
      full_name: name || email.split("@")[0],
      avatar: { url: avatar || "", public_id: "" },
      role,
    };
    document.cookie = `stayz_access_token=${encodeURIComponent(accessToken)}; max-age=${60 * 15}; path=/; samesite=lax${secure}`;
    document.cookie = `stayz_refresh_token=${encodeURIComponent(refreshToken)}; max-age=${60 * 60 * 24 * 30}; path=/; samesite=lax${secure}`;
    document.cookie = `stayz_user=${encodeURIComponent(JSON.stringify(user))}; max-age=${60 * 60 * 24 * 30}; path=/; samesite=lax${secure}`;

    window.history.replaceState({}, "", "/login-success");
    router.replace("/");
    router.refresh();
  }, [params, router]);

  return (
    <main className="auth-page" id="main-content">
      <div className="auth-panel" style={{ margin: "auto" }}>
        <div className="auth-form-wrap">
          <h1 className="auth-title">{invalidCallback ? "Không thể đăng nhập" : "Đang đăng nhập..."}</h1>
          <p className={invalidCallback ? "form-error" : "auth-sub"} role={invalidCallback ? "alert" : undefined}>
            {invalidCallback ? "Dữ liệu đăng nhập Google không hợp lệ. Vui lòng thử lại." : "StayZ đang hoàn tất đăng nhập bằng Google."}
          </p>
          {invalidCallback && <a href="/login" className="form-submit">Quay lại đăng nhập</a>}
        </div>
      </div>
    </main>
  );
}

export default function LoginSuccessPage() {
  return <Suspense fallback={null}><GoogleLoginCallback /></Suspense>;
}
