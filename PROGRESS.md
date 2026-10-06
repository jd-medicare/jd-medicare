# PROGRESS — Account 1 (Part B1: Foundation and Security)
Last verified: build OK, lint OK, 44/44 tests passing (unit 13, auth 9, users 7, security 15) against real Postgres 16 + Redis.

## DONE
1. Monorepo scaffolding: pnpm workspaces, tsconfig.base, ESLint, Prettier, NestJS+Fastify, zod env validation, root /health /ready /live, Swagger JSON at /api/docs-json, prefix api/v1.
2. packages/shared-types: api-registry.json (A4 copy), route.ts, enums, DTOs (A7), requests (A8), responses (A9), src/modules placeholders.
   packages/validation: common/auth/users schemas + per-module placeholders.
3. prisma/schema.base.prisma (Organization, User, UserProfile, Role, Permission, RolePermission, UserPermission, Menu, RoleMenu, UserMenu, AuditLog, SecurityEvent, SystemSetting, PasswordResetToken). Seed (catalog + org + PSA from env, no default password, idempotent).
4. DB protection of Primary Super Admin (triggers, unique index, append-only audit) + app checks (PROTECTED_USER). Documented.
5. Tenant isolation: TenantContext, Prisma tenant extension, RLS policies, tests.
6. Auth endpoints: Redis sessions, __Host- cookie, CSRF, argon2id, reset, TOTP MFA, lockout, rate limiting.
7. A10 building blocks: SessionGuard, PermissionsGuard, @RequirePermissions, @CurrentUser, TenantContext, PrismaService, AuditService.
8. users.*, roles.list, permissions.list, menus.list, organizations.current (23 registry keys total incl. auth/audit, verified against registry by test).
9. Audit: AuditService.log + audit.list.
10. Tests (unit, integration, security) + docs/security/auth-authorization.md + READMEs + CHANGE_REQUESTS.md.

## IN PROGRESS
- nothing.

## REMAINING / OPEN (needs owner decision, see apps/api/CHANGE_REQUESTS.md)
- MFA enrolment endpoints absent from registry (CLI `mfa:enroll` is the interim).
- Audit event names for USER_UPDATED/ACTIVATED/DISABLED/PASSWORD_RESET/LOGOUT (interim: security_events).
- AuditService.log has no tx param (audit written after commit).
- Merge tasks (Account 5): import other modules into AppModule, add their tables to TENANT_MODELS + RLS list, run prod as non-owner DB role, create real initial migration, add `prisma generate` to CI.
- Optional hardening not built: pnpm lockfile audit, Redis-backed per-user concurrent session cap, RLS-mode CI job with non-owner role for the whole suite.

## HOW TO RESUME / RUN
Sandbox notes: Prisma engine downloads are blocked here. Use `PRISMA_SCHEMA_ENGINE_BINARY=/tmp/fake-engine` (any executable) for `prisma generate`; tests create tables from prisma/base/sandbox/schema.sql when the DB is empty.
Services: start Postgres (`service postgresql start`) and Redis (`redis-server --daemonize yes`); DB `appdb`, user `app/app`.
Commands: `pnpm install && pnpm build && cd apps/api && npx jest --runInBand`.
