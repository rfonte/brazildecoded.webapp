# 🚀 Backend Setup Guide

This guide explains how to run, develop, and deploy the BrazilDecoded Express backend server.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Running the Server](#running-the-server)
4. [API Endpoints](#api-endpoints)
5. [Authentication Flow](#authentication-flow)
6. [Database Structure](#database-structure)
7. [Environment Variables](#environment-variables)
8. [Development](#development)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 16+ and npm installed
- Git (for version control)
- A text editor (VS Code recommended)
- Postman or curl (for testing API endpoints)

## Installation

### 1. Install Dependencies

```bash
npm install
```

This will install all backend dependencies from `package.json`:
- `express` — Web framework
- `cors` — Cross-origin resource sharing
- `cookie-parser` — Parse HTTP cookies
- `jsonwebtoken` — JWT token generation/verification
- `bcryptjs` — Password hashing
- `dotenv` — Environment variable loading

### 2. Create .env File

The `.env.example` file contains a template. For development, the `.env` file has been created with safe defaults:

```bash
NODE_ENV=development
PORT=3001
JWT_SECRET=bd-secret-dev-key-change-in-production-12345
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CLIENT_URL=http://localhost:8080
SERVER_URL=http://localhost:3001
DATABASE_TYPE=json
LOG_LEVEL=debug
```

**⚠️ Important for Production:**
- Change `JWT_SECRET` to a strong random string (at least 32 characters)
- Set `NODE_ENV=production`
- Use `https://` URLs
- Enable HTTPS/TLS on the server

### 3. Database Initialization

On first run, the server automatically creates a `db/` directory and initializes with default users:

```
db/
├── users.json      # All users (admin + regular users)
├── leads.json      # Form submissions from /free-starter-kit/
└── settings.json   # Global settings (optional)
```

**Default test users are created automatically:**
- **Admin:** `admin@brazildecoded.com` / `password123`
- **User:** `user@brazildecoded.com` / `password123`

These are for development/testing only. In production, add actual users via admin panel or API.

## Running the Server

### Development Mode (with auto-reload)

```bash
npm run server:watch
```

This uses `nodemon` to automatically restart the server when file changes are detected.

### Development Mode (one-time run)

```bash
npm run server:dev
```

### Starting the Frontend (in another terminal)

```bash
npm run serve
```

This starts the Eleventy dev server on `http://localhost:8080`.

### Testing Both Together

**Terminal 1 (Backend):**
```bash
npm run server:watch
```

**Terminal 2 (Frontend):**
```bash
npm run serve
```

Then open http://localhost:8080 in your browser.

## API Endpoints

### Authentication Routes

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin@brazildecoded.com",
  "password": "password123",
  "rememberMe": false
}
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "user": {
    "id": "user-...",
    "username": "admin@brazildecoded.com",
    "email": "admin@brazildecoded.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

**Also sets HTTP-only cookie:** `bd_auth_token` (valid for 15 min)

#### Logout
```http
POST /api/auth/logout
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "message": "Logged out successfully"
}
```

**Clears:** `bd_auth_token` cookie

#### Refresh Token
```http
POST /api/auth/refresh
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "message": "Token refreshed"
}
```

**Updates:** `bd_auth_token` cookie with new 15-minute expiry

#### Forgot Password (Placeholder)
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@brazildecoded.com"
}
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "message": "Password reset email sent (placeholder)"
}
```

### Account Routes (Requires Authentication)

#### Get Profile
```http
GET /api/account/profile
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "profile": {
    "id": "user-...",
    "username": "user@brazildecoded.com",
    "email": "user@brazildecoded.com",
    "name": "Test User",
    "role": "user"
  }
}
```

#### Change Password
```http
POST /api/account/change-password
Content-Type: application/json

{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "message": "Password changed successfully"
}
```

### Admin Routes (Requires admin role)

#### Get Statistics
```http
GET /api/admin/stats
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "stats": {
    "totalLeads": 42,
    "totalUsers": 2,
    "monthlyLeads": 15
  }
}
```

#### Get Leads
```http
GET /api/admin/leads
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "leads": [
    {
      "id": "lead-...",
      "name": "João Silva",
      "email": "joao@example.com",
      "company": "",
      "form_token": "bd_starterkit_v1",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "date": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Get Users (admin only)
```http
GET /api/admin/users
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "users": [
    {
      "id": "user-...",
      "username": "admin@brazildecoded.com",
      "email": "admin@brazildecoded.com",
      "name": "Admin User",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### Update Settings (admin only)
```http
PUT /api/admin/settings
Content-Type: application/json

{
  "siteTitle": "BrazilDecoded",
  "adminEmail": "admin@brazildecoded.com"
}
```

**Response (200 OK):**
```json
{
  "sucesso": true,
  "settings": {
    "siteTitle": "BrazilDecoded",
    "adminEmail": "admin@brazildecoded.com",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Health Check

```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.45
}
```

## Authentication Flow

### How JWT Works

1. **Login:**
   - User submits username + password to `/api/auth/login`
   - Server validates credentials against hashed password in database
   - Server generates JWT token with user data + expiry (15 min)
   - Server sends token in HTTP-only cookie `bd_auth_token`

2. **Authenticated Requests:**
   - Browser automatically sends cookie with each request
   - Server verifies JWT signature matches `JWT_SECRET`
   - Server decodes token → extracts user data → attaches to `req.user`
   - Route handler checks `req.user.role` for authorization

3. **Token Refresh:**
   - When token nears expiry, client calls `/api/auth/refresh`
   - Server verifies existing token, generates new one
   - New token sent in cookie with fresh 15-min expiry

4. **Logout:**
   - Client calls `/api/auth/logout`
   - Server clears `bd_auth_token` cookie
   - Client removes user data from localStorage

### Security Measures

- **HTTP-only cookies:** Token cannot be accessed by JavaScript (prevents XSS theft)
- **Secure flag:** Cookie only sent over HTTPS in production
- **SameSite=strict:** Cookie not sent in cross-site requests (prevents CSRF)
- **Password hashing:** bcryptjs with cost factor 10
- **Role-based access:** Routes check `req.user.role` before allowing access
- **CORS validation:** Only requests from `CLIENT_URL` are allowed

## Database Structure

### users.json

```json
{
  "users": [
    {
      "id": "user-1234567890",
      "username": "admin@brazildecoded.com",
      "email": "admin@brazildecoded.com",
      "name": "Admin User",
      "password": "$2a$10$...", // bcrypt hash
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### leads.json

```json
{
  "leads": [
    {
      "id": "lead-1234567890",
      "name": "João Silva",
      "email": "joao@example.com",
      "company": "",
      "form_token": "bd_starterkit_v1",
      "source": "free_starter_kit",
      "turnstile_token": "abc123...",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### settings.json

```json
{
  "settings": {
    "siteTitle": "BrazilDecoded",
    "adminEmail": "admin@brazildecoded.com",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Environment Variables

| Variable | Example | Required | Notes |
|----------|---------|----------|-------|
| `NODE_ENV` | `development` | No | Set to `production` for deployment |
| `PORT` | `3001` | No | Server port (default: 3001) |
| `JWT_SECRET` | `super-secret-key` | **Yes** | Change this in production! |
| `JWT_EXPIRY` | `15m` | No | Token expiry time |
| `JWT_REFRESH_EXPIRY` | `7d` | No | Refresh token expiry |
| `CLIENT_URL` | `http://localhost:8080` | No | Frontend URL for CORS |
| `SERVER_URL` | `http://localhost:3001` | No | Backend URL |
| `DATABASE_TYPE` | `json` | No | For future scaling (mongodb, postgresql) |
| `LOG_LEVEL` | `debug` | No | Log verbosity |

## Development

### File Structure

```
backend-server.js          # All-in-one server (split into modules in production)
├── Config section
├── Database class
├── Auth utilities
├── Middleware
├── Express app setup
├── Routes
└── Server startup
```

### Making Changes

1. Edit `backend-server.js`
2. Save file
3. If using `npm run server:watch`, server restarts automatically
4. Test changes via API or browser

### Adding a New Route

Example: Add `/api/admin/reports` endpoint

```javascript
app.get('/api/admin/reports', verifyToken, requireRole('admin'), (req, res) => {
  try {
    const leads = db.getAllLeads();
    // Your logic here
    res.json({ sucesso: true, reports: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});
```

### Adding Database Operations

Example: Add method to Database class

```javascript
class Database {
  // ...existing methods...
  
  createReport(reportData) {
    const reports = this.read('reports').reports || [];
    const newReport = {
      id: `report-${Date.now()}`,
      ...reportData,
      createdAt: new Date().toISOString(),
    };
    reports.push(newReport);
    this.write('reports', { reports });
    return newReport;
  }
}
```

### Testing Endpoints with curl

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@brazildecoded.com","password":"password123"}' \
  -c cookies.txt

# Get stats (with cookie)
curl -X GET http://localhost:3001/api/admin/stats \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3001/api/auth/logout \
  -b cookies.txt
```

### Testing in Postman

1. Open Postman
2. Create a new collection "BrazilDecoded"
3. **Login request:**
   - POST to `http://localhost:3001/api/auth/login`
   - Body (JSON): `{"username":"admin@brazildecoded.com","password":"password123"}`
   - Response contains user data
4. **Admin request:**
   - GET to `http://localhost:3001/api/admin/stats`
   - Postman automatically includes cookie
   - Response shows stats

## Troubleshooting

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solution:**
```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change PORT in .env
PORT=3002
```

### JWT_SECRET Not Set

**Error:** `✗ NOT SET` in startup banner

**Solution:**
```bash
# Edit .env file
JWT_SECRET=your-very-long-secret-key-at-least-32-characters

# Restart server
npm run server:dev
```

### CORS Error in Browser

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Solution:**
1. Ensure `CLIENT_URL` in `.env` matches frontend URL
2. Check that frontend is actually on that URL
3. Restart backend server

### Can't Connect to Backend

**Check 1:** Is backend running?
```bash
curl http://localhost:3001/health
```

**Check 2:** Are frontend and backend on the correct ports?
```bash
# Backend should respond
curl http://localhost:3001/health

# Frontend should load
curl http://localhost:8080
```

**Check 3:** Check `.env` is loaded
```bash
# backend-server.js prints config on startup
# Look for banner with ports and database path
```

### Cookie Not Being Sent

**Problem:** Requests to protected endpoints return 401 Unauthorized

**Solution:**
1. Ensure login request completed successfully
2. Check browser DevTools → Application → Cookies
3. Should see `bd_auth_token` cookie
4. Verify cookie path is `/`
5. For cross-domain requests, ensure `credentials: 'include'` is set in fetch

### Password Reset Email Not Sending

**Current Status:** Email service is a placeholder

**To Enable:**
1. Install email package: `npm install resend` (or sendgrid)
2. Add API key to `.env`: `RESEND_API_KEY=...`
3. Update forgot-password route in `backend-server.js`
4. Implement email template

## Next Steps

1. **Database Migration:** Move from JSON to MongoDB/PostgreSQL
2. **Email Service:** Integrate Resend or SendGrid for password resets
3. **Rate Limiting:** Prevent brute force attacks on login endpoint
4. **Audit Logging:** Log all admin actions (who, when, what)
5. **2FA:** Add two-factor authentication
6. **OAuth:** Add social login (Google, GitHub)
7. **API Documentation:** Generate OpenAPI/Swagger docs
8. **Test Coverage:** Add unit and integration tests

---

**Questions?** Check the `/docs` folder for more detailed documentation, or review the code comments in `backend-server.js`.
