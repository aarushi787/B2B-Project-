// Closed Requirements — same layout as Active but showing closed/completed items
import { useState } from "react";
import { Eye } from "lucide-react";
import { StatusBadge, Card, MetricCard, SearchInput, FilterPill } from "../ui/DesignSystem";

const CLOSED = [
  { title: "Company Website Redesign",          category: "UI/UX Design",     budget: "$15,000-$25,000", date: "Aug 20, 2026", proposals: "11 proposals", status: "completed" },
  { title: "ERP System Integration",            category: "Software Dev",     budget: "$40,000-$80,000", date: "Aug 15, 2026", proposals: "7 proposals",  status: "completed" },
  { title: "Annual Security Assessment",        category: "Cybersecurity",    budget: "$12,000-$18,000", date: "Jul 28, 2026", proposals: "5 proposals",  status: "cancelled" },
  { title: "Social Media Marketing Campaign",   category: "Digital Marketing",budget: "$3,000-$6,000",   date: "Jul 10, 2026", proposals: "18 proposals", status: "completed" },
];

export function ClosedRequirements() {
  const [search, setSearch] = useState("");
  const filtered = CLOSED.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
        <SearchInput placeholder="Search requirements..." value={search} onChange={setSearch} />
        <FilterPill label="Category" />
        <FilterPill label="Date Range" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 24 }}>
        <MetricCard label="Total Closed"      value={String(CLOSED.length)}   icon="📁" />
        <MetricCard label="Completed"         value={String(CLOSED.filter(r => r.status === "completed").length)} icon="✅" />
        <MetricCard label="Cancelled"         value={String(CLOSED.filter(r => r.status === "cancelled").length)} icon="❌" />
      </div>

      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 1fr 80px 40px", padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          {["Requirement Title", "Category", "Budget", "Closed Date", "Proposals", "Status", ""].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
          ))}
        </div>
        {filtered.map((r, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "2fr 1.2fr 1.2fr 1fr 1fr 80px 40px",
            padding: "16px 24px", alignItems: "center",
            borderBottom: i < filtered.length - 1 ? "1px solid #f8fafc" : "none",
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.title}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>{r.category}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>{r.budget}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>{r.date}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{r.proposals}</span>
            <StatusBadge status={r.status} />
            <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Eye style={{ width: 15, height: 15 }} /></button>
          </div>
        ))}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #f1f5f9" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>Showing {filtered.length} of {CLOSED.length} requirements</span>
        </div>
      </Card>
    </div>
  );
}
