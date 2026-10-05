// Who may touch whose data. Every test plays several separate companies (each with its own cookie jar) and checks that
// an outsider gets "not found" or "forbidden" while the rightful owner succeeds. These guard the fixes for the holes found
// in the security review: members, ledger, jobs, deals, products, messages, agreements, milestones and phone codes.
import { test, expect } from '@playwright/test';
import { API_URL, APP_ORIGIN, Session } from './helpers';

/** A deal between two fresh companies, created by the buyer. */
async function dealBetween(buyer: Session, seller: Session): Promise<string> {
  const res = await buyer.post('/deals', { buyerId: buyer.companyId, sellerId: seller.companyId, title: 'Access test deal', totalAmount: 5000 });
  expect(res.status()).toBe(201);
  return (await res.json()).id as string;
}

test.describe('Company members', () => {
  test('an outsider cannot list a company\'s members, invite themselves, or change a role', async () => {
    const owner = await Session.create('owner');
    const attacker = await Session.create('attacker');

    expect((await owner.get(`/members/company/${owner.companyId}`)).status()).toBe(200);
    expect((await attacker.get(`/members/company/${owner.companyId}`)).status()).toBe(404);

    const invite = await attacker.post('/members/invite', { companyId: owner.companyId, userId: attacker.userId, role: 'OWNER' });
    expect(invite.status()).toBe(404);

    // A real invitation by the owner works, and only the owner can then change that role.
    const ok = await owner.post('/members/invite', { companyId: owner.companyId, userId: attacker.userId, role: 'VIEWER' });
    expect(ok.status()).toBe(201);
    const memberId = (await ok.json()).id as string;
    expect((await attacker.put(`/members/${memberId}/role`, { role: 'OWNER' })).status()).toBe(404);
    expect((await owner.put(`/members/${memberId}/role`, { role: 'OPS' })).status()).toBe(200);
    await Promise.all([owner.dispose(), attacker.dispose()]);
  });
});

test.describe('Ledger and jobs', () => {
  test('a ledger is private to its company, and signed-out requests are refused', async ({ request }) => {
    const owner = await Session.create('owner');
    const attacker = await Session.create('attacker');
    for (const path of [`/ledger/balance/${owner.companyId}`, `/ledger/company/${owner.companyId}/type/credit`, `/ledger/company/${owner.companyId}/month/2026-01`]) {
      expect((await request.get(`${API_URL}${path}`)).status(), `${path} signed out`).toBe(401);
      expect((await attacker.get(path)).status(), `${path} as outsider`).toBe(404);
      expect((await owner.get(path)).status(), `${path} as owner`).toBe(200);
    }
    await Promise.all([owner.dispose(), attacker.dispose()]);
  });

  test('ordinary users cannot see or change the job queue', async () => {
    const user = await Session.create('user');
    expect((await user.get('/jobs')).status()).toBe(403);
    expect((await user.put('/jobs/00000000-0000-4000-8000-000000000000/status', { status: 'completed' })).status()).toBe(403);
    await user.dispose();
  });
});

test.describe('Deals', () => {
  test('outsiders cannot edit or delete a deal, and parties cannot approve their own', async () => {
    const buyer = await Session.create('buyer');
    const seller = await Session.create('seller');
    const outsider = await Session.create('outsider');
    const dealId = await dealBetween(buyer, seller);

    expect((await outsider.put(`/deals/${dealId}`, { title: 'hijacked' })).status()).toBe(404);
    expect((await outsider.delete(`/deals/${dealId}`)).status()).toBe(404);
    expect((await outsider.put(`/deals/${dealId}/status`, { status: 'CANCELLED' })).status()).toBe(404);
    expect((await outsider.get(`/deals/${dealId}`)).status()).toBe(403);

    // Approving and rejecting are the platform's decision.
    for (const side of [buyer, seller]) {
      expect((await side.put(`/deals/${dealId}/approve`)).status()).toBe(403);
      expect((await side.put(`/deals/${dealId}/reject`)).status()).toBe(403);
      expect((await side.put(`/deals/${dealId}/status`, { status: 'CONFIRMED' })).status()).toBe(403);
    }
    // A party may edit the terms while pending, and a title change is visible to them.
    expect((await buyer.put(`/deals/${dealId}`, { title: 'Renamed by buyer' })).status()).toBe(200);
    expect((await (await seller.get(`/deals/${dealId}`)).json()).title).toBe('Renamed by buyer');
    await Promise.all([buyer.dispose(), seller.dispose(), outsider.dispose()]);
  });
});

