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

const sessions = new Map();

function createSession(user) {
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: Date.now(),
  });
  return sessionId;
}

function setAuthCookie(res, sessionId) {
  res.cookie('bd_auth_token', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000,
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
  } catch (error) {
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
// EXPRESS APP SETUP
// ============================================================================

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

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

// ============================================================================
// ROUTES - AUTHENTICATION
// ============================================================================

app.post('/api/auth/login', (req, res) => {
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

    const sessionId = createSession(user);
    setAuthCookie(res, sessionId);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      sucesso: true,
      user: userWithoutPassword,
      rememberMe,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ sucesso: true, message: 'Logged out successfully' });
});

app.post('/api/auth/refresh', verifyToken, (req, res) => {
  try {
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      sucesso: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

app.post('/api/auth/forgot-password', (req, res) => {
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
    console.log(`Password reset requested for: ${email}`);

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

app.get('/api/account/profile', verifyToken, (req, res) => {
  try {
    const user = db.getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      sucesso: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.put('/api/account/profile', verifyToken, (req, res) => {
  try {
    const { name, email } = req.body;

    const updated = db.updateUser(req.user.id, {
      ...(name && { name }),
      ...(email && { email }),
    });

    const { password: _, ...userWithoutPassword } = updated;
    res.json({
      sucesso: true,
      user: userWithoutPassword,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/account/change-password', verifyToken, (req, res) => {
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
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============================================================================
// ROUTES - ADMIN
// ============================================================================

app.get('/api/admin/stats', verifyToken, requireRole('admin'), (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/admin/leads', verifyToken, requireRole('admin'), (req, res) => {
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
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

app.get('/api/admin/users', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const users = db.getAllUsers().map(u => {
      const { password: _, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    res.json({
      sucesso: true,
      users,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/admin/settings', verifyToken, requireRole('admin'), (req, res) => {
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
