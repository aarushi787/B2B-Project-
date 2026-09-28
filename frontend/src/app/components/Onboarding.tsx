import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, ArrowLeft, X, Sparkles, LayoutDashboard,
  ShoppingBag, Handshake, Building2, FileText, BookOpen,
  Shield, TrendingUp, CheckCircle2, ChevronRight,
} from "lucide-react";

interface Step {
  id: number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  area: "sidebar" | "header" | "main" | "center";
  spotlightPos?: { top: string; left: string; width: string; height: string };
}

const STEPS: Step[] = [
  {
    id: 1, icon: LayoutDashboard, iconColor: "text-[#0F9D9D]", iconBg: "bg-teal-50",
    title: "Your Command Center",
    description: "The Dashboard gives you a bird's-eye view of all platform activity — GMV, active deals, revenue, and company health at a glance.",
    area: "sidebar",
    spotlightPos: { top: "13%", left: "0", width: "256px", height: "44px" },
  },
  {
    id: 2, icon: ShoppingBag, iconColor: "text-purple-600", iconBg: "bg-purple-50",
    title: "Browse the Marketplace",
    description: "Discover verified companies, explore products & services, and connect with potential deal partners across all industries.",
    area: "sidebar",
    spotlightPos: { top: "20%", left: "0", width: "256px", height: "44px" },
  },
  {
    id: 3, icon: Handshake, iconColor: "text-blue-600", iconBg: "bg-blue-50",
    title: "Manage Your Deals",
    description: "Create, track, and collaborate on deals with built-in workspaces, milestone tracking, and real-time status updates.",
    area: "sidebar",
    spotlightPos: { top: "27%", left: "0", width: "256px", height: "44px" },
  },
  {
    id: 4, icon: Building2, iconColor: "text-indigo-600", iconBg: "bg-indigo-50",
    title: "Company Directory",
    description: "Explore verified companies with KYC badges, financial profiles, and direct messaging — your B2B network in one place.",
    area: "sidebar",
    spotlightPos: { top: "34%", left: "0", width: "256px", height: "44px" },
  },
  {
    id: 5, icon: FileText, iconColor: "text-amber-600", iconBg: "bg-amber-50",
    title: "Contracts & E-Signatures",
    description: "Draft, send, and sign contracts digitally. Track signing status, manage templates, and maintain a full audit trail.",
    area: "sidebar",
    spotlightPos: { top: "41%", left: "0", width: "256px", height: "44px" },
  },
  {
    id: 6, icon: BookOpen, iconColor: "text-green-600", iconBg: "bg-green-50",
    title: "Financial Ledger",
    description: "Track every transaction with detailed records, export reports, and monitor cash flow in real-time with fraud detection.",
    area: "sidebar",
    spotlightPos: { top: "55%", left: "0", width: "256px", height: "44px" },
  },
  {
    id: 7, icon: Shield, iconColor: "text-red-500", iconBg: "bg-red-50",
    title: "Admin Control Panel",
    description: "Manage users, verify companies, oversee deals, and monitor compliance — the full governance toolkit for platform admins.",
    area: "sidebar",
    spotlightPos: { top: "62%", left: "0", width: "256px", height: "44px" },
  },
  {
    id: 8, icon: TrendingUp, iconColor: "text-emerald-600", iconBg: "bg-emerald-50",
    title: "Investor Dashboard",
    description: "Premium analytics for investors — GMV trends, revenue forecasts, cohort analysis, and platform health metrics.",
    area: "sidebar",
    spotlightPos: { top: "69%", left: "0", width: "256px", height: "44px" },
  },
];

