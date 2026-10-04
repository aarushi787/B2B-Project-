import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { OverviewCards } from "../OverviewCards";
import { MilestoneTimeline } from "../MilestoneTimeline";
import { ContractDocs } from "../ContractDocs";
import { EscrowPayment } from "../EscrowPayment";
import { RiskPanel } from "../RiskPanel";
import { DealAlerts } from "../DealAlerts";
import { DealDetails } from "../DealDetails";
import { UserFlowStepper } from "../UserFlowStepper";
import { useParams } from "react-router";
import { socketService } from "../../../services/socketService";
import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { dealsService } from "../../../services/dealsService";
import type { Deal } from "../../../types";
import { getDealSide, getNextStep } from "../../../lib/dealRole";
import { DealRoleBadge, NextStepCard } from "../DealNextStep";

export type Role = "Client" | "Provider" | "Admin";
export type DealStatus = "Pending" | "Approved" | "Rejected" | "Completed";
export type EscrowStatus = "Not Funded" | "Funded" | "Released";
export type DocumentStatus = "Pending" | "Signed" | "Uploaded";

export interface Document {
  id: string;
  name: string;
  size: string;
  status: DocumentStatus;
  uploadedBy: Role;
}

export interface ChatMessage {
  id: string;
  sender: string;
  role: Role;
  text: string;
  timestamp: Date;
}

