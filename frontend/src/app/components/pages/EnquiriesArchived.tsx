// Enquiries Archived — matches dashboard-enquiries-archived.png
import { Card, SearchInput, StatusBadge } from "../ui/DesignSystem";

const ARCHIVED_ENQ = [
  { party: "Soylent Corp",         subject: "Web development consultation",     date: "Aug 10, 2026", type: "Sent",     status: "completed" },
  { party: "AcmeCorp",             subject: "Cloud services inquiry",           date: "Jul 28, 2026", type: "Received", status: "completed" },
  { party: "PixelCraft Studio",    subject: "Brand redesign discussion",        date: "Jul 15, 2026", type: "Sent",     status: "completed" },
  { party: "BlueArmor Security",   subject: "Annual security audit planning",   date: "Jun 30, 2026", type: "Received", status: "cancelled" },
];

export function EnquiriesArchived() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <SearchInput placeholder="Search archived enquiries..." />
      </div>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 80px 1fr 100px", padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          {["Business", "Subject", "Type", "Date", "Status"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
        </div>
        {ARCHIVED_ENQ.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 80px 1fr 100px", padding: "16px 24px", alignItems: "center", borderBottom: i < ARCHIVED_ENQ.length - 1 ? "1px solid #f8fafc" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "#f1f5f9", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#64748b" }}>{e.party.slice(0, 2).toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{e.party}</span>
            </div>
            <span style={{ fontSize: 13, color: "#374151" }}>{e.subject}</span>
            <span style={{ fontSize: 11, fontWeight: 600, background: e.type === "Sent" ? "#eff6ff" : "#f0fdf4", color: e.type === "Sent" ? "#2563EB" : "#16a34a", padding: "2px 8px", borderRadius: 20 }}>{e.type}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>{e.date}</span>
            <StatusBadge status={e.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}
