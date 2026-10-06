# PROGRESS: Account 6 (finance, files, integrations, notifications)

Last updated: 2026-10-05 (after owner approvals). Resume by reading this file, then continue at "Remaining".

## How to run what exists
From `project/`: `tsx --test "apps/api/src/**/__tests__/*.test.ts"` (node:test + tsx, no install needed). Status: 89 passing.

## Done
- Registry `packages/shared-types/api-registry.json` and `src/route.ts`: byte-identical to contract A4 (verified by script).
- `packages/shared-types/src/modules/finance.ts` (DTOs/bodies).
- `prisma/fragments/finance.prisma` (ExpenseHead, Income, Expense, Payment, FinancialTransaction, Attachment, AttachmentAccessLog, Notification, Integration, IntegrationRequest, WebhookEvent) + `_local-base.prisma`.
- Finance: all 17 finance.* endpoints (controller), core logic, exact money type, void-not-delete, ledger, reports, FinanceQueryService (A10), default heads, audit. Tests: money, core (void, tenant isolation, reports), authorization (controller matches registry + role matrix).
- Files: upload policy, FilesCore, StorageService (S3), controller for files.uploadUrl/downloadUrl, access log. Tests: validation, tenant isolation, ownership, size mismatch, TTL, rate limit.
- Integrations: IntegrationCore (tracking, retries, redaction), WebhookCore (signature, timestamp, replay, idempotency, rate limit), business handler registry, Redis limiter/claim store, module + BullMQ worker. Tests: 29.
- Notifications: NotificationsCore, email adapter port + SMTP provider, BullMQ worker. Tests: 6.
- Verified against real services: raw monthly SQL on PostgreSQL; rate-limit Lua and claim/release on Redis.
- Docs: `docs/api/finance-files.md`; README.md + CHANGE_REQUESTS.md in finance, files, integrations, notifications.

## Owner decisions (2026-10-05)
- Approved: BigInt `Money`; no webhook/notification routes for now; extra audit event names.
- Changed: audit write failure after commit no longer errors the request; it is logged (`AUDIT_WRITE_FAILED` + requestId) and execution continues (`finance/safe-audit.ts`, used by FinanceCore and FilesCore). Covered by `finance/__tests__/audit-failure.test.ts` (6 tests).

## In progress
Nothing partially written.

## Remaining (blocked: npm registry returns 403 in this sandbox)
1. `pnpm install` and compile: Nest controllers/modules, Prisma repositories (`prisma-*.repository.ts`), `storage.service.ts`, `smtp-email.provider.ts`, `integrations.module.ts`, `notifications.module.ts`, `_stubs` have NEVER been compiled or run. Expect small type fixes (e.g. Prisma `orderBy` computed keys).
2. `prisma validate` / `db push` with `_local-base.prisma` + `finance.prisma`, then DB-backed tests for the Prisma repositories (tenant scoping, conditional void, ledger consistency).
3. Boot the app: confirm `/api/docs-json`, guards, DomainErrorFilter and the `{data, meta}` wrapping with Account 1's real services.
4. Replace `_stubs` imports by editing `finance/deps.ts` at merge.
5. Open change requests: see CHANGE_REQUESTS.md in each folder (future webhook/notification routes, file permission/linking, optional transactional audit).
7. Ops: alert on the `AUDIT_WRITE_FAILED` log line.
6. Optional: swap `Money` for a decimal library if the team requires it (same API surface).
