// A company is a buyer or a seller *per deal*, never as an account type. These helpers derive
// "which side am I on?" and "what should I do next?" from the deal itself.
export type DealSide = 'buyer' | 'seller' | 'admin' | 'observer';
export type DealAction = 'approve' | 'fund' | 'release';

type DealParties = { buyerId: string; sellerIds: string[] } | null | undefined;

export function getDealSide(deal: DealParties, companyId: string | null | undefined, isAdmin: boolean): DealSide {
  if (deal && companyId) {
    if (deal.buyerId === companyId) return 'buyer';
    if (deal.sellerIds.includes(companyId)) return 'seller';
  }
  return isAdmin ? 'admin' : 'observer';
}

export interface NextStep {
  title: string;
  description: string;
  /** Present only when the viewer can act right now. */
  action?: DealAction;
  actionLabel?: string;
  tone: 'action' | 'waiting' | 'done' | 'closed';
}

export function getNextStep(input: {
  side: DealSide;
  dealStatus: 'Pending' | 'Approved' | 'Rejected' | 'Completed';
  escrowStatus: 'Not Funded' | 'Funded' | 'Released';
  milestone: number;
  totalMilestones?: number;
  amountLabel?: string;
}): NextStep {
  const { side, dealStatus, escrowStatus, milestone, totalMilestones = 3, amountLabel = 'the deal amount' } = input;

  if (dealStatus === 'Rejected') {
    return { title: 'Deal closed', description: 'This deal was rejected and no further steps are needed.', tone: 'closed' };
  }
  if (dealStatus === 'Completed' || escrowStatus === 'Released') {
    return { title: 'Deal complete', description: 'Delivery was confirmed and the payment has been released.', tone: 'done' };
  }
  if (dealStatus === 'Pending') {
    return side === 'admin'
      ? { title: 'Review and approve this deal', description: 'Check the parties and verification, then approve or reject.', action: 'approve', actionLabel: 'Approve deal', tone: 'action' }
      : { title: 'Waiting for approval', description: 'The platform is reviewing this deal. You will be notified once it is approved.', tone: 'waiting' };
  }

  // Approved
  if (escrowStatus === 'Not Funded') {
    if (side === 'buyer') {
      return { title: 'Fund escrow', description: `Pay ${amountLabel} into escrow. It is held safely and only released when you confirm delivery.`, action: 'fund', actionLabel: 'Fund escrow', tone: 'action' };
    }
    return { title: 'Waiting for the buyer to fund escrow', description: 'Work can start once the payment is secured in escrow.', tone: 'waiting' };
  }

  // Approved + funded
  if (milestone < totalMilestones) {
    if (side === 'seller') {
      return { title: `Deliver milestone ${Math.max(milestone, 1)} of ${totalMilestones}`, description: 'Complete the work and mark the milestone as done on the timeline.', tone: 'action' };
    }
    return { title: `Waiting for the seller to complete milestone ${Math.max(milestone, 1)}`, description: 'You will be asked to confirm delivery after the final milestone.', tone: 'waiting' };
  }
  if (side === 'buyer') {
    return { title: 'Confirm delivery and release payment', description: 'Check the delivered work. Releasing payment pays the seller and completes the deal.', action: 'release', actionLabel: 'Release payment', tone: 'action' };
  }
  return { title: 'Waiting for the buyer to confirm delivery', description: 'Payment is released to you as soon as the buyer confirms.', tone: 'waiting' };
}

/** What happens next on an approved deal, worked out from its real milestones (not from a fixed script). */
export function getMilestoneNextStep(input: {
  side: DealSide;
  milestones: { title: string; status: 'PLANNED' | 'SUBMITTED' | 'APPROVED'; changeNote: string | null; overdue: boolean }[];
}): NextStep {
  const { side, milestones } = input;
  const party = side === 'buyer' || side === 'seller';

  if (milestones.length === 0) {
    return party
      ? { title: 'Plan the work in milestones', description: 'Add milestones with an amount and a due date. The provider marks each one done and the client confirms it.', tone: 'action' }
      : { title: 'No milestones yet', description: 'The parties have not planned any milestones for this deal.', tone: 'waiting' };
  }
  if (milestones.every((m) => m.status === 'APPROVED')) {
    return { title: 'All milestones confirmed', description: 'Every milestone has been delivered and confirmed.', tone: 'done' };
  }

  const waiting = milestones.find((m) => m.status === 'SUBMITTED');
  const changes = milestones.find((m) => m.status === 'PLANNED' && m.changeNote);
  const nextOpen = milestones.find((m) => m.status !== 'APPROVED')!;

  if (side === 'buyer') {
    if (waiting) return { title: `Confirm "${waiting.title}"`, description: 'The provider marked this milestone as done. Confirm it, or ask for changes.', tone: 'action' };
    return { title: `Waiting for the provider to finish "${nextOpen.title}"`, description: 'You will be asked to confirm it when it is marked done.', tone: 'waiting' };
  }
  if (side === 'seller') {
    if (changes) return { title: `Make the requested changes to "${changes.title}"`, description: changes.changeNote ?? 'The client asked for changes.', tone: 'action' };
    if (waiting && waiting === nextOpen) return { title: `Waiting for the client to confirm "${waiting.title}"`, description: 'You will be notified when it is confirmed.', tone: 'waiting' };
    return { title: `Deliver "${nextOpen.title}"`, description: 'Complete the work and mark the milestone as done on the timeline.', tone: 'action' };
  }
  return { title: 'Deal in progress', description: `${milestones.filter((m) => m.status === 'APPROVED').length} of ${milestones.length} milestones confirmed.`, tone: 'waiting' };
}
