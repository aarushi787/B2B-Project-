// Backend unit tests (node:test). Run with `npm test`.
process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.DATA_ENCRYPTION_KEY = 'test-encryption-key';

import test from 'node:test';
import assert from 'node:assert/strict';
import { cookieFlags, signSocketToken, verifySocketToken, signAccessToken, verifyAccessToken, createRefreshToken, hashRefreshToken } from '../services/tokens.js';
import { checkDealParties } from '../utils/dealParties.js';
import { normalizeAccountRole, toDbRole } from '../utils/roles.js';
import { csrfProtection, csrfTokenFor } from '../middleware/csrf.js';
import { allowedActions, assertAllowed, dealFromAcceptedProposal, NegotiationError, parseDeliverables, sideOf, validateBudget, validateOffer } from '../services/negotiation.js';
import { createOriginMatcher, frontendBaseUrl, parseOriginList } from '../utils/origins.js';
import { describeDatabase } from '../utils/redact.js';
import { buildPoolConfig, resolveSsl } from '../config/database.js';
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

// ---- Requirements, proposals, negotiation --------------------------------------------------------------
test('negotiation: sides are derived from the companies, never from a user-chosen role', () => {
  assert.equal(sideOf('R', 'R', 'P'), 'requester');
  assert.equal(sideOf('P', 'R', 'P'), 'proposer');
  assert.equal(sideOf('X', 'R', 'P'), null);
  assert.equal(sideOf(undefined, 'R', 'P'), null);
});

test('negotiation: a fresh proposal can be shortlisted, rejected, accepted or countered by the requester only', () => {
  const base = { requirementStatus: 'open' as const, proposalStatus: 'submitted' as const, lastOfferBy: 'proposer' as const };
  assert.deepEqual(allowedActions({ ...base, side: 'requester' }), ['shortlist', 'counter', 'accept', 'reject']);
  // the proposer made the last offer, so it is not their turn: they can only withdraw
  assert.deepEqual(allowedActions({ ...base, side: 'proposer' }), ['withdraw']);
});

test('negotiation: after the requester counters, the turn passes to the proposer', () => {
  const base = { requirementStatus: 'open' as const, proposalStatus: 'shortlisted' as const, lastOfferBy: 'requester' as const };
  assert.deepEqual(allowedActions({ ...base, side: 'proposer' }), ['counter', 'accept', 'withdraw']);
  assert.deepEqual(allowedActions({ ...base, side: 'requester' }), ['reject']);
});

test('negotiation: nobody can act on a closed requirement or a finished proposal, and outsiders can never act', () => {
  const live = { proposalStatus: 'submitted' as const, lastOfferBy: 'proposer' as const };
  for (const requirementStatus of ['closed', 'awarded', 'cancelled'] as const) {
    assert.deepEqual(allowedActions({ requirementStatus, side: 'requester', ...live }), []);
  }
  for (const proposalStatus of ['rejected', 'accepted', 'withdrawn'] as const) {
    assert.deepEqual(allowedActions({ requirementStatus: 'open', proposalStatus, lastOfferBy: 'proposer', side: 'requester' }), []);
  }
  assert.deepEqual(allowedActions({ requirementStatus: 'open', side: null, ...live }), []);
});

test('negotiation: you cannot accept your own latest offer', () => {
  assert.throws(
    () => assertAllowed('accept', { requirementStatus: 'open', proposalStatus: 'submitted', lastOfferBy: 'proposer', side: 'proposer' }),
    (e: unknown) => e instanceof NegotiationError && e.status === 409
  );
  assert.throws(
    () => assertAllowed('accept', { requirementStatus: 'open', proposalStatus: 'submitted', lastOfferBy: 'proposer', side: null }),
    (e: unknown) => e instanceof NegotiationError && e.status === 403
  );
  assert.doesNotThrow(() => assertAllowed('accept', { requirementStatus: 'open', proposalStatus: 'submitted', lastOfferBy: 'proposer', side: 'requester' }));
});

test('negotiation: offer and budget validation', () => {
  assert.equal(validateOffer({ amount: 50000 }), null);
  assert.ok(validateOffer({ amount: 0 }));
  assert.ok(validateOffer({ amount: -5 }));
  assert.ok(validateOffer({ amount: Number.NaN }));
  assert.ok(validateOffer({ amount: 5_000_000_000_000 }));
  assert.ok(validateOffer({ amount: 5_000_000 }, { budgetMax: 100_000 }));
  assert.equal(validateOffer({ amount: 150_000 }, { budgetMax: 100_000 }), null);
  assert.equal(validateBudget(1000, 5000), null);
  assert.ok(validateBudget(5000, 1000));
  assert.ok(validateBudget(-1, 10));
});

