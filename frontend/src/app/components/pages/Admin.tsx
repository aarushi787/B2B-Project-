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
import { useNavigate } from "react-router";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { AdminApprovals } from "./AdminApprovals";

// ─── Types ────────────────────────────────────────────────────────────────────
type AdminRole = "Admin" | "Moderator" | "Viewer";
type UserStatus = "Active" | "Suspended" | "Pending";
type CompanyStatus = "Pending" | "Verified" | "Rejected";
type DealStatus = "In Progress" | "Pending" | "Under Review" | "Completed" | "Flagged" | "Closed";
type RiskLevel = "Low" | "Medium" | "High" | "Critical";
type Section = "approvals" | "overview" | "users" | "companies" | "deals" | "compliance" | "reports" | "settings" | "investors";
type LogType = "all" | "user" | "company" | "deal" | "security";

interface AdminUser {
  id: number | string; name: string; email: string; role: string;
  status: UserStatus; lastActive: string; company: string; joined: string; deals: number;
}
interface Company {
  id: number | string; name: string; industry: string; status: CompanyStatus;
  date: string;
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
  id: string; title: string; message: string; time: string;
  read: boolean; type: "alert" | "info" | "success" | "warning";
}
interface FraudAlert {
  id: string; title: string; entity: string; riskScore: number;
  detected: string; type: "user" | "deal" | "transaction"; resolved: boolean;
}

const INIT_USERS: AdminUser[] = [];

const INIT_COMPANIES: Company[] = [];

