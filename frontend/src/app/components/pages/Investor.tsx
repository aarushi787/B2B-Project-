import { BarChart2 } from "lucide-react";

export function Investor() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 24px" }}>Investor Insights</h1>
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 48, textAlign: "center" }}>
        <BarChart2 size={32} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>No data yet</p>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          Platform metrics such as GMV, revenue and user growth will appear here once there is real activity to report.
        </p>
      </div>
    </div>
  );
}
