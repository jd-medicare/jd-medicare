# PROGRESS - Account 2 (Case Workflow)

## Done
- M1 Prisma fragment `prisma/fragments/cases.prisma` (+ `_local-base.prisma`, local only)
- M2 customers.* and cases.* endpoints; agent own-records scope; SUBMITTED→PENDING
- M3 Team Leader edit, history (CaseRevision), call length PUT + HH:MM:SS helper
- M4 outsource.cases / outsource.summary
- M5 accept/reject: row lock + unique decision row + audit
- M6 modify-processed
- M7 workflow.transitions + table-driven transitions
- M8 CaseQueryService (documented in cases/README.md)
- M9 tests written: 50 unit tests (PASS, run here) + DB e2e spec `cases/__tests__/case-workflow.e2e.spec.ts`
- Docs: `docs/workflows/case-workflow.md`, README.md + CHANGE_REQUESTS.md in all 5 folders
- Typecheck with loosely-typed Nest/Prisma stubs: clean (only implicit-any noise from the stubs)

- Review: brittle `x-request-id` assertion removed from the e2e spec (verified by grep)
- Review: `case-query.service.ts` re-read line by line; all table names (`cases`, `call_records`, `case_revisions`) and column names (`organizationId`, `submittedAt`, `processedAt`, `agentId`, `teamLeaderId`, `processedById`, `status`, `durationSeconds`, `caseId`, `type`, `id`) match `cases.prisma`; no SQL mistakes found. Still unexecuted against Postgres.
- Approved by owner: the 4 assumptions (phone unique per org, first-TL claim, UTC dates, call length locked after processing)

## In progress
- Nothing.

## Remaining (needs a machine with network + Postgres)
1. `cd apps/api/src/_stubs/cases-local && npm i && npm run schema && npm run db:push`
2. `DATABASE_URL=<throwaway db> npm run test:e2e`  (NOT executed yet: no Postgres/Nest/Prisma in the sandbox; includes the concurrency tests)
3. Fix anything the real Prisma/Nest typecheck reveals (raw SQL in case-query.service.ts is the most likely spot).
4. At merge: edit only `cases/deps.ts`, delete `_stubs/`, apply CHANGE_REQUESTS.md items.
