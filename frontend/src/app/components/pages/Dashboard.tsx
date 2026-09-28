import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  FileText, Inbox, Search, Eye, TrendingUp, ArrowUpRight, ArrowDownRight,
  Loader2, RefreshCw, Clock,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";

interface Deal { id: string; title: string; status: string; total_amount: number; buyer_id?: string; seller_id?: string; created_at?: string; category?: string; }
interface Notification { id: string; title: string; message: string; type: string; created_at: string; read: boolean; source?: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: "#dcfce7", text: "#16a34a", label: "Active" },
  pending:      { bg: "#fef3c7", text: "#d97706", label: "Under Review" },
  approved:     { bg: "#dcfce7", text: "#16a34a", label: "Active" },
  completed:    { bg: "#f1f5f9", text: "#64748b", label: "Closed" },
  rejected:     { bg: "#fee2e2", text: "#dc2626", label: "Rejected" },
  cancelled:    { bg: "#f1f5f9", text: "#64748b", label: "Closed" },
  shortlisted:  { bg: "#ede9fe", text: "#7c3aed", label: "Shortlisted" },
  under_review: { bg: "#fef3c7", text: "#d97706", label: "Under Review" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] ?? { bg: "#f1f5f9", text: "#64748b", label: status };
  return (
    <span style={{
      background: s.bg,
      color: s.text,
      fontSize: 11,
      fontWeight: 600,
      padding: "3px 10px",
      borderRadius: 20,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return `${Math.floor(diff / 86400000)} days ago`;
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({
  label, value, change, positive, iconBg, iconColor, icon: Icon, data
}: {
  label: string;
  value: string | number;
  change: string;
  positive: boolean;
  iconBg: string;
  iconColor: string;
  icon: any;
  data?: any[];
}) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: "20px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", zIndex: 1 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: 0 }}>{label}</p>
        <div style={{ width: 36, height: 36, background: iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
      </div>
      <div style={{ zIndex: 1 }}>
        <p style={{ fontSize: 28, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: "1.1" }}>{value}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
          {positive
            ? <ArrowUpRight style={{ width: 14, height: 14, color: "#16a34a" }} />
            : <ArrowDownRight style={{ width: 14, height: 14, color: "#dc2626" }} />
          }
          <span style={{ fontSize: 12, fontWeight: 600, color: positive ? "#16a34a" : "#dc2626" }}>{change}</span>
        </div>
      </div>
      {data && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, zIndex: 0, opacity: 0.5 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={positive ? "#16a34a" : "#dc2626"} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={positive ? "#16a34a" : "#dc2626"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="uv" stroke={positive ? "#16a34a" : "#dc2626"} strokeWidth={2} fill={`url(#grad-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function Dashboard() {
  const { user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [dealsRes, notifRes] = await Promise.allSettled([
        apiClient.get<any>("/deals?limit=10"),
        apiClient.get<any>("/notifications?limit=5"),
      ]);
      if (dealsRes.status === "fulfilled") {
        const d = dealsRes.value;
        setDeals(Array.isArray(d) ? d : d.deals || d.data || []);
      }
      if (notifRes.status === "fulfilled") {
        const n = notifRes.value;
        setNotifications(Array.isArray(n) ? n : n.notifications || n.data || []);
      }
    } catch {}
    if (isRefresh) setRefreshing(false); else setLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
    
    // Wire up real-time WebSockets
    socketService.connect();
    
    const unsubDeals = socketService.on('deals:updated', () => {
      fetchData(false);
      toast.success("Deals updated in real-time");
    });
    
    const unsubNotifs = socketService.on('notification', () => {
      fetchData(false);
    });
    
    return () => {
      unsubDeals();
      unsubNotifs();
    };
  }, []);

  const activeDeals = deals.filter(d => ["pending", "approved", "active"].includes(d.status));

  // Fallback static data for design fidelity
  const staticActivity = [
    { icon: Inbox,    title: "New Proposal received for 'Web Application Redesign'", source: "Nexis Digital Logistics", time: "2 hours ago" },
    { icon: FileText, title: "Requirement posted for 'DevOps Infrastructure setup'",   source: "Umbrella Group",        time: "4 hours ago" },
    { icon: Search,   title: "Enquiry sent regarding 'Database audit Services'",       source: "TechVista Solutions",   time: "1 day ago" },
    { icon: Eye,      title: "Identity Verification was successfully approved",        source: "System Compliance",     time: "2 days ago" },
    { icon: TrendingUp, title: "Profile updated with 2 new portfolio entries",         source: "TechVista Administrator", time: "3 days ago" },
  ];

  const displayActivity = notifications.length > 0 
    ? notifications.map(n => ({
        icon: Inbox,
        title: n.title || n.message || "New Notification",
        source: n.type || "System",
        time: n.created_at ? new Date(n.created_at).toLocaleDateString() : "Just now"
      })).slice(0, 5)
    : staticActivity;

  const staticRecentReqs = [
    { title: "E-Commerce Mobile Application Development", category: "App Development",  date: "Jan 15, 2026", proposals: "9 bids",  status: "active" },
    { title: "SOC 2 Type II Auditing and Advisory",       category: "Cybersecurity",    date: "Jan 12, 2026", proposals: "3 bids",  status: "pending" },
    { title: "Kubernetes Migration & CI/CD Pipeline Setup",category: "Cloud & DevOps",  date: "Jan 08, 2026", proposals: "14 bids", status: "active" },
    { title: "Corporate Website UI/UX Design System",      category: "UI/UX Design",    date: "Jan 02, 2026", proposals: "8 bids",  status: "completed" },
  ];

  const deadlines = [
    { title: "Security Audit RFI",          due: "Due Jan 28", tag: "Urgent",  tagBg: "#fee2e2", tagColor: "#dc2626" },
    { title: "Cloud Migration RFP Proposal",due: "Due Feb 02", tag: "Active",  tagBg: "#dcfce7", tagColor: "#16a34a" },
    { title: "Mobile App Wireframes Feedback", due: "Due Feb 10", tag: "Pending", tagBg: "#fef3c7", tagColor: "#d97706" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}
    >
      {/* Refresh button */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            fontSize: 13,
            fontWeight: 500,
            color: "#64748b",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <Loader2 style={{ width: 32, height: 32, color: "#94a3b8" }} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 28 }}>
            <KPICard label="Active Requirements" value={activeDeals.length || 12} change="+8.4%" positive={true}  iconBg="#eff6ff" iconColor="#2563EB" icon={FileText} data={[{uv:4},{uv:7},{uv:6},{uv:9},{uv:12}]} />
            <KPICard label="Received Proposals"  value={deals.length     || 34} change="+14.2%" positive={true}  iconBg="#dcfce7" iconColor="#16a34a" icon={Inbox} data={[{uv:12},{uv:18},{uv:14},{uv:22},{uv:34}]} />
            <KPICard label="Pending Enquiries"   value={8}                       change="-2.1%"  positive={false} iconBg="#fef3c7" iconColor="#d97706" icon={Search} data={[{uv:10},{uv:12},{uv:9},{uv:11},{uv:8}]} />
            <KPICard label="Profile Views"       value="1,247"                   change="+24.8%" positive={true}  iconBg="#ede9fe" iconColor="#7c3aed" icon={Eye} data={[{uv:200},{uv:400},{uv:300},{uv:800},{uv:1247}]} />
          </div>

          {/* Middle row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, marginBottom: 28 }}>
            {/* Recent Activity */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Activity</h2>
                <button onClick={() => toast("Activity logs coming soon!", { icon: "📈" })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#2563EB" }}>See All</button>
              </div>
              <div>
                {displayActivity.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 24px", borderBottom: i < displayActivity.length - 1 ? "1px solid #f8fafc" : "none" }}>
                    <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <a.icon style={{ width: 15, height: 15, color: "#2563EB" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: "#0f172a", margin: 0, lineHeight: "1.4" }}>{a.title}</p>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: "3px 0 0" }}>{a.source} · {a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions + Deadlines */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Quick Actions */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Quick Actions</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Link to="/app/requirements/active"
                    style={{ background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, padding: "10px 12px", borderRadius: 8, textDecoration: "none", textAlign: "center" }}>
                    Post Requirement
                  </Link>
                  <Link to="/app/marketplace"
                    style={{ background: "#f8fafc", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "10px 12px", borderRadius: 8, textDecoration: "none", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    Browse Services
                  </Link>
                  <Link to="/app/opportunities/received"
                    style={{ background: "#f8fafc", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "10px 12px", borderRadius: 8, textDecoration: "none", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    View Proposals
                  </Link>
                  <Link to="/app/settings"
                    style={{ background: "#f8fafc", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "10px 12px", borderRadius: 8, textDecoration: "none", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    Manage Profile
                  </Link>
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Upcoming Deadlines</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {deadlines.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: i < deadlines.length - 1 ? 12 : 0, borderBottom: i < deadlines.length - 1 ? "1px solid #f8fafc" : "none" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{d.title}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                          <Clock style={{ width: 11, height: 11, color: "#94a3b8" }} />
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{d.due}</span>
                        </div>
                      </div>
                      <span style={{ background: d.tagBg, color: d.tagColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                        {d.tag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Requirements Table */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Requirements</h2>
              <Link to="/app/requirements/active" style={{ fontSize: 13, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>
                View All Requirements
              </Link>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {["Requirement", "Category", "Posted Date", "Proposals", "Status"].map(h => (
                <span key={h} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>

            {/* Rows from API or static fallback */}
            {(deals.length > 0 ? deals.slice(0, 4).map(d => ({
              title: d.title || `Deal #${d.id.slice(0, 8)}`,
              category: d.category || "General",
              date: d.created_at ? new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
              proposals: "—",
              status: d.status,
            })) : staticRecentReqs).map((req, i, arr) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                padding: "16px 24px",
                alignItems: "center",
                borderBottom: i < arr.length - 1 ? "1px solid #f8fafc" : "none",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{req.title}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{req.category}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{req.date}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{req.proposals}</span>
                <StatusBadge status={req.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
