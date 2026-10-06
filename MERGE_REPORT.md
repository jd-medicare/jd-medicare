# MERGE_REPORT

Six independently built packages were merged into one pnpm monorepo (`apps/api`, `apps/web`, `packages/shared-types`, `packages/validation`, `prisma`, `infrastructure`, `scripts`, `tests`, `docs`).

**Important: nothing here has been compiled with the real toolchain.** The build environment had no npm/Prisma access (403). What was and was not checked is listed honestly below. Do the "First run" steps on your machine before trusting any of it.

## First run (your machine / Antigravity)
```bash
corepack enable && pnpm install            # NOT --frozen-lockfile: pnpm-lock.yaml is stale, it will be regenerated
cp apps/api/.env.example apps/api/.env     # fill DATABASE_URL, REDIS_URL, SESSION_SECRET, MFA_ENCRYPTION_KEY, PRIMARY_SUPER_ADMIN_*, S3_*, SMTP_URL
pnpm prisma:assemble                       # builds prisma/schema.prisma from base + fragments
pnpm --filter @app/api prisma:generate     # Prisma 7 client -> apps/api/src/generated/prisma
pnpm db:push                               # creates tables, then applies prisma/base/sql/001..003 (triggers, RLS, FKs)
pnpm --filter @app/api seed                # roles/permissions + Primary Super Admin + org
pnpm typecheck                             # EXPECT some errors on first run: fix them in order, they are mostly import/type nits
pnpm test:unit && pnpm check:contract:full
pnpm --filter @app/api dev                 # API (QUEUE_WORKERS=on by default => single-process dev)
pnpm --filter @app/api dev:worker          # optional separate worker
pnpm --filter @app/web dev
```
Production: API containers run with `QUEUE_WORKERS=off`, one worker container runs `dist/worker.js` (already set in `infrastructure/compose/docker-compose.staging.yml`).
The migrate image uses `prisma migrate deploy`, but **no `prisma/migrations` exists yet**: create one (`prisma migrate dev --name init`) and append the SQL from `prisma/base/sql/*.sql` to it, or use `pnpm db:push` for the first deployment.

## What was done
- Base = Account 1; other accounts' folders copied in; shared-types modules re-exported without TS2308 duplicates (18 duplicate names verified structurally identical; `CeoDashboardData.finance` is now nullable).
- All stubs removed. Real bindings: reports/ceo -> `PrismaCaseDataRepository`, `PrismaUserDataRepository` (new, written in this merge), `CaseQueryService`, `FinanceQueryService`, `StorageService`, `AuditService`.
- Global guards (rate limit -> CSRF -> session -> permissions) apply to every controller; per-controller `@UseGuards` removed. Global `AllExceptionsFilter` rewritten so module error codes (409 etc.) keep their status.
- `app.module.ts` registers all 18 modules. `FilesModule` now imports `IntegrationsModule` (it was a DI bug). `worker.ts` added; `QUEUE_WORKERS=off` skips BullMQ consumers.
- `users` is under RLS, so other modules read it through the system-scoped Prisma client with an explicit organizationId.
- `prisma/base/sql/003_constraints.sql`: 54 foreign keys, amount/duration CHECKs, append-only triggers on history tables, pg_trgm index on customer phone.
- Dependencies that were missing after the merge added to `apps/api/package.json`: bullmq, @nestjs/bullmq, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner, nodemailer.
- Env examples and compose aligned (SMTP_URL, EMAIL_FROM, S3_*, BULL_PREFIX, QUEUE_WORKERS...).
- Frontend: Account's web had only Login + Outsource. Added shell/nav, Agent, Team Leader, Admin (users, audit), CEO, Reports, Finance, password reset (see `apps/web/FRONTEND_STATUS.md`, 13 listed assumptions).

## Verified here
| Check | Result |
|---|---|
| API contract script `check:contract:full` | 67/67 registry routes found in controllers, no extras |
| node:test unit tests (reports, finance, files, notifications, integrations, workflow, schemas, helpers) | all pass: 19 files; 3 files could not load only because `@nestjs/common` is not installed here |
| `003_constraints.sql` + 001/002 on local Postgres 16 (tables generated from the fragments) | applies, re-applies cleanly; bad FK and negative duration rejected |
| Syntax of all 271 TS/TSX files (esbuild), shell scripts, JSON | OK |

## NOT verified
- `tsc` type-check, `nest build`, `vite build`, jest e2e (`apps/api/test`), Playwright (`tests/`), Docker builds.
- Real Prisma schema validation (`prisma validate`), `db push`, and the Prisma repositories against a real DB (raw SQL in `PrismaCaseDataRepository.performance` especially).
- Dependency injection wiring at runtime (booting the Nest app). Expect a few DI errors on first boot.
- The new web screens (never compiled or run); list query params match the API schemas for cases, others are guesses.
- Account 2's old e2e spec was moved to `docs/handoff/account2/*.disabled` (it depended on removed stubs).

## Open decisions / known gaps (owner must decide)
1. Outsource report self-pin: pending count is always 0 for outsource users.
2. `reviewStats`: kept Account 2's definition (reviewed = EDITED/CALL_LENGTH, modified = MODIFIED_AFTER_PROCESSING); Account 3's docs say otherwise.
3. RLS is not enabled on the new case/finance/report tables; isolation relies on explicit organizationId filters in code.
4. Audit rows are written after the business transaction commits (a crash in between loses the audit row).
5. No MFA enrolment route in the registry (CLI `pnpm --filter @app/api mfa:enroll` exists); no `cases.create` route (case is created by `customers.create`).
6. Bundled PDF font is FreeSerif (GPL with font exception): get legal sign-off or swap the font.
7. `docs/legal-questions.md` and `docs/production-checklist.md` still need sign-off; no migrations committed yet.
