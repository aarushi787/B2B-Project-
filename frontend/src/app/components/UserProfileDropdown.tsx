import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router";
import { User, Settings, Sparkles, Shield, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider";

export function UserProfileDropdown() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/landing';
  };

  return (
    <div className="relative" ref={ref} style={{ fontFamily: "Inter, sans-serif" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: 6,
          background: open ? "#f1f5f9" : "transparent",
          border: "1px solid transparent",
          borderRadius: 12, cursor: "pointer", transition: "all 0.2s"
        }}
      >
        <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", border: "2px solid #e2e8f0" }}>
          <span style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#2563EB,#22d3ee)", color: "#fff", fontSize: 13, fontWeight: 700 }}>{(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}</span>
        </div>
        <div style={{ textAlign: "left", display: "none" }} className="md:block">
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, lineHeight: 1 }}>{user?.name || ""}</p>
          <p style={{ fontSize: 10, fontWeight: 600, color: "#64748b", margin: "4px 0 0", lineHeight: 1 }}>{user?.companyName || ""}</p>
        </div>
        <ChevronDown size={14} color="#64748b" style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", right: 0, top: "calc(100% + 8px)",
              width: 240, background: "#ffffff", borderRadius: 12,
              boxShadow: "0 10px 40px rgba(0,0,0,0.1)", border: "1px solid #e2e8f0",
              overflow: "hidden", zIndex: 100
            }}
          >
            <div style={{ padding: "16px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>{user?.name || ""}</p>
              <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0" }}>{user?.email || "jane@techcorp.com"}</p>
            </div>
            <div style={{ padding: 8 }}>
              <Link to="/app/dashboard" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", fontSize: 13, fontWeight: 500, color: "#334155", textDecoration: "none", borderRadius: 8 }}>
                <User size={16} /> My Dashboard
              </Link>
              <Link to="/app/settings" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", fontSize: 13, fontWeight: 500, color: "#334155", textDecoration: "none", borderRadius: 8 }}>
                <Settings size={16} /> Account Settings
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setOpen(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", fontSize: 13, fontWeight: 500, color: "#334155", textDecoration: "none", borderRadius: 8 }}>
                  <Shield size={16} /> Admin Console
                </Link>
              )}
            </div>
            <div style={{ padding: 8, borderTop: "1px solid #f1f5f9" }}>
              <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", fontSize: 13, fontWeight: 500, color: "#ef4444", background: "none", border: "none", cursor: "pointer", borderRadius: 8 }}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
