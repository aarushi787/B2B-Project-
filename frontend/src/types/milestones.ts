export type MilestoneStatus = "PLANNED" | "SUBMITTED" | "APPROVED";
export type EscrowStatus = "NOT_FUNDED" | "FUNDED" | "RELEASED";
export type DealSide = "buyer" | "seller";

export interface Milestone {
  id: string;
  dealId: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  status: MilestoneStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  changeNote: string | null;
  escrowStatus: EscrowStatus;
  overdue: boolean;
  /** What the signed-in side may do right now. The API enforces the same rules. */
  can: { edit: boolean; delete: boolean; submit: boolean; approve: boolean; requestChanges: boolean; fund: boolean };
}

export interface MilestoneSummary {
  count: number;
  approved: number;
  plannedAmount: number;
  dealTotal: number;
  heldInEscrow: number;
  released: number;
}

export interface DealMilestones {
  side: DealSide | null;
  milestones: Milestone[];
  summary: MilestoneSummary;
}

export type RiskLevel = "low" | "medium" | "high";
export interface RiskFactor { key: string; label: string; status: "good" | "warn" | "bad"; detail: string }
export interface RiskAssessment { level: RiskLevel; points: number; factors: RiskFactor[] }

export interface DealAlert {
  id: string;
  kind: string;
  severity: "action" | "warning" | "info";
  title: string;
  message: string;
  dealId: string;
  link: string;
}
