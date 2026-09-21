#!/usr/bin/env node
/**
 * BrazilDecoded Backend - All-in-One Setup
 * This file contains complete backend implementation:
 * - Auth middleware
 * - Database layer
 * - All routes (auth, admin, account)
 * 
 * Split this into multiple files in production for better organization
 */

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8080';
const DB_DIR = path.join(__dirname, 'db');

// ============================================================================
// DATABASE LAYER (JSON MVP)
// ============================================================================

class Database {
  constructor(dbDir = DB_DIR) {
    this.dbDir = dbDir;
    this.ensureDbDir();
  }

  ensureDbDir() {
    if (!fs.existsSync(this.dbDir)) {
      fs.mkdirSync(this.dbDir, { recursive: true });
    }
  }

  getFilePath(collection) {
    return path.join(this.dbDir, `${collection}.json`);
  }

  read(collection) {
    const filePath = this.getFilePath(collection);
    try {
      if (!fs.existsSync(filePath)) {
        return { [collection]: [] };
      }
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${collection}:`, error);
      return { [collection]: [] };
    }
  }

  write(collection, data) {
    const filePath = this.getFilePath(collection);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing ${collection}:`, error);
      return false;
    }
  }

  // Users operations
  getAllUsers() {
    return this.read('users').users || [];
  }

  getUserByUsername(username) {
    const users = this.getAllUsers();
    return users.find(u => u.username === username || u.email === username);
  }

  getUserById(id) {
    const users = this.getAllUsers();
    return users.find(u => u.id === id);
  }

  createUser(userData) {
    const users = this.getAllUsers();
    const newUser = {
      id: `user-${Date.now()}`,
      ...userData,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    this.write('users', { users });
    return newUser;
  }

  updateUser(id, updates) {
    let users = this.getAllUsers();
    users = users.map(u => (u.id === id ? { ...u, ...updates } : u));
    this.write('users', { users });
    return users.find(u => u.id === id);
  }

  // Leads operations
  getAllLeads() {
    return this.read('leads').leads || [];
  }

  createLead(leadData) {
    const leads = this.getAllLeads();
    const newLead = {
      id: `lead-${Date.now()}`,
      ...leadData,
      createdAt: new Date().toISOString(),
    };
    leads.push(newLead);
    this.write('leads', { leads });
    return newLead;
  }

  // Settings operations
  getSettings() {
    const settings = this.read('settings').settings || {};
    return settings;
  }

  updateSettings(updates) {
    const current = this.getSettings();
    const updated = { ...current, ...updates };
    this.write('settings', { settings: updated });
    return updated;
  }
}

const db = new Database();

// Initialize default users if database is empty
if (db.getAllUsers().length === 0) {
  const hashedPassword = bcrypt.hashSync('password123', 10);
  db.createUser({
    username: 'admin@brazildecoded.com',
    email: 'admin@brazildecoded.com',
    name: 'Admin User',
    password: hashedPassword,
    role: 'admin',
  });
  db.createUser({
    username: 'user@brazildecoded.com',
    email: 'user@brazildecoded.com',
    name: 'Test User',
    password: hashedPassword,
    role: 'user',
  });
  console.log('✓ Default users created');
}

