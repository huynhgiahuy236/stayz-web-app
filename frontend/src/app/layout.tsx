import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "StayZ — Mỗi hành trình, một nơi đáng nhớ",
  description: "Khám phá và đặt những nơi lưu trú được tuyển chọn trên khắp Việt Nam.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${sans.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
        {children}
      </body>
    </html>
  );
}
