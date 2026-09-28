import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

/**
 * In a production environment with AWS Secrets Manager or HashiCorp Vault,
 * you would fetch the secrets asynchronously here before starting the app.
 * For now, this serves as the abstraction layer so we can easily swap it out.
 */
export const getSecret = async (key: string): Promise<string> => {
  if (process.env.USE_AWS_SECRETS === 'true') {
    // Example: fetch from AWS Secrets Manager
    logger.info(`Fetching ${key} from AWS Secrets Manager`);
    // return await fetchFromAWS(key);
  }
  
  return process.env[key] || '';
};

export const loadAllSecrets = async () => {
  // Pre-fetch critical secrets
  const dbPass = await getSecret('DB_PASSWORD');
  const jwtSecret = await getSecret('JWT_SECRET');
  
  if (!dbPass || !jwtSecret) {
    logger.warn('Critical secrets missing in configuration!');
  }
};