// ============================================================================
// AUTHENTICATION UTILITIES
// ============================================================================

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function setAuthCookie(res, token) {
  res.cookie('bd_auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // keep in sync with JWT_EXPIRY default
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie('bd_auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

// Strips CR/LF so request-derived values can't forge extra log lines/records.
function sanitizeForLog(value) {
  return String(value).replace(/[\r\n]/g, ' ').slice(0, 200);
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

function verifyToken(req, res, next) {
  try {
    const token = req.cookies.bd_auth_token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - no token' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    // Expired/invalid/missing tokens are routine (not server errors), so
    // they're rejected silently instead of logged as failures.
    return res.status(401).json({ error: 'Unauthorized - invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
    }
    next();
  };
}

// ============================================================================
// RATE LIMITING
// ============================================================================

// Strict limiter for auth endpoints (10 req / 15 min per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, please try again later.' },
});

// Standard limiter for authenticated API routes (60 req / 15 min per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// EXPRESS APP SETUP
// ============================================================================

const app = express();
app.disable('x-powered-by'); // avoid disclosing the framework/version in responses

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${sanitizeForLog(req.method)} ${sanitizeForLog(req.path)}`);
  next();
});

// ============================================================================
// CSRF PROTECTION (double-submit cookie)
// ============================================================================
// The auth cookie is sent automatically by the browser on cross-site
// requests, so state-changing routes must also require a token that a
// cross-site page cannot read or set on the caller's behalf.

const CSRF_COOKIE_NAME = 'bd_csrf_token';
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrfCookie(req, res, next) {
  if (!req.cookies[CSRF_COOKIE_NAME]) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // must be readable by client JS to echo back in a header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies[CSRF_COOKIE_NAME];
  }
  next();
}

function verifyCsrfToken(req, res, next) {
  if (CSRF_SAFE_METHODS.has(req.method)) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.get('x-csrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  next();
}

app.use(issueCsrfCookie);
app.use(verifyCsrfToken);

// ============================================================================
// ROUTES - HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken });
});

// ============================================================================
// ROUTES - AUTHENTICATION
// ============================================================================

app.post('/api/auth/login', authLimiter, (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required',
      });
    }

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password',
      });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid username or password',
      });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.json({
      sucesso: true,
      user: sanitizeUser(user),
      rememberMe,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', authLimiter, (req, res) => {
  clearAuthCookie(res);
  res.json({ sucesso: true, message: 'Logged out successfully' });
});

app.post('/api/auth/refresh', authLimiter, verifyToken, (req, res) => {
  try {
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    res.json({
      sucesso: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

app.post('/api/auth/forgot-password', authLimiter, (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.getUserByUsername(email);
    if (!user) {
      // For security, always return success to avoid email enumeration
      return res.json({
        sucesso: true,
        message: 'If an account exists, a reset link has been sent',
      });
    }

    // TODO: Integrate with email service (Resend, SendGrid)
    console.log(`Password reset requested for: ${sanitizeForLog(email)}`);

    res.json({
      sucesso: true,
      message: 'Check your email for password reset instructions',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// ============================================================================
// ROUTES - ACCOUNT
// ============================================================================

app.get('/api/account/profile', apiLimiter, verifyToken, (req, res) => {
  try {
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      sucesso: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/account/profile', apiLimiter, verifyToken, (req, res) => {
  try {
    const { name, email } = req.body;

    const updated = db.updateUser(req.user.id, {
      ...(name && { name }),
      ...(email && { email }),
    });

    res.json({
      sucesso: true,
      user: sanitizeUser(updated),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/account/change-password', authLimiter, verifyToken, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters',
      });
    }

    const user = db.getUserById(req.user.id);
    const passwordMatch = bcrypt.compareSync(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Current password is incorrect',
      });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.updateUser(req.user.id, { password: hashedPassword });

    res.json({
      sucesso: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================================================
// ROUTES - ADMIN
// ============================================================================

app.get('/api/admin/stats', apiLimiter, verifyToken, requireRole('admin'), (req, res) => {
  try {
    const leads = db.getAllLeads();
    const users = db.getAllUsers();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyLeads = leads.filter(l => {
      const leadDate = new Date(l.createdAt);
      return leadDate >= monthStart;
    }).length;

    res.json({
      sucesso: true,
      stats: {
        totalLeads: leads.length,
        totalUsers: users.length,
        monthlyLeads,
      },
    });
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/leads', apiLimiter, verifyToken, requireRole('admin'), (req, res) => {
  try {
    const leads = db.getAllLeads().map(lead => ({
      ...lead,
      date: new Date(lead.createdAt).toISOString(),
    }));

    res.json({
      sucesso: true,
      leads,
    });
  } catch (error) {
    console.error('Fetch leads error:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.get('/api/admin/users', apiLimiter, verifyToken, requireRole('admin'), (req, res) => {
  try {
    const users = db.getAllUsers().map(sanitizeUser);

    res.json({
      sucesso: true,
      users,
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/admin/settings', apiLimiter, verifyToken, requireRole('admin'), (req, res) => {
  try {
    const { siteTitle, adminEmail } = req.body;

    const updated = db.updateSettings({
      ...(siteTitle && { siteTitle }),
      ...(adminEmail && { adminEmail }),
      updatedAt: new Date().toISOString(),
    });

    res.json({
      sucesso: true,
      settings: updated,
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
  });
});

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

// ============================================================================
// START SERVER
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║   🚀 BrazilDecoded Authentication Server                  ║
║   📍 http://localhost:${PORT}                                ║
║   🌍 Client: ${CLIENT_URL}                       ║
║   🔒 JWT Secret: ${process.env.JWT_SECRET ? '✓ Configured' : '✗ NOT SET'}                              ║
║   💾 Database: JSON (${DB_DIR})                     ║
║   🔄 Environment: ${process.env.NODE_ENV || 'development'}                         ║
║                                                            ║
║   📝 Test Credentials:                                    ║
║      Admin: admin@brazildecoded.com / password123         ║
║      User:  user@brazildecoded.com / password123          ║
╚════════════════════════════════════════════════════════════╝
  `);
});

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
