/** HTTP hardening: secure headers, CORS allowlist, body size limits. */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

export function securityMiddleware({ corsOrigins }) {
  return [
    helmet({
      // Images are served to the SPA on a different origin.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
    cors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type'],
      maxAge: 600,
    }),
    express.json({ limit: '100kb' }),
    express.urlencoded({ extended: false, limit: '100kb' }),
  ];
}