test('negotiation: accepting makes the requester the buyer and the proposer the seller, never the same company', () => {
  const deal = dealFromAcceptedProposal({ title: 'Cloud migration', description: 'Move to AWS', companyId: 'R' }, { companyId: 'P', amount: 45000 });
  assert.deepEqual(deal, { title: 'Cloud migration', description: 'Move to AWS', buyerId: 'R', sellerId: 'P', totalAmount: 45000 });
  assert.throws(() => dealFromAcceptedProposal({ title: 't', companyId: 'X' }, { companyId: 'X', amount: 1 }), NegotiationError);
});

test('negotiation: deliverables parse defensively', () => {
  assert.deepEqual(parseDeliverables('["a","b"]'), ['a', 'b']);
  assert.deepEqual(parseDeliverables(['x', 3, 'y']), ['x', 'y']);
  assert.deepEqual(parseDeliverables('not json'), []);
  assert.deepEqual(parseDeliverables(null), []);
});

// ---- Allowed origins (CORS) ----------------------------------------------------------------------------
test('origins: exact entries match, others do not, trailing slashes are ignored', () => {
  const ok = createOriginMatcher(parseOriginList('https://app.example.com/, http://localhost:5173'));
  assert.equal(ok('https://app.example.com'), true);
  assert.equal(ok('http://localhost:5173'), true);
  assert.equal(ok('https://evil.example.com'), false);
  assert.equal(ok('http://app.example.com'), false); // scheme matters
});

test('origins: a wildcard matches one hostname segment of the pinned pattern (Vercel previews), nothing else', () => {
  const ok = createOriginMatcher(['https://b2-b-project-*-guptaaarushi592-1933s-projects.vercel.app']);
  assert.equal(ok('https://b2-b-project-pkpc2yvp5-guptaaarushi592-1933s-projects.vercel.app'), true);
  assert.equal(ok('https://b2-b-project-abc123-guptaaarushi592-1933s-projects.vercel.app'), true);
  // someone else's deployment, a different team suffix, an extra dot, or a different scheme must not match
  assert.equal(ok('https://b2-b-project-pkpc2yvp5-someone-else.vercel.app'), false);
  assert.equal(ok('https://evil.vercel.app'), false);
  assert.equal(ok('https://b2-b-project-x.evil.com-guptaaarushi592-1933s-projects.vercel.app'), false);
  assert.equal(ok('http://b2-b-project-pkpc2yvp5-guptaaarushi592-1933s-projects.vercel.app'), false);
});

test('origins: dangerous catch-all patterns are ignored, not honoured', () => {
  for (const bad of ['*', 'https://*', 'https://*.vercel.app', '*.example.com']) {
    const ok = createOriginMatcher([bad]);
    assert.equal(ok('https://anything.vercel.app'), false, bad);
    assert.equal(ok('https://evil.example.com'), false, bad);
  }
});

test('origins: with CORS_ORIGIN unset only local dev origins are allowed', () => {
  const ok = createOriginMatcher(parseOriginList(undefined));
  assert.equal(ok('http://localhost:5173'), true);
  assert.equal(ok('https://anything.vercel.app'), false);
});

test('origins: email links use FRONTEND_URL or the first concrete origin, never a comma-joined list', () => {
  assert.equal(frontendBaseUrl({ FRONTEND_URL: 'https://app.example.com/' }), 'https://app.example.com');
  assert.equal(frontendBaseUrl({ CORS_ORIGIN: 'https://*-team.vercel.app,https://app.example.com,http://localhost:5173' }), 'https://app.example.com');
  assert.equal(frontendBaseUrl({}), 'http://localhost:5173');
});

test('csrf: wildcard-matched origins are accepted by the CSRF origin check too', () => {
  const matcher = createOriginMatcher(['https://app-*-team.vercel.app']);
  const headers: Record<string, string> = { origin: 'https://app-abc-team.vercel.app', cookie: 'refresh_token=x', 'x-csrf-token': csrfTokenFor('x') };
  const fakeReq: any = { method: 'POST', url: '/api/deals', originalUrl: '/api/deals', headers, get: (n: string) => headers[n.toLowerCase()] };
  let nexted = false;
  csrfProtection(matcher)(fakeReq, { status() { return this; }, json() { return this; } } as any, () => { nexted = true; });
  assert.equal(nexted, true);
});

test('logging: the database description never contains credentials', () => {
  const url = 'mysql://someuser.root:SuperSecretPw1@gateway.example.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';
  const described = describeDatabase({ DATABASE_URL: url });
  assert.equal(described, 'gateway.example.tidbcloud.com:4000/test');
  assert.ok(!described.includes('SuperSecretPw1') && !described.includes('someuser'));
  // an unparseable URL must not be echoed back either
  const bad = describeDatabase({ DATABASE_URL: 'not a url but has SuperSecretPw1' });
  assert.ok(!bad.includes('SuperSecretPw1'));
  assert.equal(describeDatabase({ DB_HOST: 'db', DB_PORT: '3307', DB_NAME: 'x' }), 'db:3307/x');
});

