// My Services — with Add New Service Modal and backend integration
import { useState, useEffect } from "react";
import { PlusSquare, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { StatusBadge, Card, SearchInput, PrimaryBtn, Modal, Input, TextArea, GhostBtn } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { useAuth } from "../../../auth/AuthProvider";

interface ServiceItem {
  id: string;
  name: string;
  category?: string;
  description?: string;
  price?: number;
  inventory?: number;
  merchantId?: string;
}

export function Marketplace() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", category: "", description: "", price: "" });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchServices();
    
    socketService.connect();
    // Assuming backend emits 'products:updated' or similar
    const unsub = socketService.on('products:updated', () => {
      fetchServices();
    });
    
    return () => unsub();
  }, [user?.companyId]);

  const fetchServices = async () => {
    try {
      // Assuming products represent services in the backend
      if (!user?.companyId) { setServices([]); return; }
      const data = await apiClient.get<ServiceItem[]>(`/products/merchant/${user.companyId}`);
      setServices(data || []);
    } catch (error) {
      toast.error("Failed to fetch services");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;
    try {
      await apiClient.delete(`/products/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success("Service deleted successfully");
    } catch (error) {
      toast.error("Failed to delete service");
    }
  };

  const handleAddService = async () => {
    const price = parseFloat(formData.price);
    if (!formData.name.trim() || !Number.isFinite(price) || price < 0) {
      return toast.error("Enter a name and a valid price");
    }
    if (!user?.companyId) return toast.error("Create your company profile first");
    setIsSaving(true);
    try {
      const newService = await apiClient.post<ServiceItem>('/products', {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        price,
      });
      toast.success("Service added successfully!");
      setServices([newService, ...services]);
      setAddModalOpen(false);
      setFormData({ name: "", category: "", description: "", price: "" });
    } catch (error) {
      toast.error("Failed to add service");
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <SearchInput placeholder="Search Services..." value={search} onChange={setSearch} />
        <div style={{ flex: 1 }} />
        <PrimaryBtn onClick={() => setAddModalOpen(true)}>
          <PlusSquare style={{ width: 16, height: 16 }} /> Add New Service
        </PrimaryBtn>
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center" }}>Loading services...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
          No services found. Click 'Add New Service' to create one.
        </div>
      )}

      {/* Services List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.map((s) => (
          <Card key={s.id} style={{ padding: 24, paddingBottom: 0 }}>
            {/* Top row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>{s.name}</h2>
                {s.category && (
                  <span style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 12, fontWeight: 500, padding: "2px 10px", borderRadius: 20 }}>
                    {s.category}
                  </span>
                )}
              </div>
              <StatusBadge status={"active"} />
            </div>

            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px", maxWidth: 900 }}>
              {s.description || "No description provided."}
            </p>

            {/* Bottom stats row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
                <span style={{ fontSize: 13, color: "#64748b" }}>Price: <b style={{ color: "#0f172a" }}>{typeof s.price === "number" ? `₹${s.price.toLocaleString("en-IN")}` : "On request"}</b></span>
              </div>
              
              <div style={{ display: "flex", gap: 8 }}>
                <button aria-label={`Delete ${s.name}`} title="Delete" onClick={() => handleDelete(s.id)} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, cursor: "pointer", color: "#ef4444" }}>
                  <XCircle style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add New Service Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setAddModalOpen(false)} title="Add New Service">
        <Input label="Service Name *" placeholder="e.g. Custom Web App Development" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        <Input label="Category" placeholder="e.g. Web Development" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} />
        <Input label="Price *" type="number" placeholder="e.g. 15000" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
        <TextArea label="Description" placeholder="Detailed overview of the service..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <GhostBtn onClick={() => setAddModalOpen(false)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleAddService} disabled={isSaving}>
            {isSaving ? "Saving..." : "Add Service"}
          </PrimaryBtn>
        </div>
      </Modal>
    </div>
  );
}
