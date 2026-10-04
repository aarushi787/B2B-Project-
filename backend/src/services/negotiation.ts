// Pure rules for requirements, proposals and negotiation. No database access here, so every rule is unit-testable.
//
// Model: a company posts a REQUIREMENT. Other companies send a PROPOSAL (one per company per requirement).
// Negotiation is turn-based: every offer (the first proposal and each counter-offer) is a revision and records
// who made it (`lastOfferBy`). Only the *other* side can accept or counter it. Accepting creates a deal.

export type RequirementStatus = 'open' | 'closed' | 'awarded' | 'cancelled';
export type ProposalStatus = 'submitted' | 'shortlisted' | 'rejected' | 'accepted' | 'withdrawn';
export type Side = 'proposer' | 'requester';
export type ProposalAction = 'counter' | 'accept' | 'shortlist' | 'reject' | 'withdraw';

const ACTIVE_PROPOSAL_STATUSES: ProposalStatus[] = ['submitted', 'shortlisted'];

export function isActiveProposal(status: ProposalStatus): boolean {
  return ACTIVE_PROPOSAL_STATUSES.includes(status);
}

/** Which side of a proposal a company is on, or null if it is neither party. */
export function sideOf(companyId: string | null | undefined, requirementCompanyId: string, proposalCompanyId: string): Side | null {
  if (!companyId) return null;
  if (companyId === requirementCompanyId) return 'requester';
  if (companyId === proposalCompanyId) return 'proposer';
  return null;
}

export function allowedActions(input: {
  requirementStatus: RequirementStatus;
  proposalStatus: ProposalStatus;
  lastOfferBy: Side;
  side: Side | null;
}): ProposalAction[] {
  const { requirementStatus, proposalStatus, lastOfferBy, side } = input;
  if (!side) return [];
  if (requirementStatus !== 'open') return [];
  if (!isActiveProposal(proposalStatus)) return [];

  const actions: ProposalAction[] = [];
  const myTurn = lastOfferBy !== side; // you can only respond to the other side's offer

  if (side === 'proposer') {
    if (myTurn) actions.push('counter', 'accept');
    actions.push('withdraw');
  } else {
    if (proposalStatus === 'submitted') actions.push('shortlist');
    if (myTurn) actions.push('counter', 'accept');
    actions.push('reject');
  }
  return actions;
}

export class NegotiationError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export function assertAllowed(action: ProposalAction, input: Parameters<typeof allowedActions>[0]): void {
  if (!input.side) throw new NegotiationError(403, 'You are not a party to this proposal');
  if (input.requirementStatus !== 'open') throw new NegotiationError(409, 'This requirement is no longer open');
  if (!isActiveProposal(input.proposalStatus)) throw new NegotiationError(409, `This proposal is already ${input.proposalStatus}`);
  if (!allowedActions(input).includes(action)) {
    const hint = action === 'counter' || action === 'accept' ? ' It is the other side\'s turn to respond to the latest offer.' : '';
    throw new NegotiationError(409, `You cannot ${action} this proposal right now.${hint}`);
  }
}

export interface OfferTerms {
  amount: number;
  timeline?: string | null;
  message?: string | null;
  deliverables?: string[];
}

export const MAX_AMOUNT = 1_000_000_000_000; // 1 lakh crore: far beyond any real deal, rejects typos and overflow

export function validateOffer(terms: OfferTerms, requirement?: { budgetMin?: number | null; budgetMax?: number | null }): string | null {
  if (!Number.isFinite(terms.amount) || terms.amount <= 0) return 'Amount must be greater than zero';
  if (terms.amount > MAX_AMOUNT) return 'Amount is too large';
  if (requirement?.budgetMax != null && requirement.budgetMax > 0 && terms.amount > requirement.budgetMax * 10) {
    return 'Amount is more than 10 times the requester\'s maximum budget; please check it';
  }
  return null;
}

export function validateBudget(min?: number | null, max?: number | null): string | null {
  if (min != null && min < 0) return 'Minimum budget cannot be negative';
  if (max != null && max < 0) return 'Maximum budget cannot be negative';
  if (min != null && max != null && min > max) return 'Minimum budget cannot be greater than the maximum';
  return null;
}

/** The deal that results from accepting a proposal. Buyer = the requester, seller = the proposer. */
export function dealFromAcceptedProposal(
  requirement: { title: string; description?: string | null; companyId: string },
  proposal: { companyId: string; amount: number; message?: string | null }
) {
  if (requirement.companyId === proposal.companyId) {
    throw new NegotiationError(400, 'A company cannot be both the buyer and the seller of the same deal');
  }
  return {
    title: requirement.title,
    description: requirement.description ?? proposal.message ?? '',
    buyerId: requirement.companyId,
    sellerId: proposal.companyId,
    totalAmount: proposal.amount,
  };
}

export function parseDeliverables(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === 'string');
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
