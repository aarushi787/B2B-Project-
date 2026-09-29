// B2BForCorporates — API Client
// Centralized HTTP client with JWT Bearer token injection.
// All requests go to VITE_API_BASE_URL (default: http://localhost:5000/api)

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'b2bforcorporates_token';

interface RequestOptions extends RequestInit {
  skipContentType?: boolean;
}

function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function buildHeaders(options?: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!options?.skipContentType) headers['Content-Type'] = 'application/json';
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options?.headers) Object.assign(headers, options.headers as Record<string, string>);
  return headers;
}

export const apiClient = {
  setToken(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch {}
  },
  getToken() { return getStoredToken(); },
  clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
  },

  async request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, init);
    if (response.status === 401) {
      apiClient.clearToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth')) {
        window.location.href = '/auth';
      }
      throw new Error('Unauthorized');
    }
    if (!response.ok) {
      const text = await response.text();
      let msg = text;
      try { 
        const json = JSON.parse(text); 
        msg = json.message || json.error?.message || text; 
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