test.describe('Products', () => {
  test('only the owning company can list, change or remove its products', async () => {
    const owner = await Session.create('merchant');
    const attacker = await Session.create('attacker');

    expect((await attacker.post('/products', { name: 'Fake', price: 10, merchantId: owner.companyId })).status()).toBe(403);
    const created = await owner.post('/products', { name: 'Widget', price: 100, merchantId: owner.companyId });
    expect(created.status()).toBe(201);
    const id = (await created.json()).id as string;

    expect((await attacker.put(`/products/${id}`, { price: 1 })).status()).toBe(404);
    expect((await attacker.delete(`/products/${id}`)).status()).toBe(404);
    expect((await owner.put(`/products/${id}`, { price: 120 })).status()).toBe(200);
    expect((await owner.delete(`/products/${id}`)).status()).toBe(200);
    await Promise.all([owner.dispose(), attacker.dispose()]);
  });
});

test.describe('Messages', () => {
  test('you cannot send as another company, and only the right side can read or delete a message', async () => {
    const a = await Session.create('a');
    const b = await Session.create('b');
    const spoofer = await Session.create('spoofer');

    expect((await spoofer.post('/messages/send', { senderId: a.companyId, receiverId: b.companyId, content: 'forged' })).status()).toBe(403);

    const sent = await a.post('/messages/send', { senderId: a.companyId, receiverId: b.companyId, content: 'hello' });
    expect(sent.status()).toBe(201);
    const id = (await sent.json()).id as string;

    expect((await spoofer.put(`/messages/${id}/read`)).status()).toBe(404);
    expect((await a.put(`/messages/${id}/read`)).status()).toBe(404);       // the sender is not the receiver
    expect((await b.put(`/messages/${id}/read`)).status()).toBe(200);
    expect((await spoofer.delete(`/messages/${id}`)).status()).toBe(404);
    expect((await b.delete(`/messages/${id}`)).status()).toBe(404);         // the receiver cannot delete the sender's message
    expect((await a.delete(`/messages/${id}`)).status()).toBe(200);

    // Inside a deal, only its two parties can talk, and only to each other.
    const dealId = await dealBetween(a, b);
    expect((await spoofer.post('/messages/send', { senderId: spoofer.companyId, receiverId: b.companyId, dealId, content: 'butting in' })).status()).toBe(403);
    expect((await a.post('/messages/send', { senderId: a.companyId, receiverId: b.companyId, dealId, content: 'about our deal' })).status()).toBe(201);
    await Promise.all([a.dispose(), b.dispose(), spoofer.dispose()]);
  });
});

