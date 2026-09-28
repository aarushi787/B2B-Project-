// Purpose: This module (backend/src/config/database.ts) is used to implement project functionality in a modular, maintainable way.
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

let poolConfig: mysql.PoolOptions = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
};

if (databaseUrl) {
  poolConfig = {
    ...poolConfig,
    uri: databaseUrl,
    // Add SSL if the URL doesn't natively handle the JSON string format in mysql2
    ssl: databaseUrl.includes('ssl=') ? { rejectUnauthorized: true } : undefined,
  };
} else {
  poolConfig = {
    ...poolConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'b2bforcorporates',
  };
}

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

