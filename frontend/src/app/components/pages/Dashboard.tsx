import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  FileText, Inbox, Search, Eye, TrendingUp, ArrowUpRight, ArrowDownRight,
  Loader2, RefreshCw, Clock,
} from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { ActivityLogsModal } from "../ActivityLogsModal";
import { Deal } from "../../../types";
interface Notification { id: string; title: string; message: string; type: string; created_at: string; read: boolean; source?: string; }

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: "#dcfce7", text: "#16a34a", label: "Active" },
  pending:      { bg: "#fef3c7", text: "#d97706", label: "Pending" },
  under_review: { bg: "#fef3c7", text: "#d97706", label: "Under Review" },
  closed:       { bg: "#f1f5f9", text: "#64748b", label: "Closed" },
  urgent:       { bg: "#fee2e2", text: "#dc2626", label: "Urgent" }
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status?.toLowerCase().replace(" ", "_")] ?? { bg: "#f1f5f9", text: "#64748b", label: status || "Unknown" };
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

function KPICard({
  label, value, change, positive, iconBg, iconColor, icon: Icon
}: {
  label: string;
  value: string | number;
  change: string;
  positive: boolean;
  iconBg: string;
  iconColor: string;
  icon: any;
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
      position: "relative"
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#64748b", margin: 0 }}>{label}</p>
        <div style={{ width: 36, height: 36, background: iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 18, height: 18, color: iconColor }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <p style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: "1.1" }}>{value}</p>
        <span style={{ fontSize: 11, fontWeight: 700, color: positive ? "#16a34a" : "#dc2626", background: positive ? "#dcfce7" : "#fee2e2", padding: "2px 8px", borderRadius: 12 }}>
          {change}
        </span>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => { 
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const dealsRes = await apiClient.get<Deal[] | {data: Deal[]}>('/deals');
      setDeals(Array.isArray(dealsRes) ? dealsRes : (dealsRes.data || []));
    } catch (error) {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const recentDeals = deals.slice(0, 4);
  const staticActivities = recentDeals.length > 0 ? recentDeals.map(d => ({
    icon: d.status === 'active' ? FileText : Inbox,
    title: `${d.status === 'active' ? 'Requirement posted' : 'Proposal updated'} for '${d.title}'`,
    source: `Recent update • ${d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Today'}`,
  })) : [
    { icon: Inbox, title: "New Proposal received for 'Web Application Redesign'", source: "Nexis Digital Logistics • 2 hours ago" },
    { icon: FileText, title: "Requirement posted for 'DevOps Infrastructure setup'", source: "Umbrella Group • 4 hours ago" },
    { icon: Search, title: "Enquiry sent regarding 'Database audit Services'", source: "TechVista Solutions • 1 day ago" },
    { icon: TrendingUp, title: "Profile updated with 2 new portfolio entries", source: "TechVista Administrator • 3 days ago" },
  ];

  const upcomingDeals = deals.filter(d => d.status !== 'closed' && d.status !== 'rejected').slice(0, 3);
  const staticDeadlines = upcomingDeals.length > 0 ? upcomingDeals.map(d => ({
    title: d.title,
    due: "Pending Action",
    status: d.status || "Active"
  })) : [
    { title: "Security Audit RFI", due: "Due Jan 28", status: "Urgent" },
    { title: "Cloud Migration RFP Proposal", due: "Due Feb 02", status: "Active" },
    { title: "Mobile App Wireframes Feedback", due: "Due Feb 10", status: "Pending" },
  ];

  const staticRequirements = [
    { title: "E-Commerce Mobile Application Development", category: "App Development", date: "Jan 15, 2026", bids: "9 bids", status: "Active" },
    { title: "SOC 2 Type II Auditing and Advisory", category: "Cybersecurity", date: "Jan 12, 2026", bids: "3 bids", status: "Under Review" },
    { title: "Kubernetes Migration & CI/CD Pipeline Setup", category: "Cloud & DevOps", date: "Jan 08, 2026", bids: "14 bids", status: "Active" },
    { title: "Corporate Website UI/UX Design System", category: "UI/UX Design", date: "Jan 02, 2026", bids: "8 bids", status: "Closed" },
  ];

  const displayRequirements = deals.length > 0 ? deals.slice(0, 4).map(d => ({
    title: d.title || "Untitled",
    category: d.category || "General",
    date: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "Today",
    bids: "0 bids",
    status: d.status || "Active"
  })) : staticRequirements;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "Inter, sans-serif" }}
    >
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <Loader2 style={{ width: 32, height: 32, color: "#94a3b8" }} className="animate-spin" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 28 }}>
            <KPICard label="Active Requirements" value={deals.length || "12"} change="+8.4%" positive={true}  iconBg="#eff6ff" iconColor="#2563EB" icon={FileText} />
            <KPICard label="Received Proposals"  value="34" change="+14.2%" positive={true}  iconBg="#dcfce7" iconColor="#16a34a" icon={Inbox} />
            <KPICard label="Pending Enquiries"   value="8" change="-2.1%"  positive={false} iconBg="#fef3c7" iconColor="#d97706" icon={Search} />
            <KPICard label="Profile Views"       value="1,247" change="+24.8%" positive={true}  iconBg="#f5f3ff" iconColor="#8b5cf6" icon={Eye} />
          </div>

          {/* Middle row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 28 }}>
            
            {/* Recent Activity */}
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Activity</h2>
                <button onClick={() => setShowActivityModal(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#2563EB" }}>See All</button>
              </div>
              <div>
                {staticActivities.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 24px" }}>
                    <div style={{ width: 32, height: 32, background: "#eff6ff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <a.icon style={{ width: 16, height: 16, color: "#2563EB" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0, lineHeight: "1.4" }}>{a.title}</p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>{a.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions + Deadlines */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* Quick Actions */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Quick Actions</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Link to="/app/requirements/new"
                    style={{ background: "#2563EB", color: "#fff", fontSize: 13, fontWeight: 600, padding: "12px", borderRadius: 8, textDecoration: "none", textAlign: "center" }}>
                    Post Requirement
                  </Link>
                  <Link to="/app/marketplace"
                    style={{ background: "#ffffff", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "12px", borderRadius: 8, textDecoration: "none", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    Browse Services
                  </Link>
                  <Link to="/app/opportunities/received"
                    style={{ background: "#ffffff", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "12px", borderRadius: 8, textDecoration: "none", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    View Proposals
                  </Link>
                  <Link to="/app/companies"
                    style={{ background: "#ffffff", color: "#0f172a", fontSize: 13, fontWeight: 600, padding: "12px", borderRadius: 8, textDecoration: "none", textAlign: "center", border: "1px solid #e2e8f0" }}>
                    Manage Profile
                  </Link>
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Upcoming Deadlines</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {staticDeadlines.map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: i < staticDeadlines.length - 1 ? 16 : 0, borderBottom: i < staticDeadlines.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{d.title}</p>
                        <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0 0" }}>{d.due}</p>
                      </div>
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Recent Requirements Table */}
          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Requirements</h2>
              <Link to="/app/requirements/active" style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", textDecoration: "none" }}>
                View All Requirements
              </Link>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr 1fr 1fr 1fr", padding: "12px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {["Requirement", "Category", "Posted Date", "Proposals", "Status"].map(h => (
                <span key={h} style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {displayRequirements.map((r, i) => (
              <div key={i} style={{
                display: "grid",
                gridTemplateColumns: "3fr 1.5fr 1fr 1fr 1fr",
                padding: "16px 24px",
                alignItems: "center",
                borderBottom: i < displayRequirements.length - 1 ? "1px solid #f8fafc" : "none",
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.title}</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>{r.category}</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>{r.date}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.bids}</span>
                <div><StatusBadge status={r.status} /></div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Activity Logs Modal Overlay */}
      <ActivityLogsModal 
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        activities={staticActivities.map(a => ({...a, time: a.source.split(" • ")[1]}))}
      />
    </motion.div>
  );
}
