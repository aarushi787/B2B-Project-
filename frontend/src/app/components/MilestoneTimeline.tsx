// The deal's milestones as a timeline. The provider marks a step done, the client confirms it (or asks for changes).
// The buttons shown come from the API (`can`), which re-checks every rule, so the UI can never offer a forbidden action.
import { useState } from "react";
import { CheckCircle2, Circle, Hourglass, Lock, Plus, Trash2, Wallet } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import { friendlyError } from "../../lib/useLoad";
import { formatDate, formatINR } from "../../lib/format";
import type { DealMilestones, Milestone } from "../../types/milestones";

const STATUS_LABEL = { PLANNED: "Planned", SUBMITTED: "Waiting for confirmation", APPROVED: "Confirmed" } as const;

function StatusIcon({ m }: { m: Milestone }) {
  if (m.status === "APPROVED") return <CheckCircle2 className="w-5 h-5 text-green-600" aria-hidden="true" />;
  if (m.status === "SUBMITTED") return <Hourglass className="w-5 h-5 text-amber-600" aria-hidden="true" />;
  return <Circle className={`w-5 h-5 ${m.overdue ? "text-red-500" : "text-slate-300"}`} aria-hidden="true" />;
}

function Btn({ children, onClick, disabled, tone = "primary" }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: "primary" | "plain" | "danger" }) {
  const cls =
    tone === "primary" ? "bg-[#6921A5] text-white hover:bg-[#492F77]"
    : tone === "danger" ? "bg-white text-red-600 border border-red-200 hover:bg-red-50"
    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50";
  return <button onClick={onClick} disabled={disabled} className={`text-xs font-semibold rounded-lg px-3 py-1.5 disabled:opacity-50 ${cls}`}>{children}</button>;
}

