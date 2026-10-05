import { useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { Modal } from "../ui/DesignSystem";
import { friendlyError } from "../../../lib/useLoad";
import { formatINR } from "../../../lib/format";
import { proposalsService } from "../../../services/requirementsService";
import type { MarketProposal, ProposalAction } from "../../../types";

type SimpleAction = Exclude<ProposalAction, "counter">;

const SUCCESS: Record<SimpleAction, string> = {
  accept: "Proposal accepted. Your deal has been created.",
  shortlist: "Proposal shortlisted.",
  reject: "Proposal rejected.",
  withdraw: "Proposal withdrawn.",
};

/** Runs a proposal action, shows the outcome, and refreshes the caller. Accepting jumps to the new deal. */
export function useProposalActions(onDone?: () => void) {
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (proposal: MarketProposal, action: SimpleAction) => {
    setBusyId(proposal.id);
    try {
      if (action === "accept") {
        const result = await proposalsService.accept(proposal.id);
        toast.success(SUCCESS.accept);
        navigate(`/app/deals/${result.dealId}`);
        return;
      }
      await proposalsService[action](proposal.id);
      toast.success(SUCCESS[action]);
      onDone?.();
    } catch (e) {
      // The other side may have acted first, so refresh to show the true state as well as the reason.
      toast.error(friendlyError(e));
      onDone?.();
    } finally {
      setBusyId(null);
    }
  };

  return { run, busyId };
}

const BUTTON_BASE = {
  fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: "pointer", border: "1px solid transparent",
} as const;

const BUTTONS: Record<ProposalAction, { label: string; style: React.CSSProperties }> = {
  accept:    { label: "Accept offer",   style: { background: "#16a34a", color: "#fff" } },
  counter:   { label: "Counter offer",  style: { background: "#6921A5", color: "#fff" } },
  shortlist: { label: "Shortlist",      style: { background: "#fff", color: "#6921A5", borderColor: "#ddd6fe" } },
  reject:    { label: "Reject",         style: { background: "#fff", color: "#b91c1c", borderColor: "#fecaca" } },
  withdraw:  { label: "Withdraw",       style: { background: "#fff", color: "#475569", borderColor: "#cbd5e1" } },
};

const ORDER: ProposalAction[] = ["accept", "counter", "shortlist", "reject", "withdraw"];

/** Shows exactly the actions the API says the viewer can take right now. */
export function ProposalActionButtons({
  proposal, busy, onAction, onCounter,
}: {
  proposal: MarketProposal;
  busy?: boolean;
  onAction: (action: SimpleAction) => void;
  onCounter?: () => void;
}) {
  const actions = ORDER.filter((a) => proposal.allowedActions.includes(a) && (a !== "counter" || onCounter));
  if (actions.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          disabled={busy}
          onClick={() => (a === "counter" ? onCounter?.() : onAction(a))}
          style={{ ...BUTTON_BASE, ...BUTTONS[a].style, opacity: busy ? 0.6 : 1, cursor: busy ? "not-allowed" : "pointer" }}
        >
          {BUTTONS[a].label}
        </button>
      ))}
    </div>
  );
}

/** Accepting is final (it creates a deal and closes the other proposals), so it always asks first. */
export function AcceptDialog({
  proposal, onCancel, onConfirm, busy,
}: {
  proposal: MarketProposal | null;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
}) {
  return (
    <Modal isOpen={!!proposal} onClose={onCancel} title="Accept this offer?" width={460}>
      {proposal && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.6 }}>
            You are accepting <b>{formatINR(proposal.amount)}</b> from <b>{proposal.proposerName ?? "this company"}</b> for “{proposal.requirementTitle}”.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
            <li>A deal is created with you as the buyer.</li>
            <li>Every other open proposal on this requirement is closed.</li>
            <li>This cannot be undone.</li>
          </ul>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" onClick={onCancel} disabled={busy} style={{ ...BUTTON_BASE, background: "#fff", color: "#334155", borderColor: "#cbd5e1" }}>
              Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={busy} style={{ ...BUTTON_BASE, background: "#16a34a", color: "#fff", opacity: busy ? 0.6 : 1 }}>
              {busy ? "Creating deal…" : "Accept and create deal"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
