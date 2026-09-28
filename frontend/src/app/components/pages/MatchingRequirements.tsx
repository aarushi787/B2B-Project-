import { useState, useEffect } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { FilterPill, Modal, Input, TextArea, PrimaryBtn, GhostBtn, Skeleton, EmptyState } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../auth/AuthProvider";
import { Loader2, Search } from "lucide-react";

const MATCHES = [
  {
    title: "Full-Stack Web Application for FinTech Startup",
    tag: "Web Development", posted: "2 hours ago",
    budget: "$20,000 - $40,000", timeline: "2-4 months", location: "Remote",
    match: 92, matchColor: "#16a34a",
    poster: "Acme Financial Inc.", posterInitial: "🧡",
    proposals: 14,
  },
  {
    title: "Enterprise CRM Integration & Custom Dashboard",
    tag: "UI/UX Design", posted: "1 day ago",
    budget: "$15,000 - $25,000", timeline: "6 weeks", location: "Remote",
    match: 85, matchColor: "#d97706",
    poster: "Soylent Corp", posterInitial: "🔵",
    proposals: 8,
  },
  {
    title: "Native iOS & Android Mobile Healthcare App",
    tag: "App Development", posted: "2 days ago",
    budget: "$50,000 - $80,000", timeline: "4-6 months", location: "Hybrid (NY)",
    match: 78, matchColor: "#d97706",
    poster: "HealthFirst Alliance", posterInitial: "🟢",
    proposals: 22,
  },
  {
    title: "Cloud Infrastructure Setup & Security Audit",
    tag: "Cloud & DevOps", posted: "3 days ago",
    budget: "$30,000 - $45,000", timeline: "3 months", location: "Remote",
    match: 95, matchColor: "#16a34a",
    poster: "Umbrella Corp", posterInitial: "🟣",
    proposals: 5,
  },
  {
    title: "AI Chatbot Implementation & NLP Model Tuning",
    tag: "Data & AI", posted: "4 days ago",
    budget: "$25,000 - $35,000", timeline: "2 months", location: "Remote",
    match: 89, matchColor: "#16a34a",
    poster: "Initech Systems", posterInitial: "🔴",
    proposals: 11,
  },
];

export function MatchingRequirements() {
  const { user } = useAuth();
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [formData, setFormData] = useState({ amount: "", coverLetter: "" });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [requirements, setRequirements] = useState<any[]>([]);

  useEffect(() => {
    async function loadRequirements() {
      try {
        const deals = await apiClient.get<any[]>('/deals?status=pending');
        const list = Array.isArray(deals) ? deals : (deals as any).data || [];
        // Filter out requirements created by the current user to only see others'
        setRequirements(list.filter((d: any) => d.buyerId !== user?.companyId));
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    }
    loadRequirements();
  }, [user]);

  const handleSendProposal = async () => {
    if (!formData.amount || !formData.coverLetter) return toast.error("Please fill all fields");
    setLoading(true);
    try {
      await apiClient.post('/deals', {
        title: `Proposal: ${selectedReq.title}`,
        description: formData.coverLetter,
        buyerId: selectedReq.buyerId,
        sellerId: user?.companyId || "dummy-seller",
        totalAmount: parseFloat(formData.amount) || 0,
        status: 'pending',
      });
      setSelectedReq(null);
      setFormData({ amount: "", coverLetter: "" });
      toast.success("Proposal sent successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>Requirements that match your services and expertise</p>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <FilterPill label="All Categories" />
        <FilterPill label="Any Budget" />
        <FilterPill label="Any Location" />
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Sort by:</span>
          <FilterPill label="Newest First" />
        </div>
      </div>

      {/* Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {fetching ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, display: "flex", justifyContent: "space-between" }}>
                <div style={{ flex: 1 }}>
                  <Skeleton width="40%" height="20px" style={{ marginBottom: 12 }} />
                  <Skeleton width="120px" height="16px" borderRadius="20px" style={{ marginBottom: 16 }} />
                  <div style={{ display: "flex", gap: 12 }}>
                    <Skeleton width="32px" height="32px" borderRadius="8px" />
                    <Skeleton width="100px" height="16px" />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                  <Skeleton width="80px" height="32px" />
                  <Skeleton width="80px" height="32px" />
                  <Skeleton width="100px" height="36px" borderRadius="8px" />
                </div>
              </div>
            ))}
          </div>
        ) : requirements.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No Matching Requirements"
            desc="There are currently no open requirements that match your business profile. Check back later or adjust your services."
          />
        ) : requirements.map((m, i) => (
          <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>{m.title}</h3>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ background: "#eff6ff", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20 }}>{m.category || "IT & Technology"}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>Posted {new Date(m.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0, marginLeft: 24 }}>
                {/* Stats */}
                <div style={{ display: "flex", gap: 24 }}>
                  <div>
                    <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>BUDGET</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "3px 0 0" }}>${m.totalAmount || 0}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>TIMELINE</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "3px 0 0" }}>Flexible</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>LOCATION</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "3px 0 0" }}>Remote</p>
                  </div>
                </div>
                {/* Match % */}
                <div style={{ background: "#dcfce7", borderRadius: 20, padding: "4px 12px" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>95% Match</span>
                </div>
                {/* Buttons */}
                <Link to="/app/requirements/details" style={{ textDecoration: "none" }}>
                  <button style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>View Details</button>
                </Link>
                <button onClick={() => setSelectedReq(m)} style={{ background: "#2563EB", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Send Proposal</button>
              </div>
            </div>
            {/* Bottom */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #f1f5f9", paddingTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🏢</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>Posted by <b style={{ color: "#0f172a" }}>Client #{m.buyerId?.slice(0, 4) || "Unknown"}</b></span>
              </div>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>0 proposals received</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>Showing 1-5 of 12 opportunities</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={{ padding: "6px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#64748b" }}>Previous</button>
          {[1, 2, 3].map(p => (
            <button key={p} style={{ width: 32, height: 32, borderRadius: 6, border: p === 1 ? "2px solid #2563EB" : "1px solid #e2e8f0", background: p === 1 ? "#eff6ff" : "#fff", color: p === 1 ? "#2563EB" : "#374151", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{p}</button>
          ))}
          <button style={{ padding: "6px 12px", fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, background: "#fff", cursor: "pointer", color: "#374151" }}>Next</button>
        </div>
      </div>

      <Modal isOpen={!!selectedReq} onClose={() => setSelectedReq(null)} title={`Send Proposal: ${selectedReq?.title}`}>
        <div style={{ padding: "0 0 16px", marginBottom: 16, borderBottom: "1px solid #f1f5f9" }}>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 4px" }}>Client Budget</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{selectedReq?.budget}</p>
        </div>
        <Input 
          label="Your Bid Amount ($)" 
          type="number" 
          placeholder="e.g. 25000"
          value={formData.amount} 
          onChange={e => setFormData({ ...formData, amount: e.target.value })} 
        />
        <TextArea 
          label="Cover Letter / Proposal Details" 
          placeholder="Explain why your company is the best fit for this requirement..."
          value={formData.coverLetter} 
          onChange={e => setFormData({ ...formData, coverLetter: e.target.value })} 
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <GhostBtn onClick={() => setSelectedReq(null)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSendProposal} disabled={loading}>
            {loading ? "Sending..." : "Submit Proposal"}
          </PrimaryBtn>
        </div>
      </Modal>
    </div>
  );
}
