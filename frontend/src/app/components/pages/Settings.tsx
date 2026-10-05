// Account settings. Every control here does something real: the email preference is saved, the password change ends
// your other sessions, the sessions list is what the server actually holds, and the data export and deletion
// request go to the privacy API. Nothing is shown as "enabled" unless it is.
import { useEffect, useState } from "react";
import { BadgeCheck, Download, Laptop, LogOut, ShieldAlert, Smartphone, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { apiClient } from "../../../services/apiClient";
import { useAuth } from "../../../auth/AuthProvider";
import { friendlyError, useLoad } from "../../../lib/useLoad";
import { formatDate } from "../../../lib/format";

interface Session { id: string; userAgent: string | null; ip: string | null; lastActive: string; current: boolean }

/** "Chrome on Windows" from a raw user-agent string. Good enough to recognise your own devices. */
function describeAgent(ua: string | null): { label: string; mobile: boolean } {
  if (!ua) return { label: "Unknown device", mobile: false };
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "an unknown system";
  return { label: `${browser} on ${os}`, mobile: /Android|iPhone|iPad|Mobile/.test(ua) };
}

function Section({ title, description, children, tone = "normal" }: { title: string; description?: string; children: React.ReactNode; tone?: "normal" | "danger" }) {
  return (
    <section className={`rounded-2xl border bg-white p-6 md:p-8 ${tone === "danger" ? "border-red-300" : "border-slate-200"}`} aria-labelledby={`s-${title.replace(/\s+/g, "-")}`}>
      <h2 id={`s-${title.replace(/\s+/g, "-")}`} className={`text-xl ${tone === "danger" ? "text-red-700" : "text-[#0F1A2E]"}`}>{title}</h2>
      {description && <p className="mt-1 text-[15px] text-slate-500">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

const field = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px]";
const primary = "rounded-lg bg-[#6921A5] px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-[#492F77] disabled:opacity-50";
const plain = "rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function Settings() {
  const { user, refreshUser } = useAuth();
  const [emailOn, setEmailOn] = useState(user?.emailNotifications !== false);
  const [savingPref, setSavingPref] = useState(false);
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { setEmailOn(user?.emailNotifications !== false); }, [user?.emailNotifications]);

  const sessions = useLoad<Session[]>(() => apiClient.get<Session[]>("/auth/sessions"), []);

  const saveEmailPref = async (next: boolean) => {
    setEmailOn(next); setSavingPref(true);
    try {
      await apiClient.put("/auth/preferences", { emailNotifications: next });
      await refreshUser();
      toast.success(next ? "Email notifications are on." : "Email notifications are off.");
    } catch (e) {
      setEmailOn(!next);
      toast.error(friendlyError(e));
    } finally { setSavingPref(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (pwd.next.length < 8) return setPwdError("Your new password must be at least 8 characters.");
    if (pwd.next !== pwd.confirm) return setPwdError("The new passwords do not match.");
    setPwdBusy(true);
    try {
      await apiClient.post("/auth/change-password", { currentPassword: pwd.current, newPassword: pwd.next });
      toast.success("Password changed. Your other devices were signed out.");
      setPwd({ current: "", next: "", confirm: "" });
      void sessions.reload();
    } catch (err) {
      setPwdError(friendlyError(err));
    } finally { setPwdBusy(false); }
  };

  const revoke = async (id: string) => {
    setBusy(id);
    try { await apiClient.delete(`/auth/sessions/${id}`); toast.success("That device was signed out."); await sessions.reload(); }
    catch (e) { toast.error(friendlyError(e)); } finally { setBusy(null); }
  };
  const revokeOthers = async () => {
    if (!window.confirm("Sign out every other device?")) return;
    setBusy("others");
    try { await apiClient.post("/auth/sessions/revoke-others", {}); toast.success("Other devices were signed out."); await sessions.reload(); }
    catch (e) { toast.error(friendlyError(e)); } finally { setBusy(null); }
  };

  const exportData = async () => {
    setBusy("export");
    try {
      const data = await apiClient.get<unknown>("/privacy/export-me");
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(null); }
  };

  const requestDeletion = async () => {
    setBusy("delete");
    try {
      await apiClient.post("/privacy/delete-request", { reason: "Requested from Settings" }, { headers: { "Idempotency-Key": crypto.randomUUID() } });
      toast.success("Deletion requested. We will confirm by email when it is complete.");
      setConfirmDelete("");
    } catch (e) { toast.error(friendlyError(e)); } finally { setBusy(null); }
  };

  const others = (sessions.data ?? []).filter((s) => !s.current);

  return (
    <div className="mx-auto max-w-3xl space-y-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Section title="Your account">
        <dl className="divide-y divide-slate-100 text-[15px]">
          {[
            ["Name", user?.name || "Not set"],
            ["Email", user?.email],
            ["Phone", user?.phone || "Not set"],
          ].map(([k, v]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr]">
              <dt className="font-semibold text-slate-500">{k}</dt>
              <dd className="text-slate-800 break-words">
                {v}
                {k === "Phone" && user?.phone && (
                  <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${user?.phoneVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {user?.phoneVerified ? <><BadgeCheck size={13} aria-hidden="true" /> Verified</> : "Not verified"}
                  </span>
                )}
                {k === "Email" && (
                  <span className={`ml-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${user?.emailVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {user?.emailVerified ? <><BadgeCheck size={13} aria-hidden="true" /> Verified</> : "Not verified"}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        <Link to="/app/verification" className="mt-3 inline-block text-[15px] font-semibold text-[#6921A5] hover:underline">Manage verification</Link>
      </Section>

      <Section title="Notifications" description="In-app notifications are always on. Choose whether we also email you about proposals, agreements, milestones and document decisions.">
        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 cursor-pointer">
          <span>
            <span className="block text-[15px] font-semibold text-slate-800">Email notifications</span>
            <span className="block text-sm text-slate-500">Sent to {user?.email}</span>
          </span>
          <input type="checkbox" role="switch" checked={emailOn} disabled={savingPref} onChange={(e) => void saveEmailPref(e.target.checked)} className="h-5 w-5 accent-[#6921A5]" />
        </label>
      </Section>

      <Section title="Password" description="Changing your password signs out all your other devices.">
        <form onSubmit={changePassword} className="space-y-4">
          <label className="block text-[15px] font-semibold text-slate-700">Current password
            <input type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} className={field} required />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[15px] font-semibold text-slate-700">New password
              <input type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className={field} minLength={8} required />
            </label>
            <label className="block text-[15px] font-semibold text-slate-700">Confirm new password
              <input type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className={field} required />
            </label>
          </div>
          {pwdError && <p role="alert" className="text-sm text-red-600">{pwdError}</p>}
          <button type="submit" disabled={pwdBusy || !pwd.current || !pwd.next} className={primary}>{pwdBusy ? "Updating..." : "Update password"}</button>
        </form>
      </Section>

      <Section title="Where you are signed in" description="These are the browsers and devices that can currently access your account.">
        {sessions.error && <p role="alert" className="text-sm text-red-600">{sessions.error}</p>}
        <ul className="space-y-3">
          {(sessions.data ?? []).map((s) => {
            const d = describeAgent(s.userAgent);
            const Icon = d.mobile ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-[#F8F9FB] p-4">
                <Icon size={22} className="shrink-0 text-slate-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-slate-800">{d.label}{s.ip ? <span className="font-normal text-slate-500"> · {s.ip}</span> : null}</p>
                  <p className={`text-sm ${s.current ? "text-green-700 font-semibold" : "text-slate-500"}`}>{s.current ? "This device" : `Last active ${formatDate(s.lastActive)}`}</p>
                </div>
                {!s.current && <button onClick={() => void revoke(s.id)} disabled={busy === s.id} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-50">Sign out</button>}
              </li>
            );
          })}
        </ul>
        {others.length > 0 && (
          <button onClick={() => void revokeOthers()} disabled={busy === "others"} className={`${plain} mt-4 inline-flex items-center gap-2`}>
            <LogOut size={16} aria-hidden="true" /> Sign out all other devices
          </button>
        )}
        <p className="mt-4 flex items-start gap-2 text-sm text-slate-500">
          <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Two-factor authentication is not available yet. A strong, unique password is your best protection for now.
        </p>
      </Section>

      <Section title="Your data" description="Download a copy of the personal data we hold about you.">
        <button onClick={() => void exportData()} disabled={busy === "export"} className={`${plain} inline-flex items-center gap-2`}>
          <Download size={16} aria-hidden="true" /> {busy === "export" ? "Preparing..." : "Download my data"}
        </button>
      </Section>

      <Section title="Delete my account" description="This sends a deletion request for your account and personal data. Records we must keep by law, such as completed deals and invoices, are retained." tone="danger">
        <p className="flex items-start gap-2 text-sm text-red-700"><TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> This cannot be undone once it is processed.</p>
        <label className="mt-4 block text-[15px] font-semibold text-slate-700">Type DELETE to confirm
          <input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} className={`${field} max-w-xs`} autoComplete="off" />
        </label>
        <button onClick={() => void requestDeletion()} disabled={confirmDelete !== "DELETE" || busy === "delete"} className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-[15px] font-semibold text-white hover:bg-red-700 disabled:opacity-40">
          {busy === "delete" ? "Sending..." : "Request deletion"}
        </button>
      </Section>
    </div>
  );
}
