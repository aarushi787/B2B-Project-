// The app's navigation, organised by what people do (buying, selling, deals, company) rather than by page names.
// Badges are live and real. It collapses to icons (and remembers that), and on a phone a bottom tab bar replaces it.
import type { ComponentType } from "react";
import { Link, useLocation } from "react-router";
import {
  Briefcase, Building2, ClipboardList, FileSignature, Home, Inbox, Landmark, MessageSquare, PanelLeftClose, PanelLeftOpen,
  Plus, Send, Settings, Shield, ShieldCheck, Sparkles, Store, Menu,
} from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";
import { useSidebarCounts, type SidebarCounts } from "../../lib/useSidebarCounts";

type BadgeKey = "proposals" | "alerts" | "verification";
interface NavItem { label: string; path: string; icon: ComponentType<{ className?: string }>; match?: string[]; badge?: BadgeKey }
interface NavGroup { id: string; label?: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  { id: "home", items: [{ label: "Overview", path: "/app/dashboard", icon: Home }] },
  { id: "buying", label: "Buying", items: [
    { label: "My requirements", path: "/app/requirements/active", match: ["/app/requirements"], icon: ClipboardList },
    { label: "Proposals received", path: "/app/opportunities/received", match: ["/app/opportunities/received", "/app/opportunities/proposals"], icon: Inbox, badge: "proposals" },
  ] },
  { id: "selling", label: "Selling", items: [
    { label: "Discover leads", path: "/app/opportunities/matching", icon: Sparkles },
    { label: "Proposals sent", path: "/app/opportunities/sent", match: ["/app/opportunities/sent", "/app/opportunities/send"], icon: Send },
  ] },
  { id: "deals", label: "Deals", items: [
    { label: "Deals", path: "/app/deals", icon: Briefcase, badge: "alerts" },
    { label: "Contracts", path: "/app/contracts", icon: FileSignature },
    { label: "Ledger", path: "/app/ledger", icon: Landmark },
    { label: "Messages", path: "/app/messaging", icon: MessageSquare },
  ] },
  { id: "company", label: "Company", items: [
    { label: "Business profile", path: "/app/companies", icon: Building2 },
    { label: "Services", path: "/app/marketplace", icon: Store },
    { label: "Verification", path: "/app/verification", icon: ShieldCheck, badge: "verification" },
    { label: "Settings", path: "/app/settings", icon: Settings },
  ] },
];

const isActive = (pathname: string, item: NavItem) =>
  (item.match ?? [item.path]).some((p) => pathname === p || pathname.startsWith(`${p}/`));

function badgeValue(key: BadgeKey | undefined, c: SidebarCounts): { n: number; tone: "purple" | "amber"; label: string } | null {
  if (key === "proposals" && c.proposals > 0) return { n: c.proposals, tone: "purple", label: `${c.proposals} waiting for a reply` };
  if (key === "alerts" && c.alerts > 0) return { n: c.alerts, tone: "purple", label: `${c.alerts} need your action` };
  if (key === "verification" && c.verificationDone < c.verificationTotal) {
    const left = c.verificationTotal - c.verificationDone;
    return { n: left, tone: "amber", label: `${left} profile check${left === 1 ? "" : "s"} left` };
  }
  return null;
}

