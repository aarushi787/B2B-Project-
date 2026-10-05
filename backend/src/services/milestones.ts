// Rules for deal milestones. Pure functions, so the whole workflow is unit-tested without a database.
//
//   PLANNED --(seller marks done)--> SUBMITTED --(buyer confirms)--> APPROVED
//                    ^                    |
//                    +--(buyer asks for changes, with a note)
//
// "Both-party confirmation" means exactly this: the seller says the work is done AND the buyer agrees. When the
// buyer's money for that milestone is held in escrow, the buyer's confirmation is what releases it.

export type MilestoneStatus = 'PLANNED' | 'SUBMITTED' | 'APPROVED';
export type DealSide = 'buyer' | 'seller';
export type MilestoneAction = 'submit' | 'approve' | 'requestChanges';

const RULES: Record<MilestoneAction, { from: MilestoneStatus; by: DealSide; to: MilestoneStatus }> = {
  submit: { from: 'PLANNED', by: 'seller', to: 'SUBMITTED' },
  approve: { from: 'SUBMITTED', by: 'buyer', to: 'APPROVED' },
  requestChanges: { from: 'SUBMITTED', by: 'buyer', to: 'PLANNED' },
};

export type TransitionResult = { ok: true; to: MilestoneStatus } | { ok: false; status: number; error: string };

export function applyAction(current: MilestoneStatus, action: MilestoneAction, side: DealSide | null): TransitionResult {
  const rule = RULES[action];
  if (!side) return { ok: false, status: 403, error: 'Only the buyer or seller of this deal can do that' };
  if (side !== rule.by) {
    return { ok: false, status: 403, error: rule.by === 'seller' ? 'Only the provider can mark a milestone as done' : 'Only the client can confirm or review a milestone' };
  }
  if (current !== rule.from) {
    return { ok: false, status: 409, error: `This milestone is ${current.toLowerCase()}, so that action is not available` };
  }
  return { ok: true, to: rule.to };
}

/** Milestone amounts may not add up to more than the deal total (when the deal has a total). */
export function withinDealTotal(otherAmounts: number[], amount: number, dealTotal: number): boolean {
  if (!(dealTotal > 0)) return true;
  const sum = otherAmounts.reduce((a, b) => a + b, 0) + amount;
  return Math.round(sum * 100) <= Math.round(dealTotal * 100);
}

/** A milestone is overdue when its due date has passed and it is not approved yet. A due date is valid through the end of that day. */
export function isOverdue(m: { status: MilestoneStatus; dueDate?: string | Date | null }, now: Date = new Date()): boolean {
  if (m.status === 'APPROVED' || !m.dueDate) return false;
  const due = new Date(m.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const endOfDueDay = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate(), 23, 59, 59, 999);
  return now.getTime() > endOfDueDay;
}

/** What the signed-in side can do with a milestone right now. Drives the buttons in the UI and is re-checked by the API. */
export function allowedActions(
  m: { status: MilestoneStatus; escrowStatus: 'NOT_FUNDED' | 'FUNDED' | 'RELEASED'; amount: number },
  side: DealSide | null
) {
  const can = (a: MilestoneAction) => applyAction(m.status, a, side).ok;
  const editable = Boolean(side) && m.status === 'PLANNED' && m.escrowStatus === 'NOT_FUNDED';
  return {
    edit: editable,
    delete: editable,
    submit: can('submit'),
    approve: can('approve'),
    requestChanges: can('requestChanges'),
    fund: side === 'buyer' && m.escrowStatus === 'NOT_FUNDED' && m.status !== 'APPROVED' && m.amount > 0,
  };
}
