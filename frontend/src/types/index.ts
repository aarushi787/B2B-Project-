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
