import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Download, TrendingUp, TrendingDown, DollarSign, Filter,
  Search, ArrowUpRight, ArrowDownRight, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronLeft, ChevronRight, X,
  BarChart2, TableProperties, FileSpreadsheet, FileText,
  RefreshCw, Banknote, Layers, Building2, ArrowRight,
  SlidersHorizontal, ChevronsUpDown, Info, Wallet,
  Activity, Circle, MoreHorizontal, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { toast, Toaster } from "sonner";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { useAuth } from "../../../auth/AuthProvider";

// ─── Types ────────────────────────────────────────────────────────────────────
type TxType = "Credit" | "Debit";
type TxStatus = "Completed" | "Pending" | "Failed" | "Processing";
type ViewMode = "table" | "chart";
type SortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

interface Transaction {
  id: number | string;
  date: string;
  time: string;
  type: TxType;
  amount: number;
  dealReference: string;
  dealId: string;
  category: string;
  status: TxStatus;
  description: string;
  notes?: string;
  from: string;
  to: string;
  fee: number;
  statusHistory: { status: TxStatus; timestamp: string; note: string }[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<TxStatus, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  Completed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: CheckCircle2 },
  Pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: Clock },
  Failed: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: XCircle },
  Processing: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", icon: RefreshCw },
};