interface OnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [phase, setPhase] = useState<"welcome" | "steps" | "done">("welcome");
  const [stepIdx, setStepIdx] = useState(0);

  const step = STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;
  const pct = Math.round(((stepIdx + 1) / STEPS.length) * 100);

  const next = () => {
    if (isLast) { setPhase("done"); setTimeout(onComplete, 1200); }
    else setStepIdx(i => i + 1);
  };
  const back = () => { if (!isFirst) setStepIdx(i => i - 1); };

  return (
    <div className="fixed inset-0 z-[200]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AnimatePresence mode="wait">

        {/* ── Welcome modal ──────────────────────────────── */}
        {phase === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: -24 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Gradient top banner */}
              <div className="h-40 bg-gradient-to-br from-[#0F9D9D] via-teal-400 to-emerald-400 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 opacity-20">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <motion.div key={i}
                      className="absolute w-24 h-24 rounded-full border-2 border-white/30"
                      style={{ left: `${(i % 4) * 28}%`, top: `${Math.floor(i / 4) * 45}%` }}
                      animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
                    />
                  ))}
                </div>
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/40"
                >
                  <Sparkles className="w-8 h-8 text-white" />
                </motion.div>
              </div>

              <div className="p-7">
                <h2 className="text-xl font-black text-slate-900 mb-2">Welcome to the Platform! 🎉</h2>
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  You're about to explore a powerful B2B marketplace built for serious deal-making. Let's take a quick 2-minute tour to get you up to speed.
                </p>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: Handshake, label: "Deals", color: "#0F9D9D" },
                    { icon: Building2, label: "Companies", color: "#8B5CF6" },
                    { icon: TrendingUp, label: "Analytics", color: "#22C55E" },
                  ].map(f => (
                    <div key={f.label} className="flex flex-col items-center gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${f.color}18` }}>
                        <f.icon className="w-4 h-4" style={{ color: f.color }} />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">{f.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setPhase("steps")}
                    className="flex-1 py-3 text-sm font-black text-white bg-gradient-to-r from-[#0F9D9D] to-teal-400 hover:from-[#0c8686] hover:to-teal-500 rounded-2xl transition-all shadow-sm shadow-teal-500/20 flex items-center justify-center gap-2"
                  >
                    Start Tour <ArrowRight className="w-4 h-4" />
                  </motion.button>
                  <button
                    onClick={onSkip}
                    className="px-5 py-3 text-sm font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-2xl transition-colors"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Steps ──────────────────────────────────────── */}
        {phase === "steps" && (
          <motion.div key="steps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]" />

            {/* Spotlight highlight on sidebar item */}
            {step.spotlightPos && (
              <motion.div
                key={`spot-${stepIdx}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute rounded-xl pointer-events-none z-10"
                style={{
                  top: step.spotlightPos.top,
                  left: step.spotlightPos.left,
                  width: step.spotlightPos.width,
                  height: step.spotlightPos.height,
                  boxShadow: "0 0 0 4px rgba(15,157,157,0.6), 0 0 0 9999px rgba(15,24,39,0.55)",
                }}
              >
                {/* Pulse ring */}
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-[#0F9D9D]"
                  animate={{ scale: [1, 1.04, 1], opacity: [0.8, 0.4, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            )}

            {/* Step card — bottom center */}
            <motion.div
              key={`card-${stepIdx}`}
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm z-20 px-4"
            >
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                {/* Progress bar */}
                <div className="h-1 bg-slate-100">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#0F9D9D] to-teal-400 rounded-full"
                    initial={{ width: `${((stepIdx) / STEPS.length) * 100}%` }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4 }}
                  />
                </div>

                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-2xl ${step.iconBg} flex items-center justify-center shrink-0`}>
                      <step.icon className={`w-5 h-5 ${step.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-black text-[#0F9D9D] uppercase tracking-wider">
                          Step {stepIdx + 1} of {STEPS.length}
                        </span>
                        <button onClick={onSkip} className="p-1 text-slate-300 hover:text-slate-500 rounded-lg transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h3 className="text-sm font-black text-slate-900">{step.title}</h3>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{step.description}</p>

                  {/* Dot indicators */}
                  <div className="flex items-center gap-1 mb-4">
                    {STEPS.map((_, i) => (
                      <motion.button
                        key={i}
                        onClick={() => setStepIdx(i)}
                        animate={{ width: i === stepIdx ? 20 : 6 }}
                        className={`h-1.5 rounded-full transition-colors ${i === stepIdx ? "bg-[#0F9D9D]" : i < stepIdx ? "bg-teal-200" : "bg-slate-200"}`}
                      />
                    ))}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={back}
                      disabled={isFirst}
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={next}
                      className="flex-1 py-2.5 text-xs font-black text-white bg-gradient-to-r from-[#0F9D9D] to-teal-400 hover:from-[#0c8686] rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-teal-500/20"
                    >
                      {isLast ? "Finish Tour" : "Next"} <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                    {!isLast && (
                      <button onClick={onSkip} className="px-3 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Done ───────────────────────────────────────── */}
        {phase === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl p-8 text-center max-w-xs"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="w-8 h-8 text-[#0F9D9D]" />
              </motion.div>
              <h3 className="text-base font-black text-slate-900 mb-2">You're all set! 🚀</h3>
              <p className="text-xs text-slate-500">You know your way around. Happy deal-making!</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
