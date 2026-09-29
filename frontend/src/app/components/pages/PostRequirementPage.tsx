import { useState } from "react";
import { motion } from "motion/react";
import { Check, UploadCloud, FileText, X } from "lucide-react";

export function PostRequirementPage() {
  const steps = [
    "Select service", "Describe Requirement", "Budget", 
    "Timeline", "Attached File", "Review & Submit", "Confirmation"
  ];
  const [activeStep, setActiveStep] = useState(0);

  const services = [
    "Web Development", "App Development", "Software Development", "Cybersecurity", "Graphic Design",
    "UI/UX Design", "Digital Marketing", "Video & Animation", "Cloud & DevOps", "IT Consulting",
    "Data & AI", "Business Consulting", "Accounting & Finance", "Legal Services"
  ];
  
  const budgetRanges = ["Under 50k", "50K-1L", "1L-2L", "2L-5L"];
  const timelinePresets = ["ASAP", "Within 1 Month", "1-3 Month", "3-6 Month", "1-2 Year", "Flexible"];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", textTransform: "uppercase" }}>Post A Requirement</h1>
          <p style={{ fontSize: 16, fontWeight: 500, color: "#0f172a", margin: 0 }}>Tell us what you need and we'll help you connect with<br />relevant businesses.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 32 }}>
          {/* Sidebar */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "32px 0", height: "fit-content" }}>
            {steps.map((step, i) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 24px", position: "relative" }}>
                {i < steps.length - 1 && <div style={{ position: "absolute", left: 39, top: 40, width: 2, height: 24, background: "#e2e8f0" }} />}
                <div style={{ 
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: activeStep >= i ? "#3b82f6" : "#e2e8f0",
                  color: activeStep >= i ? "#fff" : "transparent",
                  fontSize: 14, fontWeight: 700, zIndex: 1
                }}>
                  {activeStep > i ? <Check size={16} /> : (activeStep === i ? i + 1 : "")}
                </div>
                <span style={{ fontSize: 13, fontWeight: activeStep === i ? 600 : 500, color: activeStep === i ? "#3b82f6" : "#64748b" }}>
                  {step}
                </span>
              </div>
            ))}
          </div>

          {/* Form Content */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* 1. Select Service */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3b82f6" }} />
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Select Service</h3>
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Select a service according to your requirement</p>
                  </div>
                </div>
                <Check color="#10b981" size={20} />
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {services.map(s => (
                  <button key={s} style={{ 
                    padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: s === "Web Development" ? "#fff" : "#fff",
                    border: s === "Web Development" ? "2px solid #6366f1" : "1px solid #cbd5e1",
                    color: s === "Web Development" ? "#4338ca" : "#334155"
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Describe Requirement */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3b82f6" }} />
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Describe Requirement</h3>
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Provide detailed information about your requirement</p>
                  </div>
                </div>
                <Check color="#10b981" size={20} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Requirement Title *</label>
                  <input type="text" defaultValue="Build an e-commerce website" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Describe your requirement *</label>
                  <textarea defaultValue="## " style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13, minHeight: 80 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Additional project details (Optional)</label>
                  <textarea defaultValue="## " style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13, minHeight: 80 }} />
                </div>
              </div>
            </div>

            {/* 3. Budget */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3b82f6" }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Budget</h3>
                </div>
                <Check color="#10b981" size={20} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Minimum Budget *</label>
                  <input type="text" defaultValue="₹ 12,000" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13, fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Maximum Budget *</label>
                  <input type="text" defaultValue="₹ 30,000" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13, fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Currency</label>
                  <input type="text" defaultValue="INR" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13, fontWeight: 600 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 8 }}>Quick Budget Range</label>
                <div style={{ display: "flex", gap: 12 }}>
                  {budgetRanges.map(r => (
                    <button key={r} style={{ 
                      padding: "8px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: r === "Under 50k" ? "#fff" : "#fff",
                      border: r === "Under 50k" ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                      color: r === "Under 50k" ? "#0f172a" : "#334155"
                    }}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Timeline */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3b82f6" }} />
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Timeline</h3>
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Set your expected project budget</p>
                  </div>
                </div>
                <Check color="#10b981" size={20} />
              </div>
              <div style={{ display: "flex", gap: 32 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Preferred Starting Date</label>
                      <input type="date" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13 }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Expected Completion Date</label>
                      <input type="date" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13 }} />
                    </div>
                  </div>
                </div>
                <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {timelinePresets.map(t => (
                    <div key={t} style={{ 
                      padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8,
                      border: t === "3-6 Month" ? "2px solid #4f46e5" : "1px solid #cbd5e1"
                    }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: t === "3-6 Month" ? "#4f46e5" : "#e2e8f0" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Attach File */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3b82f6" }} />
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Attach File</h3>
                    <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Set your expected project budget</p>
                  </div>
                </div>
                <Check color="#10b981" size={20} />
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ flex: 2, border: "1px solid #cbd5e1", borderRadius: 8, background: "#eff6ff", padding: 32, textAlign: "center" }}>
                  <UploadCloud size={32} color="#6366f1" style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>Drag & drop files or <span style={{ color: "#6366f1" }}>Browse Files</span></p>
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>Uploaded Files (2)</h4>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={16} color="#ef4444" />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Project_brief.pdf</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>2.4MB</span>
                      <X size={14} color="#64748b" />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText size={16} color="#10b981" />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Reference_design.png</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>1.8MB</span>
                      <X size={14} color="#64748b" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6. Review & Submit */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 24, display: "flex", gap: 24, alignItems: "center" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />
              <div style={{ flexShrink: 0 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Review & Submit</h3>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>Review your information<br />before submiting</p>
              </div>
              <div style={{ display: "flex", gap: 12, flex: 1 }}>
                {["Service", "Requirement", "Budget", "Timeline", "Attachment"].map(b => (
                  <div key={b} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px", flex: 1, minHeight: 60 }}>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{b}</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 6 }}>Ready To Submit</span>
                <button style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Submit</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
