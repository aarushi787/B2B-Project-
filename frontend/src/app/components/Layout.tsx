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
import { Sidebar, BottomTabs } from "./Sidebar";
import { useAuth } from "../../auth/AuthProvider";
import { socketService } from "../../services/socketService";

const BREADCRUMB_MAP: Record<string, string> = {
  "/app": "Overview",
  "/app/dashboard": "Overview",
  "/app/companies": "Business Profile",
  "/app/marketplace": "Services",
  "/app/contracts": "Contracts",
  "/app/requirements/new": "Post a Requirement",
  "/app/deals": "Deals",
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
  "/app/ledger": "Ledger",
  "/app/reviews": "Reviews",
  "/app/notifications": "Notifications",
};

export function Layout() {
  const { user, logout: authLogout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "1"; } catch { return false; }
  });
  useEffect(() => { try { localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0"); } catch { /* storage can be blocked */ } }, [collapsed]);
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
      <aside aria-label="Sidebar" className={`hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:flex ${collapsed ? "w-[76px]" : "w-64"}`} style={{ zIndex: 20 }}>
        <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
      </aside>

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
                width: 280,
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
              <Sidebar collapsed={false} mobile onNavigate={() => setMobileOpen(false)} />
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
              <div className="h-20 md:hidden" aria-hidden="true" />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomTabs onMore={() => setMobileOpen(true)} />

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