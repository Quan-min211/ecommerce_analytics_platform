export const metadata = {
  title: "Pipeline Overview — E-Commerce Analytics Dashboard",
  description:
    "Toàn cảnh data pipeline: Medallion Architecture (Bronze → Silver → Gold), ETL status, data freshness và ML pipeline tracking.",
  keywords: ["data pipeline", "medallion architecture", "ETL", "bronze silver gold", "data engineering"],
  openGraph: {
    title: "Data Pipeline Overview — E-Commerce Analytics",
    description: "End-to-end data pipeline visualization: ingestion, processing, ML, and serving layers.",
    type: "website",
  },
};

export default function PipelineLayout({ children }) {
  return children;
}
