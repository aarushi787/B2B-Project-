// Shared building blocks for the admin console, so every screen looks and behaves the same.
// Type scale: body 16px, table text 15px, secondary text 14px, badges 13px. Nothing in the console is smaller than 13px.
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Inbox, Loader2, Search, X } from "lucide-react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// ── Layout ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl text-[#0F1A2E]">{title}</h1>
        {subtitle && <p className="mt-1 text-base text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, action, children, className, padded = true }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cx("rounded-2xl border border-slate-200 bg-white", className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            {title && <h2 className="text-xl text-[#0F1A2E]">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-6" : ""}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = "purple", onClick }: { label: string; value: React.ReactNode; hint?: string; icon: React.ComponentType<{ className?: string }>; tone?: "purple" | "green" | "amber" | "red" | "blue"; onClick?: () => void }) {
  const tones = { purple: "bg-[#F3E8F8] text-[#6921A5]", green: "bg-green-100 text-green-700", amber: "bg-amber-100 text-amber-700", red: "bg-red-100 text-red-700", blue: "bg-sky-100 text-sky-700" };
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-semibold text-slate-500">{label}</p>
        <span className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}><Icon className="h-5 w-5" /></span>
      </div>
      <p className="mt-3 text-4xl font-bold leading-none text-[#0F1A2E]">{value}</p>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </>
  );
  const cls = "rounded-2xl border border-slate-200 bg-white p-5 text-left";
  return onClick
    ? <button onClick={onClick} className={cx(cls, "transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#6921A5]")}>{body}</button>
    : <div className={cls}>{body}</div>;
}

// ── Small pieces ─────────────────────────────────────────────────────────────────────────────────────────────────────────
type Tone = "green" | "amber" | "red" | "purple" | "slate" | "blue";
const PILL: Record<Tone, string> = {
  green: "bg-green-100 text-green-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-800",
  purple: "bg-[#F3E8F8] text-[#6921A5]", slate: "bg-slate-100 text-slate-700", blue: "bg-sky-100 text-sky-800",
};
/** Status is shown with words as well as colour, so it never relies on colour alone. */
export function Pill({ tone = "slate", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[13px] font-semibold", PILL[tone])}>{children}</span>;
}

type Variant = "primary" | "secondary" | "danger" | "ghost";
export function Btn({ variant = "secondary", size = "md", className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" }) {
  const v: Record<Variant, string> = {
    primary: "bg-[#6921A5] text-white hover:bg-[#492F77]",
    secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "text-[#6921A5] hover:bg-[#F3E8F8]",
  };
  return <button {...props} className={cx("inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50", size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-[15px]", v[variant], className)} />;
}

export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label}
        className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-[15px] focus:border-[#6921A5] focus:outline-none focus:ring-2 focus:ring-[#6921A5]/20" />
    </div>
  );
}

export function SelectBox({ value, onChange, label, children }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
      <span className="sr-only sm:not-sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[15px] font-normal text-slate-800 focus:border-[#6921A5] focus:outline-none focus:ring-2 focus:ring-[#6921A5]/20">{children}</select>
    </label>
  );
}

export function Loading({ label = "Loading..." }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-3 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> {label}</div>;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Inbox className="h-9 w-9 text-slate-300" aria-hidden="true" />
      <p className="text-lg font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-md text-[15px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-800">
      <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && <button onClick={onRetry} className="font-semibold underline">Try again</button>}
    </div>
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const Th = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th scope="col" className={cx("whitespace-nowrap px-4 py-3 text-left text-sm font-semibold uppercase tracking-wide text-slate-500", className)}>{children}</th>
);
export const Td = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cx("px-4 py-3.5 align-middle text-[15px] text-slate-800", className)}>{children}</td>
);
/** A table that scrolls sideways on a phone instead of breaking the page. */
export function TableWrap({ children, label }: { children: React.ReactNode; label: string }) {
  return <div className="overflow-x-auto"><table aria-label={label} className="w-full min-w-[720px] border-collapse">{children}</table></div>;
}

export function Pagination({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (offset: number) => void }) {
  if (total <= limit) return null;
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.ceil(total / limit);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-[15px] text-slate-600">
      <span>Showing {offset + 1} to {Math.min(offset + limit, total)} of {total}</span>
      <div className="flex items-center gap-2">
        <Btn size="sm" disabled={page <= 1} onClick={() => onChange(Math.max(0, offset - limit))}>Previous</Btn>
        <span aria-current="page" className="px-2 font-semibold">Page {page} of {pages}</span>
        <Btn size="sm" disabled={page >= pages} onClick={() => onChange(offset + limit)}>Next</Btn>
      </div>
    </nav>
  );
}

// ── Overlays ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** A side panel for the details of one row. Closes on Escape, and returns focus to where it came from. */
export function Drawer({ open, title, subtitle, onClose, children }: { open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="flex h-full w-full max-w-lg flex-col bg-white shadow-2xl outline-none">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate text-2xl text-[#0F1A2E]">{title}</h2>
            {subtitle && <p className="mt-1 truncate text-[15px] text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/** For anything that cannot be undone. `requireText` makes the person type a word before the button works. */
export function ConfirmDialog({ open, title, message, confirmLabel, danger, requireText, withReason, busy, onConfirm, onCancel }: {
  open: boolean; title: string; message: React.ReactNode; confirmLabel: string; danger?: boolean; requireText?: string;
  withReason?: { label: string; required?: boolean }; busy?: boolean; onConfirm: (reason: string) => void; onCancel: () => void;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) { setTyped(""); setReason(""); box.current?.focus(); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  const ready = (!requireText || typed === requireText) && (!withReason?.required || reason.trim().length >= 3);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div ref={box} tabIndex={-1} role="alertdialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl outline-none">
        <h2 className="text-2xl text-[#0F1A2E]">{title}</h2>
        <div className="mt-2 text-[15px] leading-relaxed text-slate-600">{message}</div>
        {withReason && (
          <label className="mt-4 block text-[15px] font-semibold text-slate-700">{withReason.label}
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={255} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] font-normal" />
          </label>
        )}
        {requireText && (
          <label className="mt-4 block text-[15px] font-semibold text-slate-700">Type {requireText} to confirm
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-[15px] font-normal" />
          </label>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Btn onClick={onCancel}>Cancel</Btn>
          <Btn variant={danger ? "danger" : "primary"} disabled={!ready || busy} onClick={() => onConfirm(reason.trim())}>{busy ? "Working..." : confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

export const formatDateTime = (v?: string | Date | null) => {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
