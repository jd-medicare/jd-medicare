# Authentication, authorization and tenant isolation (Account 1)

## 1. Request pipeline
Global guards run in this order for every route (registered in `AppModule`):
1. **RateLimitGuard** – Redis fixed window: 300 req/min per IP globally, plus per-route limits (`@RateLimit`): login 10/min/IP, MFA 10/min/session, forgot 5/min, reset 10/min, user search 60/min. 429 `RATE_LIMITED` + `Retry-After`.
2. **CsrfGuard** – loads the session from the cookie; every non-GET/HEAD/OPTIONS call must send `X-CSRF-Token` equal to the session token (constant-time compare), else 403 `FORBIDDEN`.
3. **SessionGuard** – everything is authenticated unless `@Public()`. Loads the user and effective permissions **from the database on every request** (so lock/disable/role/permission changes apply instantly). Non-ACTIVE users get their session destroyed. A session that has not passed MFA gets `MFA_REQUIRED` except on `@AllowPendingMfa()` routes.
4. **PermissionsGuard** – `@RequirePermissions(a, b)` requires ALL listed permissions.
5. **TenantInterceptor** – runs the handler inside `TenantContext` with the organization taken from the session.

Public routes: `auth.csrf`, `auth.login`, `auth.logout`, `auth.passwordForgot`, `auth.passwordReset`, `auth.mfaVerify` (pending-MFA session only), and the root health probes.

## 2. Sessions, cookies, CSRF
- Server-side sessions in Redis (`sess:<sha256(id)>`), idle timeout `SESSION_IDLE_SECONDS` (default 30 min, sliding), absolute lifetime `SESSION_ABSOLUTE_SECONDS` (12 h). A per-user index (`usess:<userId>`) lets us revoke all sessions (lock, disable, password reset).
- Cookie `__Host-sid` (`sid` only when `COOKIE_SECURE=false` for local http): `HttpOnly; Secure; SameSite=Strict; Path=/`, no Domain. Value = `<id>.<HMAC-SHA256(SESSION_SECRET)>`; forged cookies are rejected before touching Redis. Nothing is stored in localStorage; no bearer tokens.
- **Client flow:** `GET /auth/csrf` (creates an anonymous session + token) → `POST /auth/login` with `X-CSRF-Token` → **call `GET /auth/csrf` again** (the session id and token are rotated on login to defeat fixation) → use the new token on every non-GET.
- Passwords: argon2id (19 MiB, t=2, p=1), policy 12–128 chars with 3 of 4 character classes.
- Lockout: 5 failures (`LOCKOUT_MAX_ATTEMPTS`) in 15 min (`LOCKOUT_MINUTES`) → `ACCOUNT_LOCKED` (423) even with the right password. The counter is keyed by the hash of the email for **known and unknown** emails so lockout cannot be used to enumerate accounts. Wrong password and unknown email return the same `INVALID_CREDENTIALS`, with dummy-hash timing equalisation. Failures write `LOGIN_FAILED`; locking writes `USER_LOCKED`.
- MFA (TOTP, RFC 6238, ±1 step): secrets are AES-256-GCM encrypted with `MFA_ENCRYPTION_KEY`; codes are single-use (Redis `NX`); 5 bad codes destroy the pending session. Enrolment is by CLI (`pnpm --filter @app/api mfa:enroll <email>`) because the registry has no enrolment endpoint (see CHANGE_REQUESTS.md). `MFA_REQUIRED_ROLES` can force enrolment for roles.
- Password reset: single-use token (only its SHA-256 stored, TTL 30 min), identical response whether or not the account exists, max 3 requests/hour/email, all sessions revoked on reset. Delivery goes through the `AUTH_EMAIL_SENDER` port (Account 6 implements it; default is a no-op).

