import { useState, useEffect } from "react";
import { StatusBadge, Card, SearchInput, FilterPill, Skeleton, EmptyState, Pagination } from "../ui/DesignSystem";
import { Eye, CheckCircle, Loader2, Inbox } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import toast from "react-hot-toast";

const RECEIVED = [
  { from: "TechVista Solutions",  req: "Enterprise CRM Development",         amount: "$32,000", date: "Sep 22, 2026", rating: "4.8 ★", status: "pending" },
  { from: "Apex Digital Systems", req: "Cloud Migration AWS Infrastructure",  amount: "$24,500", date: "Sep 20, 2026", rating: "4.9 ★", status: "shortlisted" },
  { from: "PixelCraft Studio",    req: "Mobile Banking App Redesign",         amount: "$18,000", date: "Sep 17, 2026", rating: "4.7 ★", status: "pending" },
  { from: "Vortex Growth Agency", req: "SEO & Content Marketing Strategy",    amount: "$7,500",  date: "Sep 15, 2026", rating: "4.6 ★", status: "active" },
  { from: "Kratos AI Labs",       req: "AI Chatbot Integration",              amount: "$28,000", date: "Sep 12, 2026", rating: "4.8 ★", status: "shortlisted" },
];

export function ReceivedProposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function loadProposals() {
      setLoading(true);
      try {
        const res = await apiClient.get<any>(`/deals?status=pending&page=${page}&limit=5`);
        if (Array.isArray(res)) {
          setProposals(res);
        } else {
          setProposals(res.data || []);
          setTotalPages(res.totalPages || 1);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProposals();
  }, [page]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <SearchInput placeholder="Search proposals..." />
        <FilterPill label="Status" />
        <FilterPill label="Requirement" />
      </div>
      <Card style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 900 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 80px 100px 40px", padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            {["From", "Requirement", "Bid Amount", "Received", "Rating", "Status", ""].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>
          
          {loading ? (
            <div>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 80px 100px 40px", padding: "16px 24px", alignItems: "center", borderBottom: "1px solid #f8fafc" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <Skeleton width="32px" height="32px" borderRadius="8px" />
                    <Skeleton width="120px" height="16px" />
                  </div>
                  <Skeleton width="80%" height="16px" />
                  <Skeleton width="60px" height="16px" />
                  <Skeleton width="70px" height="16px" />
                  <Skeleton width="40px" height="16px" />
                  <Skeleton width="70px" height="24px" borderRadius="12px" />
                </div>
              ))}
            </div>
          ) : proposals.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No Proposals Received"
              desc="You haven't received any bids on your requirements yet. Make sure your requirements are detailed and clear."
            />
          ) : proposals.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 80px 100px 40px", padding: "16px 24px", alignItems: "center", borderBottom: i < proposals.length - 1 ? "1px solid #f8fafc" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#2563EB" }}>
                {r.title?.slice(0, 2).toUpperCase() || "B2B"}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{r.title || "Proposal"}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <CheckCircle style={{ width: 10, height: 10, color: "#16a34a" }} />
                  <span style={{ fontSize: 10, color: "#16a34a" }}>Verified</span>
                </div>
              </div>
            </div>
            <span style={{ fontSize: 12, color: "#64748b", paddingRight: 8 }}>{r.notes || "Requirement specifics"}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>${r.amount || r.totalAmount || 0}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>{new Date(r.createdAt).toLocaleDateString()}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#d97706" }}>4.8 ★</span>
            <StatusBadge status={r.status} />
            <button onClick={() => toast("Proposal details coming soon!", { icon: "👁️" })} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Eye style={{ width: 15, height: 15 }} /></button>
          </div>
        ))}
        </div>
        {!loading && proposals.length > 0 && (
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        )}
      </Card>
    </div>
  );
}
