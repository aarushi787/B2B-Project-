// Safe, human-readable description of the database for logs. NEVER log DATABASE_URL itself:
// it contains the username and password, and logs are stored and shared far more widely than secrets.
export function describeDatabase(env: { DATABASE_URL?: string; DB_HOST?: string; DB_PORT?: string; DB_NAME?: string } = process.env): string {
  if (env.DATABASE_URL) {
    try {
      const u = new URL(env.DATABASE_URL);
      return `${u.hostname}:${u.port || '3306'}${u.pathname}`;
    } catch {
      return '[DATABASE_URL set but not parseable]';
    }
  }
  return `${env.DB_HOST || 'localhost'}:${env.DB_PORT || '3306'}/${env.DB_NAME || 'b2bforcorporates'}`;
}
