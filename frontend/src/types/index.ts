export interface Deal {
  id: string;
  buyerId: string;
  sellerIds: string[];
  productId?: string;
  title?: string;
  description?: string;
  status: string;
  category?: string;
  amount: number;
  totalAmount?: number;
  platformFee: number;
  payoutAmount: number;
  revenueSplits: any[];
  milestones: any[];
  contracts: any[];
  createdAt: string;
  updatedAt: string;
  notes: string;
  escrowStatus: string;
}

export interface User {
  id: string;
  email: string;
  role: string;
  companyId?: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  type: string;
  size: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  reputation: number;
  verified?: boolean;
  gst?: string;
  revenue: number;
  capabilities: string[];
  onTimeDelivery?: number;
  dealCompletionRate?: number;
}

export interface Proposal {
  id: string;
  dealId: string;
  companyId: string;
  amount: number;
  message: string;
  status: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  dealId?: string;
  companyId?: string;
  type: string;
  amount: number;
  description?: string;
  status?: string;
  timestamp: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  dealId?: string;
  content: string;
  read?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  unit?: string;
  createdAt?: string;
}

// ---- Requirements (RFQs), proposals and negotiation ----
export type RequirementStatus = 'open' | 'closed' | 'awarded' | 'cancelled';
export type ProposalStatus = 'submitted' | 'shortlisted' | 'rejected' | 'accepted' | 'withdrawn';
export type ProposalSide = 'proposer' | 'requester';
export type ProposalAction = 'counter' | 'accept' | 'shortlist' | 'reject' | 'withdraw';

export interface Requirement {
  id: string;
  companyId: string;
  companyName: string | null;
  companyVerified?: boolean;
  title: string;
  description: string;
  category: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: string;
  timeline: string | null;
  status: RequirementStatus;
  dealId: string | null;
  proposalCount?: number;
  myProposalId: string | null;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalRevision {
  version: number;
  offeredBy: ProposalSide;
  authorCompanyId: string;
  authorCompanyName: string;
  amount: number;
  timeline: string | null;
  message: string;
  deliverables: string[];
  createdAt: string;
}

export interface MarketProposal {
  id: string;
  requirementId: string;
  requirementTitle: string;
  requirementStatus: RequirementStatus;
  requirementBudgetMin: number | null;
  requirementBudgetMax: number | null;
  proposerId: string;
  proposerName: string | null;
  proposerVerified: boolean;
  requesterId: string;
  requesterName: string | null;
  amount: number;
  currency: string;
  timeline: string | null;
  message: string;
  deliverables: string[];
  status: ProposalStatus;
  lastOfferBy: ProposalSide;
  version: number;
  /** Which side the signed-in company is on for this proposal. */
  side: ProposalSide | null;
  /** What the signed-in company may do right now (the API enforces the same rules). */
  allowedActions: ProposalAction[];
  dealId: string | null;
  createdAt: string;
  updatedAt: string;
  revisions?: ProposalRevision[];
}

export interface Paged<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
