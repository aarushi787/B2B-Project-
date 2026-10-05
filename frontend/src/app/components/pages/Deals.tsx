// Portfolio (Deals) — with Add Project Modal and backend integration
import { useState, useEffect } from "react";
import { FolderPlus, Clock, ExternalLink, Calendar, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { StatusBadge, Card, SearchInput, FilterPill, PrimaryBtn, GhostBtn, Modal, Input, TextArea } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";

interface DealItem {
  id: string;
  notes?: string; // used as description
  title?: string;
  amount?: number;
  status: string;
  createdAt: string;
}

export function Deals() {
  const [search, setSearch] = useState("");
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ title: "", amount: "", description: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDeals();

    socketService.connect();
    const unsub = socketService.on('deals:updated', () => {
      fetchDeals();
    });

    return () => unsub();
  }, []);

  const fetchDeals = async () => {
    try {
      const res: any = await apiClient.get<DealItem[]>('/deals');
      setDeals(res?.data || res || []);
    } catch (error) {
      toast.error("Failed to load projects/deals");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async () => {
    if (!formData.title || !formData.amount) {
      return toast.error("Title and amount are required");
    }
    setIsSaving(true);
    try {
      const newDeal = await apiClient.post<DealItem>('/deals', {
        title: formData.title,
        notes: formData.description,
        totalAmount: parseFloat(formData.amount),
        status: 'COMPLETED',
        buyerId: "d850de54-4f77-4251-953f-e3662013175d",
        sellerId: "d850de54-4f77-4251-953f-e3662013175d"
      });
      toast.success("Project added successfully!");
      setDeals([newDeal, ...deals]);
      setAddModalOpen(false);
      setFormData({ title: "", amount: "", description: "" });
    } catch (error) {
      toast.error("Not authorized or failed to add project");
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = deals.filter(p => p.notes?.toLowerCase().includes(search.toLowerCase()) || p.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <SearchInput placeholder="Search Portfolios..." value={search} onChange={setSearch} />
        <FilterPill label="All Types" />
        <div style={{ flex: 1 }} />
        <PrimaryBtn onClick={() => setAddModalOpen(true)}>
          <FolderPlus style={{ width: 16, height: 16 }} /> Add Project
        </PrimaryBtn>
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center" }}>Loading portfolio...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          No projects found. Click 'Add Project' to create one.
        </div>
      )}

      {/* Portfolio Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 24 }}>
        {filtered.map((p) => (
          <Card key={p.id} className="deal-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Image placeholder */}
            <div style={{ height: 160, background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>No Image</span>
            </div>
            
            <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0, paddingRight: 16 }}>{p.title || "Project Title"}</h3>
                <StatusBadge status={p.status} />
              </div>

              <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5, margin: "0 0 16px", flex: 1 }}>
                {p.notes || p.title || "No description provided."}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Calendar style={{ width: 14, height: 14, color: "#94a3b8" }} />
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 style={{ width: 14, height: 14, color: "#94a3b8" }} />
                  <span style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>Verified</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <GhostBtn onClick={() => toast("Case study is being generated...", { icon: "📄" })} style={{ flex: 1, color: "#0f172a", padding: "8px 0" }}>View Case Study</GhostBtn>
                <button onClick={() => toast("Opening external link...", { icon: "🔗" })} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, cursor: "pointer", color: "#64748b" }}>
                  <ExternalLink style={{ width: 16, height: 16 }} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 40 }}>
          <button style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Prev</button>
          <button style={{ width: 34, height: 34, borderRadius: 6, border: "2px solid #6921A5", background: "#6921A5", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>1</button>
          <button style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>Next</button>
        </div>
      )}

      {/* Add Project Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Project">
        <Input label="Project Title *" placeholder="e.g. Acme Corp Migration" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
        <Input label="Deal Amount *" type="number" placeholder="e.g. 50000" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
        <TextArea label="Project Description" placeholder="Summarize the project outcome and deliverables..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <GhostBtn onClick={() => setAddModalOpen(false)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleAddProject} disabled={isSaving}>
            {isSaving ? "Saving..." : "Add Project"}
          </PrimaryBtn>
        </div>
      </Modal>
    </div>
  );
}