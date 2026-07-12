import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

export const metadata = {
  title: {
    default: "E-Commerce Analytics Dashboard",
    template: "%s | E-Commerce Analytics",
  },
  description:
    "Nền tảng phân tích dữ liệu thương mại điện tử Việt Nam — Thu thập, xử lý và trực quan hóa dữ liệu Shopee qua pipeline Bronze → Silver → Gold với NLP Sentiment Analysis.",
  keywords: [
    "e-commerce analytics",
    "shopee data",
    "vietnam market",
    "sentiment analysis",
    "data pipeline",
    "dashboard",
  ],
  authors: [{ name: "HCMUTE DA Project" }],
  robots: { index: false, follow: false },
  openGraph: {
    title: "E-Commerce Analytics Dashboard",
    description: "Vietnam e-commerce data analytics platform powered by Shopee scraping + NLP.",
    type: "website",
    locale: "vi_VN",
  },
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
