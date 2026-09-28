// ─── Shared Design System Components ──────────────────────────────────────────
// Used across all pages to ensure consistent ConnectPro UI

import React from "react";
import { Search, ChevronDown } from "lucide-react";

// Status badge
const STATUS: Record<string, { bg: string; text: string; label: string }> = {
  active:       { bg: "#dcfce7", text: "#16a34a", label: "Active" },
  pending:      { bg: "#fef3c7", text: "#d97706", label: "Pending" },
  approved:     { bg: "#dcfce7", text: "#16a34a", label: "Active" },
  completed:    { bg: "#f1f5f9", text: "#64748b", label: "Closed" },
  closed:       { bg: "#f1f5f9", text: "#64748b", label: "Closed" },
  rejected:     { bg: "#fee2e2", text: "#dc2626", label: "Rejected" },
  cancelled:    { bg: "#f1f5f9", text: "#64748b", label: "Cancelled" },
  shortlisted:  { bg: "#ede9fe", text: "#7c3aed", label: "Shortlisted" },
  under_review: { bg: "#fef3c7", text: "#d97706", label: "Under Review" },
  urgent:       { bg: "#fee2e2", text: "#dc2626", label: "Urgent" },
  verified:     { bg: "#dcfce7", text: "#16a34a", label: "Verified" },
  in_review:    { bg: "#fef3c7", text: "#d97706", label: "In Review" },
  not_started:  { bg: "#f1f5f9", text: "#64748b", label: "Not Started" },
};

export function StatusBadge({ status, custom }: { status: string; custom?: { bg: string; text: string; label: string } }) {
  const s = custom ?? STATUS[status.toLowerCase().replace(/ /g, "_")] ?? { bg: "#f1f5f9", text: "#64748b", label: status };
  return (
    <span style={{
      background: s.bg, color: s.text,
      fontSize: 11, fontWeight: 600,
      padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

// Page card wrapper
export function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={className} style={{
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

// Card header
export function CardHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>{title}</h2>
      {right}
    </div>
  );
}

// Blue primary button
export function PrimaryBtn({ children, onClick, style, disabled, ...rest }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; disabled?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? "#94a3b8" : "#2563EB", color: "#fff", border: "none", cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13, fontWeight: 600, padding: "9px 18px", borderRadius: 8,
        display: "flex", alignItems: "center", gap: 6,
        opacity: disabled ? 0.7 : 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// Ghost button
export function GhostBtn({ children, onClick, style, disabled, ...rest }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; disabled?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "#f8fafc", color: "#374151", border: "1px solid #e2e8f0", cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 13, fontWeight: 500, padding: "9px 14px", borderRadius: 8,
        display: "flex", alignItems: "center", gap: 6,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

// Filter dropdown pill
export function FilterPill({ label }: { label: string }) {
  return (
    <button style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
      padding: "7px 14px", fontSize: 13, fontWeight: 500, color: "#374151",
      cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
    }}>
      {label} <ChevronDown style={{ width: 14, height: 14, color: "#94a3b8" }} />
    </button>
  );
}

// Search input
export function SearchInput({ placeholder, value, onChange }: { placeholder: string; value?: string; onChange?: (v: string) => void }) {
  return (
    <div style={{ position: "relative", width: 240 }}>
      <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94a3b8", pointerEvents: "none" }} />
      <input
        placeholder={placeholder}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        style={{
          width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
          fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 8, background: "#f8fafc",
          color: "#0f172a", outline: "none",
        }}
      />
    </div>
  );
}

// Table header
export function TableHeader({ cols }: { cols: string[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: cols.map(() => "1fr").join(" "), padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
      {cols.map(c => (
        <span key={c} style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{c}</span>
      ))}
    </div>
  );
}

// Metric card (3-col variant for requirements pages)
export function MetricCard({ label, value, icon: Icon, iconBg, iconColor }: { label: string; value: string; icon: any; iconBg?: string; iconColor?: string }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: "#64748b", margin: "0 0 6px" }}>{label}</p>
        <p style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: 0 }}>{value}</p>
      </div>
      <div style={{ width: 40, height: 40, background: iconBg || "#eff6ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon style={{ width: 20, height: 20, color: iconColor || "#2563EB" }} />
      </div>
    </div>
  );
}

// Modal
export function Modal({ isOpen, onClose, title, children, width = 500 }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number | string }) {
  if (!isOpen) return null;
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: width, display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", maxHeight: "90vh" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}>&times;</button>
        </div>
        <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// Form Inputs
export function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      <input style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", color: "#0f172a" }} {...props} />
    </div>
  );
}

export function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</label>
      <textarea style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 14, outline: "none", color: "#0f172a", minHeight: 100, resize: "vertical" }} {...props} />
    </div>
  );
}

// Skeleton Loader
export function Skeleton({ width = "100%", height = "20px", borderRadius = "8px", style }: { width?: string, height?: string, borderRadius?: string, style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width, height, borderRadius,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        ...style
      }}
    />
  );
}

// Empty State
export function EmptyState({ icon: Icon, title, desc, action }: { icon: any, title: string, desc: string, action?: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ width: 64, height: 64, background: "#f8fafc", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <Icon style={{ width: 32, height: 32, color: "#94a3b8" }} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "#64748b", margin: "0 auto 24px", maxWidth: 300, lineHeight: 1.5 }}>{desc}</p>
      {action}
    </div>
  );
}

// Pagination
export function Pagination({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
      <span style={{ fontSize: 13, color: "#64748b" }}>Page {currentPage} of {totalPages}</span>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          style={{ padding: "6px 12px", border: "1px solid #e2e8f0", background: currentPage === 1 ? "#f1f5f9" : "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, color: currentPage === 1 ? "#94a3b8" : "#374151", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
        >
          Previous
        </button>
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          style={{ padding: "6px 12px", border: "1px solid #e2e8f0", background: currentPage === totalPages ? "#f1f5f9" : "#fff", borderRadius: 6, fontSize: 13, fontWeight: 600, color: currentPage === totalPages ? "#94a3b8" : "#374151", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
