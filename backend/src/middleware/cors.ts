import type { NextFunction, Request, Response } from 'express';
import { ENV } from '../config/env.ts';

/**
 * Configurable CORS middleware allowing the standalone Vite frontend
 * (e.g. http://localhost:5173) and unified origin to communicate cleanly with Express.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowedOrigins = ENV.CORS_ORIGIN.split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const requestOrigin = req.headers.origin;

  if (requestOrigin && (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin))) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
  } else if (!requestOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}