const INIT_DEALS: Deal[] = [];
const COLORS = ['#2563EB', '#3B82F6', '#10B981', '#F59E0B'];

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
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-[#2563EB]" style={{ width: 18, height: 18 }} />
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
        <div className="h-20 bg-gradient-to-r from-[#2563EB] to-blue-400" />
        <div className="px-6 pb-6 -mt-10">
          <div className="flex items-end justify-between mb-4">
            <div className="w-16 h-16 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-xl font-black text-[#2563EB]">
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
            <div className="w-8 h-8 rounded-lg bg-[#2563EB]/10 flex items-center justify-center">
              <Handshake className="w-4 h-4 text-[#2563EB]" />
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
  notifs: Notification[]; onMarkRead: (id: string) => void; onClearAll: () => void; onClose: () => void;
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
          {notifs.length === 0 && <p className="p-4 text-xs text-slate-400">No notifications.</p>}
          {notifs.map(n => {
            const Icon = typeIcon[n.type];
            return (
              <div key={n.id} onClick={() => onMarkRead(n.id)}
                className={`flex gap-3 p-3.5 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? "bg-blue-50/30" : ""}`}>
                <div className={`w-7 h-7 rounded-full ${typeBg[n.type]} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-3.5 h-3.5 ${typeColor[n.type]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[11px] font-bold ${n.read ? "text-slate-600" : "text-slate-900"}`}>{n.title}</p>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0 mt-0.5" />}
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
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [adminRole, setAdminRole] = useState<AdminRole>("Admin");
  const [roleOpen, setRoleOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [search, setSearch] = useState("");
  const [liveRefresh, setLiveRefresh] = useState(true);
  const [liveTime, setLiveTime] = useState(new Date().toLocaleTimeString());
  const [notifications, setNotifications] = useState<Notification[]>([]);
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

  const fetchDataRef = useRef<() => Promise<void>>(async () => {});
  const [amlTotal, setAmlTotal] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, compsRes, dealsRes, activityRes, amlRes, notifRes] = await Promise.all([
          apiClient.get<any[]>('/admin/users'),
          apiClient.get<any[]>('/admin/companies'),
          apiClient.get<any>('/deals'),
          apiClient.get<any[]>('/admin/activity').catch(() => [] as any[]),
          apiClient.get<any[]>('/compliance/aml-checks').catch(() => [] as any[]),
          apiClient.get<any[]>('/notifications').catch(() => [] as any[]),
        ]);
        setLoadError(null);
        const compNames: Record<string, string> = {};
        (Array.isArray(compsRes) ? compsRes : []).forEach((c: any) => { compNames[c.id] = c.name || c.legalName || 'Unnamed company'; });

        if (Array.isArray(usersRes)) {
          const mappedUsers = usersRes.map((u: any) => ({
            id: u.id,
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || 'Unknown User',
            email: u.email,
            role: u.role || 'User',
            status: "Active" as UserStatus,
            lastActive: "—",
            company: (u.companyId && compNames[u.companyId]) || "—",
            joined: new Date(u.createdAt).toLocaleDateString(),
            deals: 0
          }));
          setUsers(mappedUsers);
          setUserStatuses(Object.fromEntries(mappedUsers.map((u: any) => [u.id, u.status])));
        }

        if (Array.isArray(compsRes)) {
          const mappedComps = compsRes.map((c: any) => ({
            id: c.id,
            name: c.name || c.legalName || 'Unnamed company',
            industry: c.industry || c.type || "General",
            status: (String(c.kycStatus || '').toLowerCase() === 'rejected' ? 'Rejected' : (c.verified || String(c.kycStatus || '').toLowerCase() === 'verified') ? 'Verified' : 'Pending') as CompanyStatus,
            date: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—",
          }));
          setCompanies(mappedComps);
          setCompanyStatuses(Object.fromEntries(mappedComps.map((c: any) => [c.id, c.status])));
        }

        if (dealsRes && Array.isArray(dealsRes.data)) {
          const dealStatusOf = (st: string): DealStatus =>
            st === 'COMPLETED' ? 'Completed' : st === 'CONFIRMED' ? 'In Progress' : st === 'VOIDED' ? 'Closed' : 'Pending';
          setDeals(dealsRes.data.map((d: any) => ({
            id: d.id,
            name: d.title || d.notes || `Deal ${String(d.id).substring(0, 8)}`,
            client: compNames[d.buyerId] || "Unknown company",
            provider: compNames[d.sellerIds?.[0]] || "Unknown company",
            amount: d.amount || 0,
            status: dealStatusOf(String(d.status)),
            risk: "Low" as RiskLevel,
            date: new Date(d.createdAt).toLocaleDateString(),
            flagged: false
          })));
        }

        if (Array.isArray(activityRes)) {
          setLogs(activityRes.map((a: any) => ({
            id: a.id,
            action: String(a.action || '').replace(/_/g, ' ').toLowerCase().replace(/^./, (c: string) => c.toUpperCase()),
            user: a.actorEmail || "System",
            timestamp: new Date(a.createdAt).toLocaleString(),
            ip: "—",
            result: "success" as const,
            type: (/USER|LOGIN|REGISTER/i.test(a.action) ? "user" : /COMPANY|KYC/i.test(a.action) ? "company" : /DEAL|PROPOSAL|REQUIREMENT/i.test(a.action) ? "deal" : "security") as LogType,
          })));
        }

        if (Array.isArray(amlRes)) {
          setFraudAlerts(amlRes
            .filter((a: any) => ['HIGH', 'CRITICAL'].includes(String(a.riskLevel || '').toUpperCase()))
            .map((a: any) => ({
              id: a.id,
              title: `${String(a.riskLevel).toUpperCase()} risk AML check`,
              entity: a.reason || (a.dealId ? `Deal ${String(a.dealId).substring(0, 8)}` : 'Transaction'),
              riskScore: Math.round(Number(a.riskScore) || 0),
              detected: new Date(a.createdAt).toLocaleString(),
              type: "transaction" as const,
              resolved: false,
            })));
          setAmlTotal(amlRes.length);
        }

        if (Array.isArray(notifRes)) {
          setNotifications(notifRes.map((n: any) => ({
            id: String(n.id),
            title: n.title,
            message: n.message,
            time: new Date(n.createdAt).toLocaleString(),
            read: !!n.isRead,
            type: (['alert', 'info', 'success', 'warning'].includes(n.type) ? n.type : n.type === 'error' ? 'alert' : 'info') as Notification["type"],
          })));
        }
      } catch (e: any) {
        console.error("Failed to load admin data", e);
        setLoadError("Could not load admin data. Check your connection and permissions, then retry.");
      } finally {
        setDataLoading(false);
      }
    };
    fetchDataRef.current = fetchData;
    fetchData();

    socketService.connect();
    const unsubs = ['deals:updated', 'company:updated', 'admin:activity', 'notifications:new', 'proposals:new'].map(ev => socketService.on(ev, () => fetchData()));
    return () => { unsubs.forEach(u => u()); };
  }, []);
  const [viewDeal, setViewDeal] = useState<Deal | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [auditFilter, setAuditFilter] = useState<LogType>("all");
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const loading = dataLoading;
  const roleRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Suspend/flag/approve actions in these tabs are not backed by an API (real reviews happen in "Approvals & Activity"), so they stay disabled.
  const canWrite = false;
  const isAdmin = adminRole === "Admin";
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!liveRefresh) return;
    const t = setInterval(() => setLiveTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(t);
  }, [liveRefresh]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) setRoleOpen(false);
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addLog = (_action: string, _type: LogType) => { void fetchDataRef.current(); };

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

  const filteredLogs = auditFilter === "all" ? logs : logs.filter(l => l.type === auditFilter);

  const formatMoney = (n: number) => (n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${Math.round(n).toLocaleString()}`);
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = (k: string) => new Date(`${k}-01`).toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  const volumeByMonth = (() => {
    const m: Record<string, { volume: number; deals: number }> = {};
    deals.forEach(d => { const k = monthKey(new Date(d.date)); if (k.includes("NaN")) return; (m[k] ??= { volume: 0, deals: 0 }); m[k].volume += d.amount; m[k].deals += 1; });
    return Object.keys(m).sort().map(k => ({ name: monthLabel(k), ...m[k] }));
  })();
  const usersByMonth = (() => {
    const m: Record<string, number> = {};
    users.forEach(u => { const k = monthKey(new Date(u.joined)); if (!k.includes("NaN")) m[k] = (m[k] ?? 0) + 1; });
    return Object.keys(m).sort().map(k => ({ month: monthLabel(k), users: m[k] }));
  })();
  const platformUsage = Object.entries(users.reduce((a: Record<string, number>, u) => { a[u.role] = (a[u.role] ?? 0) + 1; return a; }, {})).map(([name, value]) => ({ name, value }));

  const SIDEBAR_ITEMS: { icon: React.ElementType; label: string; key: Section; badge?: number }[] = [
    { icon: LayoutDashboard, label: "Overview", key: "overview" },
    { icon: FileText, label: "Approvals & Activity", key: "approvals" },
    { icon: Users, label: "Users", key: "users", badge: users.filter(u => userStatuses[u.id] === "Pending").length || undefined },
    { icon: Building2, label: "Companies", key: "companies", badge: Object.values(companyStatuses).filter(s => s === "Pending").length || undefined },
    { icon: Handshake, label: "Deals", key: "deals", badge: deals.filter(d => d.flagged).length || undefined },
    { icon: TrendingUp, label: "Investors", key: "investors" },
    { icon: Shield, label: "Compliance", key: "compliance" },
    { icon: BarChart2, label: "Reports", key: "reports" },
    { icon: Settings, label: "Settings", key: "settings" },
  ];

  return (
    <div className="flex h-full min-h-screen bg-[#F8FAFC] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Toaster position="top-right" richColors />

      {/* Modals */}
      <AnimatePresence>
        {rejectModal.open && <RejectModal companyName={rejectModal.name} onConfirm={handleRejectConfirm} onClose={() => setRejectModal({ open: false, id: 0, name: "" })} />}
        {viewUser && <UserModal user={viewUser} status={userStatuses[viewUser.id]} onToggle={() => handleToggleUser(viewUser.id)} onClose={() => setViewUser(null)} />}
        {viewDeal && <DealPanel deal={viewDeal} onClose={() => setViewDeal(null)} onFlag={() => handleFlagDeal(viewDeal.id)} canFlag={canWrite} />}
        {showNotifs && <NotifPanel notifs={notifications} onMarkRead={id => { setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)); void apiClient.put(`/notifications/${id}/read`, {}).catch(() => {}); }} onClearAll={() => { setNotifications(p => p.map(n => ({ ...n, read: true }))); void apiClient.put('/notifications/read-all', {}).catch(() => {}); }} onClose={() => setShowNotifs(false)} />}
      </AnimatePresence>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Admin Top Navigation ────────────────────────────────── */}
        <div className="bg-white border-b border-slate-200 shrink-0">
          {/* Top Header */}
          <div className="px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563EB] to-blue-400 flex items-center justify-center shadow-sm">
                <Shield className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight">Admin Control Center</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="relative" ref={roleRef}>
                    <button onClick={() => setRoleOpen(o => !o)} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-[#2563EB] transition-colors">
                      {adminRole === "Admin" ? <ShieldCheck className="w-3 h-3 text-[#2563EB]" /> : adminRole === "Moderator" ? <ShieldAlert className="w-3 h-3 text-blue-500" /> : <Eye className="w-3 h-3 text-slate-400" />}
                      Role: {adminRole}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    <AnimatePresence>
                      {roleOpen && (
                        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                          className="absolute left-0 mt-2 w-40 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50">
                          {(["Admin", "Moderator", "Viewer"] as AdminRole[]).map(r => (
                            <button key={r} onClick={() => { setAdminRole(r); setRoleOpen(false); toast.info(`Switched to ${r} role`); }}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${adminRole === r ? "bg-blue-50 text-[#2563EB] font-bold" : "text-slate-600 hover:bg-slate-50"}`}>
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
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-all" />
              </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Role banner */}
            {adminRole === "Viewer" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500">
                <Lock className="w-3 h-3" /> Read-only mode
              </div>
            )}
            {adminRole === "Moderator" && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-[10px] font-bold text-blue-600">
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
                <div className="w-8 h-8 bg-gradient-to-br from-[#2563EB] to-blue-400 rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-sm">A</div>
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
                      <button onClick={async () => { await logout(); navigate("/auth", { replace: true }); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors">
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
                className={`relative flex items-center gap-2 py-3.5 text-xs font-semibold whitespace-nowrap transition-colors ${section === item.key ? "text-[#2563EB]" : "text-slate-500 hover:text-slate-800"}`}>
                <item.icon className={`w-4 h-4 ${section === item.key ? "text-[#2563EB]" : "text-slate-400"}`} />
                {item.label}
                {item.badge ? (
                  <span className={`ml-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${section === item.key ? "bg-[#2563EB] text-white" : "bg-slate-200 text-slate-600"}`}>{item.badge}</span>
                ) : null}
                {section === item.key && (
                  <motion.div layoutId="adminTabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-t-full" />
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
              {loadError && (
                <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
                  <span>{loadError}</span>
                  <button onClick={() => void fetchDataRef.current()} className="font-bold underline">Retry</button>
                </div>
              )}
              {section === "approvals" && <AdminApprovals />}

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
                      { label: "Total Users", value: users.length.toString(), sub: `${users.filter(u => Date.now() - new Date(u.joined).getTime() < 7 * 86400000).length} joined this week`, icon: Users, color: "#2563EB", bg: "bg-blue-50", sec: "users" as Section },
                      { label: "Companies", value: companies.length.toString(), sub: `${Object.values(companyStatuses).filter(s => s === "Pending").length} pending`, icon: Building2, color: "#2563EB", bg: "bg-blue-50", sec: "companies" as Section },
                      { label: "Active Deals", value: deals.filter(d => d.status === "In Progress" || d.status === "Pending").length.toString(), sub: `${deals.filter(d => d.flagged).length} flagged`, icon: Handshake, color: "#3B82F6", bg: "bg-blue-50", sec: "deals" as Section },
                      { label: "Deal Volume", value: formatMoney(deals.reduce((t, d) => t + d.amount, 0)), sub: `${deals.length} deals total`, icon: DollarSign, color: "#22C55E", bg: "bg-green-50", sec: "reports" as Section },
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
                          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">Deal Volume</p>
                            <p className="text-[10px] text-slate-400">Total deal value by month</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 h-64">
                        {volumeByMonth.length === 0 ? <p className="text-xs text-slate-400 mt-6">No deals yet.</p> : <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={volumeByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(value) => formatMoney(Number(value))} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number) => [formatMoney(value), 'Deal volume']}
                            />
                            <Area type="monotone" dataKey="volume" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                          </AreaChart>
                        </ResponsiveContainer>}
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
                            <p className="text-[10px] text-slate-400">Accounts by role</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 h-64 flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={platformUsage} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} width={60} />
                            <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {platformUsage.map((entry, index) => (
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
                        <div><p className="text-xs font-bold text-slate-900">Fraud Detection</p><p className="text-[10px] text-slate-400">High-risk AML checks</p></div>
                        <span className="ml-auto text-[9px] font-bold text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">{fraudAlerts.filter(f => !f.resolved).length} Active</span>
                      </div>
                      <div className="p-4 space-y-3">
                        {fraudAlerts.length === 0 && <p className="text-xs text-slate-400">No high-risk checks have been recorded.</p>}
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
                        <button onClick={() => setSection("compliance")} className="text-[10px] font-semibold text-[#2563EB] hover:underline">View all</button>
                      </div>
                      <div className="p-4 space-y-0">
                        {logs.length === 0 && <p className="text-xs text-slate-400">No activity recorded yet.</p>}
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
                        className="flex items-center gap-3 p-3 bg-[#2563EB]/5 border border-blue-200 rounded-2xl">
                        <span className="text-xs font-bold text-[#2563EB]">{selectedUsers.size} selected</span>
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
                            {canWrite && <th className="py-3 px-4 w-10"><button onClick={() => selectedUsers.size === users.length ? setSelectedUsers(new Set()) : setSelectedUsers(new Set(users.map(u => u.id)))} className="text-slate-400 hover:text-slate-600">{selectedUsers.size === users.length ? <CheckSquare className="w-3.5 h-3.5 text-[#2563EB]" /> : <Square className="w-3.5 h-3.5" />}</button></th>}
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
                                {canWrite && <td className="py-3 px-4"><button onClick={() => toggleSelectUser(u.id)}>{selectedUsers.has(u.id) ? <CheckSquare className="w-3.5 h-3.5 text-[#2563EB]" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}</button></td>}
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0 ${userStatuses[u.id] === "Suspended" ? "bg-slate-400" : "bg-gradient-to-br from-[#2563EB] to-blue-400"}`}>{u.name.charAt(0)}</div>
                                    <div>
                                      <p className="font-bold text-slate-800">{u.name}</p>
                                      <p className="text-[10px] text-slate-400">{u.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-600">{u.company}</td>
                                <td className="py-3 px-4">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${u.role === "Admin" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{u.role}</span>
                                </td>
                                <td className="py-3 px-4"><Badge label={userStatuses[u.id]} style={userStatusStyle[userStatuses[u.id]]} /></td>
                                <td className="py-3 px-4 text-slate-400 text-[10px]">{u.lastActive}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => setViewUser(u)} className="p-1.5 text-slate-400 hover:text-[#2563EB] hover:bg-blue-50 rounded-lg transition-colors" title="View Profile"><Eye className="w-3.5 h-3.5" /></button>
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
                          </div>
                          <div className="p-3 bg-slate-50/60">
                            <p className="text-[9px] text-slate-400 mb-2.5">Registered {c.date}</p>
                            {st === "Pending" ? (
                              <button onClick={() => setSection("approvals")} className="w-full py-2 text-[11px] font-bold text-[#2563EB] bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">Review in Approvals</button>
                            ) : st === "Verified" && false ? (
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
                              className={`border-b border-slate-50 cursor-pointer transition-colors group ${d.flagged ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-blue-50/30"}`}>
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
                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#2563EB] transition-colors" />
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
                      { label: "AML Checks Passed", value: Math.max(amlTotal - fraudAlerts.length, 0), total: amlTotal, color: "#2563EB", bg: "bg-blue-50", border: "border-blue-200", icon: CheckCircle },
                      { label: "High Risk Checks", value: fraudAlerts.length, total: amlTotal, color: "#EF4444", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle },
                    ].map(c => (
                      <div key={c.label} className={`bg-white rounded-2xl border ${c.border} shadow-sm p-5`}>
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}><c.icon className="w-4.5 h-4.5" style={{ width: 18, height: 18, color: c.color }} /></div>
                          <p className="text-xs font-bold text-slate-700">{c.label}</p>
                        </div>
                        <p className="text-2xl font-black text-slate-900">{c.value}<span className="text-sm font-medium text-slate-400">/{c.total}</span></p>
                        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div className="h-full rounded-full" style={{ backgroundColor: c.color }}
                            initial={{ width: 0 }} animate={{ width: `${c.total ? (c.value / c.total) * 100 : 0}%` }} transition={{ duration: 0.8 }} />
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
                            {filteredLogs.length === 0 && <tr><td colSpan={5} className="py-6 px-4 text-xs text-slate-400">No events recorded.</td></tr>}
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
                  <SectionHeader icon={BarChart2} title="Reports & Analytics" subtitle="Computed from live platform data" />
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <h3 className="text-xs font-bold text-slate-900 mb-4">New Users per Month</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={usersByMonth}>
                          <defs key="admin-area-defs">
                            <linearGradient id="adminGradUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop key="s0" offset="5%" stopColor="#2563EB" stopOpacity={0.18} />
                              <stop key="s1" offset="95%" stopColor="#2563EB" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid key="ag-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis key="ag-xa" dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                          <YAxis key="ag-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip key="ag-tt" content={<ChartTooltip />} />
                          <Area key="ag-users" type="monotone" dataKey="users" stroke="#2563EB" strokeWidth={2.5} fill="url(#adminGradUsers)" name="Users" dot={false} activeDot={{ r: 5 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <h3 className="text-xs font-bold text-slate-900 mb-4">Deal Volume per Month</h3>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={volumeByMonth}>
                          <CartesianGrid key="abr-cg" strokeDasharray="3 3" stroke="#F1F5F9" />
                          <XAxis key="abr-xa" dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                          <YAxis key="abr-ya" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} />
                          <Tooltip key="abr-tt" content={<ChartTooltip />} />
                          <Bar key="abr-rev" dataKey="volume" fill="#2563EB" name="Deal volume" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Total Users", value: String(users.length) },
                      { label: "Total Deal Volume", value: formatMoney(deals.reduce((t, d) => t + d.amount, 0)) },
                      { label: "Deals Completed", value: String(deals.filter(d => d.status === "Completed").length) },
                      { label: "High-Risk AML Checks", value: String(fraudAlerts.length) },
                    ].map(st => (
                      <div key={st.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                        <p className="text-[10px] text-slate-400 mb-2">{st.label}</p>
                        <p className="text-xl font-black text-slate-900">{st.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ══════════════ INVESTORS ══════════════ */}
              {section === "investors" && (
                <div className="space-y-5">
                  <SectionHeader icon={TrendingUp} title="Investor Dashboard" subtitle="Platform performance · GMV · Growth metrics" />
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                    <p className="text-sm font-bold text-slate-800">No data yet</p>
                    <p className="text-xs text-slate-400 mt-1">Investor metrics will appear here once there is real activity to report.</p>
                  </div>
                </div>
              )}

              {section === "settings" && (
                <div className="space-y-5">
                  <SectionHeader icon={Settings} title="Platform Settings" subtitle="Configuration & access control" />
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                    <p className="text-sm font-bold text-slate-800">No configurable settings yet</p>
                    <p className="text-xs text-slate-400 mt-1">Platform-wide settings are managed in the server configuration.</p>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
