// Everything waiting for an admin decision, in one list: pending KYC documents and unverified companies.
// Decisions can be made one at a time or in bulk; every decision is audited and the company is told why.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, FileText } from "lucide-react";
import { apiClient, API_BASE_URL } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { formatDate } from "../../../lib/format";
import { Btn, Card, EmptyState, ErrorNote, Loading, PageHeader, Pill, cx } from "./ui";

interface QueueItem { kind: "document" | "company"; id: string; companyId: string; companyName: string | null; title: string; detail: string | null; submittedBy: string | null; createdAt: string }
type Filter = "all" | "document" | "company";

const TEMPLATES = [
  "The document is unclear or unreadable. Please upload a clearer copy.",
  "The details do not match your company profile.",
  "The document has expired.",
  "We need additional information. Please contact support.",
];
const keyOf = (i: QueueItem) => `${i.kind}:${i.id}`;

export function ReviewQueueSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const queue = useLoad<{ items: QueueItem[] }>(() => apiClient.get("/admin/review-queue"), [refreshKey]);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const items = queue.data?.items ?? [];
  const shown = useMemo(() => items.filter((i) => filter === "all" || i.kind === filter), [items, filter]);
  const allSelected = shown.length > 0 && shown.every((i) => selected.has(keyOf(i)));
  const counts = { all: items.length, document: items.filter((i) => i.kind === "document").length, company: items.filter((i) => i.kind === "company").length };

  // Forget selections for items that were decided elsewhere.
  useEffect(() => { setSelected((prev) => new Set([...prev].filter((k) => items.some((i) => keyOf(i) === k)))); }, [items]);
  useEffect(() => { socketService.connect(); return socketService.on("admin:activity", () => { void queue.reload(); }); }, [queue.reload]);

  const toggle = (i: QueueItem) => setSelected((p) => { const n = new Set(p); n.has(keyOf(i)) ? n.delete(keyOf(i)) : n.add(keyOf(i)); return n; });
  const toggleAll = () => setSelected((p) => { const n = new Set(p); shown.forEach((i) => (allSelected ? n.delete(keyOf(i)) : n.add(keyOf(i)))); return n; });

  const decide = useCallback(async (decision: "approve" | "reject", only?: QueueItem) => {
    const chosen = only ? [only] : items.filter((i) => selected.has(keyOf(i)));
    if (chosen.length === 0) return;
    if (decision === "reject" && !reason.trim()) { setError("Choose or write a reason first. The company will see it."); return; }
    if (chosen.length > 1 && !window.confirm(`${decision === "approve" ? "Approve" : "Reject"} ${chosen.length} items?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const r = await apiClient.post<{ decided: number; failed: number }>("/admin/review-queue/decide", {
        items: chosen.map((i) => ({ kind: i.kind, id: i.id })), decision, reason: reason.trim() || undefined,
      });
      setNotice(`${r.decided} ${decision === "approve" ? "approved" : "rejected"}${r.failed ? `, ${r.failed} could not be changed` : ""}.`);
      setSelected(new Set());
      await queue.reload();
      onChanged();
    } catch (e) { setError(friendlyError(e)); } finally { setBusy(false); }
  }, [items, selected, reason, queue, onChanged]);

  return (
    <div>
      <PageHeader title="Review queue" subtitle="Documents and companies waiting for a decision, oldest first." />
      {queue.error && <ErrorNote message={queue.error} onRetry={() => void queue.reload()} />}
      {error && <ErrorNote message={error} />}
      {notice && <p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[15px] text-green-800">{notice}</p>}

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-4" role="tablist" aria-label="Filter the queue">
          {(["all", "document", "company"] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
              className={cx("rounded-full px-4 py-1.5 text-[15px] font-semibold", filter === f ? "bg-[#6921A5] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>
              {f === "all" ? "All" : f === "document" ? "Documents" : "Companies"} ({counts[f]})
            </button>
          ))}
        </div>

        {shown.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 bg-[#F8F9FB] px-6 py-4">
            <label className="flex items-center gap-2 text-[15px] font-semibold"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[#6921A5]" /> Select all</label>
            <span className="text-sm text-slate-500">{selected.size} selected</span>
            <select aria-label="Rejection reason template" value="" onChange={(e) => e.target.value && setReason(e.target.value)} className="max-w-[240px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px]">
              <option value="">Reason template...</option>
              {TEMPLATES.map((t) => <option key={t} value={t}>{t.length > 44 ? `${t.slice(0, 44)}...` : t}</option>)}
            </select>
            <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} aria-label="Reason" placeholder="Reason (required to reject, shown to the company)" className="min-w-[220px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px]" />
            <Btn variant="primary" disabled={busy || selected.size === 0} onClick={() => void decide("approve")}>Approve selected</Btn>
            <Btn variant="danger" disabled={busy || selected.size === 0} onClick={() => void decide("reject")}>Reject selected</Btn>
          </div>
        )}

        {queue.loading && !queue.data ? <Loading /> : shown.length === 0 ? (
          <EmptyState title="Nothing is waiting for review" hint="New documents and unverified companies appear here as soon as they arrive." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((i) => (
              <li key={keyOf(i)} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <input type="checkbox" aria-label={`Select ${i.companyName ?? "item"}`} checked={selected.has(keyOf(i))} onChange={() => toggle(i)} className="h-4 w-4 accent-[#6921A5]" />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8F8] text-[#6921A5]">
                  {i.kind === "document" ? <FileText className="h-5 w-5" aria-hidden="true" /> : <Building2 className="h-5 w-5" aria-hidden="true" />}
                </span>
                <div className="min-w-[220px] flex-1">
                  <p className="text-[17px] font-semibold text-slate-900">{i.companyName ?? "Unknown company"} <span className="font-normal text-slate-500">· {i.title}</span></p>
                  <p className="text-sm text-slate-500">{[i.detail, i.submittedBy, `waiting since ${formatDate(i.createdAt)}`].filter(Boolean).join(" · ")}</p>
                </div>
                <Pill tone={i.kind === "document" ? "blue" : "purple"}>{i.kind === "document" ? "Document" : "Company"}</Pill>
                {i.kind === "document" && <a href={`${API_BASE_URL}/kyc/${i.id}/file`} target="_blank" rel="noreferrer" className="text-[15px] font-semibold text-[#6921A5] hover:underline">View file</a>}
                <Btn size="sm" variant="primary" disabled={busy} onClick={() => void decide("approve", i)}>Approve</Btn>
                <Btn size="sm" variant="danger" disabled={busy} onClick={() => void decide("reject", i)}>Reject</Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
