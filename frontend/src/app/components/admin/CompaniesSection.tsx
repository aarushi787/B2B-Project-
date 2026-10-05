// Every company, with its trust checks. Admins verify or revoke here; each change is audited and the company is told.
import { useMemo, useState } from "react";
import { apiClient } from "../../../services/apiClient";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { TrustBadges, type Trust } from "../TrustBadges";
import { Btn, Card, ConfirmDialog, Drawer, EmptyState, ErrorNote, Loading, PageHeader, Pagination, Pill, SearchInput, SelectBox, TableWrap, Td, Th, formatDateTime, useDebounced } from "./ui";

interface AdminCompany {
  id: string; name: string; email: string | null; ownerEmail: string | null; industry: string | null; description: string | null; address: string | null;
  website: string | null; gst: string | null; pan: string | null; phone: string | null; verified: number | boolean; createdAt: string;
  dealCount: number; pendingDocuments: number; trust: Trust;
}
const PAGE = 15;

export function CompaniesSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const companies = useLoad<AdminCompany[]>(() => apiClient.get<AdminCompany[]>("/admin/companies"), [refreshKey]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<AdminCompany | null>(null);
  const [revoke, setRevoke] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dq = useDebounced(q);

  const rows = useMemo(() => {
    const term = dq.trim().toLowerCase();
    return (companies.data ?? []).filter((c) =>
      (!term || c.name.toLowerCase().includes(term) || (c.ownerEmail ?? "").toLowerCase().includes(term) || (c.industry ?? "").toLowerCase().includes(term)) &&
      (filter === "all" || (filter === "verified") === !!c.verified));
  }, [companies.data, dq, filter]);
  const page = rows.slice(offset, offset + PAGE);

  const setVerified = async (c: AdminCompany, verified: boolean) => {
    setBusy(true); setError("");
    try {
      await apiClient.put(`/companies/${c.id}/verify`, { verified });
      setRevoke(false); setOpen(null);
      await companies.reload(); onChanged();
    } catch (e) { setError(friendlyError(e)); setRevoke(false); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Companies" subtitle={`${companies.data?.length ?? 0} companies. Verified ones show a badge across the platform.`} />
      {companies.error && <ErrorNote message={companies.error} onRetry={() => void companies.reload()} />}
      {error && <ErrorNote message={error} />}

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
          <SearchInput label="Search companies" placeholder="Search by name, owner or industry" value={q} onChange={(v) => { setQ(v); setOffset(0); }} />
          <SelectBox label="Show" value={filter} onChange={(v) => { setFilter(v); setOffset(0); }}><option value="all">All companies</option><option value="unverified">Not verified</option><option value="verified">Verified</option></SelectBox>
        </div>
        {companies.loading && !companies.data ? <Loading /> : rows.length === 0 ? <EmptyState title="No companies match" hint="Try a different search or clear the filter." /> : (
          <>
            <TableWrap label="Companies">
              <thead className="bg-[#F8F9FB]"><tr><Th>Company</Th><Th>Trust</Th><Th>Deals</Th><Th>Documents</Th><Th>Joined</Th><Th className="text-right">Action</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {page.map((c) => (
                  <tr key={c.id} className="hover:bg-[#F8F9FB]">
                    <Td>
                      <button className="text-left" onClick={() => setOpen(c)}>
                        <span className="block font-semibold text-slate-900">{c.name}</span>
                        <span className="block text-sm text-slate-500">{c.ownerEmail ?? "No owner"}{c.industry ? ` · ${c.industry}` : ""}</span>
                      </button>
                    </Td>
                    <Td><TrustBadges trust={c.trust} /></Td>
                    <Td>{c.dealCount}</Td>
                    <Td>{c.pendingDocuments > 0 ? <Pill tone="amber">{c.pendingDocuments} pending</Pill> : <span className="text-slate-400">None</span>}</Td>
                    <Td className="text-slate-500">{formatDateTime(c.createdAt)}</Td>
                    <Td className="text-right">
                      {c.verified
                        ? <Btn size="sm" onClick={() => { setOpen(c); setRevoke(true); }}>Revoke</Btn>
                        : <Btn size="sm" variant="primary" disabled={busy} onClick={() => void setVerified(c, true)}>Verify</Btn>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination total={rows.length} limit={PAGE} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>

      <Drawer open={!!open && !revoke} title={open?.name ?? ""} subtitle={open?.ownerEmail ?? undefined} onClose={() => setOpen(null)}>
        {open && (
          <div className="space-y-6">
            <TrustBadges trust={open.trust} />
            <dl className="divide-y divide-slate-100 text-[15px]">
              {([
                ["Industry", open.industry || "Not set"], ["Address", open.address || "Not set"], ["Website", open.website || "Not set"],
                ["GST number", open.gst || "Not provided"], ["PAN", open.pan || "Not provided"], ["Phone", open.phone || "Not set"],
                ["Description", open.description || "Not set"], ["Joined", formatDateTime(open.createdAt)], ["Deals", String(open.dealCount)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr]"><dt className="font-semibold text-slate-500">{k}</dt><dd className="break-words text-slate-800">{v}</dd></div>
              ))}
            </dl>
            <p className="text-sm text-slate-500">The GST check tests the format and check digit only. It does not look the number up in the government registry.</p>
            <div className="flex gap-3">
              {open.verified
                ? <Btn onClick={() => setRevoke(true)}>Revoke verification</Btn>
                : <Btn variant="primary" disabled={busy} onClick={() => void setVerified(open, true)}>Verify company</Btn>}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={revoke} title="Remove the verified badge?" message={<>{open?.name} will no longer show as verified, and will be told.</>} confirmLabel="Revoke" danger busy={busy}
        onCancel={() => setRevoke(false)} onConfirm={() => open && void setVerified(open, false)} />
    </div>
  );
}
