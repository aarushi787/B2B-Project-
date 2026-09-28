import React from "react";
import { Calendar, Package, MapPin, Tag, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { DealStatus } from "./pages/DealWorkspace";

interface DealDetailsProps {
  dealStatus: DealStatus;
}

export function DealDetails({ dealStatus }: DealDetailsProps) {
  const deal = {
    id: "DW-2024-001",
    product: "Enterprise SaaS License Bundle",
    category: "Software & Technology",
    clientName: "Acme Corporation",
    clientLocation: "Mumbai, India",
    clientInitials: "AC",
    providerName: "Globex Inc.",
    providerLocation: "Bangalore, India",
    providerInitials: "GI",
    amount: "$1,50,000",
    startDate: "Apr 10, 2024",
    endDate: "Apr 22, 2024",
    dealType: "B2B License",
  };

  const getStatusBg = () => {
    switch (dealStatus) {
      case "Approved": return "from-green-50 to-emerald-50 border-green-100";
      case "Rejected": return "from-red-50 to-rose-50 border-red-100";
      case "Completed": return "from-emerald-50 to-teal-50 border-emerald-100";
      default: return "from-amber-50 to-yellow-50 border-amber-100";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
    >
      {/* Header */}
      <div className={`p-4 bg-gradient-to-r ${getStatusBg()} border-b`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Deal Details</span>
          <a href="#" className="text-[10px] text-[#0F9D9D] hover:underline flex items-center gap-1 font-semibold">
            View Full <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
        <p className="text-xs font-bold text-slate-800">{deal.product}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{deal.id}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Parties */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Parties Involved</p>

          {/* Client */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50 border border-blue-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white text-[10px] font-black shadow-sm">
              {deal.clientInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-800 truncate">{deal.clientName}</p>
                <span className="text-[9px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full shrink-0">Client</span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5" />{deal.clientLocation}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-px h-4 bg-slate-200"></div>
          </div>

          {/* Provider */}
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-purple-50 border border-purple-100">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-400 flex items-center justify-center text-white text-[10px] font-black shadow-sm">
              {deal.providerInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-800 truncate">{deal.providerName}</p>
                <span className="text-[9px] font-semibold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full shrink-0">Provider</span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-2.5 h-2.5" />{deal.providerLocation}
              </p>
            </div>
          </div>
        </div>

        {/* Deal Info */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Product / Service</p>
              <p className="text-xs font-semibold text-slate-700">{deal.product}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Category</p>
              <p className="text-xs font-semibold text-slate-700">{deal.category}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-[#0F9D9D]">₹</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Deal Amount</p>
              <p className="text-sm font-black text-slate-900">{deal.amount}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">Timeline</p>
              <p className="text-xs font-semibold text-slate-700">{deal.startDate} → {deal.endDate}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
