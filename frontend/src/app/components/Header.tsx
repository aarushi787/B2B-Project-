// The top bar of the signed-in app: page title and breadcrumbs, search, notifications and the account menu.
// It owns its own open/closed state; everything that belongs to the app (notifications, user, navigation) comes in as props.
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield, Settings, Sparkles, Search, Bell, ChevronDown, ChevronRight, PanelLeftClose, PanelLeftOpen, Menu,
  CheckCircle, AlertCircle, Clock, LogOut, User,
} from "lucide-react";

export interface HeaderNotification { id: string; type: "success" | "warning" | "info"; title: string; message: string; time: string; read: boolean; link: string | null }
export interface HeaderUser { name?: string; email?: string; companyName?: string }

export interface HeaderProps {
  crumbs: { label: string; path: string }[];
  pageTitle: string;
  user: HeaderUser | null;
  isAdmin: boolean;
  notifications: HeaderNotification[];
  markAllRead: () => void;
  markRead: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMenu: () => void;
  onStartTour: () => void;
  onLogout: () => void;
}

export function Header({ crumbs, pageTitle, user, isAdmin, notifications, markAllRead, markRead, collapsed, onToggleCollapsed, onOpenMenu, onStartTour, onLogout }: HeaderProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close menus on an outside click or Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setAvatarOpen(false); setNotifOpen(false); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-lg border-b border-slate-200/60 shadow-sm transition-all">
          <div className="flex items-center gap-6 px-6 h-[72px]">
            {/* Mobile hamburger */}
            <button
              onClick={onOpenMenu}
              className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumbs + Title */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {crumbs.map((c, i) => (
                  <React.Fragment key={`${c.path}-${i}`}>
                    {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                    <Link
                      to={c.path}
                      className={`text-[12px] font-semibold tracking-wide uppercase transition-colors ${
                        i === crumbs.length - 1 ? "text-[#6921A5]" : "text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {c.label}
                    </Link>
                  </React.Fragment>
                ))}
              </div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                {pageTitle}
              </h1>
            </div>

            {/* Search */}
            <div className="relative hidden md:block w-[320px] group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#6921A5] transition-colors" />
              <input
                type="text"
                ref={searchRef}
                aria-label="Search businesses"
                placeholder="Search businesses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && search.trim()) navigate(`/explore?q=${encodeURIComponent(search.trim())}`); }}
                className="w-full pl-9 pr-12 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6921A5]/20 focus:border-[#6921A5] focus:bg-white transition-all shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-60">
                <kbd className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded">Ctrl</kbd>
                <kbd className="px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 bg-white border border-slate-200 rounded">K</kbd>
              </div>
            </div>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button
                aria-label="Notifications"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen(o => !o)}
                className="relative p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 border-2 border-white rounded-full text-[11px] font-bold text-white flex items-center justify-center">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: 360,
                      background: "#fff",
                      borderRadius: 12,
                      boxShadow: "0 10px 40px rgba(0,0,0,0.12)",
                      border: "1px solid #e2e8f0",
                      overflow: "hidden",
                      zIndex: 50,
                    }}
                  >
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Notifications</span>
                        <span style={{ fontSize: 11, fontWeight: 700, background: "#ef4444", color: "#fff", padding: "2px 6px", borderRadius: 10 }}>{notifications.filter(n => !n.read).length} new</span>
                      </div>
                      <button onClick={markAllRead} style={{ fontSize: 12, fontWeight: 600, color: "#6921A5", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>
                    </div>
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {notifications.map(n => (
                        <div key={n.id} onClick={() => { markRead(n.id); if (n.link) { setNotifOpen(false); navigate(n.link); } }} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f8fafc", cursor: "pointer", background: n.read ? "#fff" : "#f8fafc" }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: n.type === "success" ? "#dcfce7" : n.type === "warning" ? "#fef3c7" : "#DBC5E7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            {n.type === "success" && <CheckCircle style={{ width: 14, height: 14, color: "#16a34a" }} />}
                            {n.type === "warning" && <AlertCircle style={{ width: 14, height: 14, color: "#d97706" }} />}
                            {n.type === "info" && <Bell style={{ width: 14, height: 14, color: "#6921A5" }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0 }}>{n.title}</p>
                            <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0", lineHeight: "1.4" }}>{n.message}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                              <Clock style={{ width: 10, height: 10, color: "#94a3b8" }} />
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>{n.time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
                      <Link to="/app/notifications" onClick={() => setNotifOpen(false)} style={{ fontSize: 13, fontWeight: 600, color: "#6921A5", textDecoration: "none" }}>View All Notifications</Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={avatarRef}>
              <button
                aria-label="Account menu"
                aria-expanded={avatarOpen}
                onClick={() => setAvatarOpen(o => !o)}
                className="flex items-center gap-2.5 p-1.5 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200 group"
              >
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border-2 border-slate-100 shadow-sm group-hover:border-[#6921A5]/30 transition-colors">
                  <span className="w-full h-full bg-gradient-to-br from-[#6921A5] to-blue-400 flex items-center justify-center text-white text-xs font-bold">{(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}</span>
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <p className="text-xs font-bold text-slate-800 leading-none group-hover:text-[#6921A5] transition-colors">{user?.name || ""}</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1 leading-none">{user?.companyName || ""}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block group-hover:text-[#6921A5] transition-colors" />
              </button>

              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: "calc(100% + 8px)",
                      width: 200,
                      background: "#fff",
                      borderRadius: 10,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                      border: "1px solid #e2e8f0",
                      overflow: "hidden",
                      zIndex: 50,
                    }}
                  >
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>{user?.name ?? ""}</p>
                      <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>{user?.email ?? ""}</p>
                    </div>
                    {[
                      { icon: User, label: "Profile", path: "/app/settings" },
                      { icon: Settings, label: "Settings", path: "/app/settings" },
                      { icon: Sparkles, label: "Platform Tour", action: () => { onStartTour(); setAvatarOpen(false); } },
                      ...(isAdmin ? [{ icon: Shield, label: "Admin Console", path: "/admin" }] : []),
                    ].map(item => (
                      item.action ? (
                        <button key={item.label} onClick={item.action}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", fontSize: 13, color: "#374151", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                          <item.icon style={{ width: 14, height: 14 }} /> {item.label}
                        </button>
                      ) : (
                        <Link key={item.label} to={item.path!}
                          onClick={() => setAvatarOpen(false)}
                          style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", fontSize: 13, color: "#374151", textDecoration: "none" }}>
                          <item.icon style={{ width: 14, height: 14 }} /> {item.label}
                        </Link>
                      )
                    ))}
                    <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 4 }}>
                      <button
                        onClick={onLogout}
                        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", fontSize: 13, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}
                      >
                        <LogOut style={{ width: 14, height: 14 }} /> Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Collapse toggle desktop */}
            <button
              onClick={onToggleCollapsed}
              style={{ padding: 6, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", borderRadius: 6, display: "none" }}
              className="md:block"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen style={{ width: 16, height: 16 }} /> : <PanelLeftClose style={{ width: 16, height: 16 }} />}
            </button>
          </div>
        </header>
  );
}
