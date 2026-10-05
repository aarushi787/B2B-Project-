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
import { gstStatus, hasValidGstChecksum, trustChecks } from '../services/compliance.js';
import { buildAgreementText, hashContent } from '../services/agreements.js';
import { allowedActions as milestoneActions, applyAction, isOverdue, withinDealTotal } from '../services/milestones.js';
import { assessRisk } from '../services/risk.js';
import { csvCell } from '../utils/csv.js';
import { OTP_MAX_ATTEMPTS, canSendCode, canTryCode, codeMatches, generateCode, hashCode, maskPhone, normalizePhone } from '../services/otp.js';
import { smsProvider } from '../services/sms.js';
import { canChangeDealStatus, canEditDealTerms, sideOfDeal } from '../utils/dealAccess.js';
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

test('database: TiDB Cloud hosts always get TLS, even in development', () => {
  assert.ok(resolveSsl('gateway01.ap-northeast-1.prod.aws.tidbcloud.com', { NODE_ENV: 'development' }));
  assert.equal(resolveSsl('gateway01.ap-northeast-1.prod.aws.tidbcloud.com', { DB_SSL: 'false' }), undefined);
  assert.equal(resolveSsl('localhost', { NODE_ENV: 'development' }), undefined);
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

test('gst: a real GSTIN passes the format and check-digit test, and mistakes are caught', () => {
  assert.equal(hasValidGstChecksum('27AAPFU0939F1ZV'), true);
  assert.equal(hasValidGstChecksum('27aapfu0939f1zv'), true, 'case does not matter');
  assert.equal(hasValidGstChecksum('27AAPFU0939F1ZX'), false, 'wrong check digit');
  assert.equal(hasValidGstChecksum('27AAPFU0939F1Y1'), false, 'wrong shape');
  assert.equal(hasValidGstChecksum('not a gstin'), false);
  assert.equal(gstStatus(''), 'missing');
  assert.equal(gstStatus(null), 'missing');
  assert.equal(gstStatus('27AAPFU0939F1ZV'), 'valid');
  assert.equal(gstStatus('27AAPFU0939F1ZX'), 'invalid');
});

test('trust: the public summary has the verified flag and GST status but never the GST number', () => {
  const t = trustChecks({ verified: 1, gst: '27AAPFU0939F1ZV' });
  assert.deepEqual(t, { verified: true, gst: 'valid' });
  assert.deepEqual(trustChecks({ verified: 0 }), { verified: false, gst: 'missing' });
  assert.equal(JSON.stringify(t).includes('27AAPFU'), false);
});

test('agreements: same terms give the same text and hash, and any edit changes the hash', () => {
  const input = {
    dealId: 'deal-1', title: 'Cloud migration', description: 'Move to AWS', buyer: { name: 'Buyer Ltd', gst: '27AAPFU0939F1ZV' },
    seller: { name: 'Seller Pvt Ltd' }, amount: 52000, timeline: '4 weeks', deliverables: ['Plan', 'Cutover'], date: new Date('2026-10-05T00:00:00Z'),
  };
  const a = buildAgreementText(input);
  assert.equal(a, buildAgreementText(input));
  assert.equal(hashContent(a), hashContent(buildAgreementText(input)));
  assert.match(a, /Buyer Ltd/);
  assert.match(a, /INR 52,000/);
  assert.match(a, /1\. Plan/);
  assert.notEqual(hashContent(a), hashContent(a.replace('4 weeks', '6 weeks')));
  assert.equal(hashContent(a).length, 64);
});

test('milestones: the provider marks done, the client confirms, and nobody can skip a step', () => {
  assert.deepEqual(applyAction('PLANNED', 'submit', 'seller'), { ok: true, to: 'SUBMITTED' });
  assert.deepEqual(applyAction('SUBMITTED', 'approve', 'buyer'), { ok: true, to: 'APPROVED' });
  assert.deepEqual(applyAction('SUBMITTED', 'requestChanges', 'buyer'), { ok: true, to: 'PLANNED' });
  // The wrong side
  assert.equal(applyAction('PLANNED', 'submit', 'buyer').ok, false);
  assert.equal(applyAction('SUBMITTED', 'approve', 'seller').ok, false);
  assert.equal(applyAction('SUBMITTED', 'approve', null).ok, false);
  // The wrong step: the client cannot confirm work that was never marked done, and approval is final
  const early = applyAction('PLANNED', 'approve', 'buyer');
  assert.equal(early.ok, false);
  if (!early.ok) assert.equal(early.status, 409);
  assert.equal(applyAction('APPROVED', 'submit', 'seller').ok, false);
  assert.equal(applyAction('APPROVED', 'requestChanges', 'buyer').ok, false);
});

test('milestones: buttons follow the rules, and funded or finished milestones cannot be edited', () => {
  const planned = { status: 'PLANNED' as const, escrowStatus: 'NOT_FUNDED' as const, amount: 100 };
  assert.deepEqual(milestoneActions(planned, 'seller'), { edit: true, delete: true, submit: true, approve: false, requestChanges: false, fund: false });
  assert.equal(milestoneActions(planned, 'buyer').fund, true);
  assert.equal(milestoneActions({ ...planned, escrowStatus: 'FUNDED' }, 'buyer').edit, false);
  assert.equal(milestoneActions({ ...planned, escrowStatus: 'FUNDED' }, 'buyer').fund, false);
  assert.equal(milestoneActions({ ...planned, status: 'SUBMITTED' }, 'buyer').approve, true);
  assert.equal(milestoneActions({ ...planned, amount: 0 }, 'buyer').fund, false, 'nothing to hold');
  assert.equal(milestoneActions(planned, null).submit, false);
});

test('milestones: amounts may not exceed the deal total, and overdue means past the end of the due day', () => {
  assert.equal(withinDealTotal([400, 300], 300, 1000), true);
  assert.equal(withinDealTotal([400, 300], 300.01, 1000), false);
  assert.equal(withinDealTotal([5000], 5000, 0), true, 'a deal with no total has no cap');
  const now = new Date('2026-10-05T10:00:00Z');
  assert.equal(isOverdue({ status: 'PLANNED', dueDate: '2026-10-05' }, now), false, 'due today is not overdue yet');
  assert.equal(isOverdue({ status: 'PLANNED', dueDate: '2026-10-04' }, now), true);
  assert.equal(isOverdue({ status: 'APPROVED', dueDate: '2026-01-01' }, now), false);
  assert.equal(isOverdue({ status: 'SUBMITTED', dueDate: null }, now), false);
});

test('risk: every factor is listed, and the level follows the documented rule', () => {
  const good = { name: 'A', verified: true, gst: 'valid' as const, completedDeals: 2 };
  const calm = assessRisk({ buyer: good, seller: { ...good, name: 'B' }, agreement: 'signed', milestones: [{ status: 'PLANNED', dueDate: '2099-01-01', amount: 10, escrowStatus: 'NOT_FUNDED' }], escrowAvailable: false });
  assert.equal(calm.level, 'low');
  assert.equal(calm.points, 0);
  assert.ok(calm.factors.length >= 8);
  assert.equal(calm.factors.some((f) => f.key === 'escrow'), false, 'escrow is not judged when payments are not set up');

  const weak = { name: 'C', verified: false, gst: 'missing' as const, completedDeals: 0 };
  const risky = assessRisk({ buyer: weak, seller: { ...weak, name: 'D', gst: 'invalid' }, agreement: 'none', milestones: [], escrowAvailable: true });
  assert.equal(risky.level, 'high');
  assert.ok(risky.factors.every((f) => f.detail.length > 0), 'each factor explains itself');

  const late = assessRisk({ buyer: good, seller: { ...good, name: 'B' }, agreement: 'signed', milestones: [{ status: 'PLANNED', dueDate: '2020-01-01', amount: 10, escrowStatus: 'NOT_FUNDED' }], escrowAvailable: false, now: new Date('2026-10-05T00:00:00Z') });
  assert.notEqual(late.level, 'low', 'an overdue milestone is never low risk');

  const funded = assessRisk({ buyer: good, seller: { ...good, name: 'B' }, agreement: 'signed', milestones: [{ status: 'PLANNED', dueDate: null, amount: 10, escrowStatus: 'FUNDED' }], escrowAvailable: true });
  assert.equal(funded.factors.find((f) => f.key === 'escrow')?.status, 'good');
});

test('deals: only the two parties and admins can touch a deal, and nobody approves their own deal', () => {
  const deal = { buyerId: 'b', sellerId: 's' };
  assert.equal(sideOfDeal(deal, 'b'), 'buyer');
  assert.equal(sideOfDeal(deal, 's'), 'seller');
  assert.equal(sideOfDeal(deal, 'x'), null, 'a stranger is not a party');
  assert.equal(sideOfDeal(deal, undefined), null);

  // A stranger gets "not found", so deal ids cannot be probed
  const stranger = canChangeDealStatus({ isAdmin: false, side: null, from: 'pending', to: 'cancelled' });
  assert.equal(stranger.ok, false);
  if (!stranger.ok) assert.equal(stranger.status, 404);

  // Approval and rejection are the platform's decision
  for (const side of ['buyer', 'seller'] as const) {
    for (const to of ['approved', 'rejected'] as const) {
      const r = canChangeDealStatus({ isAdmin: false, side, from: 'pending', to });
      assert.equal(r.ok, false, `${side} must not set ${to}`);
    }
  }
  assert.equal(canChangeDealStatus({ isAdmin: true, side: null, from: 'pending', to: 'approved' }).ok, true);

  // What a party may do
  assert.equal(canChangeDealStatus({ isAdmin: false, side: 'seller', from: 'pending', to: 'cancelled' }).ok, true);
  assert.equal(canChangeDealStatus({ isAdmin: false, side: 'buyer', from: 'approved', to: 'completed' }).ok, true);
  assert.equal(canChangeDealStatus({ isAdmin: false, side: 'seller', from: 'approved', to: 'completed' }).ok, false, 'only the buyer completes');
  assert.equal(canChangeDealStatus({ isAdmin: false, side: 'buyer', from: 'pending', to: 'completed' }).ok, false, 'not before approval');
  assert.equal(canChangeDealStatus({ isAdmin: false, side: 'buyer', from: 'completed', to: 'cancelled' }).ok, false, 'a finished deal stays finished');

  // Terms can be edited only while pending
  assert.equal(canEditDealTerms({ isAdmin: false, side: 'buyer', status: 'pending' }).ok, true);
  assert.equal(canEditDealTerms({ isAdmin: false, side: 'buyer', status: 'approved' }).ok, false);
  assert.equal(canEditDealTerms({ isAdmin: false, side: null, status: 'pending' }).ok, false);
  assert.equal(canEditDealTerms({ isAdmin: true, side: null, status: 'approved' }).ok, true);
});

test('csv: cells are quoted, and formulas are defused so a spreadsheet cannot run them', () => {
  assert.equal(csvCell('hello'), '"hello"');
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvCell({ a: 1 }), '"{""a"":1}"');
  for (const bad of ['=HYPERLINK("http://evil")', '+1+1', '-2+3', '@SUM(A1)']) {
    assert.ok(csvCell(bad).startsWith('"' + "'"), `${bad} must be defused`);
  }
  assert.equal(csvCell('a=b'), '"a=b"', 'only a leading character is dangerous');
});

test('otp: numbers are normalised, and masked when shown', () => {
  assert.equal(normalizePhone('+91 98765-43210'), '+919876543210');
  assert.equal(normalizePhone('(022) 5554 1234'), null, 'a leading 0 is a local number, not an international one');
  assert.equal(normalizePhone('12345'), null, 'too short');
  assert.equal(normalizePhone('+1234567890123456'), null, 'too long');
  assert.equal(normalizePhone('abc'), null);
  assert.equal(normalizePhone(undefined), null);
  assert.equal(maskPhone('+919876543210'), '+91••••••3210');
});

test('otp: codes are 6 digits, hashed with a key, and only the right code matches', () => {
  for (let i = 0; i < 50; i++) assert.match(generateCode(), /^\d{6}$/);
  const hash = hashCode('secret', 'user-1', '+919876543210', '123456');
  assert.equal(hash.length, 64);
  assert.equal(codeMatches(hash, 'secret', 'user-1', '+919876543210', '123456'), true);
  assert.equal(codeMatches(hash, 'secret', 'user-1', '+919876543210', '123457'), false, 'wrong code');
  assert.equal(codeMatches(hash, 'other', 'user-1', '+919876543210', '123456'), false, 'wrong key');
  assert.equal(codeMatches(hash, 'secret', 'user-2', '+919876543210', '123456'), false, 'another user');
  assert.equal(codeMatches(hash, 'secret', 'user-1', '+910000000000', '123456'), false, 'another number');
  assert.equal(codeMatches(hash, 'secret', 'user-1', '+919876543210', '12345'), false, 'not 6 digits');
});

test('otp: resend cooldown, hourly cap, expiry and attempt limit', () => {
  const now = new Date('2026-10-05T10:00:00Z');
  assert.equal(canSendCode({ lastSentAt: null, sendsLastHour: 0, now }).ok, true);
  const soon = canSendCode({ lastSentAt: new Date('2026-10-05T09:59:30Z'), sendsLastHour: 1, now });
  assert.equal(soon.ok, false);
  if (!soon.ok) assert.equal(soon.retryAfterSeconds, 30);
  assert.equal(canSendCode({ lastSentAt: new Date('2026-10-05T09:58:00Z'), sendsLastHour: 1, now }).ok, true);
  assert.equal(canSendCode({ lastSentAt: new Date('2026-10-05T09:50:00Z'), sendsLastHour: 5, now }).ok, false, 'hourly cap');

  const fresh = { expiresAt: new Date('2026-10-05T10:05:00Z'), attempts: 0 };
  assert.deepEqual(canTryCode(fresh, now), { ok: true, attemptsLeft: OTP_MAX_ATTEMPTS });
  assert.equal(canTryCode(null, now).ok, false);
  assert.equal(canTryCode({ ...fresh, consumedAt: now }, now).ok, false, 'a used code is gone');
  const old = canTryCode({ ...fresh, expiresAt: new Date('2026-10-05T09:59:00Z') }, now);
  assert.equal(old.ok === false && old.reason, 'expired');
  const locked = canTryCode({ ...fresh, attempts: OTP_MAX_ATTEMPTS }, now);
  assert.equal(locked.ok === false && locked.reason, 'locked');
});

test('sms: the console provider never exists in production, and twilio needs all its settings', () => {
  assert.equal(smsProvider({ NODE_ENV: 'development' } as NodeJS.ProcessEnv), 'console');
  assert.equal(smsProvider({ NODE_ENV: 'production' } as NodeJS.ProcessEnv), null);
  assert.equal(smsProvider({ NODE_ENV: 'production', SMS_PROVIDER: 'console' } as NodeJS.ProcessEnv), null);
  assert.equal(smsProvider({ NODE_ENV: 'production', SMS_PROVIDER: 'twilio' } as NodeJS.ProcessEnv), null, 'missing credentials');
  assert.equal(smsProvider({ NODE_ENV: 'production', SMS_PROVIDER: 'twilio', TWILIO_ACCOUNT_SID: 'a', TWILIO_AUTH_TOKEN: 'b', TWILIO_FROM: '+1' } as NodeJS.ProcessEnv), 'twilio');
});
