import { test, expect } from '@playwright/test';
import { Session, sampleRequirement } from './helpers';

// Requirements (RFQs), proposals, turn-based negotiation and the deal created on acceptance.
// Each company is a separate Session with its own cookies; "buyer" and "seller" are roles in a deal, not accounts.

test.describe('Requirements and proposals (API)', () => {
  let alpha: Session; // posts requirements
  let beta: Session; // sends proposals
  let gamma: Session; // a second bidder / an outsider

  test.beforeEach(async () => {
    [alpha, beta, gamma] = await Promise.all([Session.create('alpha'), Session.create('beta'), Session.create('gamma')]);
  });
  test.afterEach(async () => {
    await Promise.all([alpha.dispose(), beta.dispose(), gamma.dispose()]);
  });

  async function postRequirement(over: Record<string, unknown> = {}) {
    const res = await alpha.post('/requirements', sampleRequirement(over));
    expect(res.status()).toBe(201);
    return (await res.json()) as { id: string };
  }

  test('posting validates input and lists the requirement for the owner and for other companies', async () => {
    expect((await alpha.post('/requirements', sampleRequirement({ title: 'x' }))).status()).toBe(400);
    expect((await alpha.post('/requirements', sampleRequirement({ budgetMin: 90000, budgetMax: 1000 }))).status()).toBe(400);

    const req = await postRequirement();

    const mine = await (await alpha.get('/requirements?scope=mine')).json();
    expect(mine.data.map((r: any) => r.id)).toContain(req.id);

    // Not in the owner's own "open to propose on" list, but visible to other companies.
    const alphaOpen = await (await alpha.get('/requirements?scope=open')).json();
    expect(alphaOpen.data.map((r: any) => r.id)).not.toContain(req.id);
    const betaOpen = await (await beta.get('/requirements?scope=open')).json();
    const seen = betaOpen.data.find((r: any) => r.id === req.id);
    expect(seen).toBeTruthy();
    expect(seen.myProposalId).toBeNull();
    expect(seen.isMine).toBe(false);

    const search = await (await beta.get('/requirements?scope=open&q=AWS')).json();
    expect(search.data.map((r: any) => r.id)).toContain(req.id);
  });

  test('a company cannot propose on its own requirement, and duplicates are refused', async () => {
    const req = await postRequirement();
    const own = await alpha.post(`/requirements/${req.id}/proposals`, { amount: 50000 });
    expect(own.status()).toBe(403);

    const first = await beta.post(`/requirements/${req.id}/proposals`, { amount: 52000, timeline: '4 weeks', message: 'We can do it.' });
    expect(first.status()).toBe(201);
    const dup = await beta.post(`/requirements/${req.id}/proposals`, { amount: 51000 });
    expect(dup.status()).toBe(409);

    expect((await beta.post(`/requirements/${req.id}/proposals`, { amount: -5 })).status()).toBe(400);
  });

  test('only the requester can see all proposals; outsiders cannot see a proposal at all', async () => {
    const req = await postRequirement();
    const created = await (await beta.post(`/requirements/${req.id}/proposals`, { amount: 52000 })).json();
    await gamma.post(`/requirements/${req.id}/proposals`, { amount: 47000 });

    const all = await (await alpha.get(`/requirements/${req.id}/proposals?sort=amount`)).json();
    expect(all.data.map((p: any) => p.amount)).toEqual([47000, 52000]); // cheapest first, for comparison
    expect(all.data[0].side).toBe('requester');

    expect((await beta.get(`/requirements/${req.id}/proposals`)).status()).toBe(403);

    const outsider = await Session.create('outsider');
    expect((await outsider.get(`/proposals/${created.id}`)).status()).toBe(404);
    expect((await beta.get(`/proposals/${created.id}`)).status()).toBe(200); // the proposer can
    await outsider.dispose();
  });

  test('negotiation is turn-based and keeps a version history', async () => {
    const req = await postRequirement();
    const p = await (await beta.post(`/requirements/${req.id}/proposals`, { amount: 55000, message: 'Initial offer' })).json();

    // The proposer made the latest offer, so it is not their turn.
    expect((await beta.post(`/proposals/${p.id}/accept`)).status()).toBe(409);
    expect((await beta.post(`/proposals/${p.id}/offers`, { amount: 50000 })).status()).toBe(409);

    // Requester counters; now the proposer's turn and the requester cannot accept their own counter.
    const countered = await alpha.post(`/proposals/${p.id}/offers`, { amount: 48000, message: 'Can you do 48k?' });
    expect(countered.status()).toBe(200);
    const body = await countered.json();
    expect(body.lastOfferBy).toBe('requester');
    expect(body.version).toBe(2);
    expect(body.amount).toBe(48000);
    expect((await alpha.post(`/proposals/${p.id}/accept`)).status()).toBe(409);

    // Proposer comes back with a middle offer.
    expect((await beta.post(`/proposals/${p.id}/offers`, { amount: 51500, message: 'Meet at 51.5k' })).status()).toBe(200);

    const detail = await (await alpha.get(`/proposals/${p.id}`)).json();
    expect(detail.revisions.map((r: any) => [r.version, r.offeredBy, r.amount])).toEqual([
      [1, 'proposer', 55000],
      [2, 'requester', 48000],
      [3, 'proposer', 51500],
    ]);
    expect(detail.allowedActions).toEqual(expect.arrayContaining(['accept', 'counter']));
  });

  test('accepting creates the deal with the right buyer and seller and closes everything else', async () => {
    const req = await postRequirement();
    const pBeta = await (await beta.post(`/requirements/${req.id}/proposals`, { amount: 52000 })).json();
    const pGamma = await (await gamma.post(`/requirements/${req.id}/proposals`, { amount: 47000 })).json();

    const accepted = await alpha.post(`/proposals/${pGamma.id}/accept`);
    expect(accepted.status()).toBe(200);
    const result = await accepted.json();
    expect(result.status).toBe('accepted');
    expect(result.dealId).toBeTruthy();

    // The deal: requester = buyer, accepted proposer = seller. Both parties can open it; the loser cannot.
    const deal = await (await alpha.get(`/deals/${result.dealId}`)).json();
    expect(deal.buyerId).toBe(alpha.companyId);
    expect(deal.sellerIds).toEqual([gamma.companyId]);
    expect(deal.amount).toBe(47000);
    expect((await gamma.get(`/deals/${result.dealId}`)).status()).toBe(200);
    expect((await beta.get(`/deals/${result.dealId}`)).status()).toBe(403);

    // The requirement is awarded, the competing proposal rejected, and no further action is possible.
    const reqNow = await (await alpha.get(`/requirements/${req.id}`)).json();
    expect(reqNow.status).toBe('awarded');
    expect(reqNow.dealId).toBe(result.dealId);
    const betaNow = await (await beta.get(`/proposals/${pBeta.id}`)).json();
    expect(betaNow.status).toBe('rejected');
    expect(betaNow.allowedActions).toEqual([]);
    expect((await alpha.post(`/proposals/${pBeta.id}/accept`)).status()).toBe(409);
  });

  test('two simultaneous accepts award the requirement exactly once', async () => {
    const req = await postRequirement();
    const p1 = await (await beta.post(`/requirements/${req.id}/proposals`, { amount: 52000 })).json();
    const p2 = await (await gamma.post(`/requirements/${req.id}/proposals`, { amount: 47000 })).json();

    const [a, b] = await Promise.all([alpha.post(`/proposals/${p1.id}/accept`), alpha.post(`/proposals/${p2.id}/accept`)]);
    expect([a.status(), b.status()].sort()).toEqual([200, 409]);

    const deals = await (await alpha.get('/deals')).json();
    expect(deals.data.filter((d: any) => d.buyerId === alpha.companyId)).toHaveLength(1);
  });

  test('withdrawing and re-submitting continues the same proposal; closing a requirement rejects open proposals', async () => {
    const req = await postRequirement();
    const p = await (await beta.post(`/requirements/${req.id}/proposals`, { amount: 52000 })).json();

    expect((await beta.post(`/proposals/${p.id}/withdraw`)).status()).toBe(200);
    expect((await alpha.post(`/proposals/${p.id}/accept`)).status()).toBe(409); // withdrawn

    const again = await beta.post(`/requirements/${req.id}/proposals`, { amount: 50000, message: 'Revised after thinking' });
    expect(again.status()).toBe(201);
    const revived = await again.json();
    expect(revived.id).toBe(p.id);
    expect(revived.version).toBe(2);
    expect(revived.status).toBe('submitted');

    expect((await beta.post(`/requirements/${req.id}/close`)).status()).toBe(404); // not the owner
    expect((await alpha.post(`/requirements/${req.id}/close`)).status()).toBe(200);
    const after = await (await beta.get(`/proposals/${p.id}`)).json();
    expect(after.status).toBe('rejected');
    expect((await gamma.post(`/requirements/${req.id}/proposals`, { amount: 40000 })).status()).toBe(409); // closed
    // Closed requirements disappear from the public list and from outsiders' view.
    expect((await gamma.get(`/requirements/${req.id}`)).status()).toBe(404);
  });

  test('sent and received lists show the right proposals to the right company', async () => {
    const req = await postRequirement();
    const p = await (await beta.post(`/requirements/${req.id}/proposals`, { amount: 52000 })).json();

    const sent = await (await beta.get('/proposals?scope=sent')).json();
    expect(sent.data.map((x: any) => x.id)).toContain(p.id);
    const received = await (await alpha.get('/proposals?scope=received')).json();
    expect(received.data.map((x: any) => x.id)).toContain(p.id);
    expect(received.data.find((x: any) => x.id === p.id).requirementTitle).toBe('Cloud migration to AWS');

    const notMine = await (await gamma.get('/proposals?scope=received')).json();
    expect(notMine.data.map((x: any) => x.id)).not.toContain(p.id);
    expect((await gamma.get('/requirements?scope=all')).status()).toBe(403); // admin only
  });
});
