// A plain-language risk summary for a deal. Every factor is a real fact about the deal (verification, GST, agreement,
// milestones, escrow, deal history). There is no hidden score: the level follows from the rule shown under "How this works".
import { useEffect } from "react";
import { CheckCircle2, ShieldAlert, TriangleAlert } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { socketService } from "../../services/socketService";
import { useLoad } from "../../lib/useLoad";
import type { RiskAssessment, RiskFactor } from "../../types/milestones";

const LEVEL = {
  low: { label: "Low risk", bg: "#dcfce7", color: "#15803d" },
  medium: { label: "Medium risk", bg: "#fef3c7", color: "#b45309" },
  high: { label: "High risk", bg: "#fee2e2", color: "#b91c1c" },
} as const;

function Icon({ s }: { s: RiskFactor["status"] }) {
  if (s === "good") return <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" aria-label="Good" />;
  if (s === "warn") return <TriangleAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-label="Needs attention" />;
  return <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-label="Problem" />;
}

export function RiskPanel({ dealId }: { dealId: string }) {
  const { data, error, reload } = useLoad<RiskAssessment>(() => apiClient.get<RiskAssessment>(`/milestones/deal/${dealId}/risk`), [dealId]);

  useEffect(() => {
    socketService.connect();
    const offs = ["milestones:updated", "documents:updated"].map((e) => socketService.on(e, () => { void reload(); }));
    return () => offs.forEach((o) => o());
  }, [reload]);

  const level = data ? LEVEL[data.level] : null;
  // Problems first, then things to watch, then what is fine.
  const factors = [...(data?.factors ?? [])].sort((a, b) => ({ bad: 0, warn: 1, good: 2 }[a.status] - { bad: 0, warn: 1, good: 2 }[b.status]));

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5" aria-labelledby="risk-heading">
      <div className="flex items-center gap-2">
        <h2 id="risk-heading" className="text-sm font-bold text-slate-900">Risk summary</h2>
        {level && <span className="ml-auto text-xs font-bold rounded-full px-2.5 py-1" style={{ background: level.bg, color: level.color }}>{level.label}</span>}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="mt-3 text-sm text-slate-500">Checking...</p>}
      {data && (
        <>
          <ul className="mt-3 space-y-2.5">
            {factors.map((f) => (
              <li key={f.key} className="flex gap-2">
                <Icon s={f.status} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          <details className="mt-4 text-xs text-slate-500">
            <summary className="cursor-pointer font-semibold text-slate-600">How this works</summary>
            <p className="mt-2 leading-relaxed">
              Each fact above counts 0 points when fine, 1 when it needs attention and 2 when it is a problem. 0 to 1 points is low risk, 2 to 3 is medium and 4 or more is high.
              An overdue milestone is never low. This summary uses only information on the platform. It is a guide, not a guarantee.
            </p>
          </details>
        </>
      )}
    </section>
  );
}
