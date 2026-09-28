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

function FundModal({ amount, onConfirm, onClose }: { amount: string; onConfirm: () => void; onClose: () => void }) {
  const [method, setMethod] = useState<"bank" | "card" | "instant">("bank");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    onConfirm();
    onClose();
  };

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Fund Escrow</h3>
              <p className="text-[10px] text-slate-400">Secure payment transfer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Amount Display */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-emerald-50 rounded-xl border border-purple-100">
            <p className="text-xs text-cyan-600 font-medium mb-1">Total to Fund</p>
            <p className="text-3xl font-black text-slate-900">{amount}</p>
            <p className="text-[10px] text-slate-500 mt-1">Held in secure escrow until deal completion</p>
          </div>

          {/* Manual Wire Instructions */}
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-3">Wire Transfer Instructions</p>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-[10px] text-slate-500">Bank Name</span>
                <span className="text-xs font-bold text-slate-800">Global Corporate Trust Bank</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-[10px] text-slate-500">Account Name</span>
                <span className="text-xs font-bold text-slate-800">B2B For Corporates Escrow</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-[10px] text-slate-500">Account Number</span>
                <span className="text-xs font-mono font-bold text-slate-800">8812 3345 9901 4452</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500">SWIFT / IFSC</span>
                <span className="text-xs font-mono font-bold text-slate-800">GCTB0001234</span>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-700">
              Please initiate the wire transfer and click confirm below. Our admins will verify the deposit within 24 hours before marking escrow as Funded.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex items-center gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-xl transition-all shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
                Processing...
              </>
            ) : (
              <>I have initiated transfer <ArrowRight className="w-4 h-4" /></>
            )}
          </motion.button>
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