export function Sidebar({ collapsed, onToggleCollapsed, mobile = false, onNavigate }: { collapsed: boolean; onToggleCollapsed?: () => void; mobile?: boolean; onNavigate?: () => void }) {
  const { user, isAdmin } = useAuth();
  const { pathname } = useLocation();
  const counts = useSidebarCounts();
  const narrow = collapsed && !mobile;
  const groups: NavGroup[] = isAdmin ? [...GROUPS, { id: "admin", label: "Platform", items: [{ label: "Admin console", path: "/admin", icon: Shield }] }] : GROUPS;
  const pct = Math.round((counts.verificationDone / counts.verificationTotal) * 100);

  return (
    <div className="flex h-full flex-col" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div className={`flex items-center border-b border-slate-100 ${narrow ? "justify-center px-2 py-4" : "px-5 py-4"}`}>
        <Link to="/app/dashboard" aria-label="B2BForCorporates home" onClick={onNavigate} className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6921A5]">
          <img src="/logo.png" alt="" className={narrow ? "h-8 w-auto" : "h-10 w-auto"} />
        </Link>
      </div>

      <div className={narrow ? "px-2 pt-4" : "px-4 pt-4"}>
        <Link to="/app/requirements/new" onClick={onNavigate} title={narrow ? "Post a requirement" : undefined} aria-label="Post a requirement"
          className={`flex items-center justify-center gap-2 rounded-xl bg-[#6921A5] text-[15px] font-semibold text-white transition-colors hover:bg-[#492F77] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6921A5] ${narrow ? "h-11 w-full" : "px-4 py-3"}`}>
          <Plus className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!narrow && "Post a requirement"}
        </Link>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-4">
        {groups.map((group) => (
          <div key={group.id} className="mb-3">
            {group.label && (narrow
              ? <hr className="mx-3 mb-2 border-slate-100" />
              : <p className="px-3 pb-1.5 pt-2 text-[13px] font-bold uppercase tracking-wider text-slate-400">{group.label}</p>)}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const badge = badgeValue(item.badge, counts);
                const Icon = item.icon;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onNavigate}
                      title={narrow ? item.label : undefined}
                      aria-label={narrow ? `${item.label}${badge ? `, ${badge.label}` : ""}` : undefined}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center rounded-xl text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6921A5] ${narrow ? "h-11 justify-center" : "gap-3 px-3 py-2.5"} ${active ? "bg-[#F3E8F8] text-[#6921A5]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}
                    >
                      {active && !narrow && <span aria-hidden="true" className="absolute -left-2 top-2 bottom-2 w-1 rounded-full bg-[#6921A5]" />}
                      <Icon className={`h-5 w-5 shrink-0 ${active ? "text-[#6921A5]" : "text-slate-400"}`} />
                      {!narrow && <span className="flex-1 truncate">{item.label}</span>}
                      {badge && (narrow
                        ? <span aria-hidden="true" className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ring-2 ring-white ${badge.tone === "amber" ? "bg-amber-500" : "bg-[#6921A5]"}`} />
                        : <span aria-label={badge.label} className={`rounded-full px-2 py-0.5 text-[13px] font-bold ${badge.tone === "amber" ? "bg-amber-100 text-amber-800" : "bg-[#6921A5] text-white"}`}>{badge.n}</span>)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!narrow && counts.verificationDone < counts.verificationTotal && (
        <Link to="/app/verification" onClick={onNavigate} className="mx-3 mb-3 block rounded-xl border border-[#DBC5E7] bg-[#F8F9FB] p-4 hover:bg-[#F3E8F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6921A5]">
          <p className="flex items-center justify-between text-[15px] font-semibold text-[#0F1A2E]">Profile checks <span className="text-[#6921A5]">{counts.verificationDone}/{counts.verificationTotal}</span></p>
          <div role="progressbar" aria-label="Profile checks complete" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="mt-2 h-2 overflow-hidden rounded-full bg-[#DBC5E7]/60">
            <div className="h-full rounded-full bg-[#6921A5] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-500">Verified businesses get more replies.</p>
        </Link>
      )}

      <div className={`flex items-center border-t border-slate-100 ${narrow ? "flex-col gap-2 px-2 py-3" : "gap-3 px-4 py-3"}`}>
        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6921A5] to-[#4B99E4] text-base font-bold text-white">
          {(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}
        </span>
        {!narrow && (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight text-slate-900">{user?.name}</p>
            <p className="truncate text-sm leading-tight text-slate-500">{isAdmin ? "Platform admin" : user?.companyName ?? "Member"}</p>
          </div>
        )}
        {!mobile && onToggleCollapsed && (
          <button onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6921A5]">
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
}

/** Phone navigation: the five things people do most, always within thumb reach. "More" opens the full menu. */
export function BottomTabs({ onMore }: { onMore: () => void }) {
  const { pathname } = useLocation();
  const counts = useSidebarCounts();
  const tabs = [
    { label: "Overview", path: "/app/dashboard", icon: Home, n: 0 },
    { label: "Proposals", path: "/app/opportunities/received", match: ["/app/opportunities"], icon: Inbox, n: counts.proposals },
    { label: "Deals", path: "/app/deals", icon: Briefcase, n: counts.alerts },
    { label: "Messages", path: "/app/messaging", icon: MessageSquare, n: 0 },
  ];
  const cls = "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6921A5]";
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {tabs.map((t) => {
        const active = (t.match ?? [t.path]).some((p) => pathname === p || pathname.startsWith(`${p}/`));
        return (
          <Link key={t.path} to={t.path} aria-current={active ? "page" : undefined} className={`${cls} ${active ? "text-[#6921A5]" : "text-slate-500"}`}>
            <t.icon className="h-6 w-6" />
            {t.label}
            {t.n > 0 && <span aria-label={`${t.n} waiting`} className="absolute right-[22%] top-1 min-w-[18px] rounded-full bg-[#6921A5] px-1 text-center text-[12px] font-bold leading-[18px] text-white">{t.n}</span>}
          </Link>
        );
      })}
      <button onClick={onMore} className={`${cls} text-slate-500`}><Menu className="h-6 w-6" />More</button>
    </nav>
  );
}
