# AUTH_STATE.md — SYANO (سوق سوريا)

## Authentication Overview
- **Method:** JWT (HS256) signed with SESSION_SECRET
- **Token lifetime:** 7 days
- **Transport:** `Authorization: Bearer <token>` header
- **Password hashing:** bcrypt
- **OTP hashing:** bcrypt (for reset OTP codes)

## Environment Variables Required
- `SESSION_SECRET` — JWT signing secret (Replit Secret)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` — push notifications

## Authentication Flow

### Login
1. `POST /api/auth/login` with `{ email, password }`
2. Lookup user by email — if not found → `USER_NOT_FOUND` (intentional, prevents enumeration)
3. bcrypt.compare(password, password_hash)
4. If mismatch → `USER_NOT_FOUND` (same error, prevents enumeration)
5. Check account_status — if suspended → 403 + ACCOUNT_SUSPENDED
6. Check rate limit (429 → `rate_limited`)
7. Issue JWT with `{ userId, role, email, isVerified }`
8. Return `{ user, token }`

### Register
1. `POST /api/auth/register` with `{ email, phone, password, name }`
2. Check duplicate email → `email_taken`
3. Check duplicate phone → `phone_taken`
4. bcrypt.hash(password, 10)
5. Insert user with role=customer, is_verified=true (VERIFICATION_ENABLED=false)
6. Issue JWT
7. Return `{ user, token }`

### Forgot Password (OTP Reset)
1. `POST /api/auth/forgot-password` with `{ email }`
2. Always returns safe message (never reveals if email exists)
3. If user exists: generate 6-digit OTP, bcrypt.hash it, store in `reset_otp_hash` + `reset_otp_expires_at` (10 min)
4. Track `reset_otp_attempts` (max 5) and `reset_otp_locked_until`
5. Send OTP via email (if email service configured)

### Verify Reset OTP
1. `POST /api/auth/verify-reset-otp` with `{ email, code }`
2. Lookup user, check attempts/lockout
3. bcrypt.compare(code, reset_otp_hash)
4. If valid: return one-time reset token (JWT, short-lived)
5. Increment attempts on failure

### Reset Password
1. `POST /api/auth/reset-password` with `{ token, password }`
2. Verify reset token
3. bcrypt.hash(newPassword, 10)
4. Update password_hash, clear reset_otp_* fields

## OTP Verification System
- **Status:** DISABLED via `VERIFICATION_ENABLED` flag in `artifacts/api-server/src/routes/auth.ts`
- **Behavior:** Register returns token directly; login skips 403 gate; `verify.tsx` redirects to `/`
- **DB:** OTP columns (`otp_hash`, `otp_expires_at`, etc.) still exist — system intact but inactive
- **DO NOT** remove OTP columns — feature may be re-enabled

## Role System
| Role | Access |
|---|---|
| `customer` | Cart, orders, reviews, messaging, store follow |
| `seller` | Seller dashboard, own products, messaging |
| `admin` | Full access including admin dashboard |

## Account Status System
- `account_status`: `active` | `suspended`
- Suspended accounts: all protected routes return 403 + SSE event to kick active sessions
- Suspension stored: `suspended_reason`, `suspended_by` (admin user id), `suspended_at`
- Admin can reactivate via `PATCH /api/admin/users/:id/reactivate`

## Auth Middleware
- `requireAuth` — validates JWT, attaches `req.user = { userId, role, email, isVerified }`
- `requireRole(role)` — checks `req.user.role === role` (or admin override)
- `requireActiveAccount` — checks `account_status === 'active'`, triggers SSE kick if suspended

## Required DB Columns (users table)
All verified present 2026-06-08:
- `password_hash` — bcrypt hash
- `is_verified` — boolean
- `account_status` — text ('active'/'suspended')
- `reset_otp_hash` — text
- `reset_otp_expires_at` — timestamptz
- `reset_otp_attempts` — integer
- `reset_otp_locked_until` — timestamptz
- `otp_hash`, `otp_expires_at`, `otp_attempts`, `otp_locked_until` — for registration OTP (currently disabled)

## Admin Account Requirements
After fresh database:
1. Register with `delewatiamer7@gmail.com`
2. Promote via SQL: `UPDATE users SET role='admin', is_verified=true, account_status='active' WHERE email='delewatiamer7@gmail.com'`
3. Reset password via forgot-password flow

## Frontend Error Code Mapping
| HTTP | Body | Frontend action |
|---|---|---|
| 429 | any | `rate_limited` error display |
| 403 | `ACCOUNT_SUSPENDED` | Suspended toast + redirect to home |
| 401 | `USER_NOT_FOUND` | `no_account_found` error display |
| 400 | `Email already registered` | `email_taken` error |
| 400 | `Phone number already registered` | `phone_taken` error |

## JWT_SECRET Narrowing (Express v5 TypeScript)
```typescript
// CORRECT — IIFE narrow to const
const secret = (() => {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET required");
  return s;
})();

// WRONG — bare conditional doesn't narrow for TypeScript
if (!process.env.SESSION_SECRET) throw new Error();
jwt.sign(payload, process.env.SESSION_SECRET); // TS error: string | undefined
```
