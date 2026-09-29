import { useState, useEffect } from "react";
import { StatusBadge } from "../ui/DesignSystem";
import { Download, CheckCircle, Clock } from "lucide-react";
import { Link, useParams } from "react-router";
import { motion } from "motion/react";
import { apiClient } from "../../../services/apiClient";
import toast from "react-hot-toast";

export function RequirementDetails() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<any>(null);

  useEffect(() => {
    fetchDeal();
  }, [id]);

  const fetchDeal = async () => {
    try {
      if (id) {
        const res = await apiClient.get<any>(`/deals/${id}`);
        setDeal(res);
      } else {
        // Fallback to latest deal for demo if no ID is provided
        const res = await apiClient.get<any>('/deals');
        const data = Array.isArray(res) ? res : (res.data || []);
        if (data.length > 0) setDeal(data[0]);
      }
    } catch (error) {
      toast.error("Failed to load requirement details");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    try {
      if (!deal?.id) {
        toast.success(`Demo action: ${action} triggered!`);
        return;
      }
      
      if (action === 'Close Requirement') {
        await apiClient.put(`/deals/${deal.id}/status`, { status: 'closed' });
        toast.success("Requirement closed");
        fetchDeal();
      } else if (action === 'Accept Proposal') {
        await apiClient.put(`/deals/${deal.id}/status`, { status: 'accepted' });
        toast.success("Proposal accepted!");
        fetchDeal();
      } else if (action === 'Decline') {
        await apiClient.put(`/deals/${deal.id}/status`, { status: 'rejected' });
        toast.success("Proposal declined");
        fetchDeal();
      } else {
        toast("Feature coming soon: " + action, { icon: "🚧" });
      }
    } catch (error) {
      toast.error(`Failed to ${action.toLowerCase()}`);
    }
  };

  const title = deal?.title || "Enterprise CRM Development";
  const status = deal?.status || "Active";
  const amount = deal?.totalAmount ? `$${deal.totalAmount}` : "$25,000 - $50,000";
  const dateStr = deal?.createdAt ? new Date(deal.createdAt).toLocaleDateString() : "Sep 15, 2026";
  const description = deal?.description || "We are seeking a highly experienced software development provider to construct a fully customized Enterprise Customer Relationship Management (CRM) system. The baseline target platform must integrate seamlessly with our legacy database layers and support deep operational data flow mapping. The application needs specialized components including custom workflow triggers, robust role-based access controls, and dynamic analytical widgets.\n\nSecurity compliance is paramount; the architecture must natively support modern standards like SAML/OIDC and offer secure milestone-protected auditing capabilities. Real-time logging of user activity and comprehensive API governance are essential deliverables. Suppliers should present clear architectural proposals detailing structural data safety benchmarks.";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      
      {/* Top Banner */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px 32px", marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>{title}</h1>
            <span style={{ background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20 }}>{status}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "#64748b" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>📅 Posted {dateStr}</span>
            <span style={{ color: "#e2e8f0" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>💰 {amount}</span>
            <span style={{ color: "#e2e8f0" }}>|</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>⏱️ 3-6 months</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => handleAction("Edit Requirement")} style={{ background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
            Edit Requirement
          </button>
          <button onClick={() => handleAction("Close Requirement")} style={{ background: "#ffffff", border: "1px solid #ef4444", color: "#ef4444", fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 8, cursor: "pointer" }}>
            Close Requirement
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
        
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Requirement Description */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "28px 32px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Requirement Description</h2>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, margin: "0 0 16px", whiteSpace: "pre-wrap" }}>
              {description}
            </p>
          </div>

          {/* Attachments */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "28px 32px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Attachments</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: "#2563EB" }}>📄</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Requirements_Spec.pdf</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>1.8 MB</span>
                </div>
                <button onClick={() => handleAction("Download Attachment")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Download style={{ width: 16, height: 16 }} /></button>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: "#2563EB" }}>📄</div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>Wireframes.zip</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>14.5 MB</span>
                </div>
                <button onClick={() => handleAction("Download Attachment")} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Download style={{ width: 16, height: 16 }} /></button>
              </div>
            </div>
          </div>

          {/* Proposals Received */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 16px" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>Proposals Received</h2>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#2563EB" }}>1 proposal</span>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Proposal 1 */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#2563EB", fontWeight: 700, fontSize: 14 }}>N</div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>Nexis Digital Logistics</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>4.8 ★</span>
                    <span>|</span>
                    <span>Proposed: <strong style={{ color: "#0f172a" }}>$35,000</strong> in 4 months</span>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 20px" }}>
                  Full enterprise-scale integration with Salesforce, complete with robust custom reporting modules and data validation structures.
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Link to="#" onClick={() => handleAction("View Full Proposal")} style={{ fontSize: 13, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>View Full Proposal</Link>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <button onClick={() => handleAction("Decline")} style={{ background: "none", border: "none", color: "#64748b", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Decline</button>
                    <button onClick={() => handleAction("Accept Proposal")} style={{ background: "#10b981", border: "none", color: "#fff", fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 6, cursor: "pointer" }}>Accept Proposal</button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          
          {/* Requirement Summary */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Requirement Summary</h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[
                { label: "Category", value: "Software Development" },
                { label: "Budget Range", value: amount },
                { label: "Timeline", value: "3 - 6 months" },
                { label: "Location", value: "Remote" },
                { label: "Posted By", value: "TechVista Solutions" },
                { label: "Deadline", value: "Oct 15, 2026" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "24px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 24px" }}>Activity Timeline</h2>
            <div style={{ position: "relative", paddingLeft: 12 }}>
              <div style={{ position: "absolute", left: 16, top: 8, bottom: 24, width: 2, background: "#2563EB" }} />
              
              <div style={{ position: "relative", paddingLeft: 24, marginBottom: 24 }}>
                <div style={{ position: "absolute", left: -2, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#2563EB" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Requirement Posted</p>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{dateStr}</span>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Project specs uploaded by Admin</p>
              </div>
              
              <div style={{ position: "relative", paddingLeft: 24 }}>
                <div style={{ position: "absolute", left: -2, top: 4, width: 10, height: 10, borderRadius: "50%", background: "#e2e8f0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>Awaiting final decision</p>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>Pending</span>
                </div>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0 }}>Evaluating stakeholder commercial feedback</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
