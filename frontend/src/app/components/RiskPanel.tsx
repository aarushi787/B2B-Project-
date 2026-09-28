import React from "react";
import { AlertOctagon, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

interface RiskPanelProps {
  score: number;
  checks: { kyc: boolean; aml: boolean; verification: boolean };
  onToggleCheck: (key: string) => void;
}

function CircularGauge({ score }: { score: number }) {
  const size = 100;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Only use 270 degrees of the circle (from 135deg to 405deg)
  const arc = circumference * 0.75;
  const offset = arc - (score / 100) * arc;

  const getColor = () => {
    if (score < 50) return "#EF4444";
    if (score < 80) return "#F59E0B";
    return "#22C55E";
  };

  const getLabel = () => {
    if (score < 50) return "High Risk";
    if (score < 80) return "Medium";
    return "Low Risk";
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
          />
          {/* Score arc */}
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circumference}`}
            initial={{ strokeDashoffset: arc }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          />
        </svg>
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="text-xl font-black"
            style={{ color: getColor() }}
          >
            {score}
          </motion.span>
          <span className="text-[9px] font-semibold text-slate-400 leading-none">/100</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="px-3 py-1 rounded-full text-xs font-bold mt-1"
        style={{ backgroundColor: `${getColor()}15`, color: getColor() }}
      >
        {getLabel()}
      </motion.div>
    </div>
  );
}

export function RiskPanel({ score, checks, onToggleCheck }: RiskPanelProps) {
  const allPassed = Object.values(checks).every(Boolean);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <AlertOctagon className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Risk & Compliance</h2>
            <p className="text-[10px] text-slate-400">Real-time assessment</p>
          </div>
        </div>
        {allPassed ? (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
            <ShieldCheck className="w-3 h-3" /> Clear
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
            <AlertCircle className="w-3 h-3" /> Action Needed
          </div>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Circular Gauge */}
        <div className="flex items-center justify-center">
          <CircularGauge score={score} />
        </div>

        {/* High Risk Warning */}
        {score < 50 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-700 font-medium">
              High risk detected. Complete all compliance checks before proceeding.
            </p>
          </motion.div>
        )}

        {/* Compliance Checks */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compliance Checks</p>
          {[
            { key: "kyc", label: "KYC Verification", desc: "Identity confirmed" },
            { key: "aml", label: "AML Screening", desc: "Anti-money laundering" },
            { key: "verification", label: "Document Verified", desc: "All docs authenticated" },
          ].map(({ key, label, desc }) => {
            const isPassed = checks[key as keyof typeof checks];
            return (
              <motion.div
                key={key}
                whileHover={{ x: 2 }}
                onClick={() => onToggleCheck(key)}
                className="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group hover:shadow-sm"
                style={{
                  backgroundColor: isPassed ? "#F0FDF4" : "#FFF7ED",
                  borderColor: isPassed ? "#BBF7D0" : "#FED7AA",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <motion.div
                    animate={{
                      backgroundColor: isPassed ? "#DCFCE7" : "#FFEDD5",
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </motion.div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{label}</p>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                  </div>
                </div>
                <motion.div
                  animate={{
                    backgroundColor: isPassed ? "#22C55E" : "#F59E0B",
                  }}
                  className="w-2 h-2 rounded-full"
                />
              </motion.div>
            );
          })}
        </div>

        {/* Overall Score Bar */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-semibold text-slate-500">Compliance Score</span>
            <span className="text-[10px] font-bold text-slate-700">
              {Object.values(checks).filter(Boolean).length}/{Object.values(checks).length} checks
            </span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${(Object.values(checks).filter(Boolean).length / Object.values(checks).length) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${allPassed ? "bg-green-500" : "bg-amber-400"}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
