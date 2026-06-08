# RECOVERY_GUIDE.md — SYANO (سوق سوريا)

## PURPOSE
This file allows any AI session to recover and continue instantly without asking the user for context.

Read this FIRST in any new session before touching any code.

---

## Current Stable State
- **Date verified:** 2026-06-08
- **TypeScript:** 0 structural errors across api-server, marketplace, mobile
- **Database:** All 22 tables present, all additive migrations applied
- **Admin account:** delewatiamer7@gmail.com (role=admin, active, verified)
- **All services:** API Server + Marketplace + Mobile running

---

## Recovery Order (run in this sequence)

### Step 1 — Install dependencies
```bash
pnpm install
```

### Step 2 — Verify environment variables
All must be present:
- DATABASE_URL
- SESSION_SECRET
- SITE_URL
- CORS_ORIGIN
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_EMAIL
- REPLIT_DEV_DOMAIN
- REPLIT_DOMAINS
- REPL_ID

Check: `printenv | grep -E "DATABASE_URL|SESSION_SECRET|SITE_URL|CORS_ORIGIN|VAPID|REPLIT"`

### Step 3 — Verify database
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```
Expected: 22 tables (see DATABASE_STATE.md for full list)

If empty, push schema:
```bash
cd lib/db && echo "" | DATABASE_URL="$DATABASE_URL" pnpm drizzle-kit push --config=drizzle.config.ts
```
Then restart API server (it applies additive migrations automatically).

### Step 4 — Root admin is self-healing (automatic)
The `bootstrapRootAdmin()` function runs automatically during API server startup (after migrations).

**No manual action required.** It will:
- Create the root admin if missing
- Repair role / account_status / is_verified if wrong
- Regenerate password hash if it doesn't match `ROOT_ADMIN_PASSWORD` env var

To verify it ran correctly, check API server logs for one of:
- `Root admin bootstrapped (created)`
- `Root admin repaired` (with repairs list)
- `Root admin healthy`

Root admin email: `delewaitamer7@gmail.com`
Password: set via `ROOT_ADMIN_PASSWORD` Replit Secret (falls back to configured default if absent)

### Step 5 — Build lib declarations
```bash
npx tsc --build lib/db lib/api-zod lib/api-client-react
```
This is required after fresh clone / migration. Do this before running tsc checks.

### Step 6 — Start services
Services are started automatically via Replit workflows:
- `artifacts/api-server: API Server` — `export NODE_ENV=development && pnpm run build && pnpm run start`
- `artifacts/marketplace: web` — `vite --config vite.config.ts --host 0.0.0.0`
- `artifacts/mobile: expo` — expo start

If workflows failed, restart them via Replit workflow manager.

### Step 7 — Verify authentication
```bash
BASE="http://localhost:8080"
curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"delewatiamer7@gmail.com","password":"<admin-password>"}'
```
Expected: `{ user: { role: "admin" }, token: "eyJ..." }`

### Step 8 — Read project state
Read in order:
1. `project-memory/PROJECT_STATE.md` — overall state
2. `project-memory/CURRENT_TASK.md` — what was being worked on
3. `project-memory/KNOWN_ISSUES.md` — open bugs
4. `project-memory/CHANGELOG.md` — recent changes

### Step 9 — Continue from CURRENT_TASK.md
Resume exactly where the previous session left off.

---

## DO NOT (Absolute Rules)

- **DO NOT regenerate OpenAPI** — it was manually extended (isBestDeal, storeName, hasVariants, flashSale*, q on AdminListUsersParams)
- **DO NOT run orval** unless you can prove it is required and you have preserved all manual extensions
- **DO NOT rewrite authentication** — fully working, JWT + bcrypt + OTP all intact
- **DO NOT recreate JWT logic** — SESSION_SECRET is in Replit Secrets
- **DO NOT remove additive migrations** from `run-migrations.ts` — idempotent, safe to re-run
- **DO NOT drop tables or columns** — additive only
- **DO NOT modify the manualChunks** in `vite.config.ts` without understanding the pnpm path bug
- **DO NOT merge vendor-react and vendor-radix** into one chunk — causes production crash
- **DO NOT add scroll-behavior: smooth to html root** — causes layout recalculations
- **DO NOT use position:fixed on mobile action bars** — doesn't render correctly
- **DO NOT undo any performance optimization** — all are complete and verified

---

## Key File Locations

| What | Where |
|---|---|
| API Server entry | `artifacts/api-server/src/index.ts` |
| API Server routes | `artifacts/api-server/src/routes/index.ts` |
| Drizzle schema | `lib/db/src/schema/` |
| Drizzle config | `lib/db/drizzle.config.ts` |
| Additive migrations | `artifacts/api-server/src/lib/run-migrations.ts` |
| Vite config (bundle split) | `artifacts/marketplace/vite.config.ts` |
| i18n translations | `artifacts/marketplace/src/i18n/{en,ar}.json` |
| Generated API schemas | `lib/api-client-react/src/generated/api.schemas.ts` |
| Generated API hooks | `lib/api-client-react/src/generated/api.ts` |
| Auth routes | `artifacts/api-server/src/routes/auth.ts` |
| Auth middleware | `artifacts/api-server/src/middleware/` |
| Product card | `artifacts/marketplace/src/components/ProductCard.tsx` |
| Notification provider | `artifacts/marketplace/src/providers/NotificationProvider.tsx` |
| Guest cart context | `artifacts/marketplace/src/providers/GuestCartContext.tsx` |

---

## Known Open Issues (sync from KNOWN_ISSUES.md)

- **KI-001:** Pre-existing TS7006 implicit-any in callbacks (low priority, does not affect runtime)
- **KI-002:** Admin password is `Test1234!` after fresh-DB recovery — should be reset via forgot-password
- **KI-003:** Minor Expo package version mismatches (~1 patch version behind) — no functional impact

---

## Current Active Feature
**None** — stable state. Next task is the Modern Product Variant System upgrade.
See `project-memory/VARIANT_SYSTEM_STATE.md` for planning notes.

---

## Workspace Structure
```
workspace/
├── artifacts/
│   ├── api-server/       Express v5 API (port $PORT, default 8080)
│   ├── marketplace/      React+Vite marketplace (port $PORT)
│   ├── mobile/           Expo React Native (port $PORT)
│   └── mockup-sandbox/   Canvas component preview (port $PORT)
├── lib/
│   ├── db/               Drizzle schema (composite TS — build with tsc --build)
│   ├── api-zod/          Zod schemas (composite TS — build with tsc --build)
│   ├── api-client-react/ Orval hooks (composite TS — build with tsc --build)
│   └── api-spec/         OpenAPI source
├── project-memory/       THIS DIRECTORY
└── pnpm-workspace.yaml
```

---

## Quick Diagnostic Commands
```bash
# Check all services health
curl -s http://localhost:8080/api/settings
curl -s http://localhost:8080/api/products?limit=1

# Check DB tables
# Use executeSql({ sqlQuery: "SELECT table_name FROM information_schema.tables WHERE table_schema='public'" })

# TypeScript check (after building libs)
npx tsc --noEmit -p artifacts/api-server/tsconfig.json 2>&1 | grep "error TS" | grep -v TS7006
npx tsc --noEmit -p artifacts/marketplace/tsconfig.json 2>&1 | grep "error TS" | grep -v TS7006
npx tsc --noEmit -p artifacts/mobile/tsconfig.json 2>&1 | grep "error TS" | grep -v TS7006

# Rebuild lib declarations
npx tsc --build lib/db lib/api-zod lib/api-client-react
```
