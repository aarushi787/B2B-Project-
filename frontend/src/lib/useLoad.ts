import { useCallback, useEffect, useRef, useState } from 'react';

/** Loads data with explicit loading / error / retry state and ignores stale responses. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  const reload = useCallback(async () => {
    const run = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await loader.current();
      if (run === latest.current) setData(result);
    } catch (e: any) {
      if (run === latest.current) setError(friendlyError(e));
    } finally {
      if (run === latest.current) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void reload(); }, deps);

  return { data, loading, error, reload, setData };
}

/** Turns "API Error: 409 Conflict - message" into just the message. */
export function friendlyError(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e ?? '');
  const m = /^API Error: \d+ [^-]*- (.*)$/s.exec(text);
  const msg = (m ? m[1] : text).replace(/\s*\|.*$/s, '').trim();
  if (!msg || msg === 'Failed to fetch') return 'Could not reach the server. Check your connection and try again.';
  return msg;
}
