// Every user on the platform. Admins can search, see details, change a role, suspend or reinstate, and delete.
// The server refuses anything that would lock the platform out (an admin acting on themselves, or removing the last admin).
import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../auth/AuthProvider";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { Btn, Card, ConfirmDialog, Drawer, EmptyState, ErrorNote, Loading, PageHeader, Pagination, Pill, SearchInput, SelectBox, TableWrap, Td, Th, formatDateTime, useDebounced } from "./ui";

interface AdminUser {
  id: string; email: string; phone: string | null; firstName: string | null; lastName: string | null; role: string;
  createdAt: string; emailVerified: number | boolean; suspendedAt: string | null; suspendedReason: string | null; companyId: string | null;
}
const PAGE = 15;
const nameOf = (u: AdminUser) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
const isAdminRole = (r: string) => r.toLowerCase() === "admin";

function CreateUser({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ email: "", password: "", firstName: "", lastName: "", role: "user" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[15px] font-normal";
  return (
    <Drawer open={open} title="Add a user" subtitle="They can sign in straight away with this password." onClose={onClose}>
      <form className="space-y-4" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr("");
        try { await apiClient.post("/admin/users", { ...f, firstName: f.firstName || undefined, lastName: f.lastName || undefined }); onCreated(); onClose(); setF({ email: "", password: "", firstName: "", lastName: "", role: "user" }); }
        catch (x) { setErr(friendlyError(x)); } finally { setBusy(false); }
      }}>
        <label className="block text-[15px] font-semibold text-slate-700">Email *<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={input} /></label>
        <label className="block text-[15px] font-semibold text-slate-700">Password * <span className="font-normal text-slate-500">(8+ characters)</span><input type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} className={input} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[15px] font-semibold text-slate-700">First name<input value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} className={input} /></label>
          <label className="block text-[15px] font-semibold text-slate-700">Last name<input value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} className={input} /></label>
        </div>
        <label className="block text-[15px] font-semibold text-slate-700">Role
          <select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={input}><option value="user">User</option><option value="admin">Platform admin</option></select>
        </label>
        {err && <p role="alert" className="text-[15px] text-red-600">{err}</p>}
        <Btn type="submit" variant="primary" disabled={busy}>{busy ? "Creating..." : "Create user"}</Btn>
      </form>
    </Drawer>
  );
}

