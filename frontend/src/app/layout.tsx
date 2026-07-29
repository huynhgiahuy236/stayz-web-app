import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StayZ — Mỗi hành trình, một nơi đáng nhớ",
  description: "Khám phá và đặt những nơi lưu trú được tuyển chọn trên khắp Việt Nam.",
  keywords: ["đặt phòng khách sạn", "du lịch Việt Nam", "nghỉ dưỡng", "StayZ"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
        {children}
      </body>
    </html>
  );
}
