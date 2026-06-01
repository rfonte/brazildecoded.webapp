# 🎯 Quick Start - Authentication System

This document provides a fast way to get the authentication system running locally.

## 30-Second Setup

### Prerequisites
- Node.js 16+ installed
- npm available in terminal

### Steps

**1. Install dependencies:**
```bash
npm install
```

**2. Start backend (Terminal 1):**
```bash
npm run server:dev
```

You should see:
```
╔════════════════════════════════════════════════════════════╗
║   🚀 BrazilDecoded Authentication Server                  ║
║   📍 http://localhost:3001                                ║
│   Test Credentials:                                    │
│      Admin: admin@brazildecoded.com / password123         │
│      User:  user@brazildecoded.com / password123          │
╚════════════════════════════════════════════════════════════╝
```

**3. Start frontend (Terminal 2):**
```bash
npm run serve
```

**4. Open browser:**
- Frontend: http://localhost:8080
- Backend health: http://localhost:3001/health

## Complete Testing Flow

### 1. Login Test

Open http://localhost:8080/login and login with:
- **Email:** `admin@brazildecoded.com`
- **Password:** `password123`

Expected: Redirect to `/admin` dashboard

### 2. Admin Dashboard

http://localhost:8080/admin should show:
- Admin welcome message
- Stats (leads, users)
- Access to manage leads and users
- Settings panel

### 3. User Dashboard

http://localhost:8080/account should show:
- User profile information
- Account settings

### 4. Logout

Click logout button in header dropdown → should redirect to home

### 5. API Testing (curl)

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin@brazildecoded.com","password":"password123"}' \
  -v
```

Look for `Set-Cookie: bd_auth_token=...` header

**Protected endpoint (get stats):**
```bash
# First login to get cookie, then:
curl -X GET http://localhost:3001/api/admin/stats \
  -b "bd_auth_token=<TOKEN_FROM_LOGIN>" \
  -v
```

## File Structure Created

### Frontend Pages
- `src/pages/login.njk` — Login form
- `src/pages/forgot-password.njk` — Password recovery
- `src/pages/account.njk` — User dashboard
- `src/pages/admin.njk` — Admin dashboard

### Frontend Code
- `src/assets/js/auth.js` — Client authentication library
- `src/_includes/layout.njk` — Updated header with auth menu

### Backend
- `backend-server.js` — Complete Express server (all-in-one)
- `.env` — Environment configuration (ready to use)
- `.env.example` — Configuration template

### Documentation
- `BACKEND_SETUP_GUIDE.md` — Detailed setup and API reference
- `LOGIN_SYSTEM_SUMMARY.md` — Architecture decisions
- `BACKEND_SETUP.md` — Previous backend documentation

## Database Files (Auto-created)

First time backend runs, these are created in `db/`:
```
db/
├── users.json      (contains admin + test user)
├── leads.json      (empty initially)
└── settings.json   (empty initially)
```

## Common Issues

### "Cannot find module express"

**Fix:** Run `npm install` to install dependencies

### "Port 3001 already in use"

**Fix:** Either:
- Kill the process using port 3001
- Change PORT in `.env` to 3002 (or another free port)

### "CORS error in browser"

**Fix:** Ensure both servers are running:
- Backend: http://localhost:3001
- Frontend: http://localhost:8080

### Login doesn't work

**Check:**
1. Backend is running and shows startup banner
2. Email field has `admin@brazildecoded.com`
3. Password is `password123`
4. Check browser console for error messages
5. Check backend terminal for error logs

## Development Commands

```bash
# Frontend
npm run serve              # Start dev server
npm run build              # Build static site
npm run lint               # Lint JavaScript

# Backend
npm run server:dev         # Start backend (one-time)
npm run server:watch       # Start backend with auto-reload

# Testing
npm run test:unit          # Run unit tests
npm run test:unit:coverage # Run tests with coverage

# Utilities
npm run docs               # Generate JSDoc documentation
npm run format             # Format code with Prettier
```

## Next Steps

1. **Customize Styling:** Edit login/admin pages to match your brand
2. **Add Database:** Migrate from JSON to MongoDB/PostgreSQL
3. **Email Service:** Configure password reset emails
4. **Rate Limiting:** Add protection against brute force
5. **Two-Factor Auth:** Add TOTP or SMS verification

## Documentation Files

- `BACKEND_SETUP_GUIDE.md` — Complete API reference and setup instructions
- `LOGIN_SYSTEM_SUMMARY.md` — Architecture decisions and technical overview
- `BACKEND_SETUP.md` — Initial backend planning document

---

**Need help?** 
- Check `BACKEND_SETUP_GUIDE.md` for detailed troubleshooting
- Review code comments in `backend-server.js`
- Test endpoints with curl or Postman
