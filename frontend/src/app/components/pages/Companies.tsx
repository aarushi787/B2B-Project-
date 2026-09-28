// Business Profile — with Edit Profile Modal and backend integration
import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card, GhostBtn, PrimaryBtn, Modal, Input, TextArea } from "../ui/DesignSystem";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../auth/AuthProvider";

interface Company {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  industry?: string;
  description?: string;
  address?: string;
  createdAt?: string;
}

export function Companies() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<Partial<Company>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCompany();
  }, []);

  const fetchCompany = async () => {
    try {
      if (user?.companyId) {
        const data = await apiClient.get<Company>(`/companies/${user.companyId}`);
        if (data) {
          setCompany(data);
          setFormData(data);
          return;
        }
      }
        // Fallback placeholder if no companies exist in DB
        const placeholder: Company = {
          id: "new",
          name: "TechVista Solutions",
          email: "enterprise@techvista.com",
          phone: "+91 22 5554-1234",
          website: "https://techvista.com",
          industry: "Information Technology & Services",
          description: "TechVista Solutions is a premier B2B software engineering and cloud infrastructure development firm.",
        };
        setCompany(placeholder);
        setFormData(placeholder);
    } catch (error) {
      toast.error("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (company?.id && company.id !== "new") {
        await apiClient.put(`/companies/${company.id}`, formData);
        toast.success("Profile updated successfully!");
      } else {
        // Create new if placeholder
        const newComp = await apiClient.post<Company>('/companies', formData);
        toast.success("Profile created successfully!");
        setCompany(newComp);
        setFormData(newComp);
      }
      setCompany(prev => ({ ...prev, ...formData } as Company));
      setEditModalOpen(false);
    } catch (error) {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading profile...</div>;
  if (!company) return null;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Header Profile Card */}
      <Card style={{ padding: 24, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* Avatar square */}
          <div style={{ width: 80, height: 80, background: "#eff6ff", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#2563EB" }}>
            {company.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>{company.name}</h1>
              <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0fdf4", color: "#16a34a", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Verified Enterprise Partner
              </span>
            </div>
            <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 4px" }}>{company.industry || "Software Development"} • {company.address || "Mumbai, India"}</p>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Member since {company.createdAt ? new Date(company.createdAt).getFullYear() : "2023"}</p>
          </div>
        </div>
        <GhostBtn onClick={() => setEditModalOpen(true)} style={{ color: "#2563EB", borderColor: "#2563EB", padding: "10px 20px" }}>Edit Profile</GhostBtn>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>Company Information</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Industry", value: company.industry || "Not specified" },
                { label: "Company Size", value: "50-200 employees" },
                { label: "Website", value: company.website || "Not specified" },
                { label: "Email", value: company.email || "Not specified" },
                { label: "Phone", value: company.phone || "Not specified" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "flex", paddingBottom: 12, borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ width: 140, fontSize: 13, color: "#64748b", fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>About Us</h2>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
              {company.description || "No description provided."}
            </p>
          </Card>
        </div>

        {/* Right Column (Static Stats/Verification for now) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Card style={{ padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>Key Statistics</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Total Services", value: "8 Active" },
                { label: "Completed Projects", value: "45 Engagements" },
                { label: "Avg Customer Rating", value: "4.8 / 5.0" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", paddingBottom: 12, borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Business Profile">
        <Input label="Company Name" value={formData.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        <Input label="Email Address" type="email" value={formData.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} />
        <Input label="Phone Number" value={formData.phone || ""} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
        <Input label="Website URL" value={formData.website || ""} onChange={e => setFormData({ ...formData, website: e.target.value })} />
        <Input label="Industry" value={formData.industry || ""} onChange={e => setFormData({ ...formData, industry: e.target.value })} />
        <Input label="Address / Location" value={formData.address || ""} onChange={e => setFormData({ ...formData, address: e.target.value })} />
        <TextArea label="About Us (Description)" value={formData.description || ""} onChange={e => setFormData({ ...formData, description: e.target.value })} />
        
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
          <GhostBtn onClick={() => setEditModalOpen(false)}>Cancel</GhostBtn>
          <PrimaryBtn onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </PrimaryBtn>
        </div>
      </Modal>
    </div>
  );
}
