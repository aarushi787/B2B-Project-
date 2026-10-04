import { AlertCircle, BadgeCheck } from "lucide-react";
import { Skeleton, StatusBadge } from "../ui/DesignSystem";
import type { ProposalStatus, RequirementStatus } from "../../../types";

const PROPOSAL_STATUS: Record<ProposalStatus, { bg: string; text: string; label: string }> = {
  submitted:   { bg: "#eff6ff", text: "#1d4ed8", label: "Submitted" },
  shortlisted: { bg: "#EFF6FF", text: "#1D4ED8", label: "Shortlisted" },
  accepted:    { bg: "#dcfce7", text: "#166534", label: "Accepted" },
  rejected:    { bg: "#fee2e2", text: "#991b1b", label: "Rejected" },
  withdrawn:   { bg: "#f1f5f9", text: "#475569", label: "Withdrawn" },
};

const REQUIREMENT_STATUS: Record<RequirementStatus, { bg: string; text: string; label: string }> = {
  open:      { bg: "#dcfce7", text: "#166534", label: "Open" },
  awarded:   { bg: "#eff6ff", text: "#1d4ed8", label: "Awarded" },
  closed:    { bg: "#f1f5f9", text: "#475569", label: "Closed" },
  cancelled: { bg: "#fee2e2", text: "#991b1b", label: "Cancelled" },
};

export function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  return <StatusBadge status={status} custom={PROPOSAL_STATUS[status]} />;
}

export function RequirementStatusBadge({ status }: { status: RequirementStatus }) {
  return <StatusBadge status={status} custom={REQUIREMENT_STATUS[status]} />;
}

export function VerifiedMark({ verified }: { verified?: boolean }) {
  if (!verified) return null;
  return (
    <span title="Verified business" aria-label="Verified business" style={{ display: "inline-flex", verticalAlign: "middle", marginLeft: 4, color: "#2563EB" }}>
      <BadgeCheck size={15} aria-hidden="true" />
    </span>
  );
}

/** Highlights proposals where the viewer is the one who should respond next. */
export function YourTurnTag() {
  return (
    <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, whiteSpace: "nowrap" }}>
      Your turn
    </span>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" style={{ border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 12, padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
      <AlertCircle size={20} color="#dc2626" aria-hidden="true" />
      <p style={{ margin: 0, flex: 1, fontSize: 14, color: "#7f1d1d" }}>{message}</p>
      <button type="button" onClick={onRetry} style={{ background: "#fff", border: "1px solid #fecaca", color: "#991b1b", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer" }}>
        Try again
      </button>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height="72px" borderRadius="12px" />
      ))}
    </div>
  );
}

export const pageStyle = { maxWidth: 1100, margin: "0 auto", fontFamily: "Inter, sans-serif" } as const;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 14, color: "#475569", margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}
