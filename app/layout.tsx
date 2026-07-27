import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quizly — Học vui, nhớ lâu",
  description: "Tạo và chinh phục những bộ câu hỏi trắc nghiệm của riêng bạn.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
