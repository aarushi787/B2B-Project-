import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Eye, Edit2, Plus, FileText, Inbox, Clock, Search, ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";
import { motion } from "motion/react";
import { apiClient } from "../../../services/apiClient";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: "#dcfce7", text: "#16a34a", label: "Active" },
  under_review: { bg: "#fef3c7", text: "#d97706", label: "Under Review" },
  shortlisted:  { bg: "#eff6ff", text: "#2563eb", label: "Shortlisted" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status.toLowerCase().replace(" ", "_")] ?? { bg: "#f1f5f9", text: "#64748b", label: status };
  return (
    <span style={{
      background: s.bg, color: s.text, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, iconBg, iconColor }: any) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: "0 0 12px" }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.1 }}>{value}</p>
      </div>
      <div style={{ width: 40, height: 40, background: iconBg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 20, height: 20, color: iconColor }} />
      </div>
    </div>
  );
}

export function ActiveRequirements() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500);
  }, []);

  const staticRequirements = [
    { title: "Enterprise CRM Development", category: "Software Dev", budget: "$25,000-$50,000", date: "Sep 15, 2026", proposals: "8 proposals", status: "Active" },
    { title: "Cloud Migration AWS Infrastructure", category: "Cloud & DevOps", budget: "$15,000-$30,000", date: "Sep 12, 2026", proposals: "12 proposals", status: "Active" },
    { title: "Mobile Banking App Redesign", category: "UI/UX Design", budget: "$10,000-$20,000", date: "Sep 10, 2026", proposals: "6 proposals", status: "Under Review" },
    { title: "Cybersecurity Audit & Compliance", category: "Cybersecurity", budget: "$8,000-$15,000", date: "Sep 08, 2026", proposals: "4 proposals", status: "Active" },
    { title: "SEO & Content Marketing Strategy", category: "Digital Marketing", budget: "$5,000-$10,000", date: "Sep 05, 2026", proposals: "15 proposals", status: "Shortlisted" },
    { title: "AI Chatbot Integration", category: "Data & AI", budget: "$20,000-$40,000", date: "Sep 03, 2026", proposals: "9 proposals", status: "Active" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      
      {/* Header + Filters */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div style={{ position: "relative", width: 280 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#94a3b8" }} />
          <input
            placeholder="Search requirements..."
            style={{ width: "100%", padding: "10px 16px 10px 40px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, outline: "none" }}
          />
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {["Category", "Budget Range", "Date Posted"].map(label => (
            <button key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              {label} <ChevronDown style={{ width: 14, height: 14, color: "#94a3b8" }} />
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
          <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
            Sort: Newest <ChevronDown style={{ width: 14, height: 14, color: "#94a3b8" }} />
          </button>
          <Link to="/app/requirements/new" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#2563EB", border: "1px solid #2563EB", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#ffffff", cursor: "pointer", textDecoration: "none" }}>
            Post New Requirement <Plus style={{ width: 16, height: 16 }} />
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 32 }}>
        <MetricCard label="Total Active" value="12" icon={FileText} iconBg="#eff6ff" iconColor="#2563EB" />
        <MetricCard label="Proposals Received" value="34" icon={Inbox} iconBg="#dcfce7" iconColor="#16a34a" />
        <MetricCard label="Avg. Response Time" value="2.4 days" icon={Clock} iconBg="#f5f3ff" iconColor="#8B5CF6" />
      </div>

      {/* Main Table */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1.5fr 1.5fr 1fr 1fr 1fr 80px", padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
          {["Requirement Title", "Category", "Budget", "Posted Date", "Proposals", "Status", "Actions"].map(h => (
            <span key={h} style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {staticRequirements.map((r, i) => (
          <div key={i} style={{
            display: "grid",
            gridTemplateColumns: "2.5fr 1.5fr 1.5fr 1fr 1fr 1fr 80px",
            padding: "20px 24px",
            alignItems: "center",
            borderBottom: i < staticRequirements.length - 1 ? "1px solid #f1f5f9" : "none",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.title}</span>
            <span style={{ fontSize: 13, color: "#64748b" }}>{r.category}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.budget}</span>
            <span style={{ fontSize: 13, color: "#64748b" }}>{r.date}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{r.proposals}</span>
            <div><StatusBadge status={r.status} /></div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link to="/app/requirements/details" style={{ color: "#64748b" }}><Eye style={{ width: 16, height: 16 }} /></Link>
              <button style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#64748b" }}><Edit2 style={{ width: 16, height: 16 }} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Showing 1-6 of 12 requirements</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ width: 36, height: 36, background: "#eff6ff", border: "1px solid #eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>1</button>
          <button style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>2</button>
          <button style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
            <ChevronRight style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

    </motion.div>
  );
}