export function DealWorkspace() {
  const { id = "DW-2024-001" } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [dealLoadFailed, setDealLoadFailed] = useState(false);
  const [dealStatus, setDealStatus] = useState<DealStatus>("Pending");
  const [escrowStatus, setEscrowStatus] = useState<EscrowStatus>("Not Funded");
  const [milestone, setMilestone] = useState<number>(1);

  // Load the real deal. The API only returns deals the viewer's company is a party to (or any deal for admins).
  useEffect(() => {
    let alive = true;
    setDeal(null);
    setDealLoadFailed(false);
    dealsService.getDealById(id)
      .then(d => { if (alive) setDeal(d); })
      .catch(() => { if (alive) setDealLoadFailed(true); });
    return () => { alive = false; };
  }, [id]);

  // Which side of THIS deal the viewer is on comes from the deal itself, never from a user-selectable toggle.
  const side = getDealSide(deal, user?.companyId, isAdmin);
  const role: Role = side === "buyer" ? "Client" : side === "seller" ? "Provider" : side === "admin" ? "Admin" : "Client";

  // Hook up WebSockets for real-time updates
  useEffect(() => {
    socketService.connect();
    socketService.watchDeal(id);
    
    const unsubscribe = socketService.on('deals:updated', (data: any) => {
      // Map backend status to frontend status
      const newStatus = data.status === 'CONFIRMED' || data.status === 'approved' ? 'Approved' :
                        data.status === 'COMPLETED' || data.status === 'completed' ? 'Completed' :
                        data.status === 'VOIDED' || data.status === 'rejected' ? 'Rejected' : 'Pending';
      setDealStatus(newStatus as DealStatus);
      toast.info(`Deal status updated in real-time to ${newStatus}`);
    });

    return () => {
      unsubscribe();
      socketService.unwatchDeal(id);
    };
  }, [id]);

  const [documents, setDocuments] = useState<Document[]>([
    { id: "1", name: "Master_Service_Agreement.pdf", size: "2.4 MB", status: "Signed", uploadedBy: "Provider" },
    { id: "2", name: "NDA_Signed.pdf", size: "1.1 MB", status: "Signed", uploadedBy: "Client" },
    { id: "3", name: "Scope_of_Work_v2.docx", size: "0.8 MB", status: "Uploaded", uploadedBy: "Provider" },
  ]);

  const [chat, setChat] = useState<ChatMessage[]>([
    { id: "1", sender: "System", role: "Admin", text: "Deal DW-2024-001 initiated by Admin.", timestamp: new Date(Date.now() - 172800000) },
    { id: "2", sender: "Alice (Provider)", role: "Provider", text: "I've uploaded the MSA and Scope of Work for review. Please check and sign.", timestamp: new Date(Date.now() - 86400000) },
    { id: "3", sender: "Bob (Client)", role: "Client", text: "Documents received. NDA has been signed. Will review MSA shortly.", timestamp: new Date(Date.now() - 43200000) },
    { id: "4", sender: "System", role: "Admin", text: "Contract signed. Milestone 1 completed.", timestamp: new Date(Date.now() - 7200000) },
  ]);

  const [riskScore, setRiskScore] = useState(72);
  const [checks, setChecks] = useState({ kyc: true, aml: true, verification: false });

  // Compute progress
  const progress = milestone === 0 ? 10 : milestone === 1 ? 35 : milestone === 2 ? 65 : 100;

  // Flow step derived from milestone
  const flowStep = milestone === 0 ? 0 : milestone <= 1 ? 0 : milestone === 2 ? 1 : 2;

  // Compute Alerts
  const alerts: string[] = [];
  if (dealStatus === "Pending" && milestone > 1) alerts.push("⚠️ Deal is pending approval but milestones are progressing.");
  if (!checks.verification) alerts.push("⚠️ Missing Identity Verification — required before payment.");
  if (escrowStatus === "Not Funded" && milestone >= 2) alerts.push("⚠️ Escrow must be funded to proceed to this milestone.");
  if (riskScore < 60) alerts.push("⚠️ High risk score detected — complete all compliance checks.");

  // Actions
  const handleApprove = () => {
    if (side === "observer") { toast.error("You have view-only access to this deal."); return; }
    setDealStatus("Approved");
    setChat(c => [...c, { id: Date.now().toString(), sender: "System", role: "Admin", text: "Deal approved by Admin.", timestamp: new Date() }]);
    toast.success("✅ Deal Approved successfully!", { description: "All parties have been notified." });
    
    // In a real app, this would hit the API:
    // apiClient.put(`/deals/${id}/approve`);
  };

  const handleReject = () => {
    if (side === "observer") { toast.error("You have view-only access to this deal."); return; }
    setDealStatus("Rejected");
    setChat(c => [...c, { id: Date.now().toString(), sender: "System", role: "Admin", text: "Deal rejected by Admin.", timestamp: new Date() }]);
    toast.error("Deal Rejected", { description: "Reason logged and parties notified." });
  };

  const handleFundEscrow = () => {
    if (side === "observer") { toast.error("You have view-only access to this deal."); return; }
    setEscrowStatus("Funded");
    setChat(c => [...c, { id: Date.now().toString(), sender: "System", role: "Admin", text: "Escrow funded — $1,50,000 secured.", timestamp: new Date() }]);
    if (milestone < 2) setMilestone(2);
    toast.success("💰 Escrow Funded!", { description: "$1,50,000 secured in escrow account." });
  };

  const handleReleaseEscrow = () => {
    if (side === "observer") { toast.error("You have view-only access to this deal."); return; }
    setEscrowStatus("Released");
    setDealStatus("Completed");
    setMilestone(3);
    setChat(c => [...c, { id: Date.now().toString(), sender: "System", role: "Admin", text: "Payment released. Deal completed!", timestamp: new Date() }]);
    toast.success("🎉 Payment Released!", { description: "Deal marked as completed. Funds transferred." });
  };

  const handleSignDoc = (id: string) => {
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, status: "Signed" } : d));
    setChat(c => [...c, { id: Date.now().toString(), sender: "System", role: "Admin", text: `Document signed successfully.`, timestamp: new Date() }]);
    toast.success("✍️ Document signed successfully.");
  };

  const handleUploadDoc = (file: File | null) => {
    if (!file) return;
    const newDoc: Document = {
      id: Math.random().toString(),
      name: file.name,
      size: (file.size / 1024 / 1024).toFixed(1) + " MB",
      status: "Uploaded",
      uploadedBy: role,
    };
    setDocuments(prev => [...prev, newDoc]);
    toast.success("📎 Document uploaded!", { description: file.name });
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;
    const newMessage: ChatMessage = {
      id: Math.random().toString(),
      sender: role === "Admin" ? "Admin" : role === "Client" ? "Bob (Client)" : "Alice (Provider)",
      role,
      text,
      timestamp: new Date(),
    };
    setChat(prev => [...prev, newMessage]);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-right" richColors />

      {/* Deal Identity Bar — replaces the old duplicate sticky Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm mb-6 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-cyan-400 flex items-center justify-center shadow-sm shadow-cyan-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">Deal Workspace</h2>
              <p className="text-xs text-slate-400">Acme Corp × Globex Inc · #DW-2024-001</p>
            </div>
            <motion.div
              key={dealStatus}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ml-2 ${
                dealStatus === "Approved" ? "bg-green-100 text-green-700 border-green-200" :
                dealStatus === "Rejected" ? "bg-red-100 text-red-700 border-red-200" :
                dealStatus === "Completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                "bg-amber-100 text-amber-700 border-amber-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                dealStatus === "Approved" ? "bg-green-500" :
                dealStatus === "Rejected" ? "bg-red-500" :
                dealStatus === "Completed" ? "bg-emerald-500" : "bg-amber-500"
              }`} />
              {dealStatus}
            </motion.div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live · 3 participants
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-5">

        {/* Role + Status Row */}
        <div className="flex items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            <span>Deal ID:</span>
            <span className="text-[#8B5CF6] font-bold">{id}</span>
          </div>
          <div className="ml-3"><DealRoleBadge side={side} /></div>
        </div>

        {dealLoadFailed && (
          <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs px-4 py-3">
            We couldn't load this deal, so the workspace below shows sample data and you only have view access.
          </div>
        )}

        <NextStepCard
          step={getNextStep({ side, dealStatus, escrowStatus, milestone, amountLabel: "$1,50,000" })}
          onAction={(a) => (a === "approve" ? handleApprove() : a === "fund" ? handleFundEscrow() : handleReleaseEscrow())}
        />

        {/* Smart Alerts */}
        <DealAlerts alerts={alerts} />

        {/* Overview Cards */}
        <OverviewCards
          dealAmount="$1,50,000"
          client="Acme Corp"
          provider="Globex Inc"
          progress={progress}
          riskScore={riskScore}
        />

        {/* User Flow Stepper */}
        <UserFlowStepper currentStep={flowStep} />

        {/* Main Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

          {/* LEFT: Main Workspace */}
          <div className="space-y-5 min-w-0">

            {/* Milestone Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Milestone Timeline</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Click any step to update progress</p>
                </div>
                <span className="text-xs font-semibold text-[#8B5CF6] bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                  {milestone}/3 Steps
                </span>
              </div>
              <MilestoneTimeline currentStep={milestone} onStepClick={(s) => {
                setMilestone(s);
                toast.info(`Milestone updated: Step ${s + 1}`);
              }} />
            </motion.div>

            {/* Contract Documents */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <ContractDocs
                documents={documents}
                onSign={handleSignDoc}
                onUpload={handleUploadDoc}
                role={role}
              />
            </motion.div>
          </div>

          {/* RIGHT: Sidebar */}
          <div className="space-y-5">

            {/* Deal Details */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
            >
              <DealDetails dealStatus={dealStatus} />
            </motion.div>

            {/* Risk & Compliance */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 }}
            >
              <RiskPanel
                score={riskScore}
                checks={checks}
                onToggleCheck={(key) => {
                  const updated = { ...checks, [key]: !checks[key as keyof typeof checks] };
                  setChecks(updated);
                  const passedCount = Object.values(updated).filter(Boolean).length;
                  setRiskScore(Math.min(95, 55 + passedCount * 15));
                  toast.info(`${key.toUpperCase()} check ${updated[key as keyof typeof checks] ? "enabled" : "disabled"}`);
                }}
              />
            </motion.div>

            {/* Escrow Payment */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
            >
              <EscrowPayment
                status={escrowStatus}
                amount="$1,50,000"
                role={role}
                onFund={handleFundEscrow}
                onRelease={handleReleaseEscrow}
              />
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}