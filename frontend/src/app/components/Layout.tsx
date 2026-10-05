import React, { useState, useEffect, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { apiClient } from "../../services/apiClient";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, Building2, ShoppingBag, Folder,
  Shield, Settings, FileText, Sparkles, Send, Inbox,
  Archive, MessageSquare, Search, Bell, ChevronDown, ChevronRight,
  PanelLeftClose, PanelLeftOpen, Menu, X,
  CheckCircle, AlertCircle, Clock, LogOut, User,
} from "lucide-react";
import { Onboarding } from "./Onboarding";
import { Header } from "./Header";
import { useAuth } from "../../auth/AuthProvider";
import { socketService } from "../../services/socketService";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview",              path: "/app/dashboard",              group: "root" },

  // Highest Priority: Core Marketplace Actions
  { icon: Sparkles,        label: "Discover Leads",       path: "/app/opportunities/matching", group: "marketplace" },
  { icon: FileText,        label: "My Requirements",      path: "/app/requirements/active",    group: "marketplace" },
  { icon: Send,            label: "Sent Proposals",       path: "/app/opportunities/sent",     group: "marketplace" },
  { icon: Inbox,           label: "Received Proposals",   path: "/app/opportunities/received", group: "marketplace" },

  // Projects & Deals
  { icon: Folder,          label: "Portfolio / Deals",    path: "/app/deals",                  group: "projects" },
  { icon: Shield,          label: "Verification",         path: "/app/verification",           group: "projects" },
  { icon: FileText,        label: "Contracts",            path: "/app/contracts",              group: "projects" },
  { icon: FileText,        label: "Ledger",               path: "/app/ledger",                 group: "projects" },

  // Communication
  { icon: MessageSquare,   label: "Messages",             path: "/app/messaging",              group: "communication" },

  // Administrative: Company Identity
  { icon: Building2,       label: "Business Profile",     path: "/app/companies",              group: "company" },
  { icon: ShoppingBag,     label: "Services Catalog",     path: "/app/marketplace",            group: "company" },
  { icon: FileText,        label: "Investor Portal",      path: "/app/investor",               group: "company" },

  // Admin & Settings
  { icon: Settings,        label: "Settings",             path: "/app/settings",               group: "settings" },
];

const GROUPS = [
  { id: "root",           label: null,              items: NAV_ITEMS.filter(n => n.group === "root") },
  { id: "marketplace",    label: "MARKETPLACE",     items: NAV_ITEMS.filter(n => n.group === "marketplace") },
  { id: "projects",       label: "PROJECTS",        items: NAV_ITEMS.filter(n => n.group === "projects") },
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
  "/app/contracts": "Contracts",
  "/app/verification": "Verification",
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
    <div className="flex items-center justify-center w-full">
      <img src="/logo.png" alt="B2B Logo" style={{ height: small ? 32 : 44, width: "auto", objectFit: "contain" }} className="shrink-0" />
    </div>
  );
}

export function Layout() {
  const { user, logout: authLogout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);

  // Real notifications: loaded from the API, then pushed live over the websocket.
  const toUi = (n: any) => ({
    id: n.id,
    type: n.type === 'success' || n.type === 'warning' ? n.type : 'info',
    title: n.title,
    message: n.message,
    time: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now',
    read: !!n.isRead,
    link: n.payload?.link ?? null,
  });

  useEffect(() => {
    let alive = true;
    apiClient.get<any[]>('/notifications').then((rows) => { if (alive) setNotifications((rows || []).map(toUi)); }).catch(() => {});
    socketService.connect();
    const unsubscribe = socketService.on<any>('notifications:new', (n) => {
      setNotifications((prev) => (prev.some((p) => p.id === n.id) ? prev : [toUi({ ...n, createdAt: n.createdAt ?? new Date().toISOString() }), ...prev]));
    });
    return () => { alive = false; unsubscribe(); };
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    apiClient.put('/notifications/read-all', {}).catch(() => {});
  };
  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    apiClient.put(`/notifications/${id}/read`, {}).catch(() => {});
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);


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
      <div className="flex flex-col h-full" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
                  fontSize: 11,
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
                        whileHover={{ x: 4, backgroundColor: isActive ? "#F3E8F8" : "#f8fafc" }}
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
                          background: isActive ? "#F3E8F8" : "transparent",
                          color: isActive ? "#6921A5" : "#64748b",
                          fontWeight: isActive ? 600 : 500,
                          fontSize: 13,
                          borderLeft: isActive && !isCollapsed ? "3px solid #6921A5" : "3px solid transparent",
                        }}
                        className="sidebar-link"
                      >
                        <item.icon
                          style={{
                            width: 18,
                            height: 18,
                            flexShrink: 0,
                            color: isActive ? "#6921A5" : "#94a3b8",
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
                            fontSize: 13,
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
                background: "linear-gradient(135deg, #1e3a8a 0%, #6921A5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", margin: 0, lineHeight: "1.2" }}>
                  {user?.name ?? ""}
                </p>
                <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: "1.2" }}>{isAdmin ? "Platform admin" : (user as any)?.companyName ?? "Member"}</p>
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
    <div style={{ display: "flex", height: "100vh", background: "#f8fafc", overflow: "hidden", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

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

        <Header
          crumbs={crumbs}
          pageTitle={pageTitle}
          user={user}
          isAdmin={isAdmin}
          notifications={notifications}
          markAllRead={markAllRead}
          markRead={markRead}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(c => !c)}
          onOpenMenu={() => setMobileOpen(true)}
          onStartTour={() => setShowOnboarding(true)}
          onLogout={async () => { await authLogout(); window.location.href = '/auth'; }}
        />

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
              <Outlet context={{ notifications, setNotifications, markAllRead, markRead }} />
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