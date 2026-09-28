import React, { useState } from "react";
import { EscrowStatus, Role } from "./pages/DealWorkspace";
import {
  Shield, ArrowRight, Lock, Unlock, CheckCircle2,
  X, AlertCircle, CreditCard, Building2, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EscrowPaymentProps {
  status: EscrowStatus;
  amount: string;
  role: Role;
  onFund: () => void;
  onRelease: () => void;
}

import StripeCheckout from './pages/StripeCheckout';

function FundModal({ amount, onConfirm, onClose }: { amount: string; onConfirm: () => void; onClose: () => void }) {
  // Parse numeric amount from string like "$1,50,000"
  const numericAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10) || 150000;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-md"
      >
        <StripeCheckout 
          dealId="test_deal" 
          amount={numericAmount} 
          onComplete={() => {
            onConfirm();
            onClose();
          }} 
        />
        <div className="mt-4 flex justify-center">
          <button onClick={onClose} className="px-6 py-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm font-semibold">
            Cancel Payment
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function EscrowPayment({ status, amount, role, onFund, onRelease }: EscrowPaymentProps) {
  const [showModal, setShowModal] = useState(false);

  const statusConfig = {
    "Not Funded": {
      icon: Lock,
      color: "text-amber-500",
      bg: "bg-amber-50",
      border: "border-amber-200",
      glow: "shadow-amber-100",
      label: "Not Funded",
      barWidth: "0%",
      barColor: "bg-amber-300",
    },
    "Funded": {
      icon: Shield,
      color: "text-[#8B5CF6]",
      bg: "bg-purple-50",
      border: "border-purple-200",
      glow: "shadow-purple-100",
      label: "Secured in Escrow",
      barWidth: "60%",
      barColor: "bg-[#8B5CF6]",
    },
    "Released": {
      icon: Unlock,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      glow: "shadow-green-100",
      label: "Payment Released",
      barWidth: "100%",
      barColor: "bg-green-500",
    },
  };

  const cfg = statusConfig[status];
  const Icon = cfg.icon;

  return (
    <>
      <AnimatePresence>
        {showModal && (
          <FundModal
            amount={amount}
            onConfirm={onFund}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Escrow Payment</h2>
              <p className="text-[10px] text-slate-400">Secure deal financing</p>
            </div>
          </div>
          <motion.div
            key={status}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border shadow-sm ${cfg.bg} ${cfg.color} ${cfg.border}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {cfg.label}
          </motion.div>
        </div>

        <div className="p-5 space-y-4">
          {/* Amount */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Escrow Amount</p>
            <p className="text-3xl font-black text-slate-900">{amount}</p>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Escrow Progress</span>
                <span className="font-semibold" style={{ color: status === "Not Funded" ? "#F59E0B" : status === "Funded" ? "#8B5CF6" : "#22C55E" }}>
                  {status === "Not Funded" ? "0%" : status === "Funded" ? "60%" : "100%"}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: cfg.barWidth }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full ${cfg.barColor}`}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0%</span>
                <span>Funded</span>
                <span>Released</span>
              </div>
            </div>
          </div>

          {/* Flow Steps */}
          <div className="flex items-center gap-2">
            {["Fund", "Secure", "Release"].map((step, i) => (
              <React.Fragment key={step}>
                <div className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-semibold ${
                  (status === "Not Funded" && i === 0) || (status === "Funded" && i === 1) || (status === "Released" && i === 2)
                    ? "bg-purple-50 text-teal-700 border border-purple-200"
                    : (status === "Funded" && i === 0) || (status === "Released" && i <= 1)
                      ? "bg-green-50 text-green-600 border border-green-200"
                      : "bg-slate-50 text-slate-400 border border-slate-100"
                }`}>
                  {step}
                </div>
                {i < 2 && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
              </React.Fragment>
            ))}
          </div>

          {/* Action Buttons */}
          <AnimatePresence mode="wait">
            {status === "Not Funded" && role === "Client" && (
              <motion.button
                key="fund"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold rounded-xl shadow-md shadow-cyan-500/20 transition-all text-sm"
              >
                <Zap className="w-4 h-4" /> Fund Escrow Now
              </motion.button>
            )}

            {status === "Not Funded" && role !== "Client" && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-full py-3 bg-slate-50 border border-dashed border-slate-200 text-slate-400 font-medium rounded-xl text-xs text-center flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" /> Awaiting Client to Fund
              </motion.div>
            )}

            {status === "Funded" && (role === "Admin" || role === "Client") && (
              <motion.button
                key="release"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={onRelease}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl shadow-md shadow-green-500/20 transition-all text-sm"
              >
                <Unlock className="w-4 h-4" /> Release Payment
              </motion.button>
            )}

            {status === "Funded" && role === "Provider" && (
              <motion.div
                key="secured"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="w-full py-3 bg-purple-50 border border-purple-200 text-teal-700 font-semibold rounded-xl text-xs text-center flex items-center justify-center gap-2"
              >
                <Shield className="w-3.5 h-3.5" /> Funds Secured in Escrow
              </motion.div>
            )}

            {status === "Released" && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="w-full py-3 bg-green-50 border border-green-200 text-green-700 font-semibold rounded-xl text-sm text-center flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Payment Completed Successfully!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
