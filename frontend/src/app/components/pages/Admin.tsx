// The platform admin console. A left sidebar switches between screens; the current screen is kept in the URL
// (/admin?tab=users) so a link, the back button and a refresh all land in the right place. Every figure and action
// on these screens is real: nothing here is sample data. Access is enforced by the server on every /api/admin call.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { BookOpenCheck, Briefcase, Building2, ClipboardCheck, HeartPulse, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { useAuth } from "../../../auth/AuthProvider";
import { apiClient } from "../../../services/apiClient";
import { socketService } from "../../../services/socketService";
import { cx } from "../admin/ui";
import { OverviewSection } from "../admin/OverviewSection";
import { ReviewQueueSection } from "../admin/ReviewQueueSection";
import { UsersSection } from "../admin/UsersSection";
import { CompaniesSection } from "../admin/CompaniesSection";
import { DealsSection } from "../admin/DealsSection";
import { AuditSection } from "../admin/AuditSection";
import { SystemSection } from "../admin/SystemSection";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "review", label: "Review queue", icon: ClipboardCheck },
  { key: "users", label: "Users", icon: Users },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "deals", label: "Deals", icon: Briefcase },
  { key: "audit", label: "Audit log", icon: BookOpenCheck },
  { key: "system", label: "System", icon: HeartPulse },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: TabKey = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "overview") as TabKey;
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pending, setPending] = useState(0);
  const main = useRef<HTMLElement>(null);

  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);
  const goTo = useCallback((key: string) => { setParams({ tab: key }); setMenuOpen(false); }, [setParams]);

  // The pending number on the sidebar, refreshed whenever something changes.
  useEffect(() => {
    let alive = true;
    apiClient.get<{ pendingReview: { documents: number; companies: number } }>("/admin/stats?days=7")
      .then((s) => alive && setPending(s.pendingReview.documents + s.pendingReview.companies))
      .catch(() => {});
    return () => { alive = false; };
  }, [refreshKey]);

  // Live: new documents, sign-ups and deals refresh whatever screen is open.
  useEffect(() => {
    socketService.connect();
    return socketService.on("admin:activity", bump);
  }, [bump]);

  useEffect(() => { document.title = `${TABS.find((t) => t.key === tab)?.label} · Admin · B2BForCorporates`; main.current?.focus(); }, [tab]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const Nav = (
    <nav aria-label="Admin sections" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {TABS.map(({ key, label, icon: Icon }) => {
        const active = key === tab;
        return (
          <button key={key} onClick={() => goTo(key)} aria-current={active ? "page" : undefined}
            className={cx("flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold transition-colors", active ? "bg-[#F3E8F8] text-[#6921A5]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900")}>
            <Icon className={cx("h-5 w-5 shrink-0", active ? "text-[#6921A5]" : "text-slate-400")} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {key === "review" && pending > 0 && <span aria-label={`${pending} waiting`} className="rounded-full bg-[#6921A5] px-2 py-0.5 text-[13px] font-bold text-white">{pending}</span>}
          </button>
        );
      })}
    </nav>
  );

  const Brand = (
    <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
      <img src="/logo.png" alt="" className="h-9 w-auto" />
      <div className="leading-tight">
        <p className="text-lg font-semibold text-[#0F1A2E]" style={{ fontFamily: "'Fraunces', serif" }}>Admin</p>
        <p className="text-sm text-slate-500">B2BForCorporates</p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] text-[#0F1A2E]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:shadow">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {Brand}{Nav}
        <div className="border-t border-slate-100 p-4">
          <Link to="/app/dashboard" className="block rounded-lg px-4 py-2.5 text-[15px] font-semibold text-[#6921A5] hover:bg-[#F3E8F8]">← Back to the app</Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onMouseDown={(e) => e.target === e.currentTarget && setMenuOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/50" aria-hidden="true" />
          <aside role="dialog" aria-modal="true" aria-label="Admin menu" className="relative flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            {Brand}{Nav}
            <div className="border-t border-slate-100 p-4"><Link to="/app/dashboard" className="block rounded-lg px-4 py-2.5 text-[15px] font-semibold text-[#6921A5]">← Back to the app</Link></div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-8">
          <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-6 w-6" /></button>
          <span className="hidden items-center gap-2 text-sm font-semibold text-green-700 sm:flex"><span className="h-2 w-2 rounded-full bg-green-500" aria-hidden="true" /> Live</span>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-[15px] font-semibold leading-tight">{user?.name}</p>
              <p className="text-sm leading-tight text-slate-500">{user?.email}</p>
            </div>
            <button onClick={async () => { await logout(); navigate("/auth", { replace: true }); }} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-[15px] font-semibold text-slate-700 hover:bg-slate-50">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
          </div>
        </header>

        <main id="admin-main" ref={main} tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 outline-none sm:px-8">
          {tab === "overview" && <OverviewSection goTo={goTo} refreshKey={refreshKey} />}
          {tab === "review" && <ReviewQueueSection refreshKey={refreshKey} onChanged={bump} />}
          {tab === "users" && <UsersSection refreshKey={refreshKey} onChanged={bump} />}
          {tab === "companies" && <CompaniesSection refreshKey={refreshKey} onChanged={bump} />}
          {tab === "deals" && <DealsSection refreshKey={refreshKey} onChanged={bump} />}
          {tab === "audit" && <AuditSection refreshKey={refreshKey} />}
          {tab === "system" && <SystemSection refreshKey={refreshKey} />}
        </main>
      </div>
    </div>
  );
}
