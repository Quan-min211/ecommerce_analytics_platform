import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
        <Navbar />
        {/* pt-16 offsets the fixed 64px navbar */}
        <div className="flex flex-col min-h-screen pt-16">
          <main className="flex-1">
            <div className="max-w-screen-2xl mx-auto px-6 py-8">{children}</div>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
