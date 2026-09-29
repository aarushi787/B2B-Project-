import { useState, useEffect } from "react";
import { Link } from "react-router";
import { 
  FileText, CheckCircle, Clock, CheckSquare, Search,
  ChevronDown, Filter, LayoutGrid, List as ListIcon, MoreHorizontal, Edit2
} from "lucide-react";
import { motion } from "motion/react";
import { apiClient } from "../../../services/apiClient";
import { StatusBadge } from "../ui/DesignSystem";
import { Deal } from "../../../types";
import toast from "react-hot-toast";

function MetricCard({ label, value, active }: { label: string, value: string, active?: boolean }) {
  return (
    <div style={{
      background: active ? "#eff6ff" : "#ffffff",
      border: `1px solid ${active ? "#bfdbfe" : "#e2e8f0"}`,
      borderRadius: 12,
      padding: "24px",
      display: "flex",
      flexDirection: "column",
      gap: 12
    }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: active ? "#1e3a8a" : "#64748b", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 800, color: active ? "#1e40af" : "#0f172a", margin: 0, lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}

export function ActiveRequirements() {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const res = await apiClient.get<{data: Deal[]} | Deal[]>('/deals');
      const data = Array.isArray(res) ? res : (res.data || []);
      setDeals(data);
    } catch (error) {
      toast.error("Failed to load active requirements");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAction = (msg: string) => {
    toast(msg, { icon: "🚧" });
  };

  const staticRequirements = [
    { title: "Enterprise CRM Development", category: "Software Development", amount: "$25,000 - $50,000", posted: "Sep 15, 2026", proposals: 4, status: "Active" },
    { title: "Cloud Infrastructure Migration", category: "Cloud & DevOps", amount: "$15,000 - $30,000", posted: "Sep 12, 2026", proposals: 12, status: "Under Review" },
    { title: "Mobile App UI/UX Redesign", category: "Design", amount: "$8,000 - $12,000", posted: "Sep 10, 2026", proposals: 28, status: "Pending" },
    { title: "SOC 2 Compliance Audit", category: "Security", amount: "$10,000 - $20,000", posted: "Sep 08, 2026", proposals: 3, status: "Active" },
    { title: "Data Warehouse Implementation", category: "Data Engineering", amount: "$40,000 - $70,000", posted: "Sep 05, 2026", proposals: 8, status: "Active" },
    { title: "Marketing Automation Setup", category: "Marketing Tech", amount: "$5,000 - $10,000", posted: "Sep 01, 2026", proposals: 15, status: "Closed" },
  ];

  const displayRequirements = deals.length > 0 ? deals.map(d => ({
    id: d.id,
    title: d.title || "Untitled",
    category: d.category || "General",
    amount: d.totalAmount ? `$${d.totalAmount}` : "Open Budget",
    posted: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "Today",
    proposals: 0,
    status: d.status || "Active"
  })) : staticRequirements;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      
      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 24, marginBottom: 32 }}>
        <MetricCard label="Total Requirements" value={displayRequirements.length.toString()} active />
        <MetricCard label="Active Now" value={displayRequirements.filter(d => d.status.toLowerCase() === 'active').length.toString() || "3"} />
        <MetricCard label="Under Review" value="2" />
        <MetricCard label="Closed" value="1" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 500 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search style={{ position: "absolute", left: 16, top: 10, width: 18, height: 18, color: "#94a3b8" }} />
            <input 
              type="text" 
              placeholder="Search requirements..." 
              style={{ width: "100%", padding: "10px 16px 10px 44px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none" }}
            />
          </div>
          <button onClick={() => handleDemoAction("Filters coming soon!")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
            <Filter style={{ width: 14, height: 14 }} /> Filter
          </button>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {["All", "Active", "Reviewing", "Closed"].map((label, i) => (
              <button onClick={() => handleDemoAction("Tab coming soon!")} key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
          
          <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 4 }}>
            <button onClick={() => handleDemoAction("View toggle coming soon!")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <ListIcon style={{ width: 16, height: 16 }} />
            </button>
            <button onClick={() => handleDemoAction("View toggle coming soon!")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "transparent", border: "none", borderRadius: 6, color: "#94a3b8", cursor: "pointer" }}>
              <LayoutGrid style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {loading ? <div style={{ padding: 24, textAlign: "center" }}>Loading requirements...</div> : null}

      {/* Main Table */}
      {!loading && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr 1.5fr 1fr 1fr 1fr 80px", padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            {["Requirement Title", "Category", "Budget", "Posted", "Proposals", "Status", ""].map((h, i) => (
              <span key={i} style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {displayRequirements.map((r, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "3fr 1.5fr 1.5fr 1fr 1fr 1fr 80px",
              padding: "20px 24px",
              alignItems: "center",
              borderBottom: i < displayRequirements.length - 1 ? "1px solid #f1f5f9" : "none",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{r.title}</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{r.category}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.amount}</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{r.posted}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#2563EB" }}>
                <Link to="/app/opportunities/received" style={{ color: "inherit", textDecoration: "none" }}>{r.proposals} received</Link>
              </span>
              <div><StatusBadge status={r.status} /></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                <Link to={`/app/requirements/details${(r as any).id ? `/${(r as any).id}` : ''}`} style={{ color: "#64748b" }}><Edit2 style={{ width: 16, height: 16 }} /></Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Showing 1-{displayRequirements.length} of {displayRequirements.length} requirements</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => handleDemoAction("Pagination coming soon")} style={{ padding: "8px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>Previous</button>
          <button onClick={() => handleDemoAction("Pagination coming soon")} style={{ width: 36, height: 36, background: "#eff6ff", border: "1px solid #eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>1</button>
          <button onClick={() => handleDemoAction("Pagination coming soon")} style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>2</button>
          <button onClick={() => handleDemoAction("Pagination coming soon")} style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", cursor: "pointer" }}>
            <MoreHorizontal style={{ width: 16, height: 16 }} />
          </button>
          <button onClick={() => handleDemoAction("Pagination coming soon")} style={{ padding: "8px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>Next</button>
        </div>
      </div>

    </motion.div>
  );
}
