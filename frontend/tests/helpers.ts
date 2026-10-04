import type { APIRequestContext } from '@playwright/test';

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
