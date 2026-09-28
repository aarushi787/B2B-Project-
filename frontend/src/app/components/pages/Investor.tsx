import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, TrendingDown, DollarSign, Users, Handshake,
  Download, RefreshCw, ArrowUpRight, ArrowDownRight,
  Activity, BarChart2, PieChart as PieChartIcon, ChevronDown,
  Zap, Globe, Award, Target, Calendar, Info, Star,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine,
} from "recharts";
import { toast, Toaster } from "sonner";
import { ChartContainer } from "../ui/ChartContainer";

// ─── Data ─────────────────────────────────────────────────────────────────────
const MONTHLY_DATA = [
  { period: "May '25", gmv: 8.2, revenue: 0.82, users: 890, deals: 28 },
  { period: "Jun '25", gmv: 9.4, revenue: 0.94, users: 920, deals: 31 },
  { period: "Jul '25", gmv: 10.8, revenue: 1.08, users: 965, deals: 35 },
  { period: "Aug '25", gmv: 11.2, revenue: 1.12, users: 1010, deals: 38 },
  { period: "Sep '25", gmv: 12.6, revenue: 1.26, users: 1045, deals: 42 },
  { period: "Oct '25", gmv: 13.4, revenue: 1.34, users: 1082, deals: 46 },
  { period: "Nov '25", gmv: 15.1, revenue: 1.51, users: 1110, deals: 52 },
  { period: "Dec '25", gmv: 17.2, revenue: 1.72, users: 1140, deals: 58 },
  { period: "Jan '26", gmv: 14.8, revenue: 1.48, users: 1160, deals: 49 },
  { period: "Feb '26", gmv: 16.3, revenue: 1.63, users: 1190, deals: 55 },
  { period: "Mar '26", gmv: 18.9, revenue: 1.89, users: 1218, deals: 63 },
  { period: "Apr '26", gmv: 20.4, revenue: 2.04, users: 1247, deals: 68 },
];

const QUARTERLY_DATA = [
  { period: "Q1 '25", gmv: 22.1, revenue: 2.21, users: 780, deals: 72 },
  { period: "Q2 '25", gmv: 28.4, revenue: 2.84, users: 890, deals: 94 },
  { period: "Q3 '25", gmv: 37.2, revenue: 3.72, users: 1010, deals: 126 },
  { period: "Q4 '25", gmv: 45.7, revenue: 4.57, users: 1140, deals: 156 },
  { period: "Q1 '26", gmv: 55.0, revenue: 5.52, users: 1247, deals: 187 },
];

const USER_GROWTH_DATA = [
  { month: "Oct", newUsers: 45, retainedUsers: 780 },
  { month: "Nov", newUsers: 52, retainedUsers: 810 },
  { month: "Dec", newUsers: 61, retainedUsers: 845 },
  { month: "Jan", newUsers: 48, retainedUsers: 872 },
  { month: "Feb", newUsers: 55, retainedUsers: 912 },
  { month: "Mar", newUsers: 63, retainedUsers: 960 },
  { month: "Apr", newUsers: 71, retainedUsers: 1018 },
];

const DEAL_CATEGORY_DATA = [
  { category: "Technology", count: 124, value: 42.1, color: "#8B5CF6" },
  { category: "Manufacturing", count: 89, value: 31.4, color: "#8B5CF6" },
  { category: "Healthcare", count: 76, value: 28.8, color: "#3B82F6" },
  { category: "Energy", count: 58, value: 22.6, color: "#22C55E" },
  { category: "Retail", count: 76, value: 17.9, color: "#F59E0B" },
];

