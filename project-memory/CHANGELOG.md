# CHANGELOG.md — SYANO (سوق سوريا)

Chronological log of all verified modifications. Never delete previous entries.

---

## 2026-06-08 02:30 UTC — Workspace Migration Recovery

**Added:**
- `project-memory/` directory with full project state layer (10 files)

**Fixed:**
- `AdminListUsersParams` missing `q?: string` field in `lib/api-client-react/src/generated/api.schemas.ts`
- Empty database after Replit account migration — schema pushed via `drizzle-kit push`
- Missing admin account (delewatiamer7@gmail.com) — recreated with role=admin, is_verified=true, account_status=active
- Missing `node_modules` after migration — restored via `pnpm install`
- Missing lib declarations (`lib/db/dist`, `lib/api-zod/dist`, `lib/api-client-react/dist`) — rebuilt via `npx tsc --build`

**Changed:**
- Nothing functional changed — recovery only

**Database impact:**
- All 22 tables created from scratch (DB was empty)
- Additive migrations applied: order shipping fields, order_status_history, variant columns, sales_count, account_status

**API impact:**
- `AdminListUsersParams.q` now typed correctly — admin user search works

**Frontend impact:**
- None

**Mobile impact:**
- None

**Performance impact:**
- All previously completed optimizations verified intact

**Breaking changes:**
- None

**Verification status:**
- ✅ pnpm install: OK
- ✅ Environment: all 10 vars present
- ✅ Database: all 22 tables present
- ✅ Admin account: active
- ✅ Login: JWT issued
- ✅ Register: working
- ✅ Forgot password: working
- ✅ Verify OTP: endpoint present
- ✅ Reset password: endpoint present
- ✅ API Server: running
- ✅ Marketplace: running
- ✅ Mobile: running
- ✅ TypeScript api-server: 0 structural errors
- ✅ TypeScript marketplace: 0 structural errors
- ✅ TypeScript mobile: 0 structural errors
- ✅ All performance optimizations: intact

---

## 2026-06-08 — Pre-migration State (carried over from previous workspace)

The following was already complete and working before migration:

**Authentication:**
- Login (JWT, bcrypt, account status check)
- Register (duplicate email/phone detection)
- Forgot password (OTP via email)
- OTP verification (disabled via VERIFICATION_ENABLED flag)
- Password reset (token-based)
- Guest cart (full flow)
- Account suspension system

**Dashboards:**
- Admin dashboard (users, products, orders, logs, stats, suspension/reactivation)
- Seller dashboard (orders, products, inventory, analytics, store settings, messaging)
- Customer dashboard (orders, profile)

**Platform features:**
- Messaging system (SSE real-time + 3s/5s polling fallback)
- Notifications (SSE + polling)
- Push notifications (VAPID)
- Product reviews
- Seller reviews
- Store follow system
- Seller applications (draft, submit, admin approval)
- Product variants (groups, options, values, images)
- Flash sale support
- Search (pg_trgm)
- Sitemap
- CSV export
- Arabic RTL + i18n (en + ar)
- Google Translate protection
- Localization (USD/SYP currency)

**Performance optimizations:**
- React.memo (Navbar, NotificationCenter, ProductCard, cart, home)
- Stable callbacks (useCallback in 13+ files)
- Bundle splitting (manualChunks: vendor-react, vendor-radix, framer-motion deferred, recharts deferred)
- Lazy loading (54 lazy-loaded components in marketplace)
- Virtualized product grid (IntersectionObserver prefetch in ProductCard)
- Frame pacing (NavigationProgress CSS animation, will-change removal)
- Long task optimization (CSV export ISO date formatting)
- Memory optimization (NotificationProvider, GuestCartContext useMemo)
- Mobile FlatList optimization (getItemLayout, removeClippedSubviews, initialNumToRender)
- Skeleton screens on all pages
- SSE kick on account suspension
