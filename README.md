# B2BForCorporates

Enterprise collaboration platform — SaaS Dashboard UI + B2B Nexus backend engine.

> Deploying to Vercel + Render? Follow [DEPLOY.md](DEPLOY.md).

## Mission
Give corporates a trusted place to discover verified businesses, post requirements, exchange proposals, sign contracts and pay through escrow — with the deal, chat, ledger and audit trail in one workspace.

## Vision
Become the trusted operating system for B2B trade, replacing scattered email, chat apps and unverified middlemen with verified companies, reputation scores, compliance checks, AI-assisted matching and secure payments.

## Quick Start

### 1. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. MySQL setup
```sql
CREATE DATABASE b2bforcorporates;
CREATE USER 'b2b_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON b2bforcorporates.* TO 'b2b_user'@'localhost';
```

### 3. Configure environment
- Edit `backend/.env` with your MySQL credentials and secrets (`JWT_SECRET`, `DATA_ENCRYPTION_KEY`, and `CORS_ORIGIN` — a comma-separated list of allowed frontend origins)
- Create `frontend/.env.local` (not committed) with `VITE_API_BASE_URL=http://localhost:5000/api` and `VITE_SOCKET_URL=http://localhost:5000`
- Never put secret API keys in `VITE_*` variables: they are bundled into the browser.

### 4. Initialize database
```bash
cd backend && npm run db:init && npm run db:seed
```

### 5. Run both servers

**Terminal 1 — Backend (port 5000):**
```bash
cd backend && npm run dev
```

**Terminal 2 — Frontend (port 5173):**
```bash
cd frontend && npm run dev
```

Open http://localhost:5173

## Demo Credentials
`npm run db:seed` creates demo users (e.g. `admin@example.com`, `maya@example.com`, `rahul@example.com`).
Their shared password is `SEED_PASSWORD` if set, otherwise a random one printed once in the seed output.
Seeding production requires `SEED_PASSWORD`.

## Admin Panel
```bash
cd admin-frontend && npm install && npm run dev
```

## Authentication model
- Access and refresh tokens live in **httpOnly cookies** set by the API; frontend JavaScript never sees or stores them.
- State-changing requests must send an `X-CSRF-Token` header (returned by login/register/refresh and `GET /api/auth/csrf`) from an origin listed in `CORS_ORIGIN`.
- Accounts are either `USER` or `ADMIN`. "Buyer" and "seller" are roles a company plays in a single deal, not account types.
- The admin console is at `/admin` and the API enforces platform-admin access on every `/api/admin/*` request.

## Tests & Builds
```bash
cd backend && npm test          # unit tests (tokens, encryption, CSRF, roles, deal parties)
cd frontend && npx playwright test   # E2E; needs the API + frontend running (see .github/workflows/ci.yml)
cd frontend && npm run build    # type-check + production build
cd admin-frontend && npm run build
```

CI (`.github/workflows/ci.yml`) builds all three apps, runs the unit tests, then runs the Playwright suite against a throwaway MySQL service. The E2E tests create real accounts, so never point them at a database you care about.

## Docker
`docker-compose.yml` runs the backend on port 3000 with database `b2b_nexus` (overridable with `DB_NAME`). Local `npm run dev` uses port 5000 and database `b2bforcorporates`.

## Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + Tailwind CSS 4 |
| UI Components | shadcn/ui + Radix UI + Lucide React |
| Animations | Motion (Framer) |
| Backend | Express 4 + TypeScript |
| Database | MySQL 8.0 (17 tables) |
| Auth | JWT + bcryptjs |
| Real-time | Socket.IO |
| Payments | Razorpay (escrow) |
| AI | Google Gemini |

## Project Structure
```
b2bforcorporates/
├── frontend/          # React + Vite + Tailwind (SaaS Dashboard shell)
│   └── src/
│       ├── app/       # Pages, Layout, Routes
│       ├── auth/      # AuthProvider + useAuth hook
│       ├── services/  # API client + all backend service wrappers
│       └── types/     # TypeScript types
└── backend/           # Express + TypeScript (B2B Nexus engine)
    └── src/
        ├── routes/    # 17 API route modules (120+ endpoints)
        ├── config/    # DB connection + schema init
        ├── middleware/ # Auth, RBAC, validation, rate limiting
        └── realtime/  # Socket.IO server
```
