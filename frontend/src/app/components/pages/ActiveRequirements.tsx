// Active Requirements Page — with Post Requirement Modal and backend integration
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Eye, Edit2, Plus, FileText, Inbox, Clock } from "lucide-react";
import toast from "react-hot-toast";
import { StatusBadge, Card, MetricCard, SearchInput, FilterPill, PrimaryBtn, GhostBtn, Modal, Input, TextArea } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";

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

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    try {
      // Using deals API to store requirements (since there's no native requirements table)
      const data = await apiClient.get<RequirementItem[]>('/deals');
      setRequirements(data || []);
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
      setFormData({ title: "", description: "", budget: "" });
    } catch (error) {
      toast.error("Failed to post requirement");
    } finally {
      setIsSaving(false);
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
    </div>
  );
}
