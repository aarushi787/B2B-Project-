import { useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { FileText, Inbox, Search, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { requirementsService, proposalsService } from "../../../services/requirementsService";
import { socketService } from "../../../services/socketService";
import { useLoad } from "../../../lib/useLoad";
import { formatDate } from "../../../lib/format";
import { ActivityLogsModal } from "../ActivityLogsModal";
import { OverviewCards } from "../OverviewCards";
import { DealAlerts } from "../DealAlerts";
import type { Deal } from "../../../types";

interface ActivityRow { id: string; title: string; message?: string; createdAt: string; }

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: "#dcfce7", text: "#16a34a", label: "Active" },
  open:         { bg: "#dcfce7", text: "#16a34a", label: "Open" },
  pending:      { bg: "#fef3c7", text: "#d97706", label: "Pending" },
  awarded:      { bg: "#F3E8F8", text: "#6921A5", label: "Awarded" },
  closed:       { bg: "#f1f5f9", text: "#64748b", label: "Closed" },
  cancelled:    { bg: "#f1f5f9", text: "#64748b", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status?.toLowerCase()] ?? { bg: "#f1f5f9", text: "#64748b", label: status || "Unknown" };
  return (
    <span style={{ background: s.bg, color: s.text, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const [showActivityModal, setShowActivityModal] = useState(false);

  const { data, loading, error, reload } = useLoad(async () => {
    const [mine, received, sent, deals, notifs] = await Promise.all([
      requirementsService.list({ scope: "mine", limit: 100 }),
      proposalsService.list({ scope: "received", limit: 1 }),
      proposalsService.list({ scope: "sent", limit: 1 }),
      apiClient.get<{ data: Deal[] } | Deal[]>("/deals"),
      apiClient.get<ActivityRow[]>("/notifications").catch(() => [] as ActivityRow[]),
    ]);
    return {
      requirements: mine.data,
      receivedTotal: received.total,
      sentTotal: sent.total,
      deals: Array.isArray(deals) ? deals : deals.data || [],
      activity: notifs,
    };
  }, [user?.companyId]);

  useEffect(() => {
    socketService.connect();
    const offs = ["proposals:updated", "proposals:new", "notifications:new", "deals:updated"].map(e => socketService.on(e, () => { void reload(); }));
    return () => offs.forEach(o => o());
  }, [reload]);

  const requirements = data?.requirements ?? [];
  const deals = data?.deals ?? [];
  const activity = (data?.activity ?? []).map(n => ({
    icon: Inbox,
    title: n.title,
    source: n.message || "",
    time: formatDate(n.createdAt),
  }));
  const openRequirements = requirements.filter(r => r.status === "open");
  const activeDeals = deals.filter(d => !["COMPLETED", "VOIDED"].includes((d.status || "").toUpperCase()));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ maxWidth: 1200, margin: "0 auto", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {error ? (
        <div role="alert" style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: 20, color: "#b91c1c", fontSize: 13 }}>
          {error} <button onClick={() => void reload()} style={{ color: "#6921A5", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Retry</button>
        </div>
      ) : loading && !data ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
          <Loader2 style={{ width: 32, height: 32, color: "#94a3b8" }} className="animate-spin" />
        </div>
      ) : (
        <>
          <OverviewCards items={[
            { label: "Open Requirements", value: openRequirements.length, icon: FileText, iconBg: "#F3E8F8", iconColor: "#6921A5" },
            { label: "Received Proposals", value: data?.receivedTotal ?? 0, icon: Inbox, iconBg: "#dcfce7", iconColor: "#16a34a" },
            { label: "Sent Proposals", value: data?.sentTotal ?? 0, icon: Search, iconBg: "#fef3c7", iconColor: "#d97706" },
            { label: "Active Deals", value: activeDeals.length, icon: TrendingUp, iconBg: "#F3E8F8", iconColor: "#6921A5" },
          ]} />

          <div style={{ marginBottom: 28 }}><DealAlerts /></div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20, marginBottom: 28 }}>
            <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Activity</h2>
                <button onClick={() => setShowActivityModal(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#6921A5" }}>See All</button>
              </div>
              <div>
                {activity.length === 0 && <p style={{ padding: "16px 24px", fontSize: 13, color: "#64748b", margin: 0 }}>No recent activity.</p>}
                {activity.slice(0, 5).map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 24px" }}>
                    <div style={{ width: 32, height: 32, background: "#F3E8F8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                      <a.icon style={{ width: 16, height: 16, color: "#6921A5" }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0, lineHeight: "1.4" }}>{a.title}</p>
                      <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>{a.source ? `${a.source} - ` : ""}{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Quick Actions</h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Link to="/app/requirements/new"
                    style={{ background: "#6921A5", color: "#fff", fontSize: 13, fontWeight: 600, padding: "12px", borderRadius: 8, textDecoration: "none", textAlign: "center" }}>
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

              <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>Active Deals</h2>
                {activeDeals.length === 0 && <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>No active deals.</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {activeDeals.slice(0, 3).map((d, i, arr) => (
                    <Link key={d.id} to={`/app/deals/${d.id}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: i < arr.length - 1 ? 16 : 0, borderBottom: i < arr.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{d.title || "Untitled deal"}</p>
                        <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>Created {formatDate(d.createdAt)}</p>
                      </div>
                      <StatusBadge status={(d.status || "").toUpperCase() === "CONFIRMED" ? "active" : "pending"} />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #f1f5f9" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>Recent Requirements</h2>
              <Link to="/app/requirements/active" style={{ fontSize: 13, fontWeight: 700, color: "#6921A5", textDecoration: "none" }}>
                View All Requirements
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr 1fr 1fr 1fr", padding: "12px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
              {["Requirement", "Category", "Posted Date", "Proposals", "Status"].map(h => (
                <span key={h} style={{ fontSize: 13, fontWeight: 700, color: "#64748b" }}>{h}</span>
              ))}
            </div>
            {requirements.length === 0 && <p style={{ padding: "16px 24px", fontSize: 13, color: "#64748b", margin: 0 }}>You have not posted any requirements yet.</p>}
            {requirements.slice(0, 4).map((r, i, arr) => (
              <div key={r.id} style={{
                display: "grid", gridTemplateColumns: "3fr 1.5fr 1fr 1fr 1fr", padding: "16px 24px", alignItems: "center",
                borderBottom: i < arr.length - 1 ? "1px solid #f8fafc" : "none",
              }}>
                <Link to={`/app/requirements/${r.id}`} style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", textDecoration: "none" }}>{r.title}</Link>
                <span style={{ fontSize: 13, color: "#64748b" }}>{r.category || "General"}</span>
                <span style={{ fontSize: 13, color: "#64748b" }}>{formatDate(r.createdAt)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{r.proposalCount ?? 0}</span>
                <div><StatusBadge status={r.status} /></div>
              </div>
            ))}
          </div>
        </>
      )}

      <ActivityLogsModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        activities={activity}
      />
    </motion.div>
  );
}
