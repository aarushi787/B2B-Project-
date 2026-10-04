import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Link } from "react-router";
import { GhostBtn, PrimaryBtn, Modal, Input, TextArea } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../auth/AuthProvider";
import { friendlyError } from "../../../lib/useLoad";
import { formatDate } from "../../../lib/format";

interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  description?: string;
  address?: string;
  gst?: string;
  verified?: boolean;
  createdAt?: string;
}

const dash = (v?: string | null) => (v && String(v).trim() ? v : "Not provided");

export function Companies() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchCompany = async () => {
    if (!user?.companyId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Company>(`/companies/${user.companyId}`);
      setCompany(data);
      setFormData(data);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchCompany(); }, [user?.companyId]);

  const handleSave = async () => {
    if (!company) return;
    setIsSaving(true);
    try {
      const { name, email, phone, website, industry, address, description } = formData;
      const updated = await apiClient.put<Company>(`/companies/${company.id}`, { name, email, phone, website, industry, address, description });
      setCompany(updated);
      setFormData(updated);
      setEditModalOpen(false);
      toast.success("Profile updated successfully!");
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading profile...</div>;
  if (error) {
    return (
      <div role="alert" style={{ padding: 40, textAlign: "center", color: "#b91c1c" }}>
        {error} <button onClick={() => void fetchCompany()} style={{ color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Retry</button>
      </div>
    );
  }
  if (!company) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Your account is not linked to a company profile yet.</div>;
  }

  const comp = company;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ width: 88, height: 88, background: "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#2563EB" }}>
            {comp.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>{comp.name}</h1>
              {comp.verified && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#16a34a", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                  <CheckCircle2 style={{ width: 14, height: 14 }} /> Verified
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>{[comp.industry, comp.address].filter(Boolean).join(" • ") || "No industry or location added yet"}</p>
            {comp.createdAt && <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Member since {formatDate(comp.createdAt)}</p>}
          </div>
        </div>
        <button onClick={() => setEditModalOpen(true)} style={{ background: "transparent", color: "#2563EB", border: "1px solid #2563EB", borderRadius: 8, padding: "8px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Edit Profile
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>Company Information</h2>
            <div style={{ display: "flex", flexDirection: "column", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              {[
                { label: "Industry", value: comp.industry },
                { label: "Website", value: comp.website },
                { label: "Email", value: comp.email },
                { label: "Phone", value: comp.phone },
                { label: "GST", value: comp.gst },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  <span style={{ width: 240, fontSize: 13, color: "#64748b", fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{dash(item.value)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>About Us</h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
              {comp.description || "No description added yet."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Verification Status</h2>
            <span style={{ fontSize: 11, fontWeight: 700, color: comp.verified ? "#16a34a" : "#d97706", background: comp.verified ? "#dcfce7" : "#fef3c7", padding: "3px 10px", borderRadius: 12 }}>
              {comp.verified ? "VERIFIED" : "PENDING"}
            </span>
            <p style={{ margin: "12px 0 0" }}>
              <Link to="/app/verification" style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>View document status</Link>
            </p>
          </div>
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Business Profile">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Company Name" value={formData.name ?? ""} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label="Email Address" type="email" value={formData.email ?? ""} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Phone Number" value={formData.phone ?? ""} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Website URL" value={formData.website ?? ""} onChange={e => setFormData({ ...formData, website: e.target.value })} />
          <Input label="Industry" value={formData.industry ?? ""} onChange={e => setFormData({ ...formData, industry: e.target.value })} />
          <Input label="Address / Location" value={formData.address ?? ""} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          <TextArea label="About Us (Description)" value={formData.description ?? ""} onChange={e => setFormData({ ...formData, description: e.target.value })} />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
            <GhostBtn onClick={() => setEditModalOpen(false)}>Cancel</GhostBtn>
            <PrimaryBtn onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </PrimaryBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
