import React, { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Building2, ShoppingBag, Folder,
  Shield, Settings, FileText, Sparkles, Send, Inbox,
  Archive, MessageSquare, Search, Bell, ChevronDown,
  PanelLeftClose, PanelLeftOpen, Menu, X,
  CheckCircle, AlertCircle, Clock, LogOut, User,
} from "lucide-react";
import { Onboarding } from "./Onboarding";
import { useAuth } from "../../auth/AuthProvider";
import { socketService } from "../../services/socketService";

// ─── Nav config ─────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview",              path: "/app/dashboard",              group: "root" },

  // Highest Priority: Core Marketplace Actions
  { icon: Sparkles,        label: "Discover Leads",       path: "/app/opportunities/matching", group: "marketplace" },
  { icon: FileText,        label: "My Requirements",      path: "/app/requirements/active",    group: "marketplace" },
  { icon: Send,            label: "Proposals",            path: "/app/opportunities/sent",     group: "marketplace" },

  // Communication
  { icon: MessageSquare,   label: "Messages",             path: "/app/messaging",              group: "communication" },

  // Administrative: Company Identity
  { icon: Building2,       label: "Business Profile",     path: "/app/companies",              group: "company" },
  { icon: ShoppingBag,     label: "Services Catalog",     path: "/app/marketplace",            group: "company" },

  // Lowest Priority: Settings
  { icon: Settings,        label: "Settings",             path: "/app/settings",               group: "settings" },
  { icon: Shield,          label: "Admin Portal",         path: "/app/admin",                  group: "settings" },
];

const GROUPS = [
  { id: "root",           label: null,              items: NAV_ITEMS.filter(n => n.group === "root") },
  { id: "marketplace",    label: "MARKETPLACE",     items: NAV_ITEMS.filter(n => n.group === "marketplace") },
  { id: "communication",  label: "COMMUNICATION",   items: NAV_ITEMS.filter(n => n.group === "communication") },
  { id: "company",        label: "MY BUSINESS",     items: NAV_ITEMS.filter(n => n.group === "company") },
  { id: "settings",       label: null,              items: NAV_ITEMS.filter(n => n.group === "settings") },
];

const BREADCRUMB_MAP: Record<string, string> = {
  "/app": "Overview",
  "/app/dashboard": "Overview",
  "/app/companies": "Business Profile",
  "/app/marketplace": "Services",
  "/app/deals": "Portfolio",
  "/app/contracts": "Verification",
  "/app/settings": "Business Settings",
  "/app/requirements/active": "Active Requirements",
  "/app/requirements/closed": "Closed Requirements",
  "/app/requirements/details": "Requirement Details",
  "/app/opportunities/matching": "Matching Requirements",
  "/app/opportunities/sent": "Sent Proposals",
  "/app/opportunities/received": "Received Proposals",
  "/app/enquiries/sent": "Sent Enquiries",
  "/app/enquiries/received": "Received Enquiries",
  "/app/enquiries/archived": "Archived Enquiries",
  "/app/messaging": "Messages",
};

