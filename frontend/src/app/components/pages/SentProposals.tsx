import { useState, useEffect } from "react";
import { StatusBadge, Card, SearchInput, FilterPill, Skeleton, EmptyState, Pagination } from "../ui/DesignSystem";
import { Eye, Loader2, Send } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../auth/AuthProvider";
import toast from "react-hot-toast";
import { ProposalModal, Proposal } from "../ProposalModal";

export function SentProposals() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);

  useEffect(() => {
    async function loadProposals() {
      if (!user?.companyId) return;
      setLoading(true);
      try {
        const res = await apiClient.get<any>(`/deals/seller/${user.companyId}?page=${page}&limit=5`);
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
  }, [user, page]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <ProposalModal proposal={selectedProposal} onClose={() => setSelectedProposal(null)} isReceived={false} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <SearchInput placeholder="Search proposals..." />
        <FilterPill label="Status" />
        <FilterPill label="Date" />
      </div>
      <Card style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 800 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 100px 40px", padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
            {["Sent To", "Requirement", "Bid Amount", "Submitted", "Status", ""].map(h => (
              <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
            ))}
          </div>

        {loading ? (
          <div>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 100px 40px", padding: "16px 24px", alignItems: "center", borderBottom: "1px solid #f8fafc" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Skeleton width="32px" height="32px" borderRadius="8px" />
                  <Skeleton width="120px" height="16px" />
                </div>
                <Skeleton width="80%" height="16px" />
                <Skeleton width="60px" height="16px" />
                <Skeleton width="70px" height="16px" />
                <Skeleton width="70px" height="24px" borderRadius="12px" />
              </div>
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No Proposals Sent"
            desc="You haven't submitted any bids yet. Head over to the Discover Leads page to find active requirements matching your services."
            action={<a href="/app/opportunities/matching" style={{ background: "#2563EB", color: "#fff", padding: "8px 16px", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>Discover Leads</a>}
          />
        ) : proposals.map((s, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1fr 1fr 100px 40px", padding: "16px 24px", alignItems: "center", borderBottom: i < proposals.length - 1 ? "1px solid #f8fafc" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#2563EB" }}>
                🏢
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Client #{s.buyerId?.slice(0, 4)}</span>
            </div>
            <span style={{ fontSize: 12, color: "#64748b", paddingRight: 8 }}>{s.notes || s.title || "Proposal Details"}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>${s.amount || s.totalAmount || 0}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>{new Date(s.createdAt).toLocaleDateString()}</span>
            <StatusBadge status={s.status} />
            <button onClick={() => setSelectedProposal(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Eye style={{ width: 15, height: 15 }} /></button>
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
