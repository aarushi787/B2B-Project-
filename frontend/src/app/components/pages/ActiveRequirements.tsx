// Active Requirements Page — with Post Requirement Modal and backend integration
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Eye, Edit2, Plus, FileText, Inbox, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { StatusBadge, Card, MetricCard, SearchInput, FilterPill, PrimaryBtn, GhostBtn, Modal, Input, TextArea } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";

interface RequirementItem {
  id: string;
  title: string;
  notes?: string;
  status: string;
  createdAt: string;
}

export function ActiveRequirements() {
  const [search, setSearch] = useState("");
  const [requirements, setRequirements] = useState<RequirementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", description: "", budget: "" });
  const [isSaving, setIsSaving] = useState(false);
  
  // AI Matching State
  const [isMatchModalOpen, setMatchModalOpen] = useState(false);
  const [aiMatches, setAiMatches] = useState<any[]>([]);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    fetchRequirements();
    
    socketService.connect();
    const unsub = socketService.on('deals:updated', () => {
      fetchRequirements();
    });
    
    return () => unsub();
  }, []);

  const fetchRequirements = async () => {
    try {
      // Using deals API to store requirements (since there's no native requirements table)
      const res = await apiClient.get<any>('/deals');
      // The API returns { data: [...], total, page }, so we need to extract the data array
      const dealsArray = Array.isArray(res) ? res : (res.data || []);
      setRequirements(dealsArray);
    } catch (error) {
      toast.error("Failed to load requirements");
    } finally {
      setLoading(false);
    }
  };

  const handlePostRequirement = async () => {
    if (!formData.title) return toast.error("Title is required");
    setIsSaving(true);
    try {
      const newReq = await apiClient.post<RequirementItem>('/deals', {
        title: formData.title,
        notes: formData.description,
        totalAmount: parseFloat(formData.budget) || 0,
        status: 'pending', // Pending represents active requirement
        buyerId: "dummy-buyer",
        sellerId: "dummy-seller"
      });
      toast.success("Requirement posted successfully!");
      setRequirements([newReq, ...requirements]);
      setAddModalOpen(false);
      
      // Trigger AI Smart Match
      triggerAiMatch(formData);
      
      setFormData({ title: "", description: "", budget: "" });
    } catch (error) {
      toast.error("Failed to post requirement");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerAiMatch = async (data: { title: string; description: string; budget: string }) => {
    setIsMatching(true);
    setMatchModalOpen(true);
    try {
      const result = await apiClient.post<any>('/recommendations/match', {
        title: data.title,
        description: data.description,
        budgetMax: parseFloat(data.budget) || undefined,
        limit: 3
      });
      setAiMatches(result.matches || []);
    } catch (error) {
      toast.error("Smart Match failed to generate results");
      setAiMatches([]);
    } finally {
      setIsMatching(false);
    }
  };

  const filtered = requirements.filter(r => (r.title || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Top Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginBottom: 32 }}>
        <MetricCard label="Active Requirements" value={filtered.length.toString()} icon={FileText} iconBg="#eff6ff" iconColor="#2563EB" />
        <MetricCard label="Total Proposals Received" value="38" icon={Inbox} iconBg="#fef3c7" iconColor="#d97706" />
        <MetricCard label="Average Response Time" value="4.2 hours" icon={Clock} iconBg="#f0fdf4" iconColor="#16a34a" />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <SearchInput placeholder="Search Requirements..." value={search} onChange={setSearch} />
        <FilterPill label="All Categories" />
        <FilterPill label="Status: Active" />
        <div style={{ flex: 1 }} />
        <PrimaryBtn onClick={() => setAddModalOpen(true)}>
          <Plus style={{ width: 16, height: 16 }} /> Post New Requirement
        </PrimaryBtn>
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center" }}>Loading requirements...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          No active requirements found. Click 'Post New Requirement' to create one.
        </div>
      )}

      {/* Requirements List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map((r) => (
          <Card key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 24 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>{r.title || "Untitled Requirement"}</h3>
                <span style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 11, fontWeight: 500, padding: "2px 10px", borderRadius: 20 }}>
                  General
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>{r.notes || "No description provided."}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 24, fontSize: 12, color: "#94a3b8" }}>
                <span>Budget: $0 - $10,000</span>
                <span>Posted: {new Date(r.createdAt).toLocaleDateString()}</span>
                <span>Location: Remote/Any</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, minWidth: 200 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 4px" }}>Proposals</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>0</p>
                </div>
                <StatusBadge status={"active"} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link to="/app/requirements/details" style={{ textDecoration: "none" }}>
                  <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}><Eye style={{ width: 15, height: 15 }} /></button>
                </Link>
                <button style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}><Edit2 style={{ width: 15, height: 15 }} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Requirement Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Post New Requirement">
        <Input label="Requirement Title *" placeholder="e.g. Need AWS Cloud Migration" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
        <Input label="Estimated Budget *" type="number" placeholder="e.g. 50000" value={formData.budget} onChange={e => setFormData({ ...formData, budget: e.target.value })} />
        <TextArea label="Detailed Description" placeholder="Explain what you need exactly..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <GhostBtn onClick={() => setAddModalOpen(false)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handlePostRequirement} disabled={isSaving}>
            {isSaving ? "Posting..." : "Post Requirement"}
          </PrimaryBtn>
        </div>
      </Modal>

      {/* AI Smart Match Modal */}
      <Modal isOpen={isMatchModalOpen} onClose={() => setMatchModalOpen(false)} title="✨ AI Smart Matching Engine" width="600px">
        {isMatching ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <div style={{ display: "inline-block", padding: 12, borderRadius: "50%", background: "#f3e8ff", marginBottom: 16 }}>
              <div className="animate-spin" style={{ width: 24, height: 24, border: "3px solid #8B5CF6", borderTopColor: "transparent", borderRadius: "50%" }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>Analyzing your requirement...</h3>
            <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Gemini is scanning our verified vendors for the best fit.</p>
          </div>
        ) : (
          <div style={{ padding: "10px 0" }}>
            <div style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, marginBottom: 20, border: "1px solid #e2e8f0" }}>
              <p style={{ fontSize: 13, color: "#475569", margin: 0, fontWeight: 500 }}>
                We found <strong style={{ color: "#8B5CF6" }}>{aiMatches.length} highly compatible service providers</strong> for your project!
              </p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 8 }}>
              {aiMatches.map((match, i) => (
                <div key={match.id || i} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 16, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{match.name}</h4>
                    <span style={{ background: "#ecfdf5", color: "#10b981", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>
                      {match.matchScore}% Match
                    </span>
                  </div>
                  
                  <p style={{ fontSize: 12, color: "#475569", margin: "0 0 12px", lineHeight: 1.5 }}>
                    <strong>Why they match: </strong> {match.reasoning}
                  </p>
                  
                  {match.keyHighlights && match.keyHighlights.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {match.keyHighlights.map((hl: string, j: number) => (
                        <span key={j} style={{ fontSize: 10, background: "#f1f5f9", color: "#64748b", padding: "2px 6px", borderRadius: 4 }}>
                          {hl}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <button style={{ width: "100%", background: "#8B5CF6", color: "#fff", border: "none", padding: "8px 0", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    Invite to Submit Proposal
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
