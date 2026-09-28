import React, { useState, useRef, useEffect } from "react";
import { DealStatus, Role } from "./pages/DealWorkspace";
import {
  Bell, ShieldCheck, CheckCircle2, XCircle, Wallet,
  MoreHorizontal, ChevronRight, Home, Bookmark, BookmarkCheck,
  Share2, Download, Settings, Archive, Trash2, Star
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HeaderProps {
  dealStatus: DealStatus;
  role: Role;
  onApprove: () => void;
  onReject: () => void;
  onFundEscrow: () => void;
  notificationCount?: number;
}

export function Header({ dealStatus, role, onApprove, onReject, onFundEscrow, notificationCount = 3 }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const notifications = [
    { id: 1, text: "Milestone 2 is due in 2 days", time: "2h ago", type: "warning" },
    { id: 2, text: "Alice signed the NDA document", time: "4h ago", type: "success" },
    { id: 3, text: "Escrow funding required to proceed", time: "1d ago", type: "info" },
  ];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusStyle = () => {
    switch (dealStatus) {
      case "Approved": return "bg-green-100 text-green-700 border-green-200 shadow-green-100";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200 shadow-red-100";
      case "Completed": return "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-emerald-100";
      default: return "bg-amber-100 text-amber-700 border-amber-200 shadow-amber-100";
    }
  };

  const getStatusDot = () => {
    switch (dealStatus) {
      case "Approved": return "bg-green-500";
      case "Rejected": return "bg-red-500";
      case "Completed": return "bg-emerald-500";
      default: return "bg-amber-500";
    }
  };

  const menuItems = [
    { icon: Star, label: "Mark as Priority", action: () => {} },
    { icon: Share2, label: "Share Deal", action: () => {} },
    { icon: Download, label: "Export PDF", action: () => {} },
    { icon: Archive, label: "Archive Deal", action: () => {} },
    { icon: Settings, label: "Deal Settings", action: () => {} },
    { icon: Trash2, label: "Delete Deal", action: () => {}, danger: true },
  ];

  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 py-2 border-b border-slate-100">
          <a href="/" className="text-xs text-slate-400 hover:text-[#8B5CF6] transition-colors flex items-center gap-1">
            <Home className="w-3 h-3" /> Dashboard
          </a>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <a href="/deals" className="text-xs text-slate-400 hover:text-[#8B5CF6] transition-colors">Deals</a>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="text-xs font-semibold text-[#8B5CF6]">Deal Workspace</span>
          <span className="text-xs text-slate-300 ml-1">#DW-2024-001</span>
        </div>

        {/* Main Header Row */}
        <div className="h-14 flex items-center justify-between">
          {/* Left: Title + Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8B5CF6] to-cyan-400 flex items-center justify-center shadow-sm shadow-cyan-500/20">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Deal Workspace</h1>
                <p className="text-[10px] text-slate-400 leading-tight">Acme Corp × Globex Inc</p>
              </div>
            </div>

            {/* Status Badge */}
            <motion.div
              key={dealStatus}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${getStatusStyle()}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot()} animate-pulse`}></span>
              {dealStatus}
            </motion.div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Bookmark */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setBookmarked(b => !b)}
              className={`p-2 rounded-lg transition-all ${bookmarked ? "text-amber-500 bg-amber-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"}`}
              title={bookmarked ? "Remove bookmark" : "Bookmark deal"}
            >
              {bookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </motion.button>

            {/* Approve / Reject for Admin */}
            <AnimatePresence>
              {role === "Admin" && dealStatus === "Pending" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-1.5"
                >
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onReject}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 rounded-lg transition-all shadow-sm"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={onApprove}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-lg transition-all shadow-sm shadow-green-500/25"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fund Escrow Button */}
            <AnimatePresence>
              {(role === "Client" || role === "Admin") && (
                <motion.button
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={onFundEscrow}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-lg transition-all shadow-sm shadow-cyan-500/25"
                >
                  <Wallet className="w-3.5 h-3.5" /> Fund Escrow
                </motion.button>
              )}
            </AnimatePresence>

            <div className="h-6 w-px bg-slate-200 mx-0.5"></div>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setNotifOpen(o => !o)}
                className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              >
                <Bell className="w-4 h-4" />
                {notificationCount > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white px-0.5"
                  >
                    {notificationCount}
                  </motion.span>
                )}
              </motion.button>

              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg shadow-slate-200/80 border border-slate-200 overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Notifications</span>
                      <span className="text-[10px] font-semibold text-[#8B5CF6] cursor-pointer hover:underline">Mark all read</span>
                    </div>
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 cursor-pointer">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            n.type === "warning" ? "bg-amber-400" :
                            n.type === "success" ? "bg-green-400" : "bg-blue-400"
                          }`}></div>
                          <div>
                            <p className="text-xs text-slate-700">{n.text}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#8B5CF6] to-teal-300 border-2 border-white shadow-sm flex items-center justify-center text-white text-[10px] font-bold">
              {role.charAt(0)}
            </div>

            {/* 3-Dot Menu */}
            <div className="relative" ref={menuRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setMenuOpen(o => !o)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
              >
                <MoreHorizontal className="w-4 h-4" />
              </motion.button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg shadow-slate-200/80 border border-slate-200 overflow-hidden z-50 py-1"
                  >
                    {menuItems.map((item, i) => (
                      <React.Fragment key={item.label}>
                        {i === menuItems.length - 1 && <div className="my-1 border-t border-slate-100"></div>}
                        <button
                          onClick={() => { item.action(); setMenuOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs transition-colors ${
                            item.danger
                              ? "text-red-500 hover:bg-red-50"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <item.icon className="w-3.5 h-3.5" />
                          {item.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
