// Rules for who may be on which side of a deal. A company is a buyer or a seller *per deal*, never both,
// and may only create deals it is itself a party to (otherwise reputation could be faked or others impersonated).
export type DealPartyCheck = { ok: true } | { ok: false; status: number; message: string };

export function checkDealParties(opts: {
  buyerId: string;
  sellerIds: string[];
  callerCompanyId?: string | null;
  isPlatformAdmin?: boolean;
}): DealPartyCheck {
  const { buyerId, sellerIds, callerCompanyId, isPlatformAdmin } = opts;

  if (sellerIds.includes(buyerId)) {
    return { ok: false, status: 400, message: 'A company cannot be both the buyer and the seller of the same deal' };
  }
  if (!isPlatformAdmin) {
    const isParty = !!callerCompanyId && (callerCompanyId === buyerId || sellerIds.includes(callerCompanyId));
    if (!isParty) {
      return { ok: false, status: 403, message: 'You can only create deals that your company is a party to' };
    }
  }
  return { ok: true };
}
