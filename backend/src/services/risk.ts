// A transparent risk summary for a deal. There is no hidden score: every factor below is a plain fact about the deal
// that the UI lists, and the level follows from a simple, documented rule.
//
//   Each factor is "good" (0 points), "warn" (1 point) or "bad" (2 points).
//   Level: 0-1 points = Low, 2-3 = Medium, 4+ = High. Any overdue milestone is never lower than Medium.
import { isOverdue, type MilestoneStatus } from './milestones.js';

export type FactorStatus = 'good' | 'warn' | 'bad';
export type RiskFactor = { key: string; label: string; status: FactorStatus; detail: string };
export type RiskLevel = 'low' | 'medium' | 'high';

export type RiskInput = {
  buyer: { name: string; verified: boolean; gst: 'valid' | 'invalid' | 'missing'; completedDeals: number };
  seller: { name: string; verified: boolean; gst: 'valid' | 'invalid' | 'missing'; completedDeals: number };
  agreement: 'none' | 'awaiting' | 'signed';
  milestones: { status: MilestoneStatus; dueDate?: string | Date | null; amount: number; escrowStatus: 'NOT_FUNDED' | 'FUNDED' | 'RELEASED' }[];
  /** True when a payment provider is set up. The escrow factor only applies then. */
  escrowAvailable: boolean;
  now?: Date;
};

const POINTS: Record<FactorStatus, number> = { good: 0, warn: 1, bad: 2 };

export function assessRisk(input: RiskInput): { level: RiskLevel; points: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  const now = input.now ?? new Date();

  for (const [role, p] of [['Client', input.buyer], ['Provider', input.seller]] as const) {
    factors.push({
      key: `verified-${role}`,
      label: `${role} verified`,
      status: p.verified ? 'good' : 'warn',
      detail: p.verified ? `${p.name} has been reviewed and verified by the platform.` : `${p.name} has not been verified by the platform yet.`,
    });
    factors.push({
      key: `gst-${role}`,
      label: `${role} GST number`,
      status: p.gst === 'valid' ? 'good' : p.gst === 'invalid' ? 'bad' : 'warn',
      detail:
        p.gst === 'valid' ? 'GST number passes the format and check-digit test.'
        : p.gst === 'invalid' ? 'The GST number on file does not pass the format and check-digit test.'
        : 'No GST number has been provided.',
    });
    factors.push({
      key: `history-${role}`,
      label: `${role} deal history`,
      status: p.completedDeals > 0 ? 'good' : 'warn',
      detail: p.completedDeals > 0 ? `${p.completedDeals} completed deal${p.completedDeals === 1 ? '' : 's'} on the platform.` : 'No completed deals on the platform yet.',
    });
  }

  factors.push({
    key: 'agreement',
    label: 'Agreement',
    status: input.agreement === 'signed' ? 'good' : input.agreement === 'awaiting' ? 'warn' : 'bad',
    detail: input.agreement === 'signed' ? 'Signed by both parties.' : input.agreement === 'awaiting' ? 'Created and waiting for signatures.' : 'No agreement has been created for this deal.',
  });

  const open = input.milestones.filter((m) => m.status !== 'APPROVED');
  const overdue = input.milestones.filter((m) => isOverdue(m, now));
  factors.push({
    key: 'milestones',
    label: 'Milestones',
    status: input.milestones.length === 0 ? 'warn' : overdue.length > 0 ? 'bad' : 'good',
    detail:
      input.milestones.length === 0 ? 'No milestones are planned, so progress cannot be tracked.'
      : overdue.length > 0 ? `${overdue.length} milestone${overdue.length === 1 ? ' is' : 's are'} past the due date.`
      : `${input.milestones.length - open.length} of ${input.milestones.length} approved, none overdue.`,
  });

  if (input.escrowAvailable && input.milestones.length > 0) {
    const unfunded = open.filter((m) => m.escrowStatus === 'NOT_FUNDED' && m.amount > 0);
    factors.push({
      key: 'escrow',
      label: 'Escrow',
      status: unfunded.length === 0 ? 'good' : 'warn',
      detail: unfunded.length === 0 ? 'Open milestones are covered by funds held in escrow.' : `${unfunded.length} open milestone${unfunded.length === 1 ? ' has' : 's have'} no funds held in escrow.`,
    });
  }

  const points = factors.reduce((sum, f) => sum + POINTS[f.status], 0);
  let level: RiskLevel = points >= 4 ? 'high' : points >= 2 ? 'medium' : 'low';
  if (overdue.length > 0 && level === 'low') level = 'medium';
  return { level, points, factors };
}
