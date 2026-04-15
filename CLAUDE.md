# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack CRM (Customer Relationship Management) application with:
- **Backend**: Node.js/Express REST API + Socket.IO, using MongoDB (Atlas)
- **Frontend**: React 19 (Vite), using React Router v7, Recharts, Axios, Socket.IO client

## Development Commands

### Backend (run from `Backend/`)
```bash
npm run dev          # Start with nodemon (hot reload)
npm run seed:permissions  # Seed default permissions into DB
```

### Frontend (run from `Frontend/`)
```bash
npm run dev          # Start Vite dev server on port 5173 (all interfaces)
npm run build        # Production build to dist/
npm run lint         # ESLint check
npm run preview      # Preview production build
```

## Environment Setup

**Backend** (`Backend/.env`):
```
MONGO_URI=<MongoDB Atlas URI>
JWT_SECRET=<secret>
```

**Frontend** (`Frontend/.env`):
```
VITE_API_URL=http://localhost:5001   # Backend URL
```

The frontend `apiBase.js` falls back to `http://localhost:5001` if `VITE_API_URL` is not set.

## Architecture

### Backend (`Backend/src/`)
- **Entry**: `server.js` — creates Express + HTTP server, mounts all routes under `/api/*`, initializes Socket.IO, applies rate limiting and helmet
- **Database**: `config/db.js` — Mongoose connection to MongoDB Atlas (requires IP whitelist)
- **Auth**: JWT-based. `middleware/authMiddleware.js` exports `authMiddleware` (users + clients) and `clientAuthMiddleware` (clients only). JWT payload carries `id` and `type` (`'Client'` or user type).
- **Routing**: Each domain entity has its own route file in `routes/` and controller in `controllers/`. Route modules are registered in `server.js`.
- **Socket.IO**: `socket.js` — JWT-authenticated WebSocket connections. Users join their own room by userId. Chat rooms are joined via `join_chat` events. `getIO()` is used in controllers to emit real-time events.
- **Services**: `services/` — `activityLogService.js`, `emailService.js` (Nodemailer + IMAP), `twoFactorService.js` (Speakeasy TOTP + QR codes)
- **2FA**: Separate routes — `/api/2fa/verify-login` (no auth) for login verification, `/api/2fa` for management, `/api/admin-2fa` for admin management

### Frontend (`Frontend/src/`)
- **Entry**: `App.jsx` — React Router with role-based route guards
  - `/admin` → `AdminPanel` (Role === 'Admin')
  - `/user` → `UserPanel` (logged in, not Admin)
  - `/client` → `ClientPanel` (type === 'Client')
  - `/pay/:paymentId` → `ClientPaymentLink` (public)
- **Session**: `session.jsx` — React Context storing user in `localStorage` under `crm_user`; token also stored separately under `token` key
- **API Base**: `apiBase.js` — resolves backend URL from `VITE_API_URL` env var, with LAN/localhost fallback
- **Admin Pages**: `adminpages/` — one file per admin section (Dashboard, Users, Clients, Packages, Employees, Salary, PaymentGenerator, CustomPackages, Inquiries, CallSchedule, Permissions, Expenses, Disputes, Reports, ActivityLogs, TwoFactorSettings, Chat)
- **User Pages**: `userpages/UserDashboardPage.jsx`
- **Permissions**: `contexts/PermissionContext.jsx` provides `canDo(permission)` hook used throughout AdminPanel to conditionally render UI

### Data Models (`Backend/src/model/`)
Key models: `User`, `Client`, `Employee`, `Project`, `ProjectDetail`, `Assignment`, `Package`, `CustomPackage`, `PaymentLink`, `PaymentHistory`, `Salary`, `Expense`, `Dispute`, `Inquiry`, `CallSchedule`, `Chat`, `Message`, `Role`, `Permission`, `RolePermission`, `UserPermission`, `HostingDomain`, `ClientAsset`, `ActivityLog`

### Permission System
Permissions are seeded via `npm run seed:permissions`. Roles aggregate permissions via `RolePermission`; individual overrides via `UserPermission`. The `canDo` hook in `PermissionContext` checks the current user's effective permissions.

## Key Conventions
- Backend uses ES modules (`"type": "module"` in package.json); use `import`/`export`, not `require`
- API error responses: `{ message, stack, error }` (stack/error omitted in production)
- All authenticated requests send `Authorization: Bearer <token>` header
- Frontend calls `getApiBaseUrl()` (from `apiBase.js`) and appends API paths — never hardcode the backend URL
- Socket.IO client connects with `auth: { token }` in handshake
- Auto-logout/refresh after 15 minutes of inactivity in AdminPanel
