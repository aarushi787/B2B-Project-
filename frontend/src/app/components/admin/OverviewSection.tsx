// The first screen an admin sees: real platform numbers, what needs a decision, and live activity.
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BadgeCheck, Briefcase, FileText, ShieldAlert, UserPlus, Users } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { useLoad } from "../../../lib/useLoad";
import { formatINR } from "../../../lib/format";
import { Card, EmptyState, ErrorNote, Loading, PageHeader, SelectBox, StatCard, formatDateTime } from "./ui";

interface Stats {
  days: number;
  users: { total: number; recent: number; emailVerified: number; suspended: number };
  companies: { total: number; verified: number; unverified: number; recent: number };
  requirements: Record<string, number>;
  proposals: Record<string, number>;
  deals: { byStatus: Record<string, number>; totalValue: number };
  pendingReview: { documents: number; companies: number };
  signupsByDay: { day: string; count: number }[];
}
interface Activity { id: string; action: string; actorEmail: string | null; metadata: { title?: string; message?: string } | null; createdAt: string }

/** Fill days with no sign-ups with zero, so the chart shows quiet days instead of skipping them. */
function fillDays(rows: { day: string; count: number }[], days: number) {
  const map = new Map(rows.map((r) => [r.day, r.count]));
  const out: { day: string; label: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    out.push({ day: key, label: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }), count: map.get(key) ?? 0 });
  }
  return out;
}

export function OverviewSection({ goTo, refreshKey }: { goTo: (tab: string) => void; refreshKey: number }) {
  const [days, setDays] = useState(30);
  const stats = useLoad<Stats>(() => apiClient.get<Stats>(`/admin/stats?days=${days}`), [days, refreshKey]);
  const activity = useLoad<Activity[]>(() => apiClient.get<Activity[]>("/admin/activity").catch(() => []), [refreshKey]);
  const [live, setLive] = useState(false);
  useEffect(() => { socketService.connect(); setLive(true); }, []);

  const s = stats.data;
  const chart = useMemo(() => (s ? fillDays(s.signupsByDay, s.days) : []), [s]);
  const pendingTotal = (s?.pendingReview.documents ?? 0) + (s?.pendingReview.companies ?? 0);
  const dealCount = s ? Object.values(s.deals.byStatus).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle="How the platform is doing, and what needs you."
        actions={<SelectBox label="Period" value={String(days)} onChange={(v) => setDays(Number(v))}>
          <option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
        </SelectBox>}
      />
      {stats.error && <ErrorNote message={stats.error} onRetry={() => void stats.reload()} />}
      {!s && !stats.error && <Loading />}

      {s && (
        <div className="space-y-6">
          {pendingTotal > 0 && (
            <button onClick={() => goTo("review")} className="flex w-full items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left transition-colors hover:bg-amber-100">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><ShieldAlert className="h-6 w-6" aria-hidden="true" /></span>
              <span className="flex-1">
                <span className="block text-xl font-semibold text-amber-900">{pendingTotal} {pendingTotal === 1 ? "item needs" : "items need"} your decision</span>
                <span className="block text-[15px] text-amber-800">{s.pendingReview.documents} document{s.pendingReview.documents === 1 ? "" : "s"} and {s.pendingReview.companies} unverified compan{s.pendingReview.companies === 1 ? "y" : "ies"}. Open the review queue.</span>
              </span>
            </button>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Users" value={s.users.total} icon={Users} hint={`+${s.users.recent} in the last ${s.days} days`} onClick={() => goTo("users")} />
            <StatCard label="Verified companies" value={`${s.companies.verified} / ${s.companies.total}`} icon={BadgeCheck} tone="green" hint={`${s.companies.unverified} not verified yet`} onClick={() => goTo("companies")} />
            <StatCard label="Open requirements" value={s.requirements.open ?? 0} icon={FileText} tone="blue" hint={`${s.requirements.awarded ?? 0} awarded, ${s.requirements.closed ?? 0} closed`} />
            <StatCard label="Deals" value={dealCount} icon={Briefcase} tone="amber" hint={`${formatINR(s.deals.totalValue)} total value`} onClick={() => goTo("deals")} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
            <Card title="New users" subtitle={`Sign-ups per day, last ${s.days} days`}>
              <div className="h-64" role="img" aria-label={`Bar chart of daily sign-ups. ${s.users.recent} new users in the last ${s.days} days.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 13, fill: "#64748B" }} interval="preserveStartEnd" minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: "#64748B" }} />
                    <Tooltip cursor={{ fill: "#F3E8F8" }} contentStyle={{ fontSize: 14, borderRadius: 8, border: "1px solid #E2E8F0" }} />
                    <Bar dataKey="count" name="New users" fill="#6921A5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Accounts" subtitle="Health of the user base">
              <ul className="space-y-4 text-[15px]">
                <li className="flex items-center justify-between"><span className="text-slate-600">Email verified</span><strong>{s.users.emailVerified} of {s.users.total}</strong></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">Suspended users</span><strong>{s.users.suspended}</strong></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">New companies ({s.days}d)</span><strong>{s.companies.recent}</strong></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">Proposals sent ({s.days}d)</span><strong>{Object.values(s.proposals).reduce((a, b) => a + b, 0)}</strong></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">Deals completed</span><strong>{s.deals.byStatus.completed ?? 0}</strong></li>
                <li className="flex items-center justify-between"><span className="text-slate-600">Deals waiting for approval</span><strong>{s.deals.byStatus.pending ?? 0}</strong></li>
              </ul>
            </Card>
          </div>

          <Card title="Live activity" subtitle={live ? "Updates as it happens" : undefined} padded={false}>
            {activity.data && activity.data.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {activity.data.slice(0, 12).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-6 py-3.5">
                    <span className="w-44 shrink-0 text-sm text-slate-500">{formatDateTime(a.createdAt)}</span>
                    <span className="text-[15px] font-semibold text-slate-800">{a.metadata?.title ?? a.action}</span>
                    <span className="text-[15px] text-slate-500">{a.metadata?.message}{a.actorEmail ? ` (${a.actorEmail})` : ""}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No activity yet" hint="Sign-ups, proposals, deals and document uploads appear here as they happen." />}
          </Card>
        </div>
      )}
    </div>
  );
}

export { UserPlus };
