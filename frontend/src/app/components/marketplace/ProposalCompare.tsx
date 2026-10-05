// Side-by-side comparison of up to three proposals on one requirement. Every figure comes from the proposal or the
// company's real record; nothing is scored or ranked for you.
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Card } from "../ui/DesignSystem";
import { formatINR } from "../../../lib/format";
import type { MarketProposal } from "../../../types";
import { ProposalStatusBadge, VerifiedMark } from "./parts";
import { RatingSummary } from "../Reviews";

/** "12% under budget" / "5% over budget", against the middle of the stated range when there is one. */
export function budgetDelta(amount: number, min: number | null, max: number | null): string | null {
  const target = min != null && max != null ? (min + max) / 2 : (max ?? min);
  if (!target) return null;
  const pct = Math.round(((amount - target) / target) * 100);
  if (pct === 0) return "On budget";
  return `${Math.abs(pct)}% ${pct < 0 ? "under" : "over"} budget`;
}

export function ProposalCompare({
  proposals, onClose, renderActions,
}: { proposals: MarketProposal[]; onClose: () => void; renderActions: (p: MarketProposal) => ReactNode }) {
  const lowest = Math.min(...proposals.map((p) => p.amount));
  const th: React.CSSProperties = { textAlign: "left", padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", background: "#f8fafc", whiteSpace: "nowrap", verticalAlign: "top" };
  const td: React.CSSProperties = { padding: "12px 16px", fontSize: 15, color: "#0f172a", verticalAlign: "top", borderTop: "1px solid #f1f5f9" };

  const rows: { label: string; cell: (p: MarketProposal) => ReactNode }[] = [
    { label: "Company", cell: (p) => <strong>{p.proposerName ?? "—"}<VerifiedMark verified={p.proposerVerified} /></strong> },
    { label: "Reviews", cell: (p) => <RatingSummary rating={p.proposerRating} count={p.proposerReviews} /> },
    { label: "Deals completed", cell: (p) => p.proposerCompletedDeals },
    {
      label: "Price",
      cell: (p) => (
        <>
          <strong>{formatINR(p.amount)}</strong>
          {p.amount === lowest && proposals.length > 1 && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 700, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: 20 }}>Lowest</span>}
          {budgetDelta(p.amount, p.requirementBudgetMin, p.requirementBudgetMax) && <div style={{ fontSize: 13, color: "#475569" }}>{budgetDelta(p.amount, p.requirementBudgetMin, p.requirementBudgetMax)}</div>}
        </>
      ),
    },
    { label: "Timeline", cell: (p) => p.timeline ?? "—" },
    {
      label: "Deliverables",
      cell: (p) => p.deliverables.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{p.deliverables.map((d) => <li key={d}>{d}</li>)}</ul> : "—",
    },
    { label: "Their message", cell: (p) => <span style={{ fontSize: 14, color: "#334155", whiteSpace: "pre-wrap" }}>{p.message || "—"}</span> },
    { label: "Status", cell: (p) => <ProposalStatusBadge status={p.status} /> },
    { label: "", cell: (p) => renderActions(p) },
  ];

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Comparing {proposals.length} proposals</h3>
        <button type="button" onClick={onClose} aria-label="Close comparison" style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: "#475569" }}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
          <caption style={{ position: "absolute", left: -9999 }}>Selected proposals compared side by side</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label || "actions"}>
                <th scope="row" style={th}>{r.label}</th>
                {proposals.map((p) => <td key={p.id} style={td}>{r.cell(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
