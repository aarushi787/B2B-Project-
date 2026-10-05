// The audit log: who did what, and when. Search, filter by action and date, page through it, and export to CSV.
import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { Btn, Card, EmptyState, ErrorNote, Loading, PageHeader, Pagination, SearchInput, SelectBox, TableWrap, Td, Th, formatDateTime, useDebounced } from "./ui";

interface Entry {
  id: string; actorEmail: string | null; companyName: string | null; action: string; resourceType: string | null; resourceId: string | null;
  metadata: unknown; ipAddress: string | null; createdAt: string;
}
const PAGE = 25;
const pretty = (a: string) => a.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export function AuditSection({ refreshKey }: { refreshKey: number }) {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const dq = useDebounced(q);

  const query = () => {
    const p = new URLSearchParams();
    if (dq.trim()) p.set("q", dq.trim());
    if (action) p.set("action", action);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return p;
  };
  const actions = useLoad<string[]>(() => apiClient.get<string[]>("/admin/audit/actions"), []);
  const log = useLoad<{ total: number; rows: Entry[] }>(() => {
    const p = query(); p.set("limit", String(PAGE)); p.set("offset", String(offset));
    return apiClient.get(`/admin/audit?${p.toString()}`);
  }, [dq, action, from, to, offset, refreshKey]);

  const exportCsv = async () => {
    setExporting(true); setExportError("");
    try {
      const p = query(); p.set("format", "csv");
      const csv = await apiClient.get<string>(`/admin/audit?${p.toString()}`);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url; a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setExportError(friendlyError(e)); } finally { setExporting(false); }
  };

  const reset = (fn: () => void) => { fn(); setOffset(0); };
  const rows = log.data?.rows ?? [];

  return (
    <div>
      <PageHeader title="Audit log" subtitle="A permanent record of important actions on the platform."
        actions={<Btn onClick={() => void exportCsv()} disabled={exporting}><Download className="h-4 w-4" aria-hidden="true" /> {exporting ? "Preparing..." : "Export CSV"}</Btn>} />
      {log.error && <ErrorNote message={log.error} onRetry={() => void log.reload()} />}
      {exportError && <ErrorNote message={exportError} />}

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
          <SearchInput label="Search the audit log" placeholder="Search actor, company, action or details" value={q} onChange={(v) => reset(() => setQ(v))} />
          <SelectBox label="Action" value={action} onChange={(v) => reset(() => setAction(v))}>
            <option value="">All actions</option>
            {(actions.data ?? []).map((a) => <option key={a} value={a}>{pretty(a)}</option>)}
          </SelectBox>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">From
            <input type="date" value={from} max={to || undefined} onChange={(e) => reset(() => setFrom(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] font-normal" /></label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">To
            <input type="date" value={to} min={from || undefined} onChange={(e) => reset(() => setTo(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] font-normal" /></label>
          {(q || action || from || to) && <Btn variant="ghost" size="sm" onClick={() => reset(() => { setQ(""); setAction(""); setFrom(""); setTo(""); })}>Clear filters</Btn>}
        </div>

        {log.loading && !log.data ? <Loading /> : rows.length === 0 ? <EmptyState title="No entries match" hint="Try a wider date range or fewer filters." /> : (
          <>
            <TableWrap label="Audit log">
              <thead className="bg-[#F8F9FB]"><tr><Th className="w-10" /><Th>Time</Th><Th>Actor</Th><Th>Action</Th><Th>Resource</Th><Th>IP address</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const isOpen = openRow === r.id;
                  return (
                    <Fragment key={r.id}>
                      <tr className="hover:bg-[#F8F9FB]">
                        <Td className="w-10 pr-0">
                          <button aria-expanded={isOpen} aria-label={isOpen ? "Hide details" : "Show details"} onClick={() => setOpenRow(isOpen ? null : r.id)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        </Td>
                        <Td className="whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</Td>
                        <Td>{r.actorEmail ?? <span className="text-slate-400">System</span>}{r.companyName ? <span className="block text-sm text-slate-500">{r.companyName}</span> : null}</Td>
                        <Td className="font-semibold">{pretty(r.action)}</Td>
                        <Td className="text-slate-600">{r.resourceType ?? "—"}{r.resourceId ? <span className="block max-w-[180px] truncate text-sm text-slate-400" title={r.resourceId}>{r.resourceId}</span> : null}</Td>
                        <Td className="text-slate-500">{r.ipAddress ?? "—"}</Td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#F8F9FB]"><td colSpan={6} className="px-6 py-4">
                          <p className="mb-1 text-sm font-semibold text-slate-500">Details</p>
                          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{r.metadata ? JSON.stringify(typeof r.metadata === "string" ? JSON.parse(r.metadata as string) : r.metadata, null, 2) : "No extra details."}</pre>
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </TableWrap>
            <Pagination total={log.data?.total ?? 0} limit={PAGE} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>
    </div>
  );
}