export function MilestoneTimeline({ dealId, data, reload }: { dealId: string; data: DealMilestones | null; reload: () => Promise<void> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", dueDate: "", description: "" });
  const [changesFor, setChangesFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const run = async (key: string, work: () => Promise<unknown>) => {
    setBusy(key); setError("");
    try { await work(); await reload(); } catch (e) { setError(friendlyError(e)); } finally { setBusy(null); }
  };

  const isParty = !!data?.side;
  const milestones = data?.milestones ?? [];
  const summary = data?.summary;
  const pct = summary && summary.count ? Math.round((summary.approved / summary.count) * 100) : 0;
  const remaining = summary && summary.dealTotal > 0 ? Math.max(0, summary.dealTotal - summary.plannedAmount) : null;

  const add = () => run("add", async () => {
    await apiClient.post(`/milestones/deal/${dealId}`, {
      title: form.title.trim(),
      amount: Number(form.amount) || 0,
      dueDate: form.dueDate || null,
      description: form.description.trim() || undefined,
    });
    setForm({ title: "", amount: "", dueDate: "", description: "" });
    setAdding(false);
  });

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6" aria-labelledby="milestones-heading">
      <div className="flex items-center gap-3">
        <h2 id="milestones-heading" className="text-sm font-bold text-slate-900">Milestones</h2>
        {summary && summary.count > 0 && <span className="text-xs text-slate-500">{summary.approved} of {summary.count} confirmed</span>}
        {isParty && (
          <button onClick={() => setAdding((v) => !v)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#6921A5] hover:underline">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> Add milestone
          </button>
        )}
      </div>

      {summary && summary.count > 0 && (
        <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-3 h-2 rounded-full bg-[#F3E8F8] overflow-hidden">
          <div className="h-full bg-[#6921A5] transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

      {adding && (
        <div className="mt-4 rounded-xl border border-[#DBC5E7] bg-[#F8F9FB] p-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Title
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={255} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700">Amount (₹)
            <input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
            {remaining !== null && <span className="block mt-1 text-xs font-normal text-slate-500">{formatINR(remaining)} of the deal total is not planned yet.</span>}
          </label>
          <label className="text-sm font-semibold text-slate-700">Due date
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <label className="text-sm font-semibold text-slate-700 sm:col-span-2">What will be delivered (optional)
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} maxLength={2000} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
          </label>
          <div className="sm:col-span-2 flex gap-2">
            <Btn onClick={add} disabled={busy === "add" || form.title.trim().length < 2}>{busy === "add" ? "Adding..." : "Add milestone"}</Btn>
            <Btn tone="plain" onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {milestones.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No milestones yet. Break the work into steps with an amount and due date, so both sides can track progress and the client can confirm each step.
        </p>
      ) : (
        <ol className="mt-5 space-y-0">
          {milestones.map((m, i) => (
            <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
              {i < milestones.length - 1 && <span aria-hidden="true" className="absolute left-[9px] top-6 bottom-0 w-px bg-slate-200" />}
              <span className="mt-0.5 bg-white z-10"><StatusIcon m={m} /></span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-sm font-bold text-slate-900">{m.title}</h3>
                  <span className="text-sm font-semibold text-slate-700">{formatINR(m.amount)}</span>
                  <span className={`text-xs font-semibold ${m.status === "APPROVED" ? "text-green-700" : m.status === "SUBMITTED" ? "text-amber-700" : "text-slate-500"}`}>{STATUS_LABEL[m.status]}</span>
                  {m.escrowStatus !== "NOT_FUNDED" && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6921A5] bg-[#F3E8F8] rounded-full px-2 py-0.5">
                      {m.escrowStatus === "FUNDED" ? <Lock className="w-3 h-3" aria-hidden="true" /> : <Wallet className="w-3 h-3" aria-hidden="true" />}
                      {m.escrowStatus === "FUNDED" ? "Funds held" : "Payment released"}
                    </span>
                  )}
                </div>
                {m.description && <p className="mt-1 text-sm text-slate-600">{m.description}</p>}
                <p className={`mt-1 text-xs ${m.overdue ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                  {m.dueDate ? `${m.overdue ? "Overdue: was due" : "Due"} ${formatDate(m.dueDate)}` : "No due date"}
                  {m.approvedAt ? ` · confirmed ${formatDate(m.approvedAt)}` : m.submittedAt ? ` · marked done ${formatDate(m.submittedAt)}` : ""}
                </p>
                {m.changeNote && m.status === "PLANNED" && (
                  <p className="mt-2 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2">Changes requested: {m.changeNote}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {m.can.submit && <Btn disabled={busy === m.id} onClick={() => run(m.id, () => apiClient.post(`/milestones/${m.id}/submit`, {}))}>Mark as done</Btn>}
                  {m.can.approve && (
                    <Btn disabled={busy === m.id} onClick={() => run(m.id, () => apiClient.post(`/milestones/${m.id}/approve`, {}))}>
                      {m.escrowStatus === "FUNDED" ? "Confirm and release payment" : "Confirm"}
                    </Btn>
                  )}
                  {m.can.requestChanges && <Btn tone="plain" disabled={busy === m.id} onClick={() => { setChangesFor(changesFor === m.id ? null : m.id); setNote(""); }}>Request changes</Btn>}
                  {m.can.delete && (
                    <Btn tone="danger" disabled={busy === m.id} onClick={() => { if (window.confirm(`Remove "${m.title}"?`)) void run(m.id, () => apiClient.delete(`/milestones/${m.id}`)); }}>
                      <span className="inline-flex items-center gap-1"><Trash2 className="w-3 h-3" aria-hidden="true" /> Remove</span>
                    </Btn>
                  )}
                </div>

                {changesFor === m.id && (
                  <div className="mt-3">
                    <label htmlFor={`note-${m.id}`} className="block text-xs font-semibold text-slate-700">What should the provider change?</label>
                    <textarea id={`note-${m.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <div className="mt-2 flex gap-2">
                      <Btn disabled={busy === m.id || note.trim().length < 3} onClick={() => run(m.id, async () => { await apiClient.post(`/milestones/${m.id}/request-changes`, { note: note.trim() }); setChangesFor(null); })}>Send</Btn>
                      <Btn tone="plain" onClick={() => setChangesFor(null)}>Cancel</Btn>
                    </div>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