## 3. Roles, permissions, menus
- Effective permissions = role defaults ∪ per-user grants (`user_permissions`). Menus = role defaults, or the user override when `menusCustomized`. Defaults are seeded from contract A6.
- **Escalation rules** (all enforced server-side in `UsersService`):
  - Role/permission/menu management needs `role:manage` / `permission:manage` / `menu:manage` (PSA only by default).
  - Nobody changes their own role, permissions, menus or status.
  - Non-PSA callers may manage only users **ranked below them** (PSA 100 > ADMIN 80 > CEO 70 > TEAM_LEADER 50 > OUTSOURCE 30 > AGENT 20), may assign only roles ranked below them, **never ADMIN or CEO**, and can grant only permissions they hold themselves.
  - Role `PRIMARY_SUPER_ADMIN` can never be assigned (`PROTECTED_USER`).
- Cross-tenant ids behave as non-existent (404, never 403), so ids cannot be probed.

## 4. Primary Super Admin protection
**Application:** every mutation targeting the PSA (lock, unlock, activate, disable, role, permissions, menus, and profile edits by anyone but itself) returns 403 `PROTECTED_USER`, for Admins and for the PSA itself. `roles.list` hides the PSA role from others; `users.list` omits the PSA and `users.get` returns 404 for non-PSA callers.

**Database (`prisma/base/sql/001_protection.sql`):**
- partial unique index → at most one PSA per organization;
- trigger `guard_primary_super_admin`: PSA row cannot be deleted, demoted (flag/role), moved to another org or set to a non-ACTIVE status; nobody else can be promoted or given the PSA role; a PSA row can only be INSERTED inside the seed transaction (`SET LOCAL app.allow_psa_seed = 'on'`);
- trigger on `user_permissions` / `user_menus` rejecting overrides on the PSA.

**Hiding without deleting audit evidence:**
- `audit_logs` and `security_events` are append-only (row triggers reject UPDATE/DELETE, statement trigger rejects TRUNCATE).
- `AuditService.log` sets `isProtected = true` when the actor or target user is the PSA. `audit.list` filters `isProtected` rows unless the caller is the PSA. The rows stay in the table, queryable by DB operators/compliance.
- Brute-force protection still applies to the PSA through a temporary Redis lockout (status stays ACTIVE, which the trigger requires).

## 5. Tenant isolation
Three layers:
1. **Session** – `organizationId` only ever comes from the server-side session; bodies with `organizationId` are rejected by strict zod schemas.
2. **Prisma extension** (`PrismaService.tenant`) – forces `organizationId` into where/create/upsert for tenant-owned models (`scopeArgs`, unit tested) and strips it from updates. `PrismaService.system` is the explicit, grep-able escape hatch (pre-login lookups, seeding, audit writes with an explicit org). `tenantTransaction(fn)` gives an interactive transaction pinned to the tenant.
3. **PostgreSQL RLS** (`002_rls.sql`) – policies on `users`, `audit_logs`, `security_events`, `system_settings` keyed on `app.current_org` (set per query by the extension) or `app.rls_bypass` (system scope). **Production must connect as a non-owner, non-superuser role** (owners/superusers bypass RLS); example: `CREATE ROLE app_rt LOGIN PASSWORD '…'; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO app_rt;` (no UPDATE/DELETE on audit tables is needed, and the triggers forbid it anyway). `security.spec.ts` proves cross-tenant reads and writes are blocked at the DB for such a role.
- Other accounts: new tenant tables should be added to `TENANT_MODELS` in `prisma.service.ts` and to the RLS policy list at merge (see CHANGE_REQUESTS.md).

## 6. Other controls
Strict CORS (explicit origin list; wildcard rejected at startup), helmet headers (HSTS, `default-src 'none'`, `frame-ancestors 'none'`, nosniff), `Cache-Control: no-store`, 1 MiB body limit, `X-Request-Id` on every response (client value accepted only if it matches `[A-Za-z0-9._-]{8,64}`), uniform error envelope, redaction of password/token/secret/hash keys before audit/security persistence, no secrets logged, secrets only via validated env.

## 7. Known limitations
- `AuditService.log` has a fixed signature without a transaction handle, so the audit row is written after the business change (a crash in between loses the row). Account 2/3/6 should call it immediately after commit.
- User status changes for activate/disable/profile update and password reset are recorded in `security_events` because the contract's audit event list has no such names (see CHANGE_REQUESTS.md).
