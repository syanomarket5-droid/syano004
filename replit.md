# Marketplace

A full-stack marketplace/ecommerce app with role-based auth (Seller/Customer), cart/order/inventory/discount system, and a premium emerald green design with AMOLED dark mode.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed:admin` — seed admin demo account (idempotent)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT signing secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui, TanStack Query, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Auth: JWT (jsonwebtoken + bcryptjs), stored in localStorage
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth OpenAPI contract
- `lib/api-zod/src/index.ts` — generated Zod schemas (do not edit manually)
- `lib/api-client-react/src/` — generated React Query hooks (do not edit manually)
- `lib/db/src/schema/` — Drizzle ORM schema (users, products, cart_items, orders, order_items)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT sign/verify/requireAuth/requireRole
- `artifacts/marketplace/src/` — React frontend
- `artifacts/marketplace/src/contexts/AuthContext.tsx` — auth state management
- `artifacts/marketplace/src/lib/api-setup.ts` — API token injection

## Architecture decisions

- **Contract-first API**: OpenAPI spec drives Zod validation schemas AND React Query hooks via Orval codegen. Never hand-write API call code.
- **JWT in localStorage**: Token stored under `localStorage.token`, user under `localStorage.user`. `setAuthTokenGetter` injects it into all generated hooks.
- **Stock-on-delivery**: Inventory only decreases when a seller marks an order as "delivered" — not at checkout. Implemented in `orders.ts` status-update handler.
- **Role selector on login**: Login form shows Customer and Seller only. Admin accounts bypass role-mismatch validation server-side — entering admin credentials while "Customer" is selected grants admin access and redirects to /admin.
- **Numeric prices**: DB stores prices as `numeric`/`decimal`; route handlers use `parseFloat()` for JSON serialization. `finalPrice` is computed server-side.

## Product

- **Customers**: Browse/search/filter products by category, add to cart, checkout, view order history, track order status.
- **Sellers**: Manage product inventory (add/edit/delete/discount), view orders, update order statuses (pending → processing → shipped → delivered), view dashboard stats.
- **Auth**: Role-based registration and login (Customer / Seller). JWT-secured API with per-route role guards.

## Demo accounts

- Admin: `delewatiamer7@gmail.com` / `00Amer00` (log in via Customer button)
- Seller: `seller@demo.com` / `password123`
- Customer: `customer@demo.com` / `password123`
- 12 seed products across Electronics, Sports, Home, Fashion categories (some with discounts)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After editing API routes, the API server must be rebuilt (workflow restart) — it runs from a compiled `dist/`.
- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change before touching frontend code.
- Do NOT run `pnpm dev` at workspace root — use workflow restart instead.
- `pnpm --filter @workspace/db run push` for schema changes in dev; production needs manual migration.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
