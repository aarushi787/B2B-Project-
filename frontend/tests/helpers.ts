import { request as pwRequest, type APIRequestContext, type APIResponse } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL || 'http://localhost:5000/api';
export const APP_ORIGIN = process.env.E2E_BASE_URL || 'http://localhost:5173';
export const PASSWORD = 'E2e-Passw0rd!';

let counter = 0;

/** Unique account details so repeated runs never collide. */
export function uniqueAccount(label = 'user') {
  counter += 1;
  const stamp = `${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 6)}`;
  return {
    name: 'E2E Tester',
    email: `e2e+${label}-${stamp}@example.com`,
    phone: '+91 98765 43210',
    password: PASSWORD,
    companyName: `E2E ${label} ${stamp}`,
  };
}

/** Register through the API. The request context keeps the httpOnly cookies for later calls. */
export async function registerViaApi(request: APIRequestContext, extra: Record<string, unknown> = {}) {
  const account = uniqueAccount();
  const res = await request.post(`${API_URL}/auth/register`, {
    data: { ...account, ...extra },
    headers: { Origin: APP_ORIGIN },
  });
  const body = await res.json();
  return { account, res, body };
}

/**
 * One signed-in company, with its own cookie jar. Use several to play different companies in one test.
 * Writes automatically carry the Origin and X-CSRF-Token headers, like the real frontend.
 */
export class Session {
  constructor(
    readonly ctx: APIRequestContext,
    private csrf: string,
    readonly companyId: string,
    readonly userId: string,
    readonly companyName: string,
  ) {}

  static async create(label = 'co'): Promise<Session> {
    const ctx = await pwRequest.newContext();
    const { account, res, body } = await registerViaApi(ctx);
    if (res.status() !== 201) throw new Error(`register failed: ${res.status()} ${JSON.stringify(body)}`);
    return new Session(ctx, body.csrfToken, body.user.companyId, body.user.id, `${label}:${account.companyName}`);
  }

  private headers() {
    return { Origin: APP_ORIGIN, 'X-CSRF-Token': this.csrf };
  }
  get(path: string): Promise<APIResponse> {
    return this.ctx.get(`${API_URL}${path}`);
  }
  post(path: string, data: unknown = {}): Promise<APIResponse> {
    return this.ctx.post(`${API_URL}${path}`, { data, headers: this.headers() });
  }
  put(path: string, data: unknown = {}): Promise<APIResponse> {
    return this.ctx.put(`${API_URL}${path}`, { data, headers: this.headers() });
  }
  dispose() {
    return this.ctx.dispose();
  }
}

export const sampleRequirement = (over: Record<string, unknown> = {}) => ({
  title: 'Cloud migration to AWS',
  description: 'Move our on-premise servers to AWS with a DevOps pipeline and documentation.',
  category: 'Cloud & DevOps',
  budgetMin: 40000,
  budgetMax: 60000,
  timeline: 'Within 1 Month',
  ...over,
});
