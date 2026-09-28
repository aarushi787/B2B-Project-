// Purpose: This module (types.ts) is used to implement project functionality in a modular, maintainable way.

export enum Role {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER',
  BUYER = 'BUYER'
}

export enum DealStatus {
  ENQUIRY = 'ENQUIRY',
  NEGOTIATION = 'NEGOTIATION',
  CONFIRMED = 'CONFIRMED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  FROZEN = 'FROZEN',
  VOIDED = 'VOIDED'
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum LedgerType {
  COMMISSION = 'COMMISSION',
  PAYOUT = 'PAYOUT',
  REFUND = 'REFUND',
  ESCROW_DEPOSIT = 'ESCROW_DEPOSIT'
}

export interface Milestone {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'APPROVED' | 'PAID';
}

export interface Contract {
  id: string;
  type: 'NDA' | 'SOW' | 'MSA' | 'REVENUE_SPLIT';
  content: string;
  version: number;
  signedBy: string[];
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  permissions: string[];
}

export interface AuditReport {
  id: string;
  title: string;
  date: string;
  score: number;
  category: 'FINANCIAL' | 'OPERATIONAL' | 'COMPLIANCE';
  summary: string;
  fileUrl: string;
}

export interface Company {
  id: string;
  name: string;
  gst: string;
  risk: RiskLevel;
  reputation: number;
  domain: string;
  capabilities: string[];
  capabilityTaxonomy?: Record<string, string[]>;
  verified: boolean;
  revenue: number;
  onTimeDelivery: number;
  dealCompletionRate: number;
  complianceScore: number;
  team?: TeamMember[];
  apiKeys?: { id: string; name: string; prefix: string }[];
  auditReports?: AuditReport[];
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_KYC';
  lastActive: string;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  moq: number;
  inventory: number;
  image: string;
  certifications: string[];
}

export interface RevenueSplit {
  companyId: string;
  percentage: number;
  fixedAmount?: number;
}

export interface Deal {
  id: string;
  buyerId: string;
  sellerIds: string[];
  productId: string;
  status: DealStatus;
  amount: number;
  platformFee: number;
  payoutAmount?: number;
  revenueSplits: RevenueSplit[];
  milestones: Milestone[];
  contracts: Contract[];
  createdAt: string;
  updatedAt: string;
  notes: string;
  escrowStatus: 'UNFUNDED' | 'FUNDED' | 'DISBURSED' | 'REFUNDED';
  riskScore?: number;
  completionProbability?: number;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
  companyId: string;
  hasSeenOnboarding?: boolean;
  phone?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  gstNumber?: string;
  industry?: string;
  companyDomain?: string;
  website?: string;
  address?: string;
  description?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  dealId?: string;
  content: string;
  timestamp: string;
  type?: 'text' | 'action' | 'decision';
}

export interface LedgerEntry {
  id: string;
  dealId: string;
  amount: number;
  type: LedgerType;
  timestamp: string;
  status: 'COMPLETED' | 'PENDING';
  counterparty: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  details: string;
  ipAddress: string;
}

export interface SupportTicket {
  id: string;
  companyId: string;
  subject: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  enabled: boolean;
  description: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  type: 'MARKETPLACE' | 'REGISTRY';
  filters: any;
}

