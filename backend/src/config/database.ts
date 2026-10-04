// Purpose: This module (backend/src/config/database.ts) is used to implement project functionality in a modular, maintainable way.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

type DbEnv = Record<string, string | undefined>;

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', 'db', 'mysql']);

/**
 * TLS for the database connection.
 * - Cloud databases (TiDB Cloud, Aiven, RDS...) refuse unencrypted connections, so in production any non-local host
 *   gets TLS automatically: it no longer depends on a "?ssl=..." detail surviving in the connection URL.
 * - DB_SSL=true forces it on and DB_SSL=false forces it off (for example a database inside a private network).
 * - DB_SSL_CA takes the provider's CA certificate (PEM, or the PEM base64-encoded) for providers that use their own CA.
 */
export function resolveSsl(host: string | undefined, env: DbEnv, urlRequestedSsl = false): mysql.SslOptions | undefined {
  const flag = (env.DB_SSL || '').trim().toLowerCase();
  if (flag === 'false' || flag === '0') return undefined;
  const local = !host || LOCAL_HOSTS.has(host.toLowerCase());
  const wanted = flag === 'true' || flag === '1' || urlRequestedSsl || (!local && env.NODE_ENV === 'production');
  if (!wanted) return undefined;

  let ca = (env.DB_SSL_CA || '').trim();
  if (ca && !ca.includes('BEGIN CERTIFICATE')) {
    try { ca = Buffer.from(ca, 'base64').toString('utf8'); } catch { /* keep as given */ }
  }
  return { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
}

const BASE_POOL_OPTIONS: mysql.PoolOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

/** Builds the connection settings from DATABASE_URL, or from DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME. */
export function buildPoolConfig(env: DbEnv = process.env): mysql.PoolOptions {
  const databaseUrl = (env.DATABASE_URL || '').trim();
  if (databaseUrl) {
    // Parse it ourselves instead of handing the raw URL to mysql2: its handling of the ssl query parameter is fragile.
    const u = new URL(databaseUrl);
    const urlRequestedSsl = u.searchParams.has('ssl') || u.searchParams.has('sslmode') || u.searchParams.get('tls') === 'true';
    return {
      ...BASE_POOL_OPTIONS,
      host: u.hostname,
      port: u.port ? parseInt(u.port, 10) : 3306,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: decodeURIComponent(u.pathname.replace(/^\//, '')),
      ssl: resolveSsl(u.hostname, env, urlRequestedSsl),
    };
  }
  const host = env.DB_HOST || 'localhost';
  return {
    ...BASE_POOL_OPTIONS,
    host,
    port: parseInt(env.DB_PORT || '3306', 10),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'b2bforcorporates',
    ssl: resolveSsl(host, env),
  };
}

const poolConfig = buildPoolConfig();

const pool = mysql.createPool(poolConfig);

export async function withTransaction<T>(work: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // ignore rollback errors and propagate original failure
    }
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;

