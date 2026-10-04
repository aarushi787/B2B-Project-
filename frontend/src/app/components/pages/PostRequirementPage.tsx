import { useState } from "react";
import { motion } from "motion/react";
import { Check, UploadCloud, FileText, X } from "lucide-react";
import { requirementsService } from "../../../services/requirementsService";
import { friendlyError } from "../../../lib/useLoad";
import { parseAmount } from "../../../lib/format";
import { BUDGET_PRESETS } from "../marketplace/constants";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";

export function PostRequirementPage() {
  const navigate = useNavigate();
  const steps = [
    "Select service", "Describe Requirement", "Budget", 
    "Timeline", "Attached File", "Review & Submit"
  ];
  const [activeStep, setActiveStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [service, setService] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [timeline, setTimeline] = useState("");
  const [budgetPreset, setBudgetPreset] = useState("");

  const services = [
    "Web Development", "App Development", "Software Development", "Cybersecurity", "Graphic Design",
    "UI/UX Design", "Digital Marketing", "Video & Animation", "Cloud & DevOps", "IT Consulting",
    "Data & AI", "Business Consulting", "Accounting & Finance", "Legal Services"
  ];
  
  const budgetRanges = Object.keys(BUDGET_PRESETS);
  const timelinePresets = ["ASAP", "Within 1 Month", "1-3 Month", "3-6 Month", "1-2 Year", "Flexible"];

  const handleSubmit = async () => {
    try {
      if (!title || !description || !service) {
        toast.error("Please fill in the required fields (Service, Title, Description)");
        return;
      }
      setIsSubmitting(true);
      const budgetMin = parseAmount(minBudget);
      const budgetMax = parseAmount(maxBudget);
      if (minBudget.trim() && budgetMin === undefined) { toast.error("Enter the minimum budget as a number, for example 10000 or 1.5L."); setIsSubmitting(false); return; }
      if (maxBudget.trim() && budgetMax === undefined) { toast.error("Enter the maximum budget as a number, for example 30000 or 2L."); setIsSubmitting(false); return; }
      if (budgetMin !== undefined && budgetMax !== undefined && budgetMin > budgetMax) { toast.error("The minimum budget cannot be higher than the maximum."); setIsSubmitting(false); return; }
      await requirementsService.create({
        title: title.trim(),
        description: description.trim(),
        category: service,
        budgetMin,
        budgetMax,
        timeline: timeline || undefined,
      });
      toast.success("Requirement posted successfully!");
      navigate('/app/requirements/active');
    } catch (error) {
      toast.error(friendlyError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

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
                {service && <Check color="#10b981" size={20} />}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {services.map(s => (
                  <button key={s} onClick={() => { setService(s); setActiveStep(Math.max(activeStep, 1)); }} style={{ 
                    padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: "#fff",
                    border: service === s ? "2px solid #6366f1" : "1px solid #cbd5e1",
                    color: service === s ? "#4338ca" : "#334155"
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
                {title && description && <Check color="#10b981" size={20} />}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Requirement Title *</label>
                  <input value={title} onChange={(e) => { setTitle(e.target.value); setActiveStep(Math.max(activeStep, 2)); }} placeholder="E.g. Build an e-commerce website" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13 }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Describe your requirement *</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide as much detail as possible..." style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13, minHeight: 120, resize: "vertical" }} />
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
                {(minBudget || maxBudget) && <Check color="#10b981" size={20} />}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Minimum Budget</label>
                  <input value={minBudget} onChange={e => { setMinBudget(e.target.value); setActiveStep(Math.max(activeStep, 3)); }} placeholder="₹ 10,000" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13, fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Maximum Budget</label>
                  <input value={maxBudget} onChange={e => setMaxBudget(e.target.value)} placeholder="₹ 30,000" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 13, fontWeight: 600 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 6 }}>Currency</label>
                  <input disabled value="INR" style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 13, fontWeight: 600 }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 8 }}>Quick Budget Range</label>
                <div style={{ display: "flex", gap: 12 }}>
                  {budgetRanges.map(r => (
                    <button key={r} onClick={() => { setBudgetPreset(r); setMinBudget(String(BUDGET_PRESETS[r][0])); setMaxBudget(String(BUDGET_PRESETS[r][1])); setActiveStep(Math.max(activeStep, 3)); }} style={{ 
                      padding: "8px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: "#fff",
                      border: budgetPreset === r ? "2px solid #4f46e5" : "1px solid #cbd5e1",
                      color: budgetPreset === r ? "#0f172a" : "#334155"
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
                  </div>
                </div>
                {timeline && <Check color="#10b981" size={20} />}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {timelinePresets.map(t => (
                    <button key={t} onClick={() => { setTimeline(t); setActiveStep(Math.max(activeStep, 4)); }} style={{ 
                      padding: "8px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8, cursor: "pointer", background: "#fff",
                      border: timeline === t ? "2px solid #4f46e5" : "1px solid #cbd5e1"
                    }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: timeline === t ? "#4f46e5" : "#e2e8f0" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t}</span>
                    </button>
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
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 24 }}>
                <div style={{ flex: 1, border: "1px dashed #cbd5e1", borderRadius: 8, background: "#eff6ff", padding: 32, textAlign: "center", cursor: "pointer" }} onClick={() => { toast("File upload coming soon", {icon: "🚧"}); setActiveStep(Math.max(activeStep, 5)); }}>
                  <UploadCloud size={32} color="#6366f1" style={{ margin: "0 auto 8px" }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>Drag & drop files or <span style={{ color: "#6366f1" }}>Browse Files</span></p>
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
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px", flex: 1, minHeight: 60, background: service ? "#fff" : "#f1f5f9" }}>
                  <span style={{ fontSize: 10, color: "#64748b", display: "block" }}>Service</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{service || "Pending"}</span>
                </div>
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px", flex: 1, minHeight: 60, background: title ? "#fff" : "#f1f5f9" }}>
                  <span style={{ fontSize: 10, color: "#64748b", display: "block" }}>Requirement</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{title || "Pending"}</span>
                </div>
                <div style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px", flex: 1, minHeight: 60, background: maxBudget ? "#fff" : "#f1f5f9" }}>
                  <span style={{ fontSize: 10, color: "#64748b", display: "block" }}>Budget</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{maxBudget || "Pending"}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, fontWeight: 700, display: "block", marginBottom: 6 }}>Ready To Submit</span>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || !title || !service}
                  style={{ 
                    background: (!title || !service) ? "#94a3b8" : "#4f46e5", 
                    color: "#fff", 
                    border: "none", 
                    borderRadius: 8, 
                    padding: "10px 24px", 
                    fontSize: 13, 
                    fontWeight: 600, 
                    cursor: (!title || !service) ? "not-allowed" : "pointer" 
                  }}>
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
