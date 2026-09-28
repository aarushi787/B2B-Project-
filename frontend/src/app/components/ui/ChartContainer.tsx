import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, RefreshCw, MoreHorizontal, AlertCircle, BarChart2, Copy, Maximize2 } from "lucide-react";
import { toast } from "sonner";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onExport?: () => void;
  minHeight?: number;
  minWidth?: number;
  className?: string;
  badge?: string;
  badgeColor?: string;
  headerDark?: boolean;
  actions?: React.ReactNode;
}

function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 rounded-lg ${className}`} style={style}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function LoadingSkeleton({ minHeight }: { minHeight: number }) {
  return (
    <div className="p-4 space-y-3 flex flex-col" style={{ minHeight }}>
      <div className="flex items-end gap-2 flex-1">
        {[55, 70, 45, 80, 65, 90, 75, 85, 60, 95, 78, 88].map((h, i) => (
          <Shimmer key={i} className="flex-1 rounded-md" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="flex gap-4 justify-center">
        {[0, 1, 2].map(i => <Shimmer key={i} className="h-3 w-12" />)}
      </div>
    </div>
  );
}

export function ChartContainer({
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  onRefresh,
  onExport,
  minHeight = 220,
  minWidth,
  className = "",
  badge,
  badgeColor = "#8B5CF6",
  headerDark = false,
  actions,
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ w: Math.round(e.contentRect.width), h: Math.round(e.contentRect.height) });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const tooSmall = minWidth && dims.w > 0 && dims.w < minWidth;

  const headerBg = headerDark
    ? "bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700"
    : "bg-white border-slate-100";
  const headerText = headerDark ? "text-white" : "text-slate-900";
  const headerSub = headerDark ? "text-slate-400" : "text-slate-400";
  const btnClass = headerDark
    ? "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col bg-white ${className}`}
      style={{ borderColor: headerDark ? "#1e293b" : "#f1f5f9" }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${headerBg}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {badge && (
            <span
              className="text-[9px] font-black px-2 py-0.5 rounded-full text-white shrink-0 uppercase tracking-wide"
              style={{ backgroundColor: badgeColor }}
            >
              {badge}
            </span>
          )}
          <div className="min-w-0">
            <h3 className={`text-sm font-bold truncate ${headerText}`}>{title}</h3>
            {subtitle && <p className={`text-[10px] truncate ${headerSub}`}>{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-3">
          {actions}
          {onRefresh && (
            <button
              onClick={() => { onRefresh(); toast.success("Chart refreshed"); }}
              className={`p-1.5 rounded-lg transition-colors ${btnClass}`}
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Action menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              className={`p-1.5 rounded-lg transition-colors ${btnClass}`}
              title="More options"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50"
                >
                  {onExport && (
                    <button
                      onClick={() => { onExport(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-green-600" /> Export PNG
                    </button>
                  )}
                  <button
                    onClick={() => { toast.success("Data copied to clipboard"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-500" /> Copy data
                  </button>
                  <button
                    onClick={() => { toast.info("Full-screen mode"); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-purple-500" /> Expand view
                  </button>
                  {onRefresh && (
                    <button
                      onClick={() => { onRefresh(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Refresh
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 relative" style={{ minHeight }}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingSkeleton minHeight={minHeight} />
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-10 px-6"
              style={{ minHeight }}
            >
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-700 mb-1">Failed to load chart</p>
                <p className="text-[10px] text-slate-400">{error}</p>
              </div>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#8B5CF6] hover:bg-[#7C3AED] rounded-xl transition-colors"
                >
                  Try again
                </button>
              )}
            </motion.div>
          ) : tooSmall ? (
            <motion.div
              key="toosmall"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-2 py-10"
              style={{ minHeight }}
            >
              <BarChart2 className="w-8 h-8 text-slate-200" />
              <p className="text-[11px] font-semibold text-slate-400">Container too small</p>
              <p className="text-[10px] text-slate-300">Min width: {minWidth}px · Current: {dims.w}px</p>
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