const TREND_METRICS = [
  { label: "Avg Deal Size", current: "$184K", prev: "$142K", change: "+29.6%", up: true },
  { label: "Deal Velocity", current: "18 days", prev: "24 days", change: "-25%", up: true },
  { label: "Take Rate", current: "9.96%", prev: "9.41%", change: "+55bps", up: true },
  { label: "Churn Rate", current: "2.1%", prev: "3.4%", change: "-1.3pp", up: true },
  { label: "NPS Score", current: "72", prev: "61", change: "+11 pts", up: true },
  { label: "Support SLA", current: "98.2%", prev: "95.1%", change: "+3.1pp", up: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function useCountUp(target: number, decimals = 0, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let s = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      s += step;
      if (s >= target) { setVal(target); clearInterval(t); }
      else setVal(parseFloat(s.toFixed(decimals)));
    }, 16);
    return () => clearInterval(t);
  }, [target, decimals, duration]);
  return val;
}

function InvTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl p-3 text-xs">
      <p className="font-bold text-white mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-bold text-white">
            {p.name.toLowerCase().includes("gmv") || p.name.toLowerCase().includes("revenue") ? `$${p.value}M` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, unit, prefix, change, changeUp, sub, dark, delay, icon: Icon,
}: {
  label: string; value: number; unit: string; prefix: string;
  change: string; changeUp: boolean; sub: string; dark?: boolean;
  delay: number; icon: React.ElementType;
}) {
  const displayed = useCountUp(value, unit === "%" ? 1 : value < 10 ? 1 : 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4, boxShadow: dark ? "0 20px 48px -12px rgba(15,157,157,0.35)" : "0 16px 40px -12px rgba(0,0,0,0.10)" }}
      className={`rounded-2xl border p-5 cursor-default transition-all relative overflow-hidden ${
        dark
          ? "bg-gradient-to-br from-[#8B5CF6] to-[#0c8080] border-cyan-400 text-white"
          : "bg-white border-slate-100 shadow-sm"
      }`}
    >
      {dark && (
        <>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12" />
        </>
      )}
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dark ? "bg-white/20" : "bg-slate-50 border border-slate-100"}`}>
            <Icon className={`w-4.5 h-4.5 ${dark ? "text-white" : "text-slate-500"}`} style={{ width: 18, height: 18 }} />
          </div>
          <span className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-0.5 rounded-full ${
            changeUp
              ? dark ? "bg-white/20 text-white" : "bg-green-100 text-green-700"
              : dark ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
          }`}>
            {changeUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </span>
        </div>

        <p className={`text-2xl font-black tracking-tight mb-0.5 ${dark ? "text-white" : "text-slate-900"}`}>
          {prefix}{displayed.toLocaleString()}{unit}
        </p>
        <p className={`text-xs font-semibold ${dark ? "text-white" : "text-slate-600"}`}>{label}</p>
        <p className={`text-[10px] mt-0.5 ${dark ? "text-white/70" : "text-slate-400"}`}>{sub}</p>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function Investor() {
  const [timePeriod, setTimePeriod] = useState<"monthly" | "quarterly">("monthly");
  const [chartMetric, setChartMetric] = useState<"gmv" | "revenue" | "deals">("gmv");
  const [loading, setLoading] = useState(false);
  const chartData = timePeriod === "monthly" ? MONTHLY_DATA : QUARTERLY_DATA;

  const refresh = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); toast.success("Data refreshed"); }, 1200);
  };

  const metricMeta = {
    gmv: { key: "gmv", name: "GMV ($M)", color: "#8B5CF6", gradId: "invGradGMV" },
    revenue: { key: "revenue", name: "Revenue ($M)", color: "#8B5CF6", gradId: "invGradRev" },
    deals: { key: "deals", name: "Deals Closed", color: "#F59E0B", gradId: "invGradDeals" },
  }[chartMetric];

  return (
    <div className="min-h-screen bg-[#F5F7FA]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-right" richColors />

      {/* ── Header ────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 rounded-2xl shadow-sm mb-5">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4.5 h-4.5 text-[#8B5CF6]" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-none">Investor Dashboard</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Platform metrics · Apr 2026</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-green-700">Live</span>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={refresh}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => toast.success("Investor report downloaded!", { description: "investor_brief_apr2026.pdf" })}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black text-white bg-gradient-to-r from-slate-900 to-slate-700 hover:from-slate-800 rounded-xl transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5" /> Download Report
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">

        {/* ── KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard label="Total GMV" value={142.8} unit="M" prefix="$" change="+38.4%" changeUp sub="Gross merchandise value" dark delay={0} icon={DollarSign} />
          <KpiCard label="Platform Revenue" value={14.2} unit="M" prefix="$" change="+29.1%" changeUp sub="Net of operations cost" delay={0.07} icon={Activity} />
          <KpiCard label="YoY Growth" value={38.4} unit="%" prefix="" change="+14.2pp" changeUp sub="vs 24.2% prior year" delay={0.14} icon={TrendingUp} />
          <KpiCard label="Active Users" value={1247} unit="" prefix="" change="+12.5% MoM" changeUp sub="Verified platform users" delay={0.21} icon={Users} />
        </div>

        {/* ── Revenue Analytics ────────────────────────── */}
        <ChartContainer
          title="Revenue Analytics"
          subtitle={`${timePeriod === "monthly" ? "Monthly" : "Quarterly"} platform performance`}
          loading={loading}
          onRefresh={refresh}
          onExport={() => toast.success("Chart exported!")}
          headerDark
          badge="LIVE"
          minHeight={320}
          actions={
            <div className="flex items-center gap-2 mr-2">
              {/* Metric selector */}
              <div className="flex items-center bg-slate-700 rounded-lg p-0.5 gap-0.5">
                {(["gmv", "revenue", "deals"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition-all ${chartMetric === m ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {m === "gmv" ? "GMV" : m === "revenue" ? "Revenue" : "Deals"}
                  </button>
                ))}
              </div>
              {/* Period toggle */}
              <div className="flex items-center bg-slate-700 rounded-lg p-0.5 gap-0.5">
                {(["monthly", "quarterly"] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setTimePeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold capitalize transition-all ${timePeriod === p ? "bg-white text-slate-800 shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {p === "monthly" ? "Monthly" : "Quarterly"}
                  </button>
                ))}
              </div>
            </div>
          }
        >
          <div className="px-5 pt-2 pb-4">
            {/* Summary stats */}
            <div className="flex items-center gap-5 mb-4 pb-4 border-b border-slate-100">
              {[
                { label: "Peak Period", value: timePeriod === "monthly" ? "Apr '26" : "Q1 '26", sub: "Highest GMV" },
                { label: "Avg GMV/Period", value: timePeriod === "monthly" ? "$11.9M" : "$36.8M", sub: "12-month trailing" },
                { label: "MoM Growth", value: "+7.9%", sub: "Apr vs Mar", positive: true },
              ].map(s => (
                <div key={s.label} className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</span>
                  <span className={`text-sm font-black ${s.positive ? "text-[#8B5CF6]" : "text-slate-900"}`}>{s.value}</span>
                  <span className="text-[10px] text-slate-400">{s.sub}</span>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={`${timePeriod}-${chartMetric}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                    <defs key="inv-main-defs">
                      <linearGradient id={metricMeta.gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop key="s0" offset="5%" stopColor={metricMeta.color} stopOpacity={0.25} />
                        <stop key="s1" offset="95%" stopColor={metricMeta.color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid key="inv-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis key="inv-xa" dataKey="period" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis key="inv-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={48}
                      tickFormatter={v => chartMetric === "deals" ? String(v) : `$${v}M`} />
                    <Tooltip key="inv-tt" content={<InvTooltip />} />
                    <Area
                      key="inv-area"
                      type="monotone"
                      dataKey={metricMeta.key}
                      stroke={metricMeta.color}
                      strokeWidth={2.5}
                      fill={`url(#${metricMeta.gradId})`}
                      name={metricMeta.name}
                      dot={false}
                      activeDot={{ r: 5, fill: metricMeta.color, stroke: "white", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            </AnimatePresence>
          </div>
        </ChartContainer>

        {/* ── User Growth + Deal Metrics ────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">

          {/* User Growth Chart */}
          <ChartContainer
            title="User Growth"
            subtitle="New vs. retained active users"
            loading={loading}
            onRefresh={refresh}
            onExport={() => toast.success("Chart exported!")}
            minHeight={260}
          >
            <div className="px-5 pt-1 pb-4">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={USER_GROWTH_DATA} barGap={4} barCategoryGap="28%">
                  <CartesianGrid key="ug-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis key="ug-xa" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis key="ug-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip key="ug-tt" content={<InvTooltip />} />
                  <Legend key="ug-lg" wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                  <Bar key="ug-bar-ret" dataKey="retainedUsers" name="Retained Users" fill="#8B5CF6" radius={[4, 4, 0, 0]} opacity={0.8} />
                  <Bar key="ug-bar-new" dataKey="newUsers" name="New Users" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartContainer>

          {/* Deal Metrics panel */}
          <div className="space-y-4">
            {/* Deal KPIs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Handshake className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Deal Metrics</p>
                  <p className="text-[10px] text-slate-400">Apr 2026 snapshot</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Deals", value: "423", change: "+18%", up: true, color: "text-slate-900" },
                  { label: "Success Rate", value: "87.3%", change: "+2.1pp", up: true, color: "text-green-600" },
                  { label: "Avg Size", value: "$184K", change: "+29.6%", up: true, color: "text-[#8B5CF6]" },
                ].map(m => (
                  <div key={m.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{m.label}</p>
                    <div className={`flex items-center justify-center gap-0.5 mt-1 text-[9px] font-black ${m.up ? "text-green-600" : "text-red-500"}`}>
                      <ArrowUpRight className="w-2.5 h-2.5" />{m.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Health */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-xs font-bold text-slate-900">Financial Health</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Payment Success Rate", value: 99.2, color: "#22C55E" },
                  { label: "Transaction Volume", value: 87, color: "#8B5CF6" },
                  { label: "Platform Uptime", value: 99.9, color: "#8B5CF6" },
                  { label: "Settlement SLA", value: 94.5, color: "#F59E0B" },
                ].map(h => (
                  <div key={h.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-slate-600">{h.label}</span>
                      <span className="text-[11px] font-black text-slate-800">{h.value}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: h.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${h.value}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Deal Categories + Trend Analysis ─────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Deal categories breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                <BarChart2 className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Deal Categories</p>
                <p className="text-[10px] text-slate-400">By volume ($M) · Apr 2026</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {DEAL_CATEGORY_DATA.map((d, i) => {
                const maxVal = Math.max(...DEAL_CATEGORY_DATA.map(x => x.value));
                const pct = Math.round((d.value / maxVal) * 100);
                return (
                  <div key={d.category} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-[11px] text-slate-600 w-28 shrink-0">{d.category}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: d.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 + 0.2 }}
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-black text-slate-800">${d.value}M</span>
                      <span className="text-[9px] text-slate-400 w-6">{d.count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend Analysis */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                <Target className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Trend Analysis</p>
                <p className="text-[10px] text-slate-400">Month-over-month insights</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3">
              {TREND_METRICS.map((t, i) => (
                <motion.div
                  key={t.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/30 transition-all cursor-default"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <span className="text-[10px] text-slate-500 leading-tight">{t.label}</span>
                    <span className={`text-[9px] font-black flex items-center gap-0.5 ${t.up ? "text-green-600" : "text-red-500"}`}>
                      {t.up ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                      {t.change}
                    </span>
                  </div>
                  <p className="text-sm font-black text-slate-900">{t.current}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">prev. {t.prev}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer note ───────────────────────────────── */}
        <div className="flex items-center gap-2 py-2 px-4 bg-slate-100 rounded-xl border border-slate-200">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <p className="text-[10px] text-slate-500">
            Data as of April 23, 2026 · All figures in USD · GMV reflects gross transacted value on the platform before fees
          </p>
        </div>

      </div>
    </div>
  );
}