// ─── Brand Logo ─────────────────────────────────────────────────────────────
function BrandLogo({ small }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/logo.png" alt="B2B Logo" style={{ height: small ? 28 : 34, width: "auto", objectFit: "contain" }} className="shrink-0" />
      {!small && (
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", lineHeight: "1.1" }}>B2B</div>
          <div style={{ fontWeight: 600, fontSize: 9, color: "#2563EB", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: "1.1" }}>CORPORATES</div>
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { user, logout: authLogout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState("");
  const avatarRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([
    { id: 1, type: "success", title: "Welcome!", message: "Your real-time notifications will appear here.", time: "Just now" },
  ]);

  useEffect(() => {
    socketService.connect();
    const handleNotification = (data: any) => {
      setNotifications(prev => [{
        id: Date.now(),
        type: data.type || "info",
        title: data.title || "New Notification",
        message: data.message || data.text || "You have a new alert.",
        time: "Just now"
      }, ...prev]);
    };
    
    const unsubscribe = socketService.on('notification', handleNotification);
    return () => unsubscribe();
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // Breadcrumbs
  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs = [
    { label: "Console", path: "/app/dashboard" },
    ...segments.slice(1).map((seg, i) => {
      const path = "/" + segments.slice(0, i + 2).join("/");
      return { label: BREADCRUMB_MAP[path] ?? seg.charAt(0).toUpperCase() + seg.slice(1), path };
    }),
  ];
  const pageTitle = BREADCRUMB_MAP[location.pathname] ?? crumbs[crumbs.length - 1]?.label ?? "Dashboard";

  // Sidebar
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => {
    const isCollapsed = collapsed && !isMobile;
    return (
      <div className="flex flex-col h-full" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* Logo */}
        <div
          style={{
            padding: isCollapsed ? "20px 12px" : "20px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            minHeight: 64,
            background: "linear-gradient(to right, #ffffff, #f8fafc)"
          }}
        >
          {isCollapsed
            ? <BrandLogo small />
            : <BrandLogo />
          }
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          {GROUPS.map(group => (
            <div key={group.id} style={{ marginBottom: group.label ? 16 : 4 }}>
              {group.label && !isCollapsed && (
                <p style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "0 8px",
                  marginBottom: 4,
                  marginTop: group.id !== "root" ? 4 : 0,
                }}>
                  {group.label}
                </p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {group.items.map(item => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== "/" && location.pathname.startsWith(item.path));
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={isCollapsed ? item.label : undefined}
                      style={{ textDecoration: "none" }}
                    >
                      <motion.div
                        whileHover={{ x: 4, backgroundColor: isActive ? "#eff6ff" : "#f8fafc" }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: isCollapsed ? 0 : 12,
                          padding: isCollapsed ? "10px" : "10px 14px",
                          borderRadius: 10,
                          justifyContent: isCollapsed ? "center" : "flex-start",
                          position: "relative",
                          background: isActive ? "#eff6ff" : "transparent",
                          color: isActive ? "#2563EB" : "#64748b",
                          fontWeight: isActive ? 600 : 500,
                          fontSize: 13,
                          borderLeft: isActive && !isCollapsed ? "3px solid #2563EB" : "3px solid transparent",
                        }}
                        className="sidebar-link"
                      >
                        <item.icon
                          style={{
                            width: 18,
                            height: 18,
                            flexShrink: 0,
                            color: isActive ? "#2563EB" : "#94a3b8",
                            transition: "color 0.2s"
                          }}
                        />
                        {!isCollapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "color 0.2s" }}>{item.label}</span>}
                        {/* Tooltip on collapsed */}
                        {isCollapsed && (
                          <div style={{
                            position: "absolute",
                            left: "calc(100% + 12px)",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "#0f172a",
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: 600,
                            padding: "6px 12px",
                            borderRadius: 6,
                            whiteSpace: "nowrap",
                            opacity: 0,
                            pointerEvents: "none",
                            zIndex: 99,
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          }} className="sidebar-tooltip">
                            {item.label}
                          </div>
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User info at bottom */}
        <div style={{ borderTop: "1px solid #f1f5f9", padding: isCollapsed ? "12px 8px" : "12px 16px" }}>
          {!isCollapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #1e3a8a 0%, #2563EB 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <img
                  src="https://i.pravatar.cc/36?img=12"
                  alt="User"
                  style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }}
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0, lineHeight: "1.2" }}>
                  {user?.name ?? "TechVista Solutions"}
                </p>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0, lineHeight: "1.2" }}>Admin Account</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{ width: "100%", display: "flex", justifyContent: "center", padding: 6, color: "#64748b", background: "none", border: "none", cursor: "pointer", borderRadius: 8 }}
            >
              <PanelLeftOpen style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc", overflow: "hidden", fontFamily: "Inter, sans-serif" }}>

      {/* Onboarding overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <Onboarding
            onComplete={() => setShowOnboarding(false)}
            onSkip={() => setShowOnboarding(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 60 : 220 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e2e8f0",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          overflow: "hidden",
          zIndex: 20,
        }}
        className="hidden md:flex"
      >
        <SidebarContent />
      </motion.aside>

      {/* ── Mobile Drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)", zIndex: 30 }}
              className="md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: "fixed",
                left: 0, top: 0, bottom: 0,
                width: 240,
                background: "#ffffff",
                borderRight: "1px solid #e2e8f0",
                zIndex: 40,
              }}
              className="md:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                style={{ position: "absolute", top: 12, right: 12, padding: 6, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", borderRadius: 6 }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main Content ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

        {/* Top Header */}
        <header style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          flexShrink: 0,
          zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 24px", height: 64 }}>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              style={{ padding: 6, color: "#64748b", background: "none", border: "none", cursor: "pointer", borderRadius: 6 }}
              className="md:hidden"
            >
              <Menu style={{ width: 20, height: 20 }} />
            </button>

            {/* Breadcrumbs + Title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                {crumbs.map((c, i) => (
                  <React.Fragment key={`${c.path}-${i}`}>
                    {i > 0 && <span style={{ fontSize: 12, color: "#94a3b8" }}>/</span>}
                    <Link
                      to={c.path}
                      style={{
                        fontSize: 12,
                        color: i === crumbs.length - 1 ? "#64748b" : "#94a3b8",
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                    >
                      {c.label}
                    </Link>
                  </React.Fragment>
                ))}
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: "1.2" }}>
                {pageTitle}
              </h1>
            </div>

            {/* Search */}
            <div style={{ position: "relative", width: 260 }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8", pointerEvents: "none" }} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  paddingLeft: 32,
                  paddingRight: 12,
                  paddingTop: 8,
                  paddingBottom: 8,
                  fontSize: 13,
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  background: "#f8fafc",
                  color: "#0f172a",
                  outline: "none",
                }}
              />
            </div>

            {/* Notifications */}
            <div style={{ position: "relative" }} ref={notifRef}>
              <button
                onClick={() => setNotifOpen(o => !o)}
                style={{
                  position: "relative",
                  padding: 8,
                  color: "#64748b",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                }}
              >
                <Bell style={{ width: 18, height: 18 }} />
                <span style={{
                  position: "absolute",
                  top: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 9,
                  fontWeight: 700,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {notifications.length}
                </span>
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
                        <span style={{ fontSize: 10, fontWeight: 700, background: "#ef4444", color: "#fff", padding: "2px 6px", borderRadius: 10 }}>{notifications.length} new</span>
                      </div>
                      <button style={{ fontSize: 11, fontWeight: 600, color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>Mark all read</button>
                    </div>
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {notifications.map(n => (
                        <div key={n.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f8fafc", cursor: "pointer" }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: n.type === "success" ? "#dcfce7" : n.type === "warning" ? "#fef3c7" : "#dbeafe",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            {n.type === "success" && <CheckCircle style={{ width: 14, height: 14, color: "#16a34a" }} />}
                            {n.type === "warning" && <AlertCircle style={{ width: 14, height: 14, color: "#d97706" }} />}
                            {n.type === "info" && <Bell style={{ width: 14, height: 14, color: "#2563EB" }} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: "#0f172a", margin: 0 }}>{n.title}</p>
                            <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0", lineHeight: "1.4" }}>{n.message}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                              <Clock style={{ width: 10, height: 10, color: "#94a3b8" }} />
                              <span style={{ fontSize: 10, color: "#94a3b8" }}>{n.time}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: "10px 16px", borderTop: "1px solid #f1f5f9", textAlign: "center" }}>
                      <button style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", background: "none", border: "none", cursor: "pointer" }}>View All Notifications</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar / User menu */}
            <div style={{ position: "relative" }} ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen(o => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 8,
                }}
              >
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "2px solid #e2e8f0",
                }}>
                  <img
                    src="https://i.pravatar.cc/34?img=12"
                    alt="User"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => {
                      const el = e.target as HTMLImageElement;
                      el.parentElement!.style.background = "#2563EB";
                      el.style.display = "none";
                    }}
                  />
                </div>
                <ChevronDown style={{ width: 14, height: 14, color: "#64748b" }} />
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
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0 }}>{user?.name ?? "TechVista Solutions"}</p>
                      <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0" }}>{user?.email ?? "enterprise@techvista.com"}</p>
                    </div>
                    {[
                      { icon: User, label: "Profile", path: "/app/settings" },
                      { icon: Settings, label: "Settings", path: "/app/settings" },
                      { icon: Sparkles, label: "Platform Tour", action: () => { setShowOnboarding(true); setAvatarOpen(false); } },
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
                        onClick={async () => { await authLogout(); window.location.href = '/auth'; }}
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
              onClick={() => setCollapsed(c => !c)}
              style={{ padding: 6, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", borderRadius: 6, display: "none" }}
              className="md:block"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen style={{ width: 16, height: 16 }} /> : <PanelLeftClose style={{ width: 16, height: 16 }} />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: "auto", padding: "24px" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ minHeight: "100%" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <style>{`
        .sidebar-link:hover {
          background: #f8fafc !important;
          color: #0f172a !important;
        }
        .sidebar-link:hover .sidebar-tooltip {
          opacity: 1 !important;
        }
        a.sidebar-link { transition: background 0.12s, color 0.12s; }
      `}</style>
    </div>
  );
}