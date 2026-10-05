// All deals on the platform. New deals start as "pending" and are approved or rejected by the platform, here.
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { apiClient } from "../../../services/apiClient";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { formatDate, formatINR } from "../../../lib/format";
import { Btn, Card, ConfirmDialog, EmptyState, ErrorNote, Loading, PageHeader, Pagination, Pill, SearchInput, SelectBox, TableWrap, Td, Th, useDebounced } from "./ui";

interface DealRow {
  id: string; title: string; status: "pending" | "approved" | "rejected" | "completed" | "cancelled"; totalAmount: string | number; createdAt: string;
  buyerName: string; sellerName: string; milestones: number; milestonesDone: number; agreementStatus: "UPLOADED" | "SIGNED" | "REJECTED" | null;
}
const PAGE = 15;
const STATUS: Record<DealRow["status"], { label: string; tone: "amber" | "green" | "red" | "purple" | "slate" }> = {
  pending: { label: "Pending approval", tone: "amber" }, approved: { label: "Approved", tone: "green" }, rejected: { label: "Rejected", tone: "red" },
  completed: { label: "Completed", tone: "purple" }, cancelled: { label: "Cancelled", tone: "slate" },
};

export function DealsSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const dq = useDebounced(q);
  const deals = useLoad<{ total: number; rows: DealRow[] }>(
    () => apiClient.get(`/admin/deals?limit=${PAGE}&offset=${offset}${status !== "all" ? `&status=${status}` : ""}${dq.trim() ? `&q=${encodeURIComponent(dq.trim())}` : ""}`),
    [status, dq, offset, refreshKey]
  );
  const [confirm, setConfirm] = useState<{ deal: DealRow; action: "approve" | "reject" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const decide = async () => {
    if (!confirm) return;
    setBusy(true); setError("");
    try {
      await apiClient.put(`/deals/${confirm.deal.id}/${confirm.action}`, {});
      setConfirm(null);
      await deals.reload(); onChanged();
    } catch (e) { setError(friendlyError(e)); setConfirm(null); } finally { setBusy(false); }
  };

  const rows = deals.data?.rows ?? [];
  return (
    <div>
      <PageHeader title="Deals" subtitle="Approve new deals and follow their progress." />
      {deals.error && <ErrorNote message={deals.error} onRetry={() => void deals.reload()} />}
      {error && <ErrorNote message={error} />}

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
          <SearchInput label="Search deals" placeholder="Search by deal or company" value={q} onChange={(v) => { setQ(v); setOffset(0); }} />
          <SelectBox label="Status" value={status} onChange={(v) => { setStatus(v); setOffset(0); }}>
            <option value="all">All statuses</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </SelectBox>
        </div>
        {deals.loading && !deals.data ? <Loading /> : rows.length === 0 ? <EmptyState title="No deals found" hint="Deals appear here when a requirement is awarded to a proposal." /> : (
          <>
            <TableWrap label="Deals">
              <thead className="bg-[#F8F9FB]"><tr><Th>Deal</Th><Th>Value</Th><Th>Status</Th><Th>Agreement</Th><Th>Milestones</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((d) => (
                  <tr key={d.id} className="hover:bg-[#F8F9FB]">
                    <Td>
                      <span className="block font-semibold text-slate-900">{d.title}</span>
                      <span className="block text-sm text-slate-500">{d.buyerName} → {d.sellerName} · {formatDate(d.createdAt)}</span>
                    </Td>
                    <Td className="font-semibold">{formatINR(Number(d.totalAmount))}</Td>
                    <Td><Pill tone={STATUS[d.status].tone}>{STATUS[d.status].label}</Pill></Td>
                    <Td>{d.agreementStatus === "SIGNED" ? <Pill tone="green">Signed</Pill> : d.agreementStatus ? <Pill tone="amber">Awaiting</Pill> : <span className="text-slate-400">None</span>}</Td>
                    <Td>{d.milestones > 0 ? `${d.milestonesDone} of ${d.milestones} done` : <span className="text-slate-400">None</span>}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        {d.status === "pending" && (<>
                          <Btn size="sm" variant="primary" onClick={() => setConfirm({ deal: d, action: "approve" })}>Approve</Btn>
                          <Btn size="sm" variant="danger" onClick={() => setConfirm({ deal: d, action: "reject" })}>Reject</Btn>
                        </>)}
                        <Link to={`/app/deals/${d.id}`} aria-label={`Open ${d.title}`} className="inline-flex items-center rounded-lg p-2 text-[#6921A5] hover:bg-[#F3E8F8]"><ExternalLink className="h-4 w-4" /></Link>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination total={deals.data?.total ?? 0} limit={PAGE} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>

      <ConfirmDialog open={!!confirm} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void decide()}
        title={confirm?.action === "approve" ? "Approve this deal?" : "Reject this deal?"}
        message={confirm ? <>{confirm.deal.buyerName} and {confirm.deal.sellerName} will be told that <strong>{confirm.deal.title}</strong> was {confirm.action === "approve" ? "approved" : "rejected"}.</> : null}
        confirmLabel={confirm?.action === "approve" ? "Approve" : "Reject"} danger={confirm?.action === "reject"} />
    </div>
  );
}
