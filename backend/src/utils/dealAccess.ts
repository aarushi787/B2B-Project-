// Who may do what to a deal. Pure functions, so the rules are tested without a database.
//
//  - Only the buyer, the seller or a platform admin can touch a deal at all.
//  - Approving or rejecting a deal is the PLATFORM's decision, so a party can never approve its own deal.
//  - A party may cancel a pending or approved deal, and the buyer may mark an approved deal completed.
//  - A party may edit the terms only while the deal is still pending.
export type DealDbStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
export type Side = 'buyer' | 'seller' | null;
export type Decision = { ok: true } | { ok: false; status: number; message: string };

export function sideOfDeal(deal: { buyerId: string; sellerId: string }, companyId?: string | null): Side {
  if (!companyId) return null;
  return deal.buyerId === companyId ? 'buyer' : deal.sellerId === companyId ? 'seller' : null;
}

export function canChangeDealStatus(input: { isAdmin: boolean; side: Side; from: DealDbStatus; to: DealDbStatus }): Decision {
  const { isAdmin, side, from, to } = input;
  if (isAdmin) return { ok: true };
  if (!side) return { ok: false, status: 404, message: 'Deal not found' };
  if (to === 'cancelled' && (from === 'pending' || from === 'approved')) return { ok: true };
  if (to === 'completed' && from === 'approved' && side === 'buyer') return { ok: true };
  if (to === 'approved' || to === 'rejected') return { ok: false, status: 403, message: 'Only the platform can approve or reject a deal' };
  return { ok: false, status: 403, message: 'You cannot move this deal to that status' };
}

export function canEditDealTerms(input: { isAdmin: boolean; side: Side; status: DealDbStatus }): Decision {
  if (input.isAdmin) return { ok: true };
  if (!input.side) return { ok: false, status: 404, message: 'Deal not found' };
  if (input.status !== 'pending') return { ok: false, status: 409, message: 'The terms of a deal can only be edited while it is pending' };
  return { ok: true };
}