export function UsersSection({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const { user: me } = useAuth();
  const users = useLoad<AdminUser[]>(() => apiClient.get<AdminUser[]>("/admin/users"), [refreshKey]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<null | "suspend" | "reinstate" | "delete" | "promote" | "demote">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dq = useDebounced(q);

  const rows = useMemo(() => {
    const term = dq.trim().toLowerCase();
    return (users.data ?? []).filter((u) =>
      (!term || nameOf(u).toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || (u.phone ?? "").includes(term)) &&
      (role === "all" || (role === "admin") === isAdminRole(u.role)) &&
      (status === "all" || (status === "suspended") === !!u.suspendedAt));
  }, [users.data, dq, role, status]);
  const page = rows.slice(offset, offset + PAGE);

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await work(); setConfirm(null); setOpen(null); await users.reload(); onChanged(); }
    catch (e) { setError(friendlyError(e)); setConfirm(null); } finally { setBusy(false); }
  };

  const target = open;
  const isMe = target?.id === me?.id;

  return (
    <div>
      <PageHeader title="Users" subtitle={`${users.data?.length ?? 0} accounts on the platform.`} actions={<Btn variant="primary" onClick={() => setCreating(true)}><UserPlus className="h-4 w-4" aria-hidden="true" /> Add user</Btn>} />
      {users.error && <ErrorNote message={users.error} onRetry={() => void users.reload()} />}
      {error && <ErrorNote message={error} />}

      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-6 py-4">
          <SearchInput label="Search users" placeholder="Search by name, email or phone" value={q} onChange={(v) => { setQ(v); setOffset(0); }} />
          <SelectBox label="Role" value={role} onChange={(v) => { setRole(v); setOffset(0); }}><option value="all">All roles</option><option value="admin">Admins</option><option value="user">Users</option></SelectBox>
          <SelectBox label="Status" value={status} onChange={(v) => { setStatus(v); setOffset(0); }}><option value="all">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option></SelectBox>
        </div>
        {users.loading && !users.data ? <Loading /> : rows.length === 0 ? <EmptyState title="No users match" hint="Try a different search or clear the filters." /> : (
          <>
            <TableWrap label="Users">
              <thead className="bg-[#F8F9FB]"><tr><Th>User</Th><Th>Role</Th><Th>Email</Th><Th>Status</Th><Th>Joined</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {page.map((u) => (
                  <tr key={u.id} className="cursor-pointer hover:bg-[#F8F9FB]" onClick={() => setOpen(u)}>
                    <Td>
                      <button className="text-left" onClick={(e) => { e.stopPropagation(); setOpen(u); }}>
                        <span className="block font-semibold text-slate-900">{nameOf(u)}{u.id === me?.id ? <span className="ml-2 text-sm font-normal text-slate-500">(you)</span> : null}</span>
                        <span className="block text-sm text-slate-500">{u.email}</span>
                      </button>
                    </Td>
                    <Td><Pill tone={isAdminRole(u.role) ? "purple" : "slate"}>{isAdminRole(u.role) ? "Admin" : "User"}</Pill></Td>
                    <Td><Pill tone={u.emailVerified ? "green" : "amber"}>{u.emailVerified ? "Verified" : "Not verified"}</Pill></Td>
                    <Td><Pill tone={u.suspendedAt ? "red" : "green"}>{u.suspendedAt ? "Suspended" : "Active"}</Pill></Td>
                    <Td className="text-slate-500">{formatDateTime(u.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination total={rows.length} limit={PAGE} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>

      <Drawer open={!!target} title={target ? nameOf(target) : ""} subtitle={target?.email} onClose={() => setOpen(null)}>
        {target && (
          <div className="space-y-6">
            <dl className="divide-y divide-slate-100 text-[15px]">
              {([
                ["Role", isAdminRole(target.role) ? "Platform admin" : "User"],
                ["Status", target.suspendedAt ? `Suspended ${formatDateTime(target.suspendedAt)}${target.suspendedReason ? `: ${target.suspendedReason}` : ""}` : "Active"],
                ["Email", `${target.email} (${target.emailVerified ? "verified" : "not verified"})`],
                ["Phone", target.phone || "Not set"],
                ["Joined", formatDateTime(target.createdAt)],
                ["Company", target.companyId ? target.companyId : "No company"],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="grid gap-1 py-3 sm:grid-cols-[110px_1fr]"><dt className="font-semibold text-slate-500">{k}</dt><dd className="break-words text-slate-800">{v}</dd></div>
              ))}
            </dl>

            {isMe ? (
              <p className="rounded-xl bg-slate-50 p-4 text-[15px] text-slate-600">This is your own account. You cannot suspend, demote or delete yourself.</p>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg text-[#0F1A2E]">Actions</h3>
                <div className="flex flex-wrap gap-3">
                  {isAdminRole(target.role)
                    ? <Btn onClick={() => setConfirm("demote")}>Remove admin access</Btn>
                    : <Btn onClick={() => setConfirm("promote")}>Make platform admin</Btn>}
                  {target.suspendedAt
                    ? <Btn variant="primary" onClick={() => setConfirm("reinstate")}>Reinstate</Btn>
                    : <Btn onClick={() => setConfirm("suspend")}>Suspend</Btn>}
                  <Btn variant="danger" onClick={() => setConfirm("delete")}>Delete user</Btn>
                </div>
                <p className="text-sm text-slate-500">Suspending signs the person out everywhere and blocks sign-in until you reinstate them. Their data is kept.</p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog open={confirm === "suspend"} title="Suspend this user?" message="They will be signed out everywhere and cannot sign in until reinstated." confirmLabel="Suspend" danger busy={busy}
        withReason={{ label: "Reason (kept in the audit log)", required: true }} onCancel={() => setConfirm(null)}
        onConfirm={(reason) => void run(() => apiClient.put(`/admin/users/${target!.id}/suspend`, { suspended: true, reason }))} />
      <ConfirmDialog open={confirm === "reinstate"} title="Reinstate this user?" message="They will be able to sign in again." confirmLabel="Reinstate" busy={busy} onCancel={() => setConfirm(null)}
        onConfirm={() => void run(() => apiClient.put(`/admin/users/${target!.id}/suspend`, { suspended: false }))} />
      <ConfirmDialog open={confirm === "promote"} title="Make this user a platform admin?" message="Admins can see every account and company and make platform decisions. Only do this for people you trust fully." confirmLabel="Make admin" busy={busy} onCancel={() => setConfirm(null)}
        onConfirm={() => void run(() => apiClient.put(`/admin/users/${target!.id}`, { role: "admin" }))} />
      <ConfirmDialog open={confirm === "demote"} title="Remove admin access?" message="They become a regular user and lose access to this console." confirmLabel="Remove access" danger busy={busy} onCancel={() => setConfirm(null)}
        onConfirm={() => void run(() => apiClient.put(`/admin/users/${target!.id}`, { role: "user" }))} />
      <ConfirmDialog open={confirm === "delete"} title="Delete this user permanently?" message={<>This removes <strong>{target ? nameOf(target) : ""}</strong> and cannot be undone. If you only want to stop them signing in, suspend them instead.</>} confirmLabel="Delete forever" danger requireText="DELETE" busy={busy} onCancel={() => setConfirm(null)}
        onConfirm={() => void run(() => apiClient.delete(`/admin/users/${target!.id}`))} />

      <CreateUser open={creating} onClose={() => setCreating(false)} onCreated={() => { void users.reload(); onChanged(); }} />
    </div>
  );
}
