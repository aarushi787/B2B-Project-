import React from "react";
import { TrendingUp, TrendingDown, Users, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

interface OverviewCardsProps {
  dealAmount: string;
  client: string;
  provider: string;
  progress: number;
  riskScore: number;
}

// Circular Progress Ring SVG
function CircularProgress({ value, size = 72, stroke = 6, color = "#0F9D9D" }: {
  value: number; size?: number; stroke?: number; color?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
    </svg>
  );
}

export function OverviewCards({ dealAmount, client, provider, progress, riskScore }: OverviewCardsProps) {
  const riskLevel = riskScore < 50 ? "High" : riskScore < 80 ? "Medium" : "Low";
  const riskColor = riskScore < 50 ? "#EF4444" : riskScore < 80 ? "#F59E0B" : "#22C55E";
  const riskBg = riskScore < 50 ? "bg-red-50 border-red-100" : riskScore < 80 ? "bg-amber-50 border-amber-100" : "bg-green-50 border-green-100";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Deal Amount */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        whileHover={{ y: -4, boxShadow: "0 12px 30px -8px rgba(15, 157, 157, 0.15)" }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 group cursor-default transition-all duration-300 hover:border-teal-200/60"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Deal Amount</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">$1,50,000</span>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-teal-50 text-[#0F9D9D] group-hover:scale-110 transition-transform">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1 text-green-600 text-xs font-semibold bg-green-50 px-2 py-0.5 rounded-full">
            <TrendingUp className="w-3 h-3" />
            +12.4%
          </div>
          <span className="text-xs text-slate-400">vs last month</span>
        </div>
        <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "68%" }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="h-full bg-gradient-to-r from-[#0F9D9D] to-teal-400 rounded-full"
          />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">68% of annual target</p>
      </motion.div>

      {/* Card 2: Client & Provider */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        whileHover={{ y: -4, boxShadow: "0 12px 30px -8px rgba(59, 130, 246, 0.15)" }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 group cursor-default transition-all duration-300 hover:border-blue-200/60"
      >
        <div className="flex items-start justify-between mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parties</p>
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">{client.charAt(0)}</div>
            <div>
              <p className="text-xs font-bold text-slate-800">{client}</p>
              <p className="text-[10px] text-slate-400">Client · Verified ✓</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-2">
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">{provider.charAt(0)}</div>
            <div>
              <p className="text-xs font-bold text-slate-800">{provider}</p>
              <p className="text-[10px] text-slate-400">Service Provider · Verified ✓</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Card 3: Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        whileHover={{ y: -4, boxShadow: "0 12px 30px -8px rgba(139, 92, 246, 0.15)" }}
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 group cursor-default transition-all duration-300 hover:border-purple-200/60"
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Progress</p>
            <p className="text-2xl font-black text-slate-900">{progress}%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {progress < 50 ? "Early stage" : progress < 75 ? "Midway through" : progress < 100 ? "Almost done" : "Completed!"}
            </p>
          </div>
          <div className="relative flex items-center justify-center">
            <CircularProgress value={progress} size={68} stroke={6} color="#8B5CF6" />
            <span className="absolute text-[10px] font-bold text-slate-700">{progress}%</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-700 ${
                (progress / 100) * 4 > i ? "bg-purple-500" : "bg-slate-100"
              }`}
            />
          ))}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Step {Math.ceil((progress / 100) * 4)} of 4</p>
      </motion.div>

      {/* Card 4: Risk Level */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        whileHover={{ y: -4, boxShadow: `0 12px 30px -8px ${riskColor}26` }}
        className={`bg-white rounded-2xl border shadow-sm p-5 group cursor-default transition-all duration-300 ${riskBg}`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Risk Level</p>
            <div
              className="text-2xl font-black"
              style={{ color: riskColor }}
            >
              {riskLevel}
            </div>
          </div>
          <div className="p-2 rounded-xl group-hover:scale-110 transition-transform" style={{ backgroundColor: `${riskColor}15` }}>
            <AlertTriangle className="w-5 h-5" style={{ color: riskColor }} />
          </div>
        </div>
        <div className="relative h-2 bg-slate-200/60 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${riskScore}%` }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ backgroundColor: riskColor }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-red-400">High</span>
          <span className="text-[10px] font-semibold" style={{ color: riskColor }}>Score: {riskScore}/100</span>
          <span className="text-[10px] text-green-500">Low</span>
        </div>
        {riskScore < 80 && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 rounded-lg px-2 py-1">
            <TrendingDown className="w-3 h-3" />
            Action required to reduce risk
          </div>
        )}
      </motion.div>
    </div>
  );
}
