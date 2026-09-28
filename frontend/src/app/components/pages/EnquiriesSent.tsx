// Enquiries Sent — matches dashboard-enquiries-sent.png
import { Card, SearchInput, StatusBadge } from "../ui/DesignSystem";

const SENT_ENQ = [
  { to: "TechVista Solutions",   subject: "Database audit Services inquiry",    date: "Sep 20, 2026", status: "pending" },
  { to: "Apex Digital Systems",  subject: "Mobile app development consultation", date: "Sep 18, 2026", status: "active" },
  { to: "BlueArmor Security",    subject: "Cybersecurity assessment request",     date: "Sep 14, 2026", status: "completed" },
  { to: "PixelCraft Studio",     subject: "Brand identity redesign inquiry",      date: "Sep 10, 2026", status: "pending" },
];

export function EnquiriesSent() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <SearchInput placeholder="Search enquiries..." />
      </div>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 100px", padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          {["To", "Subject", "Date", "Status"].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
        </div>
        {SENT_ENQ.map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 100px", padding: "16px 24px", alignItems: "center", borderBottom: i < SENT_ENQ.length - 1 ? "1px solid #f8fafc" : "none", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#2563EB" }}>{e.to.slice(0, 2).toUpperCase()}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{e.to}</span>
            </div>
            <span style={{ fontSize: 13, color: "#374151" }}>{e.subject}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>{e.date}</span>
            <StatusBadge status={e.status} />
          </div>
        ))}
      </Card>
    </div>
  );
}
