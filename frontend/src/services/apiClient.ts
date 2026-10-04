// B2BForCorporates — API Client
// Cookie-based auth: the access/refresh tokens live in httpOnly cookies set by the API, so JavaScript never
// sees or stores them (an XSS bug cannot steal them). State-changing requests carry an X-CSRF-Token header,
// which the API hands out on login/refresh and at GET /auth/csrf; it is kept in memory only.
// All requests go to VITE_API_BASE_URL (default: http://localhost:5000/api)

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const LEGACY_TOKEN_KEY = 'b2bforcorporates_token';
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// Endpoints where a 401 means "bad credentials/no session", not "your access token expired".
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/csrf', '/auth/forgot-password', '/auth/reset-password'];

// One-time cleanup: earlier versions kept the JWT in localStorage.
try { localStorage.removeItem(LEGACY_TOKEN_KEY); } catch {}

interface RequestOptions extends RequestInit {
  skipContentType?: boolean;
}

let csrfToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

function buildHeaders(options?: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!options?.skipContentType) headers['Content-Type'] = 'application/json';
  if (options?.headers) Object.assign(headers, options.headers as Record<string, string>);
  return headers;
}

function toUrl(endpoint: string) {
  return endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
}

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch(toUrl('/auth/csrf'), { credentials: 'include' });
    const json = await res.json().catch(() => ({}));
    csrfToken = typeof json?.csrfToken === 'string' ? json.csrfToken : null;
  } catch {
    csrfToken = null;
  }
  return csrfToken;
}

/** Exchange the refresh cookie for a new access cookie. Concurrent callers share one attempt. */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const token = await ensureCsrfToken();
        const res = await fetch(toUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'X-CSRF-Token': token } : {}) },
          body: '{}',
        });
        if (!res.ok) return false;
        const json = await res.json().catch(() => ({}));
        csrfToken = typeof json?.csrfToken === 'string' ? json.csrfToken : null;
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function isProtectedPath() {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname;
  return p.startsWith('/app') || p.startsWith('/admin');
}

export const apiClient = {
  /** Called by the auth layer after login/register/refresh responses. */
  setCsrfToken(token: string | null | undefined) { csrfToken = token ?? null; },
  /** Forget the in-memory session state (the server clears the cookies on logout). */
  clearSession() { csrfToken = null; },

  async request<T>(endpoint: string, init: RequestInit = {}, attempt = 0): Promise<T> {
    const method = (init.method || 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    if (UNSAFE_METHODS.has(method)) {
      const token = await ensureCsrfToken();
      if (token) headers.set('X-CSRF-Token', token);
    }

    const response = await fetch(toUrl(endpoint), { ...init, headers, credentials: 'include' });

    if (response.status === 401 && attempt === 0 && !NO_REFRESH_PATHS.some(p => endpoint.startsWith(p))) {
      if (await refreshSession()) return apiClient.request<T>(endpoint, init, 1);
    }
    if (response.status === 403 && attempt === 0) {
      // A stale CSRF token (e.g. after the session rotated): fetch a fresh one and retry once.
      const body = await response.clone().json().catch(() => null);
      if (body?.error?.code === 'CSRF_INVALID') {
        csrfToken = null;
        return apiClient.request<T>(endpoint, init, 1);
      }
    }
    if (response.status === 401) {
      apiClient.clearSession();
      // Only bounce to the login page from signed-in areas; public pages (and the initial /auth/me probe) just see "logged out".
      if (isProtectedPath() && !NO_REFRESH_PATHS.some(p => endpoint.startsWith(p))) {
        window.location.href = '/auth';
      }
      throw new Error('Unauthorized');
    }
    if (!response.ok) {
      const text = await response.text();
      let msg = text;
      try {
        const json = JSON.parse(text);
        msg = json.message || json.error?.message || (typeof json.error === 'string' ? json.error : text);
        if (json.error?.details && Array.isArray(json.error.details)) {
          msg += " | " + json.error.details.map((d: any) => `${d.field}: ${d.message}`).join(', ');
        }
      } catch {}
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${msg}`);
    }
    const text = await response.text();
    if (!text) return undefined as T;
    try { return JSON.parse(text); } catch { return text as T; }
  },

  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request(endpoint, { method: 'GET', headers: buildHeaders(options) });
  },
  async post<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    const body = options?.skipContentType ? (data as any) : JSON.stringify(data);
    return this.request(endpoint, { method: 'POST', headers: buildHeaders(options), body });
  },
  async put<T>(endpoint: string, data: unknown, options?: RequestOptions): Promise<T> {
    const body = options?.skipContentType ? (data as any) : JSON.stringify(data);
    return this.request(endpoint, { method: 'PUT', headers: buildHeaders(options), body });
  },
  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request(endpoint, { method: 'DELETE', headers: buildHeaders(options) });
  },
};
