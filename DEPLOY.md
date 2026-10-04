# Deploying: Vercel (frontend) + Render (API)

```
Browser ──► Vercel (React app, static)
              │  /api/*  is proxied by Vercel (frontend/vercel.json)
              ▼
            Render (Express API + Socket.IO) ──► TiDB / MySQL
Browser ──► Render directly, websocket only (live updates)
```

Why the proxy: if the browser talked to the API on a different domain, login cookies would be "third-party" and
**Safari/iPhone blocks them**, so nobody could sign in. With `/api` proxied through Vercel the browser only ever
sees your Vercel domain, so cookies are first-party everywhere. Vercel cannot proxy websockets, so live updates
connect straight to Render using a short-lived token (no cookies needed).

## 1. Render (API)

1. **New → Web Service** → connect the GitHub repo, branch **`main`**.
2. Settings: Root Directory `backend` · Build `npm ci && npm run build` · Start `npm start` · Health check path `/api/health`.
   (Or apply `render.yaml` as a Blueprint, which sets all of this.)
3. Environment variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your database URL (**rotate the old password first**; never paste it anywhere public) |
| `JWT_SECRET` | a long random string (`openssl rand -hex 32`) |
| `DATA_ENCRYPTION_KEY` | another long random string. **Never change it afterwards** (encrypted data becomes unreadable) |
| `CORS_ORIGIN` | your frontend origins, comma-separated, **no trailing slash** (see below) |
| `FRONTEND_URL` | `https://<your-production-domain>.vercel.app` (used in verification / reset emails) |
| `COOKIE_SAMESITE` | `lax` |
| `TRUST_PROXY_HOPS` | `2` (Vercel proxy + Render's own proxy; keeps per-IP rate limits correct) |
| `AUTO_INIT_DB` | `true` (creates/updates the tables on every start; safe to repeat) |

`CORS_ORIGIN` example (replace with your real domains). The `*` matches one hostname segment only, so it covers
your own Vercel previews and nobody else's:

```
https://b2-b-project.vercel.app,https://b2-b-project-*-guptaaarushi592-1933s-projects.vercel.app
```

Optional, when you need the feature: `FILE_STORAGE_DRIVER=s3` + `R2_BUCKET`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`
(**document uploads do not work without it**; the API refuses uploads instead of silently losing files),
`REDIS_URL` (background jobs), `SMTP_*` + `EMAIL_FROM` (emails), `RAZORPAY_*` (payments), `SENTRY_DSN`, `METRICS_TOKEN`.

## 2. Vercel (frontend)

1. **Add New → Project** → import the repo.
2. Root Directory **`frontend`** · Framework **Vite** · Build `npm run build` · Output `dist`.
3. `frontend/vercel.json` already proxies `/api/*` to Render. **If your Render URL is not
   `https://b2b-project-v91w.onrender.com`, change the `destination` there** and redeploy.
4. Environment variables:

| Variable | Value |
|---|---|
| `VITE_SOCKET_URL` | your Render URL, e.g. `https://b2b-project-v91w.onrender.com` (live updates; optional, the app works without it) |
| `VITE_GEMINI_API_KEY` | leave unset: anything starting with `VITE_` is public in the browser |

`VITE_API_BASE_URL` is **not needed**: in production the app calls the same-origin `/api`.

## 3. Check it works

```bash
# API is up and tables exist (first boot after a deploy can take 30-60s on the free plan)
curl https://<render-url>/api/health

# the proxy reaches the API through Vercel
curl https://<vercel-domain>/api/health

# CORS: should print your origin in access-control-allow-origin (and nothing for a stranger's origin)
curl -si -X OPTIONS https://<render-url>/api/auth/login \
  -H "Origin: https://<vercel-domain>" -H "Access-Control-Request-Method: POST" | grep -i access-control
```

Then in a browser: sign up, reload (you should stay signed in), open the app on an iPhone/Safari if you can.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Browser console: "blocked by CORS policy" | `CORS_ORIGIN` is missing the exact origin. No trailing slash, `https://`, and previews need the `*` pattern. The API logs `cors_origin_blocked` with the origin it saw. |
| Sign-in works on Chrome but not Safari | The app is calling Render directly instead of `/api`. Remove `VITE_API_BASE_URL` from Vercel and redeploy. |
| `403 CSRF_ORIGIN` on writes | Same as CORS: the request's `Origin` is not in `CORS_ORIGIN`. |
| `403 CSRF_INVALID` | Stale tab after a long idle; reload. The app retries once on its own. |
| Everyone gets "too many attempts" | `TRUST_PROXY_HOPS` is wrong, so all users look like one IP. Use `2` behind Vercel, `1` on Render alone. |
| First request after idle hangs or Vercel shows a proxy timeout | Render's free plan sleeps and takes 30-60s to wake. Use a paid plan, or ping `/api/health` every few minutes (UptimeRobot etc.). |
| Tables missing / 500 on new pages | Set `AUTO_INIT_DB=true` (or run `npm run db:init` once against the database). |
| Document upload fails with "File storage is not configured" | Configure R2/S3 (above). Render's disk is wiped on every deploy. |
| No live updates | Set `VITE_SOCKET_URL` on Vercel. The app works without them. |

## Security checklist before real users

- Rotate any database password that ever appeared in git, logs or chat.
- Use unique random `JWT_SECRET` and `DATA_ENCRYPTION_KEY` (never reuse the CI/local test values).
- Keep `CORS_ORIGIN` to your own domains; never `*`.
- Do not seed demo accounts in production (`npm run db:seed` refuses without `SEED_PASSWORD`).