// ---- Deployment: cookie flags and socket tokens ---------------------------------------------------------
test('cookies: SameSite follows COOKIE_SAMESITE, defaults to none in production and lax elsewhere, and is Secure when it must be', () => {
  assert.deepEqual(cookieFlags({ NODE_ENV: 'development' }), { secure: false, sameSite: 'lax' });
  assert.deepEqual(cookieFlags({ NODE_ENV: 'production' }), { secure: true, sameSite: 'none' });
  assert.deepEqual(cookieFlags({ NODE_ENV: 'production', COOKIE_SAMESITE: 'lax' }), { secure: true, sameSite: 'lax' });
  assert.deepEqual(cookieFlags({ NODE_ENV: 'production', COOKIE_SAMESITE: 'STRICT' }), { secure: true, sameSite: 'strict' });
  // an invalid value is ignored, and SameSite=None is never sent without Secure
  assert.deepEqual(cookieFlags({ NODE_ENV: 'production', COOKIE_SAMESITE: 'bogus' }), { secure: true, sameSite: 'none' });
  assert.deepEqual(cookieFlags({ NODE_ENV: 'development', COOKIE_SAMESITE: 'none' }), { secure: true, sameSite: 'none' });
});

test('socket token: works only as a socket token, and is not accepted as an access token or vice versa', () => {
  const socket = signSocketToken({ userId: 'u1', companyId: 'c1', role: 'user' });
  assert.equal(verifySocketToken(socket).userId, 'u1');
  assert.equal(verifySocketToken(socket).type, 'socket');
  const access = signAccessToken({ userId: 'u1', companyId: 'c1', role: 'user' });
  assert.throws(() => verifySocketToken(access));
  assert.throws(() => verifyAccessToken(socket)); // a websocket token can never authenticate REST requests
});

// ---- Database connection settings ---------------------------------------------------------------------
test('database: a remote host gets TLS in production even when the URL has no ssl parameter', () => {
  const cfg = buildPoolConfig({ NODE_ENV: 'production', DATABASE_URL: 'mysql://user.root:pw@gateway.tidbcloud.com:4000/b2b' });
  assert.equal(cfg.host, 'gateway.tidbcloud.com');
  assert.equal(cfg.port, 4000);
  assert.equal(cfg.database, 'b2b');
  assert.deepEqual(cfg.ssl, { rejectUnauthorized: true });
});

test('database: the ssl query parameter, in any form, turns TLS on and never breaks parsing', () => {
  for (const q of ['?ssl={"rejectUnauthorized":true}', '?ssl=true', '?sslmode=require']) {
    const cfg = buildPoolConfig({ NODE_ENV: 'development', DATABASE_URL: `mysql://u:p@db.example.com:4000/x${q}` });
    assert.deepEqual(cfg.ssl, { rejectUnauthorized: true }, q);
  }
});

test('database: local databases stay unencrypted unless asked, and DB_SSL overrides either way', () => {
  assert.equal(buildPoolConfig({ NODE_ENV: 'production', DB_HOST: 'localhost' }).ssl, undefined);
  assert.equal(buildPoolConfig({ NODE_ENV: 'production', DB_HOST: 'db' }).ssl, undefined); // docker-compose service
  assert.equal(buildPoolConfig({ NODE_ENV: 'development', DB_HOST: '127.0.0.1' }).ssl, undefined);
  assert.deepEqual(buildPoolConfig({ NODE_ENV: 'development', DB_HOST: 'remote.example.com', DB_SSL: 'true' }).ssl, { rejectUnauthorized: true });
  assert.equal(buildPoolConfig({ NODE_ENV: 'production', DB_HOST: 'remote.example.com', DB_SSL: 'false' }).ssl, undefined);
});

test('database: passwords with special characters are decoded, and a provider CA can be supplied (PEM or base64)', () => {
  const cfg = buildPoolConfig({ DATABASE_URL: 'mysql://us%40er:p%40ss%23w%2Frd@host.example.com/db' });
  assert.equal(cfg.user, 'us@er');
  assert.equal(cfg.password, 'p@ss#w/rd');
  const pem = ['-----BEGIN CERTIFICATE-----', 'ABC', '-----END CERTIFICATE-----'].join(String.fromCharCode(10));
  assert.equal(resolveSsl('h.example.com', { DB_SSL: 'true', DB_SSL_CA: pem })?.ca, pem);
  assert.equal(resolveSsl('h.example.com', { DB_SSL: 'true', DB_SSL_CA: Buffer.from(pem).toString('base64') })?.ca, pem);
});