test.describe('Agreements and milestones', () => {
  test('both parties sign once each, and an outsider can neither see nor sign', async () => {
    const buyer = await Session.create('buyer');
    const seller = await Session.create('seller');
    const outsider = await Session.create('outsider');
    const dealId = await dealBetween(buyer, seller);

    expect((await outsider.post('/documents/agreements', { dealId })).status()).toBe(403);
    expect((await outsider.get(`/documents/agreement/${dealId}`)).status()).toBe(404);
    expect(await (await buyer.get(`/documents/agreement/${dealId}`)).json()).toBeNull();

    const created = await buyer.post('/documents/agreements', { dealId });
    expect(created.status()).toBe(201);
    const agreement = await created.json();
    expect(agreement.parties).toHaveLength(2);
    expect(agreement.contentHash).toMatch(/^[0-9a-f]{64}$/);
    // Asking again returns the same agreement, not a second one.
    expect((await (await seller.post('/documents/agreements', { dealId })).json()).id).toBe(agreement.id);

    expect((await outsider.post(`/documents/${agreement.id}/sign`, { signerName: 'Intruder', agree: true })).status()).toBe(404);
    expect((await seller.post(`/documents/${agreement.id}/sign`, { signerName: 'S' })).status()).toBe(400);            // needs a real name and "I agree"
    expect((await seller.post(`/documents/${agreement.id}/sign`, { signerName: 'Seller Signer', agree: false })).status()).toBe(400);

    const first = await seller.post(`/documents/${agreement.id}/sign`, { signerName: 'Seller Signer', agree: true });
    expect(first.status()).toBe(200);
    expect((await first.json()).fullySigned).toBe(false);
    expect((await seller.post(`/documents/${agreement.id}/sign`, { signerName: 'Seller Signer', agree: true })).status()).toBe(409);

    const second = await buyer.post(`/documents/${agreement.id}/sign`, { signerName: 'Buyer Signer', agree: true });
    expect(second.status()).toBe(200);
    expect(await second.json()).toMatchObject({ fullySigned: true, status: 'SIGNED' });
    await Promise.all([buyer.dispose(), seller.dispose(), outsider.dispose()]);
  });

  test('a milestone is marked done by the provider and confirmed by the client, in that order', async () => {
    const buyer = await Session.create('buyer');
    const seller = await Session.create('seller');
    const outsider = await Session.create('outsider');
    const dealId = await dealBetween(buyer, seller);

    expect((await outsider.get(`/milestones/deal/${dealId}`)).status()).toBe(404);
    expect((await outsider.post(`/milestones/deal/${dealId}`, { title: 'Nope', amount: 1 })).status()).toBe(403);

    const made = await seller.post(`/milestones/deal/${dealId}`, { title: 'Phase 1', amount: 1000, dueDate: '2099-01-01' });
    expect(made.status()).toBe(201);
    const m = await made.json();
    expect(m.status).toBe('PLANNED');

    expect((await buyer.post(`/milestones/${m.id}/approve`)).status()).toBe(409);  // nothing to confirm yet
    expect((await buyer.post(`/milestones/${m.id}/submit`)).status()).toBe(403);   // only the provider marks it done
    expect((await outsider.post(`/milestones/${m.id}/submit`)).status()).toBe(404);

    const submitted = await seller.post(`/milestones/${m.id}/submit`);
    expect(submitted.status()).toBe(200);
    expect((await submitted.json()).status).toBe('SUBMITTED');
    expect((await seller.post(`/milestones/${m.id}/approve`)).status()).toBe(403); // the provider cannot confirm their own work

    const approved = await buyer.post(`/milestones/${m.id}/approve`);
    expect(approved.status()).toBe(200);
    expect((await approved.json()).status).toBe('APPROVED');
    expect((await seller.post(`/milestones/${m.id}/submit`)).status()).toBe(409);  // confirmed is final

    // Escrow is only for the client, and says so plainly when no payment provider is set up.
    const fund = await seller.post(`/payments/milestones/${m.id}/escrow`);
    expect([403, 503]).toContain(fund.status());
    await Promise.all([buyer.dispose(), seller.dispose(), outsider.dispose()]);
  });
});

test.describe('Phone and email verification', () => {
  test('a phone is verified with the right code, after wrong ones are refused', async () => {
    const user = await Session.create('phone');
    const sent = await user.post('/auth/phone/send', {});
    expect(sent.status()).toBe(200);
    const { devCode } = await sent.json();
    expect(devCode).toMatch(/^\d{6}$/); // present only with the development console provider, which CI uses

    const wrong = devCode === '111111' ? '222222' : '111111';
    expect((await user.post('/auth/phone/verify', { code: wrong })).status()).toBe(400);
    expect((await user.post('/auth/phone/verify', { code: '12' })).status()).toBe(400);
    expect((await user.post('/auth/phone/send', {})).status()).toBe(429); // one code a minute

    const ok = await user.post('/auth/phone/verify', { code: devCode });
    expect(ok.status()).toBe(200);
    expect((await (await user.get('/auth/me')).json()).phoneVerified).toBe(true);
    expect((await user.post('/auth/phone/send', {})).status()).toBe(200); // already verified: nothing to send
    await user.dispose();
  });

  test('a made-up email verification link is refused', async ({ request }) => {
    const res = await request.post(`${API_URL}/auth/verify-email`, { data: { token: 'not-a-real-token' }, headers: { Origin: APP_ORIGIN } });
    expect(res.status()).toBe(400);
  });

  test('the readiness check reports ready once the database is up', async ({ request }) => {
    const res = await request.get(`${API_URL}/ready`);
    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('READY');
  });
});
