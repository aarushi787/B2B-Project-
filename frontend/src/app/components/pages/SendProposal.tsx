import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UploadCloud, X, FileText } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router";

export function SendProposal() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [deal, setDeal] = useState<any>(null);

  const [amount, setAmount] = useState("");
  const [timeline, setTimeline] = useState("");
  const [message, setMessage] = useState("");
  const [deliverables, setDeliverables] = useState(["Responsive web application", "Admin Dashboard"]);

  useEffect(() => {
    if (id) {
      apiClient.get<any>(`/deals/${id}`).then(res => setDeal(res)).catch(() => {});
    }
  }, [id]);

  const handleSubmit = async () => {
    if (!amount || !timeline || !message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (!user?.companyId) {
      toast.error("You must be associated with a company to send a proposal.");
      return;
    }

    try {
      setLoading(true);
      // Simulate sending a proposal by creating a new deal or updating the existing one
      // If we're updating a requirement to propose on it, we might just update the deal to have our sellerId
      // Alternatively we create a new deal with pending status
      
      const payload = {
        title: deal?.title ? `Proposal for: ${deal.title}` : "New Proposal",
        description: message,
        buyerId: deal?.buyerId || user.companyId, // Fallback if no deal
        sellerId: user.companyId,
        totalAmount: parseInt(amount.replace(/[^0-9]/g, "")) || 0,
        status: "pending"
      };

      await apiClient.post('/deals', payload);
      toast.success("Proposal sent successfully!");
      navigate('/app/opportunities/sent');
    } catch (error) {
      toast.error("Failed to send proposal.");
    } finally {
      setLoading(false);
    }
  };

  const removeDeliverable = (index: number) => {
    setDeliverables(deliverables.filter((_, i) => i !== index));
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
        
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>Send Proposal</h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>Submit your proposal for this requirement</p>
        </div>

        {/* Header Card */}
        <div style={{ background: "#e0e7ff", borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", margin: "0 0 12px" }}>{deal?.title || "Full-Stack Web Application"}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <span style={{ background: "#ffffff", color: "#2563EB", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 16 }}>{deal?.category || "Web Development"}</span>
            <span style={{ fontSize: 12, color: "#64748b" }}>Posted {deal?.createdAt ? new Date(deal.createdAt).toLocaleDateString() : "recently"}</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            <div>
              <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 4px", textTransform: "uppercase" }}>BUDGET</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>{deal?.totalAmount ? `$${deal.totalAmount}` : "$20,000 - $40,000"}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 4px", textTransform: "uppercase" }}>TIMELINE</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>2-4 months</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 12 }}>
                92%
              </div>
              <div>
                <p style={{ fontSize: 11, color: "#64748b", margin: "0 0 2px" }}>Matching Score</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Great match</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Details */}
        <div style={{ display: "flex", gap: 24, marginBottom: 24 }}>
          <div style={{ flex: 2 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 8 }}>Your Proposal Amount <span style={{ color: "#ef4444" }}>*</span></label>
            <input value={amount} onChange={e => setAmount(e.target.value)} type="text" placeholder="12,000" style={{ width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #3b82f6", fontSize: 16, fontWeight: 600, color: "#0f172a" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 8 }}>Estimated Delivery <span style={{ color: "#ef4444" }}>*</span></label>
            <div style={{ display: "flex", gap: 12 }}>
              <input value={timeline} onChange={e => setTimeline(e.target.value)} type="text" placeholder="8" style={{ width: "60px", padding: "12px", borderRadius: 8, border: "1px solid #3b82f6", fontSize: 16, fontWeight: 600, textAlign: "center" }} />
              <div style={{ padding: "12px", borderRadius: 8, border: "1px solid #94a3b8", fontSize: 16, fontWeight: 600, background: "#fff", flex: 1, textAlign: "center" }}>Weeks</div>
            </div>
          </div>
        </div>

        {/* Message */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 8 }}>Proposal Message <span style={{ color: "#ef4444" }}>*</span></label>
          <textarea 
            value={message} onChange={e => setMessage(e.target.value)}
            placeholder="Tell the client why your business is a good fit for this requirement. Highlight your experience, approach and what makes your proposal stand out..."
            style={{ width: "100%", padding: "16px", borderRadius: 8, border: "1px solid #3b82f6", fontSize: 13, minHeight: 140, resize: "vertical" }} 
          />
        </div>

        {/* Key Deliverables */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 8 }}>Key Deliverables (optional)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
            {deliverables.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input type="text" value={d} onChange={(e) => {
                  const newD = [...deliverables];
                  newD[i] = e.target.value;
                  setDeliverables(newD);
                }} style={{ flex: 1, padding: "10px 16px", borderRadius: 20, border: "1px solid #3b82f6", fontSize: 13 }} />
                <X onClick={() => removeDeliverable(i)} size={20} color="#64748b" style={{ cursor: "pointer" }} />
              </div>
            ))}
          </div>
          <button onClick={() => setDeliverables([...deliverables, ""])} style={{ padding: "8px 24px", borderRadius: 20, border: "1px solid #3b82f6", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Add deliverable
          </button>
        </div>

        {/* Documents */}
        <div style={{ marginBottom: 40 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", display: "block", marginBottom: 8 }}>Supporting Documents (optional)</label>
          <div onClick={() => toast("File upload coming soon", {icon: "🚧"})} style={{ background: "#e0e7ff", border: "1px solid #3b82f6", borderRadius: 12, padding: 32, textAlign: "center", marginBottom: 12, cursor: "pointer" }}>
            <UploadCloud size={32} color="#4f46e5" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>Drag & drop files or <span style={{ color: "#4f46e5" }}>Browse Files</span></p>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 16 }}>
          <button onClick={() => navigate(-1)} style={{ padding: "12px 32px", borderRadius: 12, border: "1px solid #3b82f6", background: "#fff", color: "#0f172a", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button disabled={loading} onClick={handleSubmit} style={{ padding: "12px 32px", borderRadius: 12, border: "none", background: loading ? "#94a3b8" : "#4f46e5", color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Sending..." : "Send Proposal"}
          </button>
        </div>

      </div>
    </div>
  );
}
