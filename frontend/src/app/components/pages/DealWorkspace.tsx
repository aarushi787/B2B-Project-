import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { ActivityChat } from "../ActivityChat";
import { DealDetails } from "../DealDetails";
import { useParams } from "react-router";
import { socketService } from "../../../services/socketService";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { friendlyError } from "../../../lib/useLoad";
import { dealsService } from "../../../services/dealsService";
import { messagesService } from "../../../services/messagesService";
import { companiesService } from "../../../services/companiesService";
import { formatINR } from "../../../lib/format";
import type { Deal, Company, Message } from "../../../types";
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

function mapStatus(status?: string): DealStatus {
  switch ((status || "").toUpperCase()) {
    case "CONFIRMED": case "APPROVED": return "Approved";
    case "COMPLETED": return "Completed";
    case "VOIDED": case "REJECTED": case "CANCELLED": return "Rejected";
    default: return "Pending";
  }
}

export function DealWorkspace() {
  const { id = "" } = useParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [dealLoadFailed, setDealLoadFailed] = useState(false);
  const [buyer, setBuyer] = useState<Company | null>(null);
  const [seller, setSeller] = useState<Company | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);

  // Load the real deal. The API only returns deals the viewer's company is a party to (or any deal for admins).
  useEffect(() => {
    let alive = true;
    setDeal(null); setBuyer(null); setSeller(null); setMessages([]);
    setDealLoadFailed(false); setLoading(true);
    (async () => {
      try {
        const d = await dealsService.getDealById(id);
        if (!alive) return;
        setDeal(d);
        const [b, s, m] = await Promise.all([
          companiesService.getCompanyById(d.buyerId).catch(() => null),
          d.sellerIds[0] ? companiesService.getCompanyById(d.sellerIds[0]).catch(() => null) : Promise.resolve(null),
          messagesService.getMessagesByDeal(id).catch(() => [] as Message[]),
        ]);
        if (!alive) return;
        setBuyer(b); setSeller(s); setMessages(m);
      } catch {
        if (alive) setDealLoadFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const dealStatus = mapStatus(deal?.status);
  const side = getDealSide(deal, user?.companyId, isAdmin);
  const role: Role = side === "buyer" ? "Client" : side === "seller" ? "Provider" : side === "admin" ? "Admin" : "Client";
  const canAct = side === "admin" || side === "buyer" || side === "seller";

  // Real-time updates for this deal.
  useEffect(() => {
    if (!id) return;
    socketService.connect();
    socketService.watchDeal(id);
    const offDeal = socketService.on("deals:updated", (data: any) => {
      if (data?.id === id) setDeal(prev => (prev ? { ...prev, ...data } : prev));
    });
    const offMsg = socketService.on("messages:new", (m: any) => {
      if (m?.dealId === id) setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
    });
    return () => { offDeal(); offMsg(); socketService.unwatchDeal(id); };
  }, [id]);

  const act = async (kind: "approve" | "reject") => {
    if (!canAct) { toast.error("You have view-only access to this deal."); return; }
    setBusy(true);
    try {
      const updated = kind === "approve" ? await dealsService.approveDeal(id) : await dealsService.rejectDeal(id, "");
      setDeal(updated);
      toast.success(kind === "approve" ? "Deal approved" : "Deal rejected");
    } catch (e: any) {
      toast.error(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!deal || !user?.companyId || !text.trim()) return;
    const receiverId = deal.buyerId === user.companyId ? deal.sellerIds[0] : deal.buyerId;
    if (!receiverId) { toast.error("This deal has no counterparty to message."); return; }
    try {
      const m = await messagesService.sendMessage({ senderId: user.companyId, receiverId, dealId: id, content: text.trim() } as any);
      setMessages(prev => (prev.some(x => x.id === m.id) ? prev : [...prev, m]));
    } catch (e: any) {
      toast.error(friendlyError(e));
    }
  };

  const chat: ChatMessage[] = messages.map(m => {
    const fromBuyer = m.senderId === deal?.buyerId;
    const co = fromBuyer ? buyer : seller;
    return {
      id: m.id,
      sender: co?.name || (fromBuyer ? "Client" : "Provider"),
      role: fromBuyer ? "Client" : "Provider",
      text: m.content,
      timestamp: new Date((m as any).timestamp ?? m.createdAt),
    };
  });

  const amountLabel = deal && deal.amount > 0 ? formatINR(deal.amount) : undefined;

  if (loading) {
    return <div className="p-10 text-center text-sm text-slate-500">Loading deal...</div>;
  }
  if (dealLoadFailed || !deal) {
    return (
      <div role="alert" className="max-w-xl mx-auto mt-10 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm px-5 py-4">
        We couldn't load this deal. It may not exist, or your company may not be a party to it.
      </div>
    );
  }

  const nextStep = getNextStep({ side, dealStatus, escrowStatus: "Not Funded", milestone: 0, amountLabel });
  const statusClass =
    dealStatus === "Approved" ? "bg-green-100 text-green-700 border-green-200" :
    dealStatus === "Rejected" ? "bg-red-100 text-red-700 border-red-200" :
    dealStatus === "Completed" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
    "bg-amber-100 text-amber-700 border-amber-200";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-right" richColors />

      <div className="bg-white border-b border-slate-200 shadow-sm mb-6 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-blue-400 flex items-center justify-center shadow-sm shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">{deal.title || "Deal Workspace"}</h2>
              <p className="text-xs text-slate-400">{buyer?.name || "Buyer"} × {seller?.name || "Seller"}</p>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ml-2 ${statusClass}`}>{dealStatus}</div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-5">
        <div className="flex items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            <span>Deal ID:</span>
            <span className="text-[#2563EB] font-bold">{id}</span>
          </div>
          <div className="ml-3"><DealRoleBadge side={side} /></div>
          {amountLabel && <div className="ml-auto text-sm font-bold text-slate-900">{amountLabel}</div>}
        </div>

        {dealStatus !== "Approved" && (
          <NextStepCard
            step={nextStep}
            onAction={(a) => { if (a === "approve" && !busy) void act("approve"); }}
          />
        )}
        {dealStatus === "Pending" && side === "admin" && (
          <div>
            <button disabled={busy} onClick={() => act("reject")} className="text-xs font-semibold text-red-600 border border-red-200 bg-white rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50">
              Reject deal
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">
          <div className="space-y-5 min-w-0">
            <ActivityChat messages={chat} onSend={handleSendMessage} role={role} />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-sm font-bold text-slate-900">Contract documents</h2>
              <p className="text-xs text-slate-400 mt-2">No documents are attached to this deal yet.</p>
            </div>
          </div>

          <div className="space-y-5">
            <DealDetails
              dealStatus={dealStatus}
              dealId={id}
              title={deal.title}
              category={deal.category}
              amountLabel={amountLabel}
              createdAt={deal.createdAt}
              client={buyer ? { name: buyer.name } : undefined}
              provider={seller ? { name: seller.name } : undefined}
            />

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <h2 className="text-sm font-bold text-slate-900">Escrow and milestones</h2>
              <p className="text-xs text-slate-400 mt-2">
                Escrow funding and milestone tracking are not enabled for this deal yet, so no payment status is shown.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
