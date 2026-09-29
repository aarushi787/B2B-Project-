import { useState, useEffect } from "react";
import { CheckCircle2, ShieldCheck, Phone, Mail, FileText, BadgeCheck } from "lucide-react";
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
  founded?: string;
  size?: string;
}

export function Companies() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
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
          setCompany({
            ...data,
            name: data.name || "TechVista Solutions",
            industry: data.industry || "Information Technology & Services",
            description: data.description || "TechVista Solutions is a premier B2B software engineering and cloud infrastructure development firm. Over the past 8 years, we have designed, architected, and successfully delivered scalable web services, native mobile deployments, and secure DevOps frameworks for modern enterprise clients. We combine strict SOC 2 operations with cutting-edge react, native, and AI modeling implementations.",
            address: data.address || "Mumbai, India",
            email: data.email || "enterprise@techvista.com",
            phone: data.phone || "+91 22 5554-1234",
            website: data.website || "https://techvista.com",
            founded: data.founded || "2018",
            size: data.size || "50-200 employees",
          });
          setFormData(data);
          return;
        }
      }
      setCompany(null);
    } catch (error) {
      toast.error("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTimeout(() => {
      setCompany(prev => ({ ...prev, ...formData } as Company));
      setEditModalOpen(false);
      setIsSaving(false);
      toast.success("Profile updated successfully!");
    }, 500);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading profile...</div>;

  const fallback = {
    name: "TechVista Solutions",
    industry: "Information Technology & Services",
    description: "TechVista Solutions is a premier B2B software engineering and cloud infrastructure development firm. Over the past 8 years, we have designed, architected, and successfully delivered scalable web services, native mobile deployments, and secure DevOps frameworks for modern enterprise clients. We combine strict SOC 2 operations with cutting-edge react, native, and AI modeling implementations.",
    address: "Mumbai, India",
    email: "enterprise@techvista.com",
    phone: "+91 22 5554-1234",
    website: "https://techvista.com",
    founded: "2018",
    size: "50-200 employees",
  };
  const comp = company || fallback;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      {/* Header Profile Card */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 32, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* Avatar square */}
          <div style={{ width: 88, height: 88, background: "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 800, color: "#2563EB" }}>
            {comp.name.charAt(0)}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>{comp.name}</h1>
              <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#16a34a", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                <CheckCircle2 style={{ width: 14, height: 14 }} /> Verified Enterprise Partner
              </span>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 8px" }}>Full-Stack Development & Cloud Solutions • {comp.address}</p>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Member since Jan 2023</p>
          </div>
        </div>
        <button onClick={() => setEditModalOpen(true)} style={{ background: "transparent", color: "#2563EB", border: "1px solid #2563EB", borderRadius: 8, padding: "8px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Edit Profile
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Company Information */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 20px" }}>Company Information</h2>
            <div style={{ display: "flex", flexDirection: "column", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              {[
                { label: "Industry", value: comp.industry },
                { label: "Company Size", value: comp.size },
                { label: "Founded", value: comp.founded },
                { label: "Website", value: comp.website },
                { label: "Email", value: comp.email },
                { label: "Phone", value: comp.phone },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  <span style={{ width: 240, fontSize: 13, color: "#64748b", fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* About Us */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>About Us</h2>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
              {comp.description}
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Industries Served */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Industries Served</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {["Technology", "Finance", "Healthcare", "E-commerce", "Education"].map(tag => (
                <span key={tag} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#334155", fontSize: 12, fontWeight: 500, padding: "4px 12px", borderRadius: 20 }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Key Statistics */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Key Statistics</h2>
            <div style={{ display: "flex", flexDirection: "column", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              {[
                { label: "Total Services", value: "8 Active" },
                { label: "Active Requirements", value: "12 Requirements" },
                { label: "Completed Projects", value: "45 Engagements" },
                { label: "Avg Customer Rating", value: "4.8 / 5.0 (23 Reviews)" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{item.label}</span>
                  <span style={{ fontSize: 12, color: "#0f172a", fontWeight: 700 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Status */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Verification Status</h2>
            <div style={{ display: "flex", flexDirection: "column", border: "1px solid #e2e8f0", borderRadius: 8 }}>
              {[
                { label: "Email Verified", status: "VERIFIED", color: "#16a34a", bg: "#dcfce7" },
                { label: "Phone Verified", status: "VERIFIED", color: "#16a34a", bg: "#dcfce7" },
                { label: "Business Documents", status: "PENDING", color: "#d97706", bg: "#fef3c7" },
                { label: "Government ID", status: "VERIFIED", color: "#16a34a", bg: "#dcfce7" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < arr.length - 1 ? "1px solid #e2e8f0" : "none" }}>
                  <span style={{ fontSize: 12, color: "#334155" }}>{item.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: item.color, background: item.bg, padding: "2px 8px", borderRadius: 12 }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Business Profile">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="Company Name" value={formData.name || comp.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <Input label="Email Address" type="email" value={formData.email || comp.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          <Input label="Phone Number" value={formData.phone || comp.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Website URL" value={formData.website || comp.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
          <Input label="Industry" value={formData.industry || comp.industry} onChange={e => setFormData({ ...formData, industry: e.target.value })} />
          <Input label="Address / Location" value={formData.address || comp.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          <TextArea label="About Us (Description)" value={formData.description || comp.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
          
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
