import { test, expect } from '@playwright/test';
import { Session, sampleRequirement } from './helpers';

test.describe('notifications and document approvals', () => {
  test('a proposal notifies the buyer, and nobody can read or clear another company\'s notifications', async () => {
    const buyer = await Session.create('buyer');
    const seller = await Session.create('seller');
    const intruder = await Session.create('intruder');

    const req = await (await buyer.post('/requirements', sampleRequirement())).json();
    const sent = await seller.post(`/requirements/${req.id}/proposals`, { amount: 5000, timeline: '2 weeks', message: 'We can do this.' });
    expect(sent.status()).toBe(201);

    await expect.poll(async () => (await (await buyer.get('/notifications')).json()).map((n: any) => n.title)).toContain('New proposal received');

    const list = await (await buyer.get('/notifications')).json();
    const note = list.find((n: any) => n.title === 'New proposal received');
    expect(note.isRead).toBe(false);

    expect((await (await intruder.get('/notifications')).json()).length).toBe(0);
    await intruder.put(`/notifications/${note.id}/read`);
    const after = await (await buyer.get('/notifications')).json();
    expect(after.find((n: any) => n.id === note.id).isRead).toBe(false);

    await buyer.put('/notifications/read-all');
    const read = await (await buyer.get('/notifications')).json();
    expect(read.every((n: any) => n.isRead)).toBe(true);

    await Promise.all([buyer.dispose(), seller.dispose(), intruder.dispose()]);
  });

  test('users cannot create notifications, approve documents or read the admin queue', async () => {
    const user = await Session.create('user');
    expect((await user.post('/notifications', { title: 'phish', message: 'x', companyId: user.companyId })).status()).toBe(403);
    expect((await user.get('/admin/approvals')).status()).toBe(403);
    expect((await user.get('/admin/activity')).status()).toBe(403);

    const up = await user.post('/kyc/upload', {
      companyId: user.companyId, documentType: 'BUSINESS_REG', fileName: 'reg.pdf', mimeType: 'application/pdf', sizeBytes: 4,
      contentBase64: Buffer.from('test').toString('base64'),
    });
    expect(up.status()).toBe(201);
    const { id, status } = await up.json();
    expect(status).toBe('PENDING');

    expect((await user.put(`/kyc/${id}/verify`, { status: 'VERIFIED' })).status()).toBe(403);
    expect((await user.get(`/kyc/${id}/file`)).status()).toBe(403);
    const mine = await (await user.get(`/kyc/company/${user.companyId}`)).json();
    expect(mine.find((d: any) => d.id === id).status).toBe('PENDING');

    const other = await Session.create('other');
    expect((await other.get(`/kyc/company/${user.companyId}`)).status()).toBe(403);
    expect((await other.post('/kyc/upload', { companyId: user.companyId, documentType: 'GOV_ID', fileName: 'x.pdf' })).status()).toBe(403);
    await Promise.all([user.dispose(), other.dispose()]);
  });

  test('other private endpoints are closed to ordinary users', async () => {
    const a = await Session.create('a');
    const b = await Session.create('b');
    expect((await a.get('/messages')).status()).toBe(403);
    expect((await a.get('/compliance/aml-checks')).status()).toBe(403);
    expect((await a.put(`/companies/${a.companyId}/verify`)).status()).toBe(403);
    expect((await a.get(`/messages/company/${b.companyId}`)).status()).toBe(403);
    expect((await a.get(`/messages/company/${a.companyId}`)).status()).toBe(200);
    await Promise.all([a.dispose(), b.dispose()]);
  });
});
