// Purpose: This module (backend/src/index.ts) is used to implement project functionality in a modular, maintainable way.
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { errorHandler } from './middleware/auth.js';
import { requestLogger } from './middleware/requestLogger.js';
import { logger } from './utils/logger.js';
import { errorResponse } from './utils/http.js';
import { normalizeErrorEnvelope } from './middleware/errorEnvelope.js';
import { initSocketServer } from './realtime/socket.js';
import { initSentry } from './observability/sentry.js';
import { metricsHandler } from './observability/metrics.js';

import authRoutes from './routes/auth.js';
import helmet from 'helmet';
import sanitizeHtml from 'sanitize-html';
import companiesRoutes from './routes/companies.js';
import productsRoutes from './routes/products.js';
import dealsRoutes from './routes/deals.js';
import messagesRoutes from './routes/messages.js';
import ledgerRoutes from './routes/ledger.js';
import membersRoutes from './routes/members.js';
import notificationsRoutes from './routes/notifications.js';
import paymentsRoutes from './routes/payments.js';
import documentsRoutes from './routes/documents.js';
import reputationRoutes from './routes/reputation.js';
import auditRoutes from './routes/audit.js';
import jobsRoutes from './routes/jobs.js';
import complianceRoutes from './routes/compliance.js';
import kycRoutes from './routes/kyc.js';
import privacyRoutes from './routes/privacy.js';
import adminRoutes from './routes/admin.js';
import recommendationsRoutes from './routes/recommendations.js';


dotenv.config();
initSentry();

const app = express();
const PORT = process.env.PORT || 5000;
const corsOrigin = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

// Middleware
app.set('trust proxy', 1);
app.use(helmet());
const corsFunc = function(origin: string | undefined, callback: (err: Error | null, origin?: string) => void) {
  // Allow the request's origin dynamically. If none is provided (e.g., direct API calls), 
  // fallback to the configured CORS_ORIGIN or localhost to prevent wildcard '*' with credentials:true
  return callback(null, origin || (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',')[0] : 'http://localhost:5173'));
};

app.use(cors({
  origin: corsFunc,
  credentials: true,
}));

// Basic custom xss sanitizer middleware (for string bodies)
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeHtml(req.body[key]);
      }
    }
  }
  next();
});
app.use(express.json({
  verify: (req, _res, buffer) => {
    (req as any).rawBody = buffer;
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(normalizeErrorEnvelope);

// Friendly root endpoints
app.get('/', (_req, res) => {
  res.json({
    name: 'B2BForCorporates API',
    status: 'OK',
    health: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'B2BForCorporates API',
    status: 'OK',
    health: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/reputation', reputationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/recommendations', recommendationsRoutes);


// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/metrics', async (req, res) => {
  const metricsToken = process.env.METRICS_TOKEN;
  if (metricsToken) {
    const authHeader = req.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
    if (token !== metricsToken) {
      return errorResponse(res, 401, 'UNAUTHORIZED', 'Invalid metrics token');
    }
  }
  return metricsHandler(req, res);
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  return errorResponse(res, 404, 'NOT_FOUND', 'Route not found');
});

const server = createServer(app);
initSocketServer(server, corsFunc);

server.listen(PORT, () => {
  logger.info('server_started', {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    database: process.env.DB_NAME || process.env.DATABASE_URL || 'b2b_nexus_marketplace',
    corsOrigin,
    websocket: 'socket.io enabled',
  });
});

