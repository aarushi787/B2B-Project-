import React, { useState, useEffect, useRef } from "react";
import {
  Users, Building2, Handshake, DollarSign, Shield, FileText,
  AlertTriangle, Clock, X, CheckCircle, XCircle, Bell,
  Search, Settings, ChevronDown, ChevronRight, LayoutDashboard,
  Flag, Eye, UserCheck, UserX, RefreshCw, Filter,
  TrendingUp, BarChart2, Lock, Unlock, Activity, Zap,
  AlertCircle, ShieldCheck, ShieldAlert, Download, MoreHorizontal,
  LogOut, User, Star, Circle, ArrowUpRight, ArrowDownRight,
  Layers, Info, SlidersHorizontal, BookOpen, CheckSquare, Square,
  PieChart as PieChartIcon, Globe, Target
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast, Toaster } from "sonner";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell
} from "recharts";
import { apiClient } from "./services/apiClient";
import { socketService } from "./services/socketService";

export default function Admin() {
type CompanyStatus = "Pending" | "Verified" | "Rejected";
type DealStatus = "In Progress" | "Pending" | "Under Review" | "Completed" | "Flagged";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";
type Section = "overview" | "users" | "companies" | "deals" | "compliance" | "reports" | "settings" | "investors";
type LogType = "all" | "user" | "company" | "deal" | "security";

interface AdminUser {
  id: number | string; name: string; email: string; role: string;
  status: UserStatus; lastActive: string; company: string; joined: string; deals: number;
}
interface Company {
  id: number | string; name: string; industry: string; status: CompanyStatus;
  kyc: number; docs: number; submittedBy: string; date: string; revenue: string;
}
interface Deal {
  id: number | string; name: string; client: string; provider: string;
  amount: number; status: DealStatus; risk: RiskLevel; date: string; flagged: boolean;
}
interface AuditLog {
  id: number | string; action: string; user: string; timestamp: string;
  ip: string; result: "success" | "failed" | "warning"; type: LogType;
}
interface Notification {
  id: number; title: string; message: string; time: string;
  read: boolean; type: "alert" | "info" | "success" | "warning";
}
interface FraudAlert {
  id: number; title: string; entity: string; riskScore: number;
  detected: string; type: "user" | "deal" | "transaction"; resolved: boolean;
}

const INIT_USERS: AdminUser[] = [];

const INIT_COMPANIES: Company[] = [];

const INIT_DEALS: Deal[] = [
  { id: 1, name: "TechCorp Equipment Purchase", client: "FinanceHub Inc", provider: "TechCorp Solutions", amount: 250000, status: "In Progress", risk: "Low", date: "Apr 20, 2026", flagged: false },
  { id: 2, name: "Green Energy Partnership", client: "RetailPro Solutions", provider: "Green Energy Ltd", amount: 180000, status: "Pending", risk: "Low", date: "Apr 19, 2026", flagged: false },
  { id: 3, name: "Medical Equipment Deal", client: "HealthFirst Medical", provider: "ManufactureX Corp", amount: 420000, status: "In Progress", risk: "Medium", date: "Apr 18, 2026", flagged: false },
  { id: 4, name: "Suspicious High-Value Transfer", client: "Unknown Entity", provider: "NewTech Industries", amount: 850000, status: "Under Review", risk: "Critical", date: "Apr 17, 2026", flagged: true },
  { id: 5, name: "SaaS Platform Licensing", client: "Acme Corp", provider: "DataStream Analytics", amount: 95000, status: "Completed", risk: "Low", date: "Apr 16, 2026", flagged: false },
  { id: 6, name: "Cross-Border Shipment", client: "GlobalTrade Ltd", provider: "Smart Manufacturing", amount: 310000, status: "Under Review", risk: "High", date: "Apr 15, 2026", flagged: false },
];

const AUDIT_LOGS: AuditLog[] = [
  { id: 1, action: "User Login", user: "John Doe", timestamp: "Apr 23, 2026 · 10:30 AM", ip: "192.168.1.1", result: "success", type: "user" },
  { id: 2, action: "Company Approved", user: "Admin", timestamp: "Apr 23, 2026 · 09:45 AM", ip: "192.168.1.5", result: "success", type: "company" },
  { id: 3, action: "Failed Login Attempt (×5)", user: "Unknown", timestamp: "Apr 23, 2026 · 08:15 AM", ip: "203.45.67.89", result: "failed", type: "security" },
  { id: 4, action: "Deal Status Changed to Flagged", user: "System", timestamp: "Apr 22, 2026 · 04:20 PM", ip: "192.168.1.3", result: "warning", type: "deal" },
  { id: 5, action: "User Suspended", user: "Admin", timestamp: "Apr 22, 2026 · 02:10 PM", ip: "192.168.1.5", result: "success", type: "user" },
  { id: 6, action: "AML Check Triggered", user: "System", timestamp: "Apr 22, 2026 · 11:00 AM", ip: "internal", result: "warning", type: "security" },
  { id: 7, action: "New Company Registration", user: "Bob Martinez", timestamp: "Apr 21, 2026 · 09:30 AM", ip: "78.23.45.10", result: "success", type: "company" },
  { id: 8, action: "Password Reset", user: "Emma Wilson", timestamp: "Apr 21, 2026 · 08:00 AM", ip: "192.168.2.7", result: "success", type: "user" },
];

const INIT_NOTIFS: Notification[] = [
  { id: 1, title: "High-Risk Deal Detected", message: "Deal #4 flagged by fraud detection system.", time: "5m ago", read: false, type: "alert" },
  { id: 2, title: "Company Pending Review", message: "EnergyTech Inc submitted KYC documents.", time: "22m ago", read: false, type: "warning" },
  { id: 3, title: "User Suspended", message: "Michael Chen account suspended by admin.", time: "1h ago", read: false, type: "info" },
  { id: 4, title: "Monthly Report Ready", message: "April 2026 revenue report generated.", time: "2h ago", read: true, type: "success" },
  { id: 5, title: "Failed Login Attempts", message: "5 failed logins from IP 203.45.67.89.", time: "3h ago", read: true, type: "alert" },
];

const REVENUE_DATA = [
  { name: 'Jan', revenue: 120000, volume: 45 },
  { name: 'Feb', revenue: 150000, volume: 52 },
  { name: 'Mar', revenue: 200000, volume: 78 },
  { name: 'Apr', revenue: 350000, volume: 110 },
  { name: 'May', revenue: 450000, volume: 135 },
  { name: 'Jun', revenue: 520000, volume: 160 },
];

const PLATFORM_USAGE = [
  { name: 'Buyers', value: 450 },
  { name: 'Sellers', value: 300 },
  { name: 'Agencies', value: 150 },
];

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

const INIT_FRAUD: FraudAlert[] = [
  { id: 1, title: "Suspicious User Activity", entity: "Unknown (IP: 203.45.67.89)", riskScore: 87, detected: "Apr 23 · 08:15 AM", type: "user", resolved: false },
  { id: 2, title: "High-Risk Deal Flagged", entity: "Suspicious High-Value Transfer · $850K", riskScore: 94, detected: "Apr 22 · 04:20 PM", type: "deal", resolved: false },
  { id: 3, title: "Unusual Transaction Pattern", entity: "DataStream Analytics", riskScore: 71, detected: "Apr 21 · 11:00 AM", type: "transaction", resolved: true },
];

const GROWTH_DATA = [
  { month: "Oct", users: 840, revenue: 1.4 }, { month: "Nov", users: 920, revenue: 1.6 },
  { month: "Dec", users: 1020, revenue: 1.9 }, { month: "Jan", users: 1080, revenue: 2.0 },
  { month: "Feb", users: 1140, revenue: 2.1 }, { month: "Mar", users: 1200, revenue: 2.3 },
  { month: "Apr", users: 1247, revenue: 2.4 },
];

const INV_MONTHLY_DATA = [
  { period: "Nov '25", gmv: 15.1, revenue: 1.51, users: 1110, deals: 52 },
  { period: "Dec '25", gmv: 17.2, revenue: 1.72, users: 1140, deals: 58 },
  { period: "Jan '26", gmv: 14.8, revenue: 1.48, users: 1160, deals: 49 },
  { period: "Feb '26", gmv: 16.3, revenue: 1.63, users: 1190, deals: 55 },
  { period: "Mar '26", gmv: 18.9, revenue: 1.89, users: 1218, deals: 63 },
  { period: "Apr '26", gmv: 20.4, revenue: 2.04, users: 1247, deals: 68 },
];

const INV_DEAL_CATEGORIES = [
  { category: "Technology", count: 124, value: 42.1, color: "#8B5CF6" },
  { category: "Manufacturing", count: 89, value: 31.4, color: "#8B5CF6" },
  { category: "Healthcare", count: 76, value: 28.8, color: "#3B82F6" },
  { category: "Energy", count: 58, value: 22.6, color: "#22C55E" },
  { category: "Retail", count: 76, value: 17.9, color: "#F59E0B" },
];

const INV_TREND_METRICS = [
  { label: "Avg Deal Size", current: "$184K", prev: "$142K", change: "+29.6%", up: true },
  { label: "Deal Velocity", current: "18 days", prev: "24 days", change: "-25%", up: true },
  { label: "Take Rate", current: "9.96%", prev: "9.41%", change: "+55bps", up: true },
  { label: "Churn Rate", current: "2.1%", prev: "3.4%", change: "-1.3pp", up: true },
  { label: "NPS Score", current: "72", prev: "61", change: "+11 pts", up: true },
  { label: "Support SLA", current: "98.2%", prev: "95.1%", change: "+3.1pp", up: true },
];

// ─── Small helpers ────────────────────────────────────────────────────────────
const userStatusStyle: Record<UserStatus, string> = {
  Active: "bg-green-100 text-green-700 border-green-200",
  Suspended: "bg-red-100 text-red-700 border-red-200",
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
};
const companyStatusStyle: Record<CompanyStatus, string> = {
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Verified: "bg-green-100 text-green-700 border-green-200",
  Rejected: "bg-red-100 text-red-700 border-red-200",
};
const riskStyle: Record<RiskLevel, string> = {
  Low: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Critical: "bg-red-100 text-red-700 border-red-200",
};

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, subtitle, action }: {
  icon: React.ElementType; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-[#8B5CF6]" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-800 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-bold text-slate-800">{typeof p.value === "number" && p.name === "Revenue" ? `$${p.value}M` : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ companyName, onConfirm, onClose }: { companyName: string; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={e => e.currentTarget === e.target && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Reject Company</h3>
            <p className="text-[10px] text-slate-400">{companyName}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-600">Please provide a reason for rejection. This will be communicated to the applicant.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4}
            placeholder="e.g. Incomplete documentation, failed KYC verification..."
            className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400 bg-slate-50" />
        </div>
        <div className="px-5 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={() => reason.trim() ? onConfirm(reason) : toast.error("Please enter a rejection reason")}
            className="flex-1 py-2.5 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
            Confirm Reject
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── User Profile Modal ────────────────────────────────────────────────────────
function UserModal({ user, status, onToggle, onClose }: {
  user: AdminUser; status: UserStatus; onToggle: () => void; onClose: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={e => e.currentTarget === e.target && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 12 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-[#8B5CF6] to-cyan-400" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-xl font-black text-[#8B5CF6]">
              {user.name.charAt(0)}
            </div>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl mb-1"><X className="w-4 h-4" /></button>
          </div>
          <h3 className="text-base font-black text-slate-900">{user.name}</h3>
          <p className="text-xs text-slate-500 mb-4">{user.email}</p>
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Company", value: user.company },
              { label: "Role", value: user.role },
              { label: "Joined", value: user.joined },
              { label: "Total Deals", value: String(user.deals) },
              { label: "Last Active", value: user.lastActive },
              { label: "Status", value: <Badge label={status} style={userStatusStyle[status]} /> },
            ].map(r => (
              <div key={r.label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] text-slate-400 mb-1">{r.label}</p>
                <div className="text-xs font-semibold text-slate-700">{r.value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onToggle}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors ${status === "Active" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-white"}`}>
              {status === "Active" ? "Suspend User" : "Activate User"}
            </motion.button>
            <button onClick={onClose} className="flex-1 py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Close</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Deal Detail Panel ─────────────────────────────────────────────────────────
function DealPanel({ deal, onClose, onFlag, canFlag }: {
  deal: Deal; onClose: () => void; onFlag: () => void; canFlag: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
      onClick={e => e.currentTarget === e.target && onClose()}>
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center">
              <Handshake className="w-4 h-4 text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Deal Detail</p>
              <p className="text-[10px] text-slate-400">DEAL-{String(deal.id).padStart(4, "0")}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className={`p-4 rounded-xl ${deal.risk === "Critical" || deal.risk === "High" ? "bg-red-50 border border-red-100" : "bg-slate-50 border border-slate-100"}`}>
            <p className="text-sm font-black text-slate-900 mb-2">{deal.name}</p>
            <div className="flex items-center gap-2">
              <Badge label={deal.status} style={deal.status === "Completed" ? "bg-green-100 text-green-700 border-green-200" : deal.status === "Under Review" || deal.status === "Flagged" ? "bg-red-100 text-red-700 border-red-200" : deal.status === "Pending" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-blue-100 text-blue-700 border-blue-200"} />
              <Badge label={`${deal.risk} Risk`} style={riskStyle[deal.risk]} />
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Client", value: deal.client, icon: Building2 },
              { label: "Provider", value: deal.provider, icon: Building2 },
              { label: "Deal Value", value: `$${deal.amount.toLocaleString()}`, icon: DollarSign },
              { label: "Date", value: deal.date, icon: Clock },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <r.icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-[10px] text-slate-400 w-14 shrink-0">{r.label}</span>
                <span className="text-[11px] font-semibold text-slate-700">{r.value}</span>
              </div>
            ))}
          </div>
          {(deal.risk === "High" || deal.risk === "Critical") && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-700 leading-relaxed">This deal has been flagged for elevated risk. Review all documentation before proceeding.</p>
            </div>
          )}
          {deal.flagged && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2.5">
              <Flag className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700">This deal has been manually flagged by an admin.</p>
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-2 border-t border-slate-100 pt-4">
          {canFlag && !deal.flagged && (
            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={onFlag}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl flex items-center justify-center gap-1.5">
              <Flag className="w-3.5 h-3.5" /> Flag Deal
            </motion.button>
          )}
          <button onClick={onClose} className={`${canFlag && !deal.flagged ? "flex-1" : "w-full"} py-2.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors`}>
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Notification Panel ────────────────────────────────────────────────────────
function NotifPanel({ notifs, onMarkRead, onClearAll, onClose }: {
  notifs: Notification[]; onMarkRead: (id: number) => void; onClearAll: () => void; onClose: () => void;
}) {
  const typeIcon: Record<Notification["type"], React.ElementType> = { alert: AlertCircle, warning: AlertTriangle, info: Info, success: CheckCircle };
  const typeColor: Record<Notification["type"], string> = { alert: "text-red-500", warning: "text-amber-500", info: "text-blue-500", success: "text-green-500" };
  const typeBg: Record<Notification["type"], string> = { alert: "bg-red-50", warning: "bg-amber-50", info: "bg-blue-50", success: "bg-green-50" };
  const unread = notifs.filter(n => !n.read).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50" onClick={e => e.currentTarget === e.target && onClose()}>
      <motion.div initial={{ opacity: 0, x: 20, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.97 }}
        className="absolute top-16 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Notifications</p>
            <p className="text-[10px] text-slate-400">{unread} unread</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClearAll} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600">Clear all</button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifs.map(n => {
            const Icon = typeIcon[n.type];
            return (
              <div key={n.id} onClick={() => onMarkRead(n.id)}
                className={`flex gap-3 p-3.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? "bg-purple-50/30" : ""}`}>
                <div className={`w-7 h-7 rounded-full ${typeBg[n.type]} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${typeColor[n.type]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[11px] font-bold ${n.read ? "text-slate-600" : "text-slate-900"}`}>{n.title}</p>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#8B5CF6] shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{n.message}</p>
                  <p className="text-[9px] text-slate-400 mt-1">{n.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Skeletons ──────────────────────────────────────────────────────────────────
function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <div className="animate-pulse w-full">
      <div className="h-10 bg-slate-100 rounded-t-xl mb-1"></div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b border-slate-50">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-4 bg-slate-100 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export function Admin() {
  const [section, setSection] = useState<Section>("overview");
  const [adminRole, setAdminRole] = useState<AdminRole>("Admin");
  const [roleOpen, setRoleOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState("");
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString());
  const [notifications, setNotifications] = useState<Notification[]>(INIT_NOTIFS);
  const [users, setUsers] = useState<AdminUser[]>(INIT_USERS);
  const [userStatuses, setUserStatuses] = useState<Record<string | number, UserStatus>>(
    Object.fromEntries(INIT_USERS.map(u => [u.id, u.status]))
  );
  const [selectedUsers, setSelectedUsers] = useState<Set<number | string>>(new Set());
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [companies, setCompanies] = useState<Company[]>(INIT_COMPANIES);
  const [companyStatuses, setCompanyStatuses] = useState<Record<string | number, CompanyStatus>>(
    Object.fromEntries(INIT_COMPANIES.map(c => [c.id, c.status]))
  );
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: number | string; name: string }>({ open: false, id: 0, name: "" });
  const [deals, setDeals] = useState<Deal[]>(INIT_DEALS);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, compsRes, dealsRes] = await Promise.all([
          apiClient.get<any[]>('/admin/users').catch(() => []),
          apiClient.get<any[]>('/admin/companies').catch(() => []),
          apiClient.get<any>('/deals').catch(() => ({ data: [] }))
        ]);
        
        if (usersRes !== undefined && Array.isArray(usersRes)) {
          const mappedUsers = usersRes.map((u: any) => ({
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown User',
            email: u.email,
            role: u.role || 'User',
            status: "Active" as UserStatus,
            lastActive: "Just now",
            company: "Platform User",
            joined: new Date(u.createdAt).toLocaleDateString(),
            deals: 0
          }));
          setUsers(mappedUsers);
          setUserStatuses(Object.fromEntries(mappedUsers.map((u: any) => [u.id, u.status])));
        }

        if (compsRes !== undefined && Array.isArray(compsRes)) {
          const mappedComps = compsRes.map((c: any) => ({
            id: c.id,
            name: c.name || c.legalName || 'Unknown Company',
            industry: c.industry || "General",
            status: c.kycStatus === 'verified' ? 'Verified' as CompanyStatus : 'Pending' as CompanyStatus,
            kyc: 100, docs: 3, submittedBy: "Admin", date: new Date(c.createdAt || Date.now()).toLocaleDateString(), revenue: "$0"
          }));
          setCompanies(mappedComps);
          setCompanyStatuses(Object.fromEntries(mappedComps.map((c: any) => [c.id, c.status])));
        }

        if (dealsRes !== undefined && dealsRes.data && Array.isArray(dealsRes.data)) {
          const mappedDeals = dealsRes.data.map((d: any) => ({
            id: d.id,
            name: d.notes || `Deal ${d.id.substring(0,8)}`,
            client: d.buyerId?.substring(0, 8) || "Unknown",
            provider: d.sellerIds?.[0]?.substring(0,8) || "Unknown",
            amount: d.amount || 0,
            status: d.status === 'CONFIRMED' ? 'Completed' : d.status === 'ENQUIRY' ? 'Pending' : 'In Progress',
            risk: "Low" as RiskLevel,
            date: new Date(d.createdAt).toLocaleDateString(),
            flagged: false
          }));
          setDeals(mappedDeals);
        }
      } catch (e) {
        console.error("Failed to load admin data", e);
      }
    };
    fetchData();

    socketService.connect();
    const unsubDeals = socketService.on('deals:updated', () => fetchData());
    const unsubCompany = socketService.on('company:updated', () => fetchData());
    return () => {
      unsubDeals();
      unsubCompany();
    };
  }, []);
  const [viewDeal, setViewDeal] = useState<Deal | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>(INIT_FRAUD);
  const [auditFilter, setAuditFilter] = useState<LogType>("all");
  const [logs, setLogs] = useState<AuditLog[]>(AUDIT_LOGS);
  const [settingsState, setSettingsState] = useState<Record<string, boolean>>({
    "Two-Factor Auth": true,
    "Email Notifications": true,
    "Auto-Suspend on 5 Failed Logins": true,
    "Real-time Fraud Alerts": true,
    "Audit Logging": true,
    "Auto KYC Screening": false,
  });
  const [loading, setLoading] = useState(true);
  const roleRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  const canWrite = adminRole !== "Viewer";
  const isAdmin = adminRole === "Admin";
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!liveRefresh) return;
    const t = setInterval(() => setLiveTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, [liveRefresh]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [section]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addLog = (action: string, type: LogType) => {
    setLogs(prev => [{
      id: Date.now(), action, user: `Admin (${adminRole})`,
      timestamp: `${new Date().toLocaleDateString()} · ${new Date().toLocaleTimeString()}`,
      ip: "192.168.1.5", result: "success", type,
    }, ...prev]);
  };

  const handleToggleUser = (id: string | number) => {
    const cur = userStatuses[id];
    const next: UserStatus = cur === "Active" ? "Suspended" : "Active";
    setUserStatuses(p => ({ ...p, [id]: next }));
    const u = users.find(x => x.id === id);
    addLog(`User ${next === "Suspended" ? "Suspended" : "Activated"}: ${u?.name}`, "user");
    toast[next === "Suspended" ? "warning" : "success"](`${u?.name} ${next === "Suspended" ? "suspended" : "activated"}`);
    setViewUser(null);
  };

  const handleBulkAction = (action: "suspend" | "activate") => {
    const next: UserStatus = action === "suspend" ? "Suspended" : "Active";
    const updated = { ...userStatuses };
    selectedUsers.forEach(id => { updated[id] = next; });
    setUserStatuses(updated);
    addLog(`Bulk ${action}: ${selectedUsers.size} users`, "user");
    toast[action === "suspend" ? "warning" : "success"](`${selectedUsers.size} users ${next.toLowerCase()}`);
    setSelectedUsers(new Set());
  };

  const toggleSelectUser = (id: string | number) => {
    setSelectedUsers(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleApprove = (id: string | number) => {
    setCompanyStatuses(p => ({ ...p, [id]: "Verified" as CompanyStatus }));
    const c = companies.find(x => x.id === id);
    addLog(`Company Approved: ${c?.name}`, "company");
    toast.success(`${c?.name} verified successfully!`);
  };

  const handleRejectConfirm = (reason: string) => {
    setCompanyStatuses(p => ({ ...p, [rejectModal.id]: "Rejected" as CompanyStatus }));
    addLog(`Company Rejected: ${rejectModal.name} — ${reason}`, "company");
    toast.error(`${rejectModal.name} rejected.`);
    setRejectModal({ open: false, id: "", name: "" });
  };

  const handleFlagDeal = (id: string | number) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, flagged: true, status: "Flagged" as DealStatus } : d));
    const deal = deals.find(d => d.id === id);
    addLog(`Deal Flagged: ${deal?.name}`, "deal");
    toast.warning(`Deal flagged for review!`);
    setViewDeal(null);
  };

  const handleResolveFraud = (id: string | number) => {
    setFraudAlerts(prev => prev.map(f => f.id === id ? { ...f, resolved: true } : f));
    toast.success("Fraud alert resolved.");
  };

  const filteredLogs = auditFilter === "all" ? logs : logs.filter(l => l.type === auditFilter);

  const SIDEBAR_ITEMS: { icon: React.ElementType; label: string; key: Section; badge?: number }[] = [
    { icon: LayoutDashboard, label: "Overview", key: "overview" },
    { icon: Users, label: "Users", key: "users", badge: users.filter(u => userStatuses[u.id] === "Pending").length || undefined },
    { icon: Building2, label: "Companies", key: "companies", badge: Object.values(companyStatuses).filter(s => s === "Pending").length || undefined },
    { icon: Handshake, label: "Deals", key: "deals", badge: deals.filter(d => d.flagged).length || undefined },
    { icon: TrendingUp, label: "Investors", key: "investors" },
    { icon: Shield, label: "Compliance", key: "compliance" },
    { icon: BarChart2, label: "Reports", key: "reports" },
    { icon: Settings, label: "Settings", key: "settings" },
  ];

  return (
    <div className="flex h-full min-h-screen bg-[#F5F7FA] -m-6 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-right" richColors />

      {/* Modals */}
      <AnimatePresence>
        {rejectModal.open && <RejectModal companyName={rejectModal.name} onConfirm={handleRejectConfirm} onClose={() => setRejectModal({ open: false, id: 0, name: "" })} />}
        {viewUser && <UserModal user={viewUser} status={userStatuses[viewUser.id]} onToggle={() => handleToggleUser(viewUser.id)} onClose={() => setViewUser(null)} />}
        {viewDeal && <DealPanel deal={viewDeal} onClose={() => setViewDeal(null)} onFlag={() => handleFlagDeal(viewDeal.id)} canFlag={canWrite} />}
        {showNotifs && <NotifPanel notifs={notifications} onMarkRead={id => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))} onClearAll={() => setNotifications(p => p.map(n => ({ ...n, read: true })))} onClose={() => setShowNotifs(false)} />}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Admin Top Navigation ────────────────────────────────── */}
        <div className="bg-white border-b border-slate-200 shrink-0">
          {/* Top Header */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-cyan-400 flex items-center justify-center shadow-sm">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight">Admin Control Center</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="relative" ref={roleRef}>
                    <button onClick={() => setRoleOpen(o => !o)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-[#8B5CF6] transition-colors">
                      {adminRole === "Admin" ? <ShieldCheck className="w-3 h-3 text-[#8B5CF6]" /> : adminRole === "Moderator" ? <ShieldAlert className="w-3 h-3 text-purple-500" /> : <Eye className="w-3 h-3 text-slate-400" />}
                      Role: {adminRole}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {roleOpen && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 mt-2 w-40 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                          {(["Admin", "Moderator", "Viewer"] as AdminRole[]).map(r => (
                            <button key={r} onClick={() => { setAdminRole(r); setRoleOpen(false); toast.info(`Switched to ${r} role`); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${adminRole === r ? "bg-purple-50 text-[#8B5CF6] font-bold" : "text-slate-600 hover:bg-slate-50"}`}>
                              {r === "Admin" ? <ShieldCheck className="w-3.5 h-3.5" /> : r === "Moderator" ? <ShieldAlert className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {r}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className="text-[10px] text-slate-300">•</span>
                  <button onClick={() => setLiveRefresh(r => !r)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                    <span className={`w-1.5 h-1.5 rounded-full ${liveRefresh ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
                    {liveRefresh ? "Live Sync Active" : "Sync Paused"}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-64 hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input type="text" placeholder="Search logs, users, alerts..." value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/30 focus:border-[#8B5CF6] transition-all" />
              </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Role banner */}
            {adminRole === "Viewer" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500">
                <Lock className="w-3 h-3" /> Read-only mode
              </div>
            )}
            {adminRole === "Moderator" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-xl text-[10px] font-bold text-purple-600">
                <ShieldAlert className="w-3 h-3" /> Limited access
              </div>
            )}

            {/* Notif */}
            <button onClick={() => setShowNotifs(o => !o)}
              className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
            </button>

            {/* Avatar dropdown */}
            <div className="relative" ref={avatarRef}>
              <button onClick={() => setAvatarOpen(o => !o)} className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-slate-50 border border-transparent hover:border-slate-200 rounded-full transition-all">
                <div className="w-8 h-8 bg-gradient-to-br from-[#8B5CF6] to-cyan-400 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm">A</div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
              </button>
              <AnimatePresence>
                {avatarOpen && (
                  <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-800">Super Admin</p>
                      <p className="text-[10px] text-slate-400">admin@platform.com</p>
                    </div>
                    {[{ icon: User, label: "Profile" }, { icon: Settings, label: "Settings" }, { icon: BookOpen, label: "Audit Log" }].map(i => (
                      <button key={i.label} onClick={() => { setAvatarOpen(false); if (i.label === "Settings") setSection("settings"); if (i.label === "Audit Log") setSection("compliance"); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                        <i.icon className="w-3.5 h-3.5" /> {i.label}
                      </button>
                    ))}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 px-6">
          <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
            {SIDEBAR_ITEMS.map(item => (
              <button key={item.key} onClick={() => setSection(item.key)}
                className={`relative flex items-center gap-2 py-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${section === item.key ? "text-[#8B5CF6]" : "text-slate-500 hover:text-slate-800"}`}>
                <item.icon className={`w-4 h-4 ${section === item.key ? "text-[#8B5CF6]" : "text-slate-400"}`} />
                {item.label}
                {item.badge ? (
                  <span className={`ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${section === item.key ? "bg-[#8B5CF6] text-white" : "bg-slate-200 text-slate-600"}`}>{item.badge}</span>
                ) : null}
                {section === item.key && (
                  <motion.div layoutId="adminTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Page body */}
        <div className="flex-1 overflow-y-auto p-5">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* ══════════════ OVERVIEW ══════════════ */}
              {section === "overview" && (
                <div className="space-y-5">
                  {/* Fraud banner */}
                  {fraudAlerts.some(f => !f.resolved) && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
                      <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-red-800">⚠️ {fraudAlerts.filter(f => !f.resolved).length} Active Fraud Alert{fraudAlerts.filter(f => !f.resolved).length > 1 ? "s" : ""} Detected</p>
                        <p className="text-[10px] text-red-600 mt-0.5">Suspicious activity requires immediate review. Visit Compliance section.</p>
                      </div>
                      <button onClick={() => setSection("compliance")} className="px-3 py-1.5 text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">Review Now</button>
                    </motion.div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
                    {[
                      { label: "Total Users", value: users.length.toString(), sub: `+3 this week`, icon: Users, color: "#8B5CF6", bg: "bg-purple-50", sec: "users" as Section },
                      { label: "Companies", value: companies.length.toString(), sub: `${Object.values(companyStatuses).filter(s => s === "Pending").length} pending`, icon: Building2, color: "#8B5CF6", bg: "bg-purple-50", sec: "companies" as Section },
                      { label: "Active Deals", value: deals.filter(d => d.status === "In Progress").length.toString(), sub: `${deals.filter(d => d.flagged).length} flagged`, icon: Handshake, color: "#3B82F6", bg: "bg-blue-50", sec: "deals" as Section },
                      { label: "Revenue (MTD)", value: "$2.4M", sub: "+15% vs last month", icon: DollarSign, color: "#22C55E", bg: "bg-green-50", sec: "reports" as Section },
                      { label: "Pending KYC", value: Object.values(companyStatuses).filter(s => s === "Pending").length.toString(), sub: "Needs review", icon: ShieldAlert, color: "#F59E0B", bg: "bg-amber-50", sec: "compliance" as Section },
                    ].map((m, i) => (
                      <motion.button key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        whileHover={{ y: -3, boxShadow: "0 10px 28px -8px rgba(0,0,0,0.10)" }} onClick={() => setSection(m.sec)}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-left transition-all cursor-pointer">
                        <div className={`w-9 h-9 rounded-xl ${m.bg} flex items-center justify-center mb-3`}>
                          <m.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: m.color }} />
                        </div>
                        <p className="text-xl font-black text-slate-900">{m.value}</p>
                        <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{m.label}</p>
                        <p className="text-[9px] text-slate-400 mt-1">{m.sub}</p>
                      </motion.button>
                    ))}
                  </div>

                  {/* ── Analytics Charts ── */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                    
                    {/* Revenue Growth Chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden xl:col-span-2">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[#8B5CF6]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Revenue Growth</p>
                            <p className="text-[10px] text-slate-400">Total platform volume</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => `$${value / 1000}k`} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Platform Demographics */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                            <PieChartIcon className="w-4 h-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">User Demographics</p>
                            <p className="text-[10px] text-slate-400">Account distribution</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 h-64 flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={PLATFORM_USAGE} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} width={60} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {PLATFORM_USAGE.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Fraud alerts + Recent logs */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Fraud Detection */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"><Zap className="w-4 h-4 text-red-500" /></div>
                        <div><p className="text-xs font-bold text-slate-900">Fraud Detection</p><p className="text-[10px] text-slate-400">Real-time risk monitoring</p></div>
                        <span className="ml-auto text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{fraudAlerts.filter(f => !f.resolved).length} Active</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {fraudAlerts.map(f => (
                          <motion.div key={f.id} layout
                            className={`p-3.5 rounded-xl border transition-all ${f.resolved ? "bg-slate-50 border-slate-100 opacity-60" : f.riskScore >= 90 ? "bg-red-50 border-red-100" : f.riskScore >= 70 ? "bg-amber-50 border-amber-100" : "bg-yellow-50 border-yellow-100"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${f.resolved ? "bg-green-100" : f.riskScore >= 90 ? "bg-red-100" : "bg-amber-100"}`}>
                                  {f.resolved ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <AlertTriangle className={`w-3.5 h-3.5 ${f.riskScore >= 90 ? "text-red-500" : "text-amber-500"}`} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-bold text-slate-800">{f.title}</p>
                                  <p className="text-[10px] text-slate-500 truncate">{f.entity}</p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">{f.detected}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <div className={`text-[10px] font-black px-2 py-0.5 rounded-full ${f.resolved ? "bg-green-100 text-green-600" : f.riskScore >= 90 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                  {f.resolved ? "Resolved" : `Risk ${f.riskScore}`}
                                </div>
                                {!f.resolved && canWrite && (
                                  <button onClick={() => handleResolveFraud(f.id)} className="text-[9px] font-bold text-[#8B5CF6] hover:underline">Resolve</button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Recent Audit Logs */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center"><Activity className="w-4 h-4 text-slate-500" /></div>
                          <div><p className="text-xs font-bold text-slate-900">Recent Activity</p><p className="text-[10px] text-slate-400">Last 5 events</p></div>
                        </div>
                        <button onClick={() => setSection("compliance")} className="text-[10px] font-semibold text-[#8B5CF6] hover:underline">View all</button>
                      </div>
                      <div className="p-4 space-y-0">
                        {logs.slice(0, 5).map((log, i) => (
                          <div key={log.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${log.result === "success" ? "bg-green-100" : log.result === "failed" ? "bg-red-100" : "bg-amber-100"}`}>
                                {log.result === "success" ? <CheckCircle className="w-3 h-3 text-green-600" /> : log.result === "failed" ? <XCircle className="w-3 h-3 text-red-500" /> : <AlertCircle className="w-3 h-3 text-amber-500" />}
                              </div>
                              {i < 4 && <div className="w-px flex-1 bg-slate-100 my-1" style={{ minHeight: 14 }} />}
                            </div>
                            <div className="pb-3 flex-1">
                              <p className="text-[11px] font-semibold text-slate-700">{log.action}</p>
                              <p className="text-[10px] text-slate-400">{log.user} · {log.timestamp}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════ USERS ══════════════ */}
              {section === "users" && (
                <div className="space-y-4">
                  <SectionHeader icon={Users} title="User Management" subtitle={`${users.length} total users`}
                    action={
                      <div className="flex items-center gap-2">
                        {adminRole === "Viewer" && <div className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded-lg"><Lock className="w-3 h-3" /> Read-only</div>}
                      </div>
                    }
                  />

                  {/* Bulk bar */}
                  <AnimatePresence>
                    {selectedUsers.size > 0 && canWrite && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="flex items-center gap-3 p-3 bg-[#8B5CF6]/5 border border-purple-200 rounded-2xl">
                        <span className="text-xs font-bold text-[#8B5CF6]">{selectedUsers.size} selected</span>
                        <div className="flex gap-2 ml-auto">
                          <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleBulkAction("activate")}
                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-green-500 hover:bg-green-600 rounded-xl flex items-center gap-1.5 transition-colors">
                            <UserCheck className="w-3.5 h-3.5" /> Activate All
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleBulkAction("suspend")}
                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl flex items-center gap-1.5 transition-colors">
                            <UserX className="w-3.5 h-3.5" /> Suspend All
                          </motion.button>
                          <button onClick={() => setSelectedUsers(new Set())} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-xl"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            {canWrite && <th className="py-3 px-4 w-10"><button onClick={() => selectedUsers.size === users.length ? setSelectedUsers(new Set()) : setSelectedUsers(new Set(users.map(u => u.id)))} className="text-slate-400 hover:text-slate-600">{selectedUsers.size === users.length ? <CheckSquare className="w-3.5 h-3.5 text-[#8B5CF6]" /> : <Square className="w-3.5 h-3.5" />}</button></th>}
                            {["User", "Company", "Role", "Status", "Last Active", "Actions"].map(h => <th key={h} className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={canWrite ? 6 : 5}>
                                <TableSkeleton cols={canWrite ? 6 : 5} />
                              </td>
                            </tr>
                          ) : (
                            <AnimatePresence>
                              {users.map((u, i) => (
                              <motion.tr key={u.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                                className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                                {canWrite && <td className="py-3 px-4"><button onClick={() => toggleSelectUser(u.id)}>{selectedUsers.has(u.id) ? <CheckSquare className="w-3.5 h-3.5 text-[#8B5CF6]" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}</button></td>}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0 ${userStatuses[u.id] === "Suspended" ? "bg-slate-400" : "bg-gradient-to-br from-[#8B5CF6] to-cyan-400"}`}>{u.name.charAt(0)}</div>
                                    <div>
                                      <p className="font-bold text-slate-800">{u.name}</p>
                                      <p className="text-[10px] text-slate-400">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-600">{u.company}</td>
                                <td className="py-3 px-4">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${u.role === "Admin" ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                                </td>
                                <td className="py-3 px-4"><Badge label={userStatuses[u.id]} style={userStatusStyle[userStatuses[u.id]]} /></td>
                                <td className="py-3 px-4 text-slate-400 text-[10px]">{u.lastActive}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => setViewUser(u)} className="p-1.5 text-slate-400 hover:text-[#8B5CF6] hover:bg-purple-50 rounded-lg transition-colors" title="View Profile"><Eye className="w-3.5 h-3.5" /></button>
                                    {canWrite && (
                                      <>
                                        <button onClick={() => handleToggleUser(u.id)}
                                          className={`p-1.5 rounded-lg transition-colors ${userStatuses[u.id] === "Active" ? "text-slate-400 hover:text-red-500 hover:bg-red-50" : "text-slate-400 hover:text-green-600 hover:bg-green-50"}`}
                                          title={userStatuses[u.id] === "Active" ? "Suspend" : "Activate"}>
                                          {userStatuses[u.id] === "Active" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                            </AnimatePresence>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════ COMPANIES ══════════════ */}
              {section === "companies" && (
                <div className="space-y-4">
                  <SectionHeader icon={Building2} title="Company Verification" subtitle="KYC & onboarding management" />
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {companies.map((c, i) => {
                      const st = companyStatuses[c.id];
                      return (
                        <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} layout
                          whileHover={{ y: -2, boxShadow: "0 8px 24px -8px rgba(0,0,0,0.08)" }}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          <div className="p-4 border-b border-slate-50">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">{c.name.charAt(0)}</div>
                                <div>
                                  <p className="text-xs font-bold text-slate-900">{c.name}</p>
                                  <p className="text-[10px] text-slate-400">{c.industry}</p>
                                </div>
                              </div>
                              <Badge label={st} style={companyStatusStyle[st]} />
                            </div>
                            <div className="flex items-center gap-4 mt-3">
                              <div>
                                <p className="text-[9px] text-slate-400 mb-1">KYC Score</p>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div className={`h-full rounded-full ${c.kyc >= 80 ? "bg-green-400" : c.kyc >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                                      initial={{ width: 0 }} animate={{ width: `${c.kyc}%` }} transition={{ delay: i * 0.07 + 0.3 }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-700">{c.kyc}</span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400">Revenue</p>
                                <p className="text-[10px] font-bold text-slate-700">{c.revenue}</p>
                              </div>
                              <div>
                                <p className="text-[9px] text-slate-400">Docs</p>
                                <p className="text-[10px] font-bold text-slate-700">{c.docs} files</p>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 bg-slate-50/60">
                            <p className="text-[9px] text-slate-400 mb-2.5">By {c.submittedBy} · {c.date}</p>
                            {st === "Pending" && canWrite ? (
                              <div className="flex gap-2">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => handleApprove(c.id)}
                                  className="flex-1 py-2 text-[11px] font-bold text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors flex items-center justify-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Approve
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => setRejectModal({ open: true, id: c.id, name: c.name })}
                                  className="flex-1 py-2 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors flex items-center justify-center gap-1">
                                  <XCircle className="w-3 h-3" /> Reject
                                </motion.button>
                              </div>
                            ) : (
                              <div className={`py-2 text-center text-[11px] font-bold rounded-xl ${st === "Verified" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {st === "Verified" ? "✓ Verified" : "✗ Rejected"}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ══════════════ DEALS ══════════════ */}
              {section === "deals" && (
                <div className="space-y-4">
                  <SectionHeader icon={Handshake} title="Deal Oversight" subtitle={`${deals.length} total deals · ${deals.filter(d => d.flagged).length} flagged`} />
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            {["Deal", "Parties", "Amount", "Status", "Risk", ""].map(h => <th key={h} className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr>
                              <td colSpan={6}>
                                <TableSkeleton cols={6} />
                              </td>
                            </tr>
                          ) : (
                            deals.map((d, i) => (
                            <motion.tr key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                              onClick={() => setViewDeal(d)}
                              className={`border-b border-slate-50 cursor-pointer transition-colors group ${d.flagged ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-purple-50/30"}`}>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5">
                                  {d.flagged && <Flag className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                                  <div>
                                    <p className="font-bold text-slate-800">{d.name}</p>
                                    <p className="text-[10px] text-slate-400">DEAL-{String(d.id).padStart(4, "0")} · {d.date}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="text-slate-600 text-[10px]">{d.client}</p>
                                <p className="text-slate-400 text-[9px]">↔ {d.provider}</p>
                              </td>
                              <td className="py-3.5 px-4 font-black text-slate-800">${d.amount.toLocaleString()}</td>
                              <td className="py-3.5 px-4">
                                <Badge label={d.status} style={
                                  d.status === "Completed" ? "bg-green-100 text-green-700 border-green-200" :
                                  d.status === "Flagged" ? "bg-red-100 text-red-700 border-red-200" :
                                  d.status === "Under Review" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                  d.status === "Pending" ? "bg-slate-100 text-slate-600 border-slate-200" :
                                  "bg-blue-100 text-blue-700 border-blue-200"
                                } />
                              </td>
                              <td className="py-3.5 px-4"><Badge label={d.risk} style={riskStyle[d.risk]} /></td>
                              <td className="py-3.5 px-4">
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#8B5CF6] transition-colors" />
                              </td>
                            </motion.tr>
                          )))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════ COMPLIANCE ══════════════ */}
              {section === "compliance" && (
                <div className="space-y-5">
                  <SectionHeader icon={Shield} title="Compliance Dashboard" subtitle="KYC · AML · Risk monitoring" />

                  {/* KYC/AML cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: "KYC Verified", value: Object.values(companyStatuses).filter(s => s === "Verified").length, total: companies.length, color: "#22C55E", bg: "bg-green-50", border: "border-green-200", icon: ShieldCheck },
                      { label: "AML Checks Passed", value: 4, total: 5, color: "#8B5CF6", bg: "bg-purple-50", border: "border-purple-200", icon: CheckCircle },
                      { label: "High Risk Entities", value: fraudAlerts.filter(f => !f.resolved).length, total: fraudAlerts.length, color: "#EF4444", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle },
                    ].map(c => (
                      <div key={c.label} className={`bg-white rounded-2xl border ${c.border} shadow-sm p-5`}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}><c.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: c.color }} /></div>
                          <p className="text-xs font-bold text-slate-700">{c.label}</p>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{c.value}<span className="text-sm font-medium text-slate-400">/{c.total}</span></p>
                        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: c.color }}
                            initial={{ width: 0 }} animate={{ width: `${(c.value / c.total) * 100}%` }} transition={{ duration: 0.8 }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Audit Logs */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center"><FileText className="w-4 h-4 text-slate-500" /></div>
                        <div><p className="text-xs font-bold text-slate-900">Audit Logs</p><p className="text-[10px] text-slate-400">{filteredLogs.length} events</p></div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                        {(["all", "user", "company", "deal", "security"] as LogType[]).map(f => (
                          <button key={f} onClick={() => setAuditFilter(f)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold capitalize transition-all ${auditFilter === f ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-slate-50 border-b border-slate-100">
                          {["Action", "User", "IP Address", "Time", "Result"].map(h => <th key={h} className="text-left py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          <AnimatePresence mode="popLayout">
                            {filteredLogs.map((log, i) => (
                              <motion.tr key={log.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}
                                className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4 font-semibold text-slate-800">{log.action}</td>
                                <td className="py-3 px-4 text-slate-600">{log.user}</td>
                                <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">{log.ip}</td>
                                <td className="py-3 px-4 text-slate-400 text-[10px]">{log.timestamp}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${log.result === "success" ? "bg-green-50 text-green-700 border-green-200" : log.result === "failed" ? "bg-red-50 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                                    {log.result === "success" ? <CheckCircle className="w-3 h-3" /> : log.result === "failed" ? <XCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                    {log.result.charAt(0).toUpperCase() + log.result.slice(1)}
                                  </span>
                                </td>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════ REPORTS ══════════════ */}
              {section === "reports" && (
                <div className="space-y-5">
                  <SectionHeader icon={BarChart2} title="Reports & Analytics" subtitle="Platform performance overview"
                    action={
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => toast.success("Report exported!", { description: "admin_report_apr2026.csv downloaded." })}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-xl transition-colors shadow-sm">
                        <Download className="w-3.5 h-3.5" /> Export Report
                      </motion.button>
                    }
                  />
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <h3 className="text-xs font-bold text-slate-900 mb-4">User Growth (Oct – Apr)</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={GROWTH_DATA}>
                          <defs key="admin-area-defs">
                            <linearGradient id="adminGradUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop key="s0" offset="5%" stopColor="#8B5CF6" stopOpacity={0.18} />
                              <stop key="s1" offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid key="ag-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis key="ag-xa" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                          <YAxis key="ag-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip key="ag-tt" content={<ChartTooltip />} />
                          <Area key="ag-users" type="monotone" dataKey="users" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#adminGradUsers)" name="Users" dot={false} activeDot={{ r: 5 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <h3 className="text-xs font-bold text-slate-900 mb-4">Monthly Revenue ($M)</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={GROWTH_DATA}>
                          <CartesianGrid key="abr-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis key="abr-xa" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                          <YAxis key="abr-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip key="abr-tt" content={<ChartTooltip />} />
                          <Bar key="abr-rev" dataKey="revenue" fill="#8B5CF6" name="Revenue" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Total Users (Apr)", value: "1,247", change: "+47", up: true },
                      { label: "Revenue (Apr)", value: "$2.4M", change: "+$300K", up: true },
                      { label: "Deals Closed", value: "18", change: "+5", up: true },
                      { label: "Fraud Cases", value: "3", change: "-2", up: false },
                    ].map(s => (
                      <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <p className="text-[10px] text-slate-400 mb-2">{s.label}</p>
                        <p className="text-xl font-black text-slate-900">{s.value}</p>
                        <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${s.up ? "text-green-600" : "text-red-500"}`}>
                          {s.up ? <TrendingUp className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {s.change} vs last month
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════════ INVESTORS ══════════════ */}
              {section === "investors" && (
                <div className="space-y-5">
                  <SectionHeader icon={TrendingUp} title="Investor Dashboard" subtitle="Platform performance · GMV · Growth metrics"
                    action={
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => toast.success("Investor report exported!", { description: "investor_report_apr2026.pdf downloaded." })}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#0c8080] rounded-xl transition-colors shadow-sm">
                        <Download className="w-3.5 h-3.5" /> Export Report
                      </motion.button>
                    }
                  />

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                    {[
                      { label: "Total GMV", value: "$188.4M", sub: "+8% vs last quarter", icon: DollarSign, gradient: true, color: "", bg: "" },
                      { label: "Annual Revenue", value: "$18.8M", sub: "10% blended take rate", icon: TrendingUp, gradient: false, color: "#8B5CF6", bg: "bg-purple-50" },
                      { label: "Active Users", value: "1,247", sub: "+71 new this month", icon: Users, gradient: false, color: "#3B82F6", bg: "bg-blue-50" },
                      { label: "Deals Closed", value: "635", sub: "Q1 '26 total", icon: Handshake, gradient: false, color: "#22C55E", bg: "bg-green-50" },
                    ].map((m, i) => (
                      <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                        whileHover={{ y: -3, boxShadow: "0 10px 28px -8px rgba(0,0,0,0.12)" }}
                        className={`rounded-2xl border shadow-sm p-4 ${m.gradient ? "bg-gradient-to-br from-[#8B5CF6] to-[#0c8080] border-cyan-600" : "bg-white border-slate-100"}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${m.gradient ? "bg-white/20" : m.bg}`}>
                          <m.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: m.gradient ? "#fff" : m.color }} />
                        </div>
                        <p className={`text-xl font-black ${m.gradient ? "text-white" : "text-slate-900"}`}>{m.value}</p>
                        <p className={`text-[10px] font-semibold mt-0.5 ${m.gradient ? "text-white/80" : "text-slate-500"}`}>{m.label}</p>
                        <p className={`text-[9px] mt-1 ${m.gradient ? "text-white/60" : "text-slate-400"}`}>{m.sub}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* GMV + Revenue/Users Charts */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">GMV Growth</h3>
                          <p className="text-[10px] text-slate-400">Last 6 months · $M</p>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                          <ArrowUpRight className="w-3 h-3" /> +8% MoM
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={INV_MONTHLY_DATA}>
                          <defs>
                            <linearGradient id="invGmvGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={32} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                          <Area type="monotone" dataKey="gmv" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#invGmvGrad)" name="GMV ($M)" dot={false} activeDot={{ r: 5 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900">Revenue & Users</h3>
                          <p className="text-[10px] text-slate-400">Dual-axis monthly trend</p>
                        </div>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                          <Activity className="w-3 h-3" /> Live
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={INV_MONTHLY_DATA}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis dataKey="period" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={32} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #E2E8F0" }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2.5} name="Revenue ($M)" dot={false} activeDot={{ r: 5 }} />
                          <Line yAxisId="right" type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2.5} name="Users" dot={false} activeDot={{ r: 5 }} strokeDasharray="5 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Deal Categories + Key Metrics */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    {/* Deal Breakdown */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center">
                          <PieChartIcon className="w-4 h-4 text-[#8B5CF6]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Deal Breakdown by Sector</p>
                          <p className="text-[10px] text-slate-400">GMV by industry vertical</p>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        {INV_DEAL_CATEGORIES.map((c, i) => {
                          const total = INV_DEAL_CATEGORIES.reduce((s, x) => s + x.value, 0);
                          const pct = ((c.value / total) * 100).toFixed(1);
                          return (
                            <motion.div key={c.category} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                                  <span className="text-[11px] font-semibold text-slate-700">{c.category}</span>
                                  <span className="text-[10px] text-slate-400">{c.count} deals</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-800">${c.value}M</span>
                                  <span className="text-[10px] text-slate-400">{pct}%</span>
                                </div>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <motion.div className="h-full rounded-full" style={{ backgroundColor: c.color }}
                                  initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.07 + 0.2, duration: 0.6 }} />
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Trend Metrics */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center">
                          <Target className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">Key Business Metrics</p>
                          <p className="text-[10px] text-slate-400">QoQ performance indicators</p>
                        </div>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {INV_TREND_METRICS.map((m, i) => (
                          <motion.div key={m.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 mb-1">{m.label}</p>
                            <p className="text-sm font-black text-slate-900">{m.current}</p>
                            <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${m.up ? "text-green-600" : "text-red-500"}`}>
                              {m.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {m.change}
                              <span className="text-slate-400 font-normal ml-0.5">vs prev</span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Platform Health Banner */}
                  <div className="bg-gradient-to-r from-[#8B5CF6]/8 to-purple-50 border border-purple-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#8B5CF6] flex items-center justify-center shadow-sm">
                          <Globe className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">Platform Health Score</p>
                          <p className="text-[10px] text-slate-500">As of April 2026 · All systems operational</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 flex-wrap">
                        {[
                          { label: "Uptime", value: "99.97%", color: "text-green-600" },
                          { label: "API Latency", value: "42ms", color: "text-[#8B5CF6]" },
                          { label: "Error Rate", value: "0.03%", color: "text-green-600" },
                        ].map(s => (
                          <div key={s.label} className="text-center">
                            <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
                            <p className="text-[9px] text-slate-400">{s.label}</p>
                          </div>
                        ))}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 rounded-xl">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-white">All Systems Go</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══════════════ SETTINGS ══════════════ */}
              {section === "settings" && (
                <div className="space-y-5">
                  <SectionHeader icon={Settings} title="Platform Settings" subtitle="Configuration & access control" />
                  {!isAdmin && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 font-semibold">Settings are only accessible to Admin role. Switch to Admin to make changes.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "Two-Factor Auth", desc: "Require 2FA for all admin logins", icon: Shield },
                      { title: "Email Notifications", desc: "Send alerts for critical events", icon: Bell },
                      { title: "Auto-Suspend on 5 Failed Logins", desc: "Security lockout policy", icon: Lock },
                      { title: "Real-time Fraud Alerts", desc: "ML-based fraud detection", icon: Zap },
                      { title: "Audit Logging", desc: "Log all admin actions", icon: FileText },
                      { title: "Auto KYC Screening", desc: "Automated company screening", icon: ShieldCheck },
                    ].map((s) => {
                      const on = settingsState[s.title] ?? false;
                      return (
                        <div key={s.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                              <s.icon className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{s.title}</p>
                              <p className="text-[10px] text-slate-400">{s.desc}</p>
                            </div>
                          </div>
                          <button disabled={!isAdmin}
                            onClick={() => {
                              setSettingsState(prev => ({ ...prev, [s.title]: !prev[s.title] }));
                              toast[on ? "warning" : "success"](`${s.title} ${on ? "disabled" : "enabled"}`);
                            }}
                            className={`rounded-full transition-all relative ${on ? "bg-[#8B5CF6]" : "bg-slate-200"} ${!isAdmin ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            style={{ height: 22, width: 40, flexShrink: 0 }}>
                            <motion.div animate={{ x: on ? 18 : 2 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" style={{ margin: 1 }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {isAdmin && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
                      <div className="flex items-center gap-2.5 mb-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <p className="text-xs font-bold text-red-800">Danger Zone</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-red-700">Reset Platform Settings</p>
                          <p className="text-[10px] text-red-500">This will reset all configuration to defaults. Cannot be undone.</p>
                        </div>
                        <button onClick={() => toast.error("Reset cancelled — confirmation required")}
                          className="px-4 py-2 text-xs font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
