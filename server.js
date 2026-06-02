#!/usr/bin/env node

/**
 * BrazilDecoded Authentication Server
 * Express.js backend for login, JWT tokens, and admin APIs
 * 
 * Run: npm run server:dev
 * Or: npm run server:watch
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import 'dotenv/config';

// Import routes
import authRoutes from './src-backend/routes/auth.js';
import adminRoutes from './src-backend/routes/admin.js';
import accountRoutes from './src-backend/routes/account.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';

// ── Rate limiters ────────────────────────────────────────────────────────────

function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 30, message = 'Too many requests, please try again later.' } = {}) {
  const store = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) store.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      store.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

// 10 req / 15 min — credential-sensitive endpoints
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many auth attempts, please try again later.' });

// 60 req / 15 min — authenticated API endpoints
const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes — rate limiters applied before route modules
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/account', apiLimiter, accountRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    error: message,
    status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 BrazilDecoded Authentication Server                  ║
║   📍 http://localhost:${PORT}${' '.repeat(Math.max(0, 21 - PORT.toString().length))}║
║   🌍 Client: ${CLIENT_URL}${' '.repeat(Math.max(0, 30 - CLIENT_URL.length))}║
║   🔒 JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ NOT SET'}${' '.repeat(Math.max(0, 28 - (process.env.JWT_SECRET ? '✓ Configured' : '✗ NOT SET').length))}║
║   💾 Database: ${process.env.DATABASE_TYPE || 'json'}${' '.repeat(Math.max(0, 37 - (process.env.DATABASE_TYPE || 'json').length))}║
║   🔄 Environment: ${process.env.NODE_ENV || 'development'}${' '.repeat(Math.max(0, 30 - (process.env.NODE_ENV || 'development').length))}║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
