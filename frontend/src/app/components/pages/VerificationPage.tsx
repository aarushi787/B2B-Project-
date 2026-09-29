import { useState } from "react";
import { motion } from "motion/react";
import { Check, Mail, Phone, FileText, User, UploadCloud } from "lucide-react";

export function VerificationPage() {
  const steps = [
    { title: "Email Verified", subtitle: "Legal Contact", status: "completed" },
    { title: "Phone Verified", subtitle: "SMS Alerts", status: "completed" },
    { title: "Business Documents", subtitle: "In Review", status: "in-review" },
    { title: "Government ID", subtitle: "Pending", status: "pending" }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      style={{ maxWidth: 900, fontFamily: "Inter, sans-serif" }}
    >
      {/* Top Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Verification</h1>
      </div>

      {/* Progress Card */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Verification Progress</h2>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#2563EB" }}>2 of 4 steps completed</span>
        </div>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px" }}>Complete all required legal steps to unlock high-tier matching priority.</p>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1, background: "#fff", paddingRight: 16 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                border: step.status === "completed" ? "2px solid #16a34a" : step.status === "in-review" ? "2px solid #2563EB" : "2px solid #e2e8f0",
                color: step.status === "completed" ? "#16a34a" : step.status === "in-review" ? "#2563EB" : "#94a3b8"
              }}>
                {step.status === "completed" ? <Check size={18} /> : <div style={{ width: 8, height: 8, borderRadius: "50%", background: step.status === "in-review" ? "#2563EB" : "#e2e8f0" }} />}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: step.status === "pending" ? "#94a3b8" : "#0f172a" }}>{step.title}</p>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{step.subtitle}</p>
              </div>
            </div>
          ))}
          {/* Background line */}
          <div style={{ position: "absolute", top: 18, left: 30, right: 30, height: 2, background: "#e2e8f0", zIndex: 0 }} />
          <div style={{ position: "absolute", top: 18, left: 30, width: "50%", height: 2, background: "#16a34a", zIndex: 0 }} />
        </div>
      </div>

      {/* Email Verification */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
            <Mail size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Email Verification</h3>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 12 }}>Verified</span>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>enterprise@techvista.com • Verified on Jan 10, 2023</p>
          </div>
        </div>
        <Check color="#16a34a" size={24} />
      </div>

      {/* Phone Verification */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
            <Phone size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Phone Verification</h3>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: 12 }}>Verified</span>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>+91 22 5554-1234 • Verified on Jan 12, 2023</p>
          </div>
        </div>
        <Check color="#16a34a" size={24} />
      </div>

      {/* Business Documents */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706" }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Business Documents</h3>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "#fef3c7", padding: "2px 8px", borderRadius: 12 }}>In Review</span>
              </div>
              <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Under review — typically takes 2-3 business days</p>
            </div>
          </div>
          <button style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
            Upload Additional Documents
          </button>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc", flex: 1 }}>
            <FileText size={20} color="#64748b" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>GST Certificate.pdf</p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>1.4 MB • Uploaded Jan 14, 2026</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#f8fafc", flex: 1 }}>
            <FileText size={20} color="#64748b" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>Company Registration.pdf</p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>2.8 MB • Uploaded Jan 14, 2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Government ID */}
      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            <User size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Government ID</h3>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 12 }}>Not Started</span>
            </div>
            <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Verify identity of the business founder or legal representative</p>
          </div>
        </div>

        <div style={{ border: "2px dashed #e2e8f0", borderRadius: 8, padding: 40, textAlign: "center", background: "#fafafa" }}>
          <UploadCloud size={32} color="#94a3b8" style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: "0 0 4px" }}>Drag and drop or click to upload</p>
          <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px" }}>Accepted formats: PDF, PNG, JPG (Max 5MB)</p>
          <button style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "8px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>
            Upload
          </button>
        </div>
      </div>
    </motion.div>
  );
}
