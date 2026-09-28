// Requirement Details — matches dashboard-requirement-details.png
import { StatusBadge, Card } from "../ui/DesignSystem";
import { CheckCircle, Send } from "lucide-react";

export function RequirementDetails() {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Main details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Enterprise CRM Development</h2>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ background: "#eff6ff", color: "#2563EB", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>Software Dev</span>
                    <StatusBadge status="active" />
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>Posted Sep 15, 2026</span>
                  </div>
                </div>
                <button style={{ background: "#2563EB", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Send style={{ width: 14, height: 14 }} /> Send Proposal
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
                {[
                  { label: "Budget Range", value: "$25,000 – $50,000" },
                  { label: "Timeline",     value: "3-4 months" },
                  { label: "Location",     value: "Remote / Mumbai, India" },
                ].map(f => (
                  <div key={f.label}>
                    <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 4px" }}>{f.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{f.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Project Description</p>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7, margin: 0 }}>
                  We are seeking an experienced software development team to build a comprehensive enterprise-grade CRM system. The solution should integrate seamlessly with our existing ERP infrastructure, support multi-team pipelines, and include robust analytics dashboards, mobile access, and automated workflow triggers.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Key Requirements</h3>
            </div>
            <div style={{ padding: 24 }}>
              {[
                "Multi-pipeline CRM with lead scoring and conversion tracking",
                "Integration with SAP ERP and existing billing systems",
                "Mobile apps for iOS and Android (React Native)",
                "Role-based access control for 500+ users",
                "Real-time reporting and custom dashboard builder",
                "GDPR and SOC 2 compliance",
              ].map((req, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 5 ? 12 : 0 }}>
                  <CheckCircle style={{ width: 16, height: 16, color: "#16a34a", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontSize: 13, color: "#374151" }}>{req}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Proposals Summary</h3>
            </div>
            <div style={{ padding: 24 }}>
              {[
                { label: "Total Proposals", value: "8" },
                { label: "Avg. Bid Amount", value: "$34,200" },
                { label: "Shortlisted",     value: "2" },
                { label: "Deadline",        value: "Oct 05, 2026" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Posted By</h3>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, background: "#eff6ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, color: "#2563EB" }}>TV</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>TechVista Solutions</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>Mumbai, India</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle style={{ width: 14, height: 14, color: "#16a34a" }} />
                <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Verified Enterprise Partner</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
