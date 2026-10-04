// Backend unit tests (node:test). Run with `npm test`.
process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.DATA_ENCRYPTION_KEY = 'test-encryption-key';

import test from 'node:test';
import assert from 'node:assert/strict';
import { signAccessToken, verifyAccessToken, createRefreshToken, hashRefreshToken } from '../services/tokens.js';
import { checkDealParties } from '../utils/dealParties.js';
import { normalizeAccountRole, toDbRole } from '../utils/roles.js';
import { csrfProtection, csrfTokenFor } from '../middleware/csrf.js';
import { encryptJson, decryptJson } from '../utils/encryption.js';

test('access token round-trips its payload', () => {
  const token = signAccessToken({ userId: 'u1', companyId: 'c1', role: 'user' });
  const payload = verifyAccessToken(token);
  assert.equal(payload.userId, 'u1');
  assert.equal(payload.companyId, 'c1');
  assert.equal(payload.role, 'user');
});

test('tampered access token is rejected', () => {
  const token = signAccessToken({ userId: 'u1', companyId: null, role: 'admin' });
  assert.throws(() => verifyAccessToken(token.slice(0, -2) + 'xx'));
});

test('refresh tokens are unique and hash deterministically', () => {
  const a = createRefreshToken();
  const b = createRefreshToken();
  assert.notEqual(a, b);
  assert.equal(hashRefreshToken(a), hashRefreshToken(a));
  assert.notEqual(hashRefreshToken(a), a);
});

test('encryption round-trips JSON and is non-deterministic', () => {
  const data = { pan: 'ABCDE1234F', n: 5 };
  const c1 = encryptJson(data);
  assert.deepEqual(decryptJson(c1), data);
  assert.notEqual(c1, encryptJson(data));
});

test('encrypted payload tampering is detected', () => {
  const c = encryptJson({ a: 1 });
  const bad = c.slice(0, -4) + (c.endsWith('AAAA') ? 'BBBB' : 'AAAA');
  assert.throws(() => decryptJson(bad));
});

test('legacy buyer/seller account roles normalize to user; only admin stays admin', () => {
  assert.equal(normalizeAccountRole('buyer'), 'user');
  assert.equal(normalizeAccountRole('SELLER'), 'user');
  assert.equal(normalizeAccountRole(undefined), 'user');
  assert.equal(normalizeAccountRole('ADMIN'), 'admin');
  assert.equal(toDbRole('user'), 'buyer');
  assert.equal(toDbRole('admin'), 'admin');
});

test('a company cannot be both buyer and seller of one deal', () => {
  const r = checkDealParties({ buyerId: 'c1', sellerIds: ['c1'], callerCompanyId: 'c1' });
  assert.equal(r.ok, false);
});

test('callers can only create deals their company is a party to', () => {
  assert.equal(checkDealParties({ buyerId: 'c1', sellerIds: ['c2'], callerCompanyId: 'c1' }).ok, true);
  assert.equal(checkDealParties({ buyerId: 'c1', sellerIds: ['c2'], callerCompanyId: 'c2' }).ok, true);
  const r = checkDealParties({ buyerId: 'c1', sellerIds: ['c2'], callerCompanyId: 'c3' });
  assert.equal(r.ok, false);
  assert.equal(checkDealParties({ buyerId: 'c1', sellerIds: ['c2'], callerCompanyId: undefined }).ok, false);
});

test('platform admin may create deals for any two distinct companies', () => {
  assert.equal(checkDealParties({ buyerId: 'c1', sellerIds: ['c2'], callerCompanyId: 'x', isPlatformAdmin: true }).ok, true);
});

// ---- CSRF middleware -------------------------------------------------------------------------------
const ORIGINS = ['http://localhost:5173'];
function runCsrf(req: { method: string; url?: string; headers?: Record<string, string> }) {
  const headers = Object.fromEntries(Object.entries(req.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  const fakeReq: any = { method: req.method, url: req.url ?? '/api/deals', originalUrl: req.url ?? '/api/deals', headers, get: (n: string) => headers[n.toLowerCase()] };
  let status = 200; let nexted = false; let body: any;
  const fakeRes: any = { status(c: number) { status = c; return this; }, json(b: any) { body = b; return this; } };
  csrfProtection(ORIGINS)(fakeReq, fakeRes, () => { nexted = true; });
  return { status, nexted, code: body?.error?.code as string | undefined };
}
const REFRESH = 'refresh-cookie-value';
const cookie = `refresh_token=${REFRESH}`;

test('csrf: safe methods pass without a token', () => {
  assert.equal(runCsrf({ method: 'GET', headers: { cookie } }).nexted, true);
});

test('csrf: cookie-authenticated POST without a token is rejected', () => {
  const r = runCsrf({ method: 'POST', headers: { cookie, origin: ORIGINS[0] } });
  assert.equal(r.nexted, false);
  assert.equal(r.status, 403);
  assert.equal(r.code, 'CSRF_INVALID');
});

test('csrf: wrong token is rejected, correct token passes', () => {
  assert.equal(runCsrf({ method: 'DELETE', headers: { cookie, 'x-csrf-token': 'nope' } }).status, 403);
  assert.equal(runCsrf({ method: 'DELETE', headers: { cookie, 'x-csrf-token': csrfTokenFor(REFRESH) } }).nexted, true);
});

test('csrf: a token for a different session does not work', () => {
  assert.equal(runCsrf({ method: 'POST', headers: { cookie, 'x-csrf-token': csrfTokenFor('another-session') } }).status, 403);
});

test('csrf: foreign Origin is rejected even with a valid token', () => {
  const r = runCsrf({ method: 'POST', headers: { cookie, origin: 'http://evil.example', 'x-csrf-token': csrfTokenFor(REFRESH) } });
  assert.equal(r.code, 'CSRF_ORIGIN');
});

test('csrf: login is exempt from the token but still gets the origin check', () => {
  assert.equal(runCsrf({ method: 'POST', url: '/api/auth/login', headers: { cookie, origin: ORIGINS[0] } }).nexted, true);
  assert.equal(runCsrf({ method: 'POST', url: '/api/auth/login', headers: { origin: 'http://evil.example' } }).code, 'CSRF_ORIGIN');
});

test('csrf: requests with no cookies or with a Bearer header are not subject to the token check', () => {
  assert.equal(runCsrf({ method: 'POST', headers: {} }).nexted, true);
  assert.equal(runCsrf({ method: 'POST', headers: { cookie, authorization: 'Bearer abc' } }).nexted, true);
});