const CATEGORY_COLORS: Record<string, string> = {
  Revenue: "#2563EB", "Operating Expenses": "#2563EB", Marketing: "#F59E0B",
  Technology: "#3B82F6", Salaries: "#EC4899", Legal: "#EF4444",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

// ─── Balance Card ─────────────────────────────────────────────────────────────
function BalanceCard({ label, value, icon: Icon, iconBg, iconColor, trend, trendUp, accent, delay }: {
  label: string; value: number; icon: React.ElementType; iconBg: string; iconColor: string;
  trend: string; trendUp?: boolean; accent?: boolean; delay: number;
}) {
  const display = useCountUp(value, 1000);
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -3, boxShadow: "0 12px 36px -8px rgba(0,0,0,0.10)" }}
      className={`rounded-2xl border shadow-sm p-5 cursor-default transition-all ${
        accent
          ? "bg-gradient-to-br from-[#2563EB] to-[#0c8080] text-white border-blue-400"
          : "bg-white border-slate-100"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? "bg-white/20" : iconBg}`}>
          <Icon className={`w-5 h-5 ${accent ? "text-white" : iconColor}`} />
        </div>
        <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          accent ? "bg-white/20 text-white" :
          trendUp === true ? "bg-green-100 text-green-700" :
          trendUp === false ? "bg-red-100 text-red-700" :
          "bg-amber-100 text-amber-700"
        }`}>
          {trendUp === true && <TrendingUp className="w-3 h-3" />}
          {trendUp === false && <TrendingDown className="w-3 h-3" />}
          {trendUp === undefined && <Clock className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <p className={`text-2xl font-black tracking-tight mb-1 ${accent ? "text-white" : "text-slate-900"}`}>
        {fmt(display)}
      </p>
      <p className={`text-xs font-medium ${accent ? "text-white/70" : "text-slate-500"}`}>{label}</p>
    </motion.div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TxStatus }) {
  const s = STATUS_STYLES[status];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.bg} ${s.text} ${s.border}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-800 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Transaction Detail Panel ─────────────────────────────────────────────────
function DetailPanel({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
      onClick={e => e.currentTarget === e.target && onClose()}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${tx.type === "Credit" ? "bg-green-100" : "bg-red-100"}`}>
              {tx.type === "Credit" ? <ArrowDownRight className="w-5 h-5 text-green-600" /> : <ArrowUpRight className="w-5 h-5 text-red-600" />}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{tx.type === "Credit" ? "Incoming" : "Outgoing"} Transfer</p>
              <p className="text-[10px] text-slate-400">{tx.dealId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Amount hero */}
          <div className={`px-6 py-6 ${tx.type === "Credit" ? "bg-green-50" : "bg-red-50"}`}>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{tx.type === "Credit" ? "Amount Received" : "Amount Paid"}</p>
            <p className={`text-3xl font-black ${tx.type === "Credit" ? "text-green-700" : "text-red-700"}`}>
              {tx.type === "Credit" ? "+" : "−"}{fmt(tx.amount)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge status={tx.status} />
              <span className="text-[10px] text-slate-400">{tx.date} · {tx.time}</span>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Details grid */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Transaction Details</p>
              <div className="space-y-3">
                {[
                  { label: "Deal Reference", value: tx.dealReference },
                  { label: "Category", value: tx.category },
                  { label: "From", value: tx.from },
                  { label: "To", value: tx.to },
                  { label: "Processing Fee", value: tx.fee > 0 ? fmt(tx.fee) : "No fee" },
                ].map(r => (
                  <div key={r.label} className="flex items-start justify-between gap-4">
                    <span className="text-[11px] text-slate-400 shrink-0">{r.label}</span>
                    <span className="text-[11px] font-semibold text-slate-700 text-right">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-xs text-slate-700 leading-relaxed">{tx.description}</p>
            </div>

            {/* Notes */}
            {tx.notes && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Notes
                </p>
                <p className="text-xs text-slate-700 leading-relaxed">{tx.notes}</p>
              </div>
            )}

            {/* Status History */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Status History</p>
              <div className="space-y-0">
                {tx.statusHistory.map((h, i) => {
                  const s = STATUS_STYLES[h.status];
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${s.bg} border ${s.border} z-10`}>
                          <Icon className={`w-3 h-3 ${s.text}`} />
                        </div>
                        {i < tx.statusHistory.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" style={{ minHeight: 16 }} />}
                      </div>
                      <div className="pb-4 flex-1">
                        <p className={`text-[11px] font-bold ${s.text}`}>{h.status}</p>
                        <p className="text-[10px] text-slate-400">{h.timestamp}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{h.note}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Linked Deal */}
            <div className="p-3.5 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4 text-[#2563EB]" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Linked Deal</p>
                <p className="text-xs font-semibold text-slate-800">{tx.dealReference}</p>
                <p className="text-[10px] text-[#2563EB]">{tx.dealId}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={() => { toast.success("Transaction exported!"); onClose(); }}
            className="flex-1 py-2.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#2563EB] rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`bg-slate-200 rounded-xl ${className}`}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="w-8 h-8 !rounded-lg shrink-0" />
          <Skeleton className="flex-1 h-4" />
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-16 h-6 !rounded-full" />
          <Skeleton className="w-24 h-4" />
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

export function Ledger() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | TxType>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | TxStatus>("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const sortRef = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const fetchTransactions = useCallback(async () => {
    try {
      // In a real app, we'd fetch specific company or all if admin
      let data = [];
      if (isAdmin) {
        data = await apiClient.get<any[]>('/ledger');
      } else if (user?.companyId) {
        data = await apiClient.get<any[]>(`/ledger/company/${user.companyId}`);
      }
      
      if (Array.isArray(data)) {
        const mapped: Transaction[] = data.map((t: any, i: number) => {
          const d = new Date(t.timestamp || Date.now());
          return {
            id: t.id || i,
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: t.type === 'PAYOUT' || t.type === 'credit' ? 'Credit' : 'Debit',
            amount: t.amount || 0,
            dealReference: t.counterparty || 'Unknown Counterparty',
            dealId: t.dealId || 'N/A',
            category: t.type === 'PAYOUT' || t.type === 'credit' ? 'Revenue' : 'Operating Expenses',
            status: 'Completed', // Our backend maps all currently to COMPLETED
            description: t.description || 'System transaction',
            from: t.type === 'PAYOUT' || t.type === 'credit' ? (t.counterparty || 'System') : (user?.companyName || 'Your company'),
            to: t.type === 'PAYOUT' || t.type === 'credit' ? (user?.companyName || 'Your company') : (t.counterparty || 'System'),
            fee: 0,
            statusHistory: [
              { status: "Completed", timestamp: d.toLocaleString(), note: "Processed by backend" }
            ]
          };
        });
        setTransactions(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch ledger", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
    
    socketService.connect();
    const unsub = socketService.on('ledger:updated', () => {
      fetchTransactions();
      toast.info("Ledger updated in real-time");
    });
    
    return () => unsub();
  }, [fetchTransactions]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setShowExportMenu(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Derived stats
  const totalIn = transactions.filter(t => t.type === "Credit" && t.status !== "Failed").reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === "Debit" && t.status !== "Failed").reduce((s, t) => s + t.amount, 0);
  const pending = transactions.filter(t => t.status === "Pending").reduce((s, t) => s + t.amount, 0);
  const balance = totalIn - totalOut;

  // Filtered + sorted
  const filtered = transactions.filter(tx => {
    const ms = tx.dealReference.toLowerCase().includes(search.toLowerCase()) ||
      tx.description.toLowerCase().includes(search.toLowerCase()) ||
      tx.dealId.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === "All" || tx.type === typeFilter;
    const mst = statusFilter === "All" || tx.status === statusFilter;
    const mc = categoryFilter === "All" || tx.category === categoryFilter;
    return ms && mt && mst && mc;
  }).sort((a, b) => {
    if (sortKey === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortKey === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortKey === "amount_desc") return b.amount - a.amount;
    if (sortKey === "amount_asc") return a.amount - b.amount;
    return 0;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const MONTHLY_DATA = (() => {
    const m: Record<string, { revenue: number; expenses: number }> = {};
    transactions.forEach(t => {
      const d = new Date(`${t.date}`);
      if (isNaN(d.getTime())) return;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      (m[k] ??= { revenue: 0, expenses: 0 });
      if (t.type === "Credit") m[k].revenue += t.amount; else m[k].expenses += t.amount;
    });
    return Object.keys(m).sort().map(k => ({
      month: new Date(`${k}-01`).toLocaleDateString(undefined, { month: "short" }),
      revenue: m[k].revenue, expenses: m[k].expenses, net: m[k].revenue - m[k].expenses,
    }));
  })();
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const categories = ["All", ...Array.from(new Set(transactions.map(t => t.category)))];

  const handleExport = (format: "csv" | "pdf") => {
    setShowExportMenu(false);
    toast.loading(`Preparing ${format.toUpperCase()}...`, { id: "export" });
    setTimeout(() => {
      if (format === "csv") {
        const csv = [
          ["Date", "Time", "Type", "Amount", "Deal Reference", "Category", "Status", "Description"],
          ...filtered.map(t => [t.date, t.time, t.type, t.amount, t.dealReference, t.category, t.status, t.description]),
        ].map(r => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `ledger_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(`${format.toUpperCase()} ready! Download started.`, { id: "export" });
    }, 1800);
  };

  const SORT_LABELS: Record<SortKey, string> = {
    date_desc: "Latest First",
    date_asc: "Oldest First",
    amount_desc: "Highest Amount",
    amount_asc: "Lowest Amount",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-right" richColors />
      <AnimatePresence>
        {selectedTx && <DetailPanel tx={selectedTx} onClose={() => setSelectedTx(null)} />}
      </AnimatePresence>

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 rounded-2xl shadow-sm mb-5">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            {/* Left */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-blue-400 flex items-center justify-center shadow-sm">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-none">Financial Ledger</h1>
                <p className="text-[10px] text-slate-400 mt-0.5">{transactions.length} transactions · Apr 2026</p>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              {/* Date range */}
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="text-[11px] text-slate-600 bg-transparent focus:outline-none w-28" />
                <span className="text-slate-300 text-xs">→</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="text-[11px] text-slate-600 bg-transparent focus:outline-none w-28" />
              </div>

              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] w-48 transition-all"
                />
              </div>

              {/* Export */}
              <div className="relative" ref={exportRef}>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setShowExportMenu(o => !o)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#2563EB] rounded-xl transition-all shadow-sm shadow-blue-500/20"
                >
                  <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3 h-3 ml-0.5" />
                </motion.button>
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50"
                    >
                      <button onClick={() => handleExport("csv")} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" /> Export CSV
                      </button>
                      <button onClick={() => handleExport("pdf")} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                        <FileText className="w-3.5 h-3.5 text-red-500" /> Download PDF Report
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-6 space-y-5">

        {/* ── Balance Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BalanceCard label="Current Balance" value={balance} icon={Wallet} iconBg="bg-blue-50" iconColor="text-[#2563EB]" trend="+12.5% vs last month" trendUp={true} accent delay={0} />
          <BalanceCard label="Total Inflow" value={totalIn} icon={ArrowDownRight} iconBg="bg-green-50" iconColor="text-green-600" trend="+8.3% vs last month" trendUp={true} delay={0.07} />
          <BalanceCard label="Total Outflow" value={totalOut} icon={ArrowUpRight} iconBg="bg-red-50" iconColor="text-red-500" trend="-4.1% vs last month" trendUp={false} delay={0.14} />
          <BalanceCard label="Pending Amount" value={pending} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500" trend="2 transactions" delay={0.21} />
        </div>

        {/* ── User Flow Stepper ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">How to Use</h3>
              <p className="text-[10px] text-slate-400">Standard financial workflow</p>
            </div>
            <span className="text-[10px] font-semibold text-[#2563EB] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">3 Steps</span>
          </div>
          <div className="flex items-start gap-0">
            {[
              { icon: Activity, label: "View Transactions", desc: "Explore all entries", color: "#2563EB" },
              { icon: SlidersHorizontal, label: "Apply Filters", desc: "Type, status, date", color: "#2563EB" },
              { icon: Download, label: "Export Data", desc: "CSV or PDF report", color: "#22C55E" },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-1 flex flex-col items-center"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm mb-2"
                    style={{ backgroundColor: `${s.color}15`, border: `1.5px solid ${s.color}30` }}
                  >
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </motion.div>
                  <p className="text-[11px] font-bold text-slate-700 text-center">{s.label}</p>
                  <p className="text-[10px] text-slate-400 text-center mt-0.5">{s.desc}</p>
                  <div className="mt-2 w-6 h-1 rounded-full" style={{ backgroundColor: `${s.color}40` }} />
                </motion.div>
                {i < arr.length - 1 && (
                  <div className="flex items-center pt-3 px-1">
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Charts ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-5">
          {/* Area / Bar Chart — full width */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Revenue vs Expenses</h2>
                  <p className="text-[10px] text-slate-400">Oct 2025 – Apr 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setChartType("area")}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartType === "area" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                >Area</button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${chartType === "bar" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}
                >Bar</button>
              </div>
            </div>
            <div className="p-4">
              {isLoading ? (
                <Skeleton className="w-full h-[260px]" />
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  {chartType === "area" ? (
                    <AreaChart data={MONTHLY_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs key="ledger-main-defs">
                        <linearGradient id="ledgerGradRev" x1="0" y1="0" x2="0" y2="1">
                          <stop key="rev-s0" offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                          <stop key="rev-s1" offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ledgerGradExp" x1="0" y1="0" x2="0" y2="1">
                          <stop key="exp-s0" offset="5%" stopColor="#EF4444" stopOpacity={0.14} />
                          <stop key="exp-s1" offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="ledgerGradNet" x1="0" y1="0" x2="0" y2="1">
                          <stop key="net-s0" offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                          <stop key="net-s1" offset="95%" stopColor="#2563EB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid key="lm-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis key="lm-xa" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis key="lm-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={64} />
                      <Tooltip key="lm-tt" content={<CustomTooltip />} />
                      <Legend key="lm-lg" wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 8 }} />
                      <Area key="lm-area-rev" type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="url(#ledgerGradRev)" name="Revenue" dot={false} activeDot={{ r: 5 }} />
                      <Area key="lm-area-exp" type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} fill="url(#ledgerGradExp)" name="Expenses" dot={false} activeDot={{ r: 5 }} />
                      <Area key="lm-area-net" type="monotone" dataKey="net" stroke="#2563EB" strokeWidth={2} fill="url(#ledgerGradNet)" name="Net" dot={false} activeDot={{ r: 5 }} strokeDasharray="4 3" />
                    </AreaChart>
                  ) : (
                    <BarChart data={MONTHLY_DATA} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={2}>
                      <CartesianGrid key="lb-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis key="lb-xa" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis key="lb-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={64} />
                      <Tooltip key="lb-tt" content={<CustomTooltip />} />
                      <Legend key="lb-lg" wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 8 }} />
                      <Bar key="lb-bar-rev" dataKey="revenue" fill="#2563EB" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar key="lb-bar-exp" dataKey="expenses" fill="#EF4444" name="Expenses" radius={[4, 4, 0, 0]} opacity={0.8} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>

        {/* ── Filters & Controls ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>

          {/* Type chips */}
          <div className="flex items-center gap-1.5">
            {(["All", "Credit", "Debit"] as const).map(t => (
              <motion.button
                key={t}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setTypeFilter(t); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                  typeFilter === t
                    ? t === "Credit" ? "bg-green-500 text-white border-green-500" :
                      t === "Debit" ? "bg-red-500 text-white border-red-500" :
                      "bg-[#2563EB] text-white border-[#2563EB]"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {t}
              </motion.button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-200 hidden sm:block" />

          {/* Status chips */}
          <div className="flex items-center gap-1.5">
            {(["All", "Completed", "Pending", "Failed"] as const).map(s => (
              <motion.button
                key={s}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => { setStatusFilter(s as any); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${
                  statusFilter === s
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {s}
              </motion.button>
            ))}
          </div>

          <div className="w-px h-5 bg-slate-200 hidden lg:block" />

          {/* Category dropdown */}
          <select
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 text-[11px] font-semibold border border-slate-200 rounded-full bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 cursor-pointer"
          >
            {categories.map(c => <option key={c} value={c}>{c === "All" ? "All Categories" : c}</option>)}
          </select>

          <div className="ml-auto flex items-center gap-2">
            {/* Sort */}
            <div className="relative" ref={sortRef}>
              <button
                onClick={() => setSortOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold border border-slate-200 rounded-full bg-white text-slate-600 hover:border-slate-300 transition-colors"
              >
                <ChevronsUpDown className="w-3 h-3" /> {SORT_LABELS[sortKey]} <ChevronDown className="w-3 h-3" />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-40"
                  >
                    {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => { setSortKey(k); setSortOpen(false); setPage(1); }}
                        className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center gap-2 ${sortKey === k ? "text-[#2563EB] bg-blue-50" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        {sortKey === k && <CheckCircle2 className="w-3 h-3" />}
                        {v}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {([["table", TableProperties], ["chart", BarChart2]] as [ViewMode, React.ElementType][]).map(([v, Icon]) => (
                <motion.button
                  key={v}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setViewMode(v)}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === v ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  title={v === "table" ? "Table View" : "Chart View"}
                >
                  <Icon className="w-3.5 h-3.5" />
                </motion.button>
              ))}
            </div>

            <span className="text-[10px] text-slate-400 font-medium hidden sm:block">
              {filtered.length} of {transactions.length} transactions
            </span>
          </div>
        </div>

        {/* ── Transactions ─────────────────────────────────────────── */}
        {viewMode === "table" ? (
          <motion.div key="table-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <TableProperties className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Transaction History</h2>
                  <p className="text-[10px] text-slate-400">Click any row to view details</p>
                </div>
              </div>
              <button
                onClick={() => { setIsLoading(true); void fetchTransactions(); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoading ? (
              <TableSkeleton />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {["Date", "Type", "Amount", "Deal Reference", "Category", "Status", "Description", ""].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {paginated.map((tx, i) => (
                        <motion.tr
                          key={tx.id}
                          layout
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => setSelectedTx(tx)}
                          className="border-b border-slate-50 cursor-pointer hover:bg-blue-50/30 transition-colors group"
                        >
                          {/* Date */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className="font-semibold text-slate-800">{tx.date}</p>
                            <p className="text-[10px] text-slate-400">{tx.time}</p>
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              tx.type === "Credit"
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200"
                            }`}>
                              {tx.type === "Credit" ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {tx.type}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <p className={`font-black text-sm ${tx.type === "Credit" ? "text-green-700" : "text-red-600"}`}>
                              {tx.type === "Credit" ? "+" : "−"}{fmt(tx.amount)}
                            </p>
                            {tx.fee > 0 && <p className="text-[9px] text-slate-400">Fee: {fmt(tx.fee)}</p>}
                          </td>

                          {/* Deal */}
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-700 max-w-[160px] truncate">{tx.dealReference}</p>
                            <p className="text-[10px] text-[#2563EB]">{tx.dealId}</p>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                              style={{
                                color: CATEGORY_COLORS[tx.category] ?? "#64748B",
                                backgroundColor: `${CATEGORY_COLORS[tx.category] ?? "#64748B"}12`,
                                borderColor: `${CATEGORY_COLORS[tx.category] ?? "#64748B"}30`,
                              }}>
                              <Circle className="w-1.5 h-1.5 fill-current" />
                              {tx.category}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4"><StatusBadge status={tx.status} /></td>

                          {/* Description */}
                          <td className="py-3.5 px-4 max-w-[200px]">
                            <p className="text-slate-500 truncate text-[11px]">{tx.description}</p>
                          </td>

                          {/* Action */}
                          <td className="py-3.5 px-4">
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2563EB] transition-colors" />
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                Showing <span className="font-bold text-slate-700">{Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)}</span> of <span className="font-bold text-slate-700">{filtered.length}</span>
              </p>
              <div className="flex items-center gap-1.5">
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-[11px] font-bold transition-all ${
                      p === page
                        ? "bg-[#2563EB] text-white shadow-sm shadow-blue-500/20"
                        : "border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700"
                    }`}
                  >
                    {p}
                  </motion.button>
                ))}
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Chart-only view */
          <motion.div key="chart-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Monthly Net Income</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={MONTHLY_DATA}>
                  <CartesianGrid key="cv-bar-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis key="cv-bar-xa" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis key="cv-bar-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={64} />
                  <Tooltip key="cv-bar-tt" content={<CustomTooltip />} />
                  <Bar key="cv-bar-net" dataKey="net" fill="#2563EB" name="Net Income" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={MONTHLY_DATA}>
                  <defs key="ledger-cv-defs">
                    <linearGradient id="ledgerGradRev2" x1="0" y1="0" x2="0" y2="1">
                      <stop key="cv-s0" offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop key="cv-s1" offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid key="cv-area-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis key="cv-area-xa" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis key="cv-area-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} width={64} />
                  <Tooltip key="cv-area-tt" content={<CustomTooltip />} />
                  <Area key="cv-area-rev" type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fill="url(#ledgerGradRev2)" name="Revenue" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {/* ── Export & Reports ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                <Download className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Export & Reports</h3>
                <p className="text-[10px] text-slate-400">Generate and download financial reports</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: "Export CSV", desc: "Raw transaction data", icon: FileSpreadsheet, color: "#22C55E", action: () => handleExport("csv") },
              { label: "Download PDF Report", desc: "Formatted ledger report", icon: FileText, color: "#EF4444", action: () => handleExport("pdf") },
              { label: "Send via Email", desc: "Share with stakeholders", icon: Banknote, color: "#2563EB", action: () => toast.success("Report sent via email!") },
            ].map(b => (
              <motion.button
                key={b.label}
                whileHover={{ y: -2, boxShadow: "0 8px 20px -6px rgba(0,0,0,0.08)" }}
                whileTap={{ scale: 0.98 }}
                onClick={b.action}
                className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${b.color}15` }}>
                  <b.icon className="w-4 h-4" style={{ color: b.color }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{b.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{b.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
