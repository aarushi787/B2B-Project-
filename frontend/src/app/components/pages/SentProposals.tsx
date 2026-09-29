import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ChevronRight, Search } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import toast from "react-hot-toast";

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  accepted:     { bg: "#dcfce7", text: "#16a34a", label: "Accepted" },
  pending:      { bg: "#fef3c7", text: "#d97706", label: "Under Review" },
  under_review: { bg: "#eff6ff", text: "#2563EB", label: "Pending" },
  declined:     { bg: "#fee2e2", text: "#dc2626", label: "Declined" },
  rejected:     { bg: "#fee2e2", text: "#dc2626", label: "Declined" },
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

function MetricCard({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}

export function SentProposals() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<any[]>([]);

  useEffect(() => {
    if (user?.companyId) {
      fetchProposals(user.companyId);
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProposals = async (companyId: string) => {
    try {
      const res = await apiClient.get<any>(`/deals/seller/${companyId}`);
      const data = Array.isArray(res) ? res : (res.data || []);
      setProposals(data);
    } catch (error) {
      toast.error("Failed to load sent proposals");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (id: string) => {
    try {
      if (!id) {
        toast.success("Demo action: Proposal withdrawn!");
        return;
      }
      await apiClient.delete(`/deals/${id}`);
      toast.success("Proposal withdrawn successfully");
      if (user?.companyId) fetchProposals(user.companyId);
    } catch (error) {
      toast.error("Failed to withdraw proposal");
    }
  };

  const handleDemoPagination = () => toast("Pagination coming soon!", { icon: "🚧" });

  const staticProposals = [
    { id: "", req: "E-commerce Platform Rebuild", client: "RetailMax Corp", amount: "$32,000", date: "Sep 18, 2026", status: "Accepted" },
    { id: "", req: "Data Analytics Dashboard", client: "DataFlow Inc", amount: "$18,500", date: "Sep 15, 2026", status: "Under Review" },
    { id: "", req: "Mobile App Development", client: "HealthFirst", amount: "$45,000", date: "Sep 12, 2026", status: "Pending" },
    { id: "", req: "API Integration Suite", client: "LogiTech Solutions", amount: "$12,000", date: "Sep 10, 2026", status: "Declined" },
    { id: "", req: "Website Redesign", client: "GreenLeaf Organics", amount: "$8,500", date: "Sep 08, 2026", status: "Accepted" },
    { id: "", req: "Cloud Infrastructure Setup", client: "FinServ Global", amount: "$28,000", date: "Sep 05, 2026", status: "Pending" },
  ];

  const displayProposals = proposals.length > 0 ? proposals.map(p => ({
    id: p.id,
    req: p.title || "Untitled Deal",
    client: p.buyer?.name || "Unknown Client",
    amount: `$${p.totalAmount || 0}`,
    date: new Date(p.createdAt).toLocaleDateString(),
    status: p.status || "Pending",
  })) : staticProposals;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      
      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, marginBottom: 32 }}>
        <MetricCard label="Total Sent" value={displayProposals.length.toString()} />
        <MetricCard label="Accepted" value="5" />
        <MetricCard label="Pending" value="8" />
        <MetricCard label="Declined" value="5" />
      </div>

      {loading ? <div style={{ padding: 24, textAlign: "center" }}>Loading sent proposals...</div> : null}

      {/* Main Table */}
      {!loading && (
        <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
          {/* Table header */}
          <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr 1.5fr 1.5fr 1.5fr 120px", padding: "16px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            {["Requirement", "Client", "Proposed Amount", "Sent Date", "Status", "Actions"].map((h, i) => (
              <span key={h} style={{ fontSize: 13, fontWeight: 700, color: "#64748b", textAlign: i === 5 ? "right" : "left" }}>{h}</span>
            ))}
          </div>

          {/* Rows */}
          {displayProposals.map((p, i) => (
            <div key={i} style={{
              display: "grid",
              gridTemplateColumns: "3fr 2fr 1.5fr 1.5fr 1.5fr 120px",
              padding: "20px 24px",
              alignItems: "center",
              borderBottom: i < displayProposals.length - 1 ? "1px solid #f1f5f9" : "none",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{p.req}</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{p.client}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{p.amount}</span>
              <span style={{ fontSize: 13, color: "#64748b" }}>{p.date}</span>
              <div><StatusBadge status={p.status} /></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                <Link to={`/app/requirements/details${p.id ? `/${p.id}` : ''}`} style={{ fontSize: 13, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>View</Link>
                {p.status !== "Accepted" && p.status !== "Declined" && p.status !== "rejected" && (
                  <button onClick={() => handleWithdraw(p.id)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#ef4444" }}>Withdraw</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Showing 1-{displayProposals.length} of {displayProposals.length} opportunities</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={handleDemoPagination} style={{ padding: "8px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>Previous</button>
          <button onClick={handleDemoPagination} style={{ width: 36, height: 36, background: "#2563EB", border: "1px solid #2563EB", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>1</button>
          <button onClick={handleDemoPagination} style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>2</button>
          <button onClick={handleDemoPagination} style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>3</button>
          <button onClick={handleDemoPagination} style={{ padding: "8px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>Next</button>
        </div>
      </div>

    </motion.div>
  );
}
