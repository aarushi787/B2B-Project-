// Is the platform healthy? Shows whether the database answers, and the state of the background payment retry queue.
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { useLoad } from "../../../lib/useLoad";
import { Btn, Card, ErrorNote, Loading, PageHeader, StatCard, formatDateTime } from "./ui";

interface Reliability {
  generatedAt: string;
  retryQueue: { total: number; queued: number; processing: number; retrying: number; succeeded: number; failed: number; deadLetter: number };
}

export function SystemSection({ refreshKey }: { refreshKey: number }) {
  const ready = useLoad<{ ok: boolean; at: string }>(
    () => apiClient.get<unknown>("/ready").then(() => ({ ok: true, at: new Date().toISOString() })).catch(() => ({ ok: false, at: new Date().toISOString() })),
    [refreshKey]
  );
  const rel = useLoad<Reliability>(() => apiClient.get<Reliability>("/admin/ops/reliability"), [refreshKey]);
  const q = rel.data?.retryQueue;

  return (
    <div>
      <PageHeader title="System" subtitle="Whether the platform is up, and what is waiting in the background."
        actions={<Btn onClick={() => { void ready.reload(); void rel.reload(); }}>Check again</Btn>} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-[15px] font-semibold text-slate-500">Database</p>
          {!ready.data ? <Loading label="Checking..." /> : (
            <p className={`mt-3 flex items-center gap-3 text-2xl font-bold ${ready.data.ok ? "text-green-700" : "text-red-700"}`}>
              {ready.data.ok ? <CheckCircle2 className="h-7 w-7" aria-hidden="true" /> : <XCircle className="h-7 w-7" aria-hidden="true" />}
              {ready.data.ok ? "Connected" : "Not reachable"}
            </p>
          )}
          {ready.data && <p className="mt-2 text-sm text-slate-500">Checked {formatDateTime(ready.data.at)}</p>}
        </div>
        <StatCard label="Failed payment jobs" value={q ? q.failed + q.deadLetter : "—"} icon={Activity} tone={q && q.failed + q.deadLetter > 0 ? "red" : "green"} hint={q && q.failed + q.deadLetter > 0 ? "These need attention" : "Nothing stuck"} />
      </div>

      <div className="mt-6">
        <Card title="Payment retry queue" subtitle="Background jobs that retry a payment that did not go through.">
          {rel.error && <ErrorNote message={rel.error} onRetry={() => void rel.reload()} />}
          {!q && !rel.error ? <Loading /> : q && (
            <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {([["Queued", q.queued], ["Processing", q.processing], ["Retrying", q.retrying], ["Succeeded", q.succeeded], ["Failed", q.failed], ["Dead letter", q.deadLetter]] as [string, number][]).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-[#F8F9FB] p-4 text-center">
                  <dt className="text-sm font-semibold text-slate-500">{k}</dt>
                  <dd className="mt-1 text-3xl font-bold text-[#0F1A2E]">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          {rel.data && <p className="mt-4 text-sm text-slate-500">Updated {formatDateTime(rel.data.generatedAt)}</p>}
        </Card>
      </div>
    </div>
  );
}
