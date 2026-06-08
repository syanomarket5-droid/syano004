# KNOWN_ISSUES.md — SYANO (سوق سوريا)

## OPEN ISSUES

### KI-001
- **ID:** KI-001
- **Priority:** Low
- **Description:** TypeScript TS7006 implicit-any errors in callback parameters across api-server, marketplace, and mobile (e.g., `.map(s => ...)` without type annotation)
- **Current status:** Open / accepted — pre-existing, does not affect runtime
- **Affected files:** `artifacts/api-server/src/routes/orders.ts`, `products.ts`, `variants.ts`, `sellers.ts`, `reviews.ts`, `search.ts`; `artifacts/marketplace/src/pages/products/[id].tsx`, `seller/dashboard.tsx`, `seller/inventory.tsx`, `seller/messages.tsx`, `seller/orders.tsx`, `seller/products/index.tsx`, `store/[slug].tsx`; `artifacts/mobile/app/(tabs)/index.tsx`, `orders.tsx`, `checkout.tsx`, `order/[id].tsx`, `components/OrderCard.tsx`
- **Possible root cause:** Code written with implicit any in arrow function callbacks; noImplicitAny is enabled but these were accepted in the previous workspace state
- **Temporary workaround:** None needed — runtime is not affected; esbuild strips types
- **Resolved in version:** Not yet — intentionally not fixed to preserve existing behavior

### KI-002
- **ID:** KI-002
- **Priority:** Low
- **Description:** After migration, admin account password is `Test1234!` (set during recovery test register). Admin should reset via forgot-password flow.
- **Current status:** Open — functional, but password should be changed
- **Affected files:** Database — users table, id=1
- **Possible root cause:** Fresh DB after migration had no admin account; recovery test registered the email which set the password
- **Temporary workaround:** Admin can use `POST /api/auth/forgot-password` + OTP flow to set own password
- **Resolved in version:** Resolved when admin resets password

### KI-003
- **ID:** KI-003
- **Priority:** Low
- **Description:** Expo package version mismatches — `expo@54.0.34` (expected ~54.0.35), `expo-font@14.0.11` (expected ~14.0.12), `expo-router@6.0.23` (expected ~6.0.24)
- **Current status:** Open / accepted — minor patch versions, no functional impact
- **Affected files:** `artifacts/mobile/package.json`
- **Possible root cause:** pnpm lockfile pinned to slightly older patch
- **Temporary workaround:** App runs correctly with current versions
- **Resolved in version:** Defer to next dependency update cycle

---

## RESOLVED ISSUES

### KI-R001
- **ID:** KI-R001
- **Priority:** Critical
- **Description:** Empty database after Replit account migration — `relation "users" does not exist`
- **Current status:** RESOLVED 2026-06-08
- **Resolution:** Ran `drizzle-kit push` to create all 22 tables from scratch
- **Resolved in version:** Recovery 2026-06-08

### KI-R002
- **ID:** KI-R002
- **Priority:** Critical
- **Description:** Missing `node_modules` after migration — all workflows failed with `ERR_MODULE_NOT_FOUND`
- **Current status:** RESOLVED 2026-06-08
- **Resolution:** Ran `pnpm install`
- **Resolved in version:** Recovery 2026-06-08

### KI-R003
- **ID:** KI-R003
- **Priority:** High
- **Description:** Lib declaration files (`dist/index.d.ts`) not built — TS6305 errors across all projects
- **Current status:** RESOLVED 2026-06-08
- **Resolution:** Ran `npx tsc --build lib/db lib/api-zod lib/api-client-react`
- **Resolved in version:** Recovery 2026-06-08

### KI-R004
- **ID:** KI-R004
- **Priority:** High
- **Description:** `AdminListUsersParams` type missing `q?: string` — TS2353 error in `artifacts/marketplace/src/pages/admin/users.tsx`
- **Current status:** RESOLVED 2026-06-08
- **Resolution:** Added `q?: string` to `AdminListUsersParams` in `lib/api-client-react/src/generated/api.schemas.ts`
- **Resolved in version:** Recovery 2026-06-08

### KI-R005
- **ID:** KI-R005
- **Priority:** High
- **Description:** Admin account missing after fresh DB — no admin user existed
- **Current status:** RESOLVED 2026-06-08
- **Resolution:** Registered email then promoted to admin via SQL UPDATE
- **Resolved in version:** Recovery 2026-06-08
