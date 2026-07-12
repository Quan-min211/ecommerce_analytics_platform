export const metadata = {
  title: "Monitoring — E-Commerce Analytics Dashboard",
  description:
    "Giám sát hệ thống: theo dõi sức khỏe dữ liệu, pipeline ETL, cảnh báo bất thường và trạng thái crawler.",
  keywords: ["monitoring", "system health", "ETL pipeline", "data quality", "e-commerce"],
  openGraph: {
    title: "Monitoring — Vietnam E-Commerce Analytics",
    description: "Monitor data pipeline health, ETL status, and system alerts.",
    type: "website",
  },
};

export default function MonitoringLayout({ children }) {
  return children;
}
