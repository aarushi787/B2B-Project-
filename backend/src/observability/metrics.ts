// Purpose: This module (backend/src/observability/metrics.ts) is used to implement project functionality in a modular, maintainable way.
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';
import { Request, Response } from 'express';

const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'b2b_nexus_' });

const httpDurationMs = new Histogram({
  name: 'b2b_nexus_http_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
  registers: [registry],
});

const httpRequestsTotal = new Counter({
  name: 'b2b_nexus_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export function observeRequest(req: Request, res: Response, startedAt: number) {
  const route = (req.route?.path as string | undefined) || req.path || 'unknown';
  const statusCode = String(res.statusCode);
  const elapsed = Date.now() - startedAt;

  httpDurationMs.labels(req.method, route, statusCode).observe(elapsed);
  httpRequestsTotal.labels(req.method, route, statusCode).inc();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

