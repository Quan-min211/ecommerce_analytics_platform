import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata = {
  title: "E-Commerce Analytics Dashboard",
  description: "Nền tảng phân tích dữ liệu thương mại điện tử Việt Nam — Shopee",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#F8FAFB] text-slate-900 font-sans antialiased">
        <Sidebar />
        <main className="ml-[260px] min-h-screen">
          <div className="p-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
