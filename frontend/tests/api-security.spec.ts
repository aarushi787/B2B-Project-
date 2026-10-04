import { test, expect } from '@playwright/test';
import { API_URL, APP_ORIGIN, registerViaApi } from './helpers';

const ORIGIN = { Origin: APP_ORIGIN };
const randomUuid = () => crypto.randomUUID();

test.describe('Auth and authorization (API)', () => {
  test('self-registration can never create an admin, even if the client asks for it', async ({ request }) => {
    const { res, body } = await registerViaApi(request, { role: 'admin' });
    expect(res.status()).toBe(201);
    expect(body.user.role).toBe('USER');

    const admin = await request.get(`${API_URL}/admin/users`);
    expect(admin.status()).toBe(403);
  });

  test('tokens live only in httpOnly cookies, never in the JSON body', async ({ request }) => {
    const { res, body } = await registerViaApi(request);
    expect(body.token).toBeUndefined();
    expect(body.refreshToken).toBeUndefined();
    expect(typeof body.csrfToken).toBe('string');

    const cookies = res.headersArray().filter(h => h.name.toLowerCase() === 'set-cookie').map(h => h.value);
    for (const name of ['access_token', 'refresh_token']) {
      const cookie = cookies.find(v => v.startsWith(`${name}=`));
      expect(cookie, `${name} cookie`).toBeTruthy();
      expect(cookie!.toLowerCase()).toContain('httponly');
    }
  });

  test('CSRF: cookie-authenticated writes need the token and an allowed origin', async ({ request }) => {
    const { body } = await registerViaApi(request);
    const url = `${API_URL}/auth/validate-token`;

    const missing = await request.post(url, { data: {}, headers: ORIGIN });
    expect(missing.status()).toBe(403);
    expect((await missing.json()).error.code).toBe('CSRF_INVALID');

    const wrong = await request.post(url, { data: {}, headers: { ...ORIGIN, 'X-CSRF-Token': 'nope' } });
    expect(wrong.status()).toBe(403);

    const evil = await request.post(url, {
      data: {},
      headers: { Origin: 'http://evil.example', 'X-CSRF-Token': body.csrfToken },
    });
    expect(evil.status()).toBe(403);
    expect((await evil.json()).error.code).toBe('CSRF_ORIGIN');

    const ok = await request.post(url, { data: {}, headers: { ...ORIGIN, 'X-CSRF-Token': body.csrfToken } });
    expect(ok.status()).toBe(200);
  });

  test('refresh rotates the session and invalidates the previous CSRF token', async ({ request }) => {
    const { body } = await registerViaApi(request);
    const refreshed = await request.post(`${API_URL}/auth/refresh`, {
      data: {},
      headers: { ...ORIGIN, 'X-CSRF-Token': body.csrfToken },
    });
    expect(refreshed.status()).toBe(200);
    const next = (await refreshed.json()).csrfToken as string;
    expect(next).not.toBe(body.csrfToken);

    const stale = await request.post(`${API_URL}/auth/validate-token`, {
      data: {},
      headers: { ...ORIGIN, 'X-CSRF-Token': body.csrfToken },
    });
    expect(stale.status()).toBe(403);

    const fresh = await request.post(`${API_URL}/auth/validate-token`, {
      data: {},
      headers: { ...ORIGIN, 'X-CSRF-Token': next },
    });
    expect(fresh.status()).toBe(200);
  });

  test('logout ends the session', async ({ request }) => {
    const { body } = await registerViaApi(request);
    expect((await request.get(`${API_URL}/auth/me`)).status()).toBe(200);

    const out = await request.post(`${API_URL}/auth/logout`, {
      data: {},
      headers: { ...ORIGIN, 'X-CSRF-Token': body.csrfToken },
    });
    expect(out.status()).toBe(200);
    expect((await request.get(`${API_URL}/auth/me`)).status()).toBe(401);
  });
});

test.describe('Deal party rules (API)', () => {
  test('a company cannot be both buyer and seller of one deal', async ({ request }) => {
    const { body } = await registerViaApi(request);
    const companyId = body.user.companyId as string;
    const res = await request.post(`${API_URL}/deals`, {
      data: { buyerId: companyId, sellerId: companyId, title: 'self deal' },
      headers: { ...ORIGIN, 'X-CSRF-Token': body.csrfToken },
    });
    expect(res.status()).toBe(400);
  });

  test('you cannot create a deal between two other companies', async ({ request }) => {
    const { body } = await registerViaApi(request);
    const res = await request.post(`${API_URL}/deals`, {
      data: { buyerId: randomUuid(), sellerId: randomUuid(), title: 'not mine' },
      headers: { ...ORIGIN, 'X-CSRF-Token': body.csrfToken },
    });
    expect(res.status()).toBe(403);
  });
});
