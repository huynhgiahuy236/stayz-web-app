import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/playfair-display";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayZ — Mỗi hành trình, một nơi đáng nhớ",
  description: "Khám phá và đặt những nơi lưu trú được tuyển chọn trên khắp Việt Nam.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
        {children}
      </body>
    </html>
  );
}
