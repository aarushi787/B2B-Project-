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
