import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ChevronDown, Building2, ShieldCheck, Star } from "lucide-react";
import { motion } from "motion/react";
import { apiClient } from "../../../services/apiClient";
import toast from "react-hot-toast";
import { Deal } from "../../../types";

function MetricCard({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: 0 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.1 }}>{value}</p>
    </div>
  );
}

export function ReceivedProposals() {
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<Deal[]>([]);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      const res = await apiClient.get<Deal[] | {data: Deal[]}>('/deals?status=pending');
      const data = Array.isArray(res) ? res : (res.data || []);
      setProposals(data);
    } catch (error) {
      toast.error("Failed to load received proposals");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      if (!id) {
        toast.success(`Demo action: ${action} triggered!`);
        return;
      }
      if (action === 'Decline Proposal') {
        await apiClient.put(`/deals/${id}/status`, { status: 'rejected' });
        toast.success("Proposal declined");
        fetchProposals();
      } else if (action === 'Shortlist') {
        await apiClient.put(`/deals/${id}/status`, { status: 'shortlisted' });
        toast.success("Proposal shortlisted");
        fetchProposals();
      } else {
        toast("Feature coming soon: " + action, { icon: "🚧" });
      }
    } catch (error) {
      toast.error(`Failed to ${action.toLowerCase()}`);
    }
  };

  const handleDemoFilter = () => toast("Filters coming soon!", { icon: "🚧" });
  const handleDemoPagination = () => toast("Pagination coming soon!", { icon: "🚧" });

  const staticProposals = [
    {
      id: "",
      provider: "Nexis Digital Logistics",
      rating: "4.8 ★",
      projects: "45 projects completed",
      time: "Submitted 2 hours ago",
      requirement: "Enterprise CRM Development",
      amount: "$35,000",
      timeline: "4 months",
      summary: "We have built custom CRM backends for logistics operators. Our proposal includes architectural blueprints, milestone-based deployment, and native modules matching your system requirements perfectly.",
      satisfaction: "98%",
    },
    {
      id: "",
      provider: "AppStudio Pro",
      rating: "4.9 ★",
      projects: "62 projects completed",
      time: "Submitted 1 day ago",
      requirement: "E-Commerce Mobile Application Development",
      amount: "$42,000",
      timeline: "3 months",
      summary: "Full-stack mobile solution with integrated Stripe and logistics APIs. Includes native iOS and Android modules built utilizing optimized performance stacks with 12 months free maintenance SLA.",
      satisfaction: "99%",
    },
    {
      id: "",
      provider: "ByteCraft Consulting",
      rating: "4.7 ★",
      projects: "28 projects completed",
      time: "Submitted 3 days ago",
      requirement: "SOC 2 Type II Auditing and Advisory",
      amount: "$29,000",
      timeline: "2 months",
      summary: "Thorough readiness assessment followed by advisory setup. We prepare the complete compliance evidence suite and lead system mock audits prior to official compliance check.",
      satisfaction: "96%",
    },
    {
      id: "",
      provider: "CloudPioneer Ltd",
      rating: "4.8 ★",
      projects: "51 projects completed",
      time: "Submitted 5 days ago",
      requirement: "Kubernetes Migration & CI/CD Pipeline Setup",
      amount: "$31,000",
      timeline: "6 weeks",
      summary: "Infrastructure-as-code deployment via Terraform. Complete migration of existing services into isolated Kubernetes nodes with robust zero-downtime deployment pipelines.",
      satisfaction: "97%",
    },
  ];

  const displayProposals = proposals.length > 0 ? proposals.map(p => ({
    id: p.id,
    provider: (p as any).seller?.name || "Unknown Provider",
    rating: "4.5 ★",
    projects: "12 projects completed",
    time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Today',
    requirement: p.title || "Untitled Requirement",
    amount: `$${p.totalAmount || 0}`,
    timeline: "2 months",
    summary: "Proposed solution based on the requirement.",
    satisfaction: "100%",
  })) : staticProposals;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Proposals from service providers for your requirements</p>
      </div>

      {/* Filter Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={handleDemoFilter} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
            All Requirements <ChevronDown style={{ width: 14, height: 14, color: "#94a3b8" }} />
          </button>
          <button onClick={handleDemoFilter} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
            All Statuses <ChevronDown style={{ width: 14, height: 14, color: "#94a3b8" }} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#64748b" }}>Sort by:</span>
          <button onClick={handleDemoFilter} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
            Highest Rated <ChevronDown style={{ width: 14, height: 14, color: "#94a3b8" }} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 32 }}>
        <MetricCard label="Total Received" value={displayProposals.length.toString()} />
        <MetricCard label="Shortlisted" value="8" />
        <MetricCard label="Accepted" value="3" />
        <MetricCard label="Pending Review" value="15" />
      </div>

      {loading ? <div style={{ padding: 24, textAlign: "center" }}>Loading proposals...</div> : null}

      {/* Proposal Cards */}
      {!loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
          {displayProposals.map((p, i) => (
            <div key={i} style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "24px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ width: 44, height: 44, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Building2 style={{ width: 20, height: 20, color: "#2563EB" }} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>{p.provider}</h3>
                      <span style={{ display: "flex", alignItems: "center", gap: 2, background: "#dcfce7", color: "#16a34a", padding: "2px 6px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                        <ShieldCheck style={{ width: 12, height: 12 }} /> Verified
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                      <span style={{ color: "#d97706" }}>{p.rating}</span>
                      <span>•</span>
                      <span>{p.projects}</span>
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#64748b" }}>{p.time}</span>
              </div>

              {/* Body */}
              <div style={{ padding: "24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 200px 200px", gap: 24, marginBottom: 24 }}>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>PROPOSAL FOR REQUIREMENT</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#2563EB", margin: 0 }}>{p.requirement}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>PROPOSED AMOUNT</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: 0 }}>{p.amount}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>ESTIMATED TIMELINE</p>
                    <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>{p.timeline}</p>
                  </div>
                </div>
                
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>PROPOSAL SUMMARY</p>
                  <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>{p.summary}</p>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid #f1f5f9", background: "#fafafa" }}>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  Satisfaction Rate: <span style={{ fontWeight: 700, color: "#10b981" }}>{p.satisfaction}</span>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => handleAction(p.id, "Decline Proposal")} style={{ background: "none", border: "none", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "8px 16px" }}>Decline Proposal</button>
                  <button onClick={() => handleAction(p.id, "View Full Proposal")} style={{ background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "10px 20px", borderRadius: 8 }}>View Full Proposal</button>
                  <button onClick={() => handleAction(p.id, "Shortlist")} style={{ background: "#2563EB", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: "10px 24px", borderRadius: 8 }}>Shortlist</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Showing 1-{displayProposals.length} of {displayProposals.length} proposals</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={handleDemoPagination} style={{ padding: "8px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>Previous</button>
          <button onClick={handleDemoPagination} style={{ width: 36, height: 36, background: "#eff6ff", border: "1px solid #eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>1</button>
          <button onClick={handleDemoPagination} style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>2</button>
          <button onClick={handleDemoPagination} style={{ width: 36, height: 36, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>3</button>
          <button onClick={handleDemoPagination} style={{ padding: "8px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer" }}>Next</button>
        </div>
      </div>

    </motion.div>
  );
}
