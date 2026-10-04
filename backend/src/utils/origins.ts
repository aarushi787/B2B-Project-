// Allowed browser origins (CORS, CSRF Origin check, websocket handshake) come from CORS_ORIGIN:
// a comma-separated list of exact origins, optionally with `*` standing for ONE hostname segment, e.g.
//   https://app.example.com,https://my-app-*-my-team.vercel.app
// `*` never matches a dot, so `https://my-app-*-my-team.vercel.app` cannot be matched by someone else's
// `evil.vercel.app`: pin wildcards to a suffix only your team controls. A bare `*` is rejected on purpose,
// because this API uses credentialed (cookie) requests.

export const DEFAULT_DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

export function parseOriginList(value: string | undefined): string[] {
  if (!value) return DEFAULT_DEV_ORIGINS;
  return value
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

function patternToRegExp(pattern: string): RegExp | null {
  // Must be a full origin with a scheme; a wildcard may only appear in the host part.
  const match = /^(https?):\/\/([^/]+)$/i.exec(pattern);
  if (!match) return null;
  const host = match[2];
  if (host === '*' || host.startsWith('*.')) return null; // too broad
  const escaped = host
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('[a-z0-9-]+');
  return new RegExp(`^${match[1].toLowerCase()}://${escaped}$`, 'i');
}

export function createOriginMatcher(patterns: string[]): (origin: string) => boolean {
  const exact = new Set<string>();
  const wildcards: RegExp[] = [];
  for (const raw of patterns) {
    const p = raw.trim().replace(/\/+$/, '');
    if (!p) continue;
    if (p.includes('*')) {
      const re = patternToRegExp(p);
      if (re) wildcards.push(re);
    } else {
      exact.add(p.toLowerCase());
    }
  }
  return (origin: string) => {
    const o = origin.trim().replace(/\/+$/, '');
    return exact.has(o.toLowerCase()) || wildcards.some((re) => re.test(o));
  };
}

/** Base URL of the frontend for links in emails: FRONTEND_URL, else the first concrete CORS origin. */
export function frontendBaseUrl(env: { FRONTEND_URL?: string; CORS_ORIGIN?: string } = process.env): string {
  const explicit = env.FRONTEND_URL?.trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  const first = parseOriginList(env.CORS_ORIGIN).find((o) => !o.includes('*'));
  return first || DEFAULT_DEV_ORIGINS[0];
}
