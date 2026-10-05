// Things that need your attention on your deals: milestones waiting for your confirmation, changes asked of you,
// overdue milestones and agreements waiting for your signature. Computed from live data, never invented.
import { useEffect } from "react";
import { Link } from "react-router";
import { Bell, Clock, FileSignature, ListChecks, TriangleAlert } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { useLoad } from "../../lib/useLoad";
import type { DealAlert } from "../../types/milestones";

const ICON: Record<string, typeof Bell> = {
  MILESTONE_AWAITING_APPROVAL: ListChecks,
  MILESTONE_CHANGES_REQUESTED: ListChecks,
  MILESTONE_OVERDUE: Clock,
  AGREEMENT_AWAITING_SIGNATURE: FileSignature,
};

/** Pass `dealId` to show only one deal's alerts (the deal page). Leave it out for all of your deals (the dashboard). */
export function DealAlerts({ dealId, hideWhenEmpty = false }: { dealId?: string; hideWhenEmpty?: boolean }) {
  const { data, error, reload } = useLoad<DealAlert[]>(() => apiClient.get<DealAlert[]>("/milestones/alerts"), []);

  useEffect(() => {
    socketService.connect();
    const offs = ["milestones:updated", "documents:updated", "deals:updated"].map((e) => socketService.on(e, () => { void reload(); }));
    return () => offs.forEach((o) => o());
  }, [reload]);

  const alerts = (data ?? []).filter((a) => !dealId || a.dealId === dealId);
  if (hideWhenEmpty && alerts.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5" aria-labelledby="alerts-heading">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-[#6921A5]" aria-hidden="true" />
        <h2 id="alerts-heading" className="text-sm font-bold text-slate-900">Needs your attention</h2>
        {alerts.length > 0 && <span className="ml-auto text-xs font-bold text-white bg-[#6921A5] rounded-full px-2 py-0.5">{alerts.length}</span>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {!error && alerts.length === 0 && <p className="mt-3 text-sm text-slate-500">Nothing is waiting on you right now.</p>}
      <ul className="mt-3 space-y-2">
        {alerts.slice(0, dealId ? 10 : 6).map((a) => {
          const Icon = a.severity === "warning" ? TriangleAlert : ICON[a.kind] ?? Bell;
          return (
            <li key={a.id}>
              <Link to={a.link} className={`flex gap-3 rounded-xl border p-3 hover:bg-[#F8F9FB] ${a.severity === "warning" ? "border-amber-200 bg-amber-50/50" : "border-slate-200"}`}>
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${a.severity === "warning" ? "text-amber-600" : "text-[#6921A5]"}`} aria-hidden="true" />
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{a.title}</span>
                  <span className="block text-xs text-slate-500">{a.message}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
