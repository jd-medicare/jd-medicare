# MERGE_AND_VERIFY
Run by the integrator after copying all six accounts' folders into one `project/` (A3 ownership means no file conflicts except those listed). Stop at the first failing step.

1. **Collect**: copy each account's owned folders. Conflicts to resolve by hand: root `package.json` (merge scripts; keep Account 5's `check:contract`, `prisma:assemble`, `test:*`), `pnpm-workspace.yaml` (must include `apps/*`, `packages/*`, `tests`), root `tsconfig`. `packages/shared-types/api-registry.json` must be identical in all copies: `sha256sum */packages/shared-types/api-registry.json`.
2. **Replace the provisional contract checker**: overwrite `scripts/check-contract.mjs` with the Part E script (this repo's version is a stand-in, see `scripts/CHANGE_REQUESTS.md`).
3. **Delete stubs and local models**: remove `apps/api/src/_stubs/` and every `prisma/fragments/_local-base.prisma`; fix imports to the real services (A10). Reconcile env variable names: compare each module README's env list with `infrastructure/env/.env.*.example`; update the examples, then re-run `node scripts/init-env.mjs`.
4. **Prisma**: `pnpm prisma:assemble` (fails if a fragment has datasource/generator or redefines Organization/User) -> `pnpm --filter ./apps/api exec prisma validate --schema ../../prisma/schema.prisma` -> create the initial migration against an empty DB: `prisma migrate dev --name init --schema ../../prisma/schema.prisma` -> commit `prisma/migrations`. Add DB-level protection for the Primary Super Admin (trigger/constraint, A6) in that migration if Account 1 has not.
5. **Contract**: `pnpm check:contract:full` must pass (every registry entry implemented, nothing extra, no hard-coded URLs in web). Fetch `/api/docs-json` and diff its paths against the registry.
6. **Static gates**: `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test:unit`. Confirm each package defines those scripts (`--if-present` hides gaps). Confirm `prisma` is a prod dependency of `apps/api`, and that the build emits `dist/main.js` and `dist/worker.js`.
7. **Containers**: build `app-web`, `app-api`, `app-migrate`, `app-worker` (commands in `.github/workflows/cd.yml`); run each as `docker run --rm --entrypoint id <img> -u` (not 0).
8. **Integration**: `pnpm test:integration` (needs Postgres/Redis/MinIO; compose dev stack).
9. **Local full stack**: staging compose with `--profile bundled-data`, a self-signed cert for `localhost`, `scripts/deploy.sh staging <tag>`; seed the Primary Super Admin and a second org (for `E2E_ORG2_ADMIN_*`).
10. **Smoke + E2E + security**: `bash scripts/smoke-test.sh https://localhost` (`-k` equivalents: set `E2E_INSECURE_TLS=1` for Playwright), `pnpm test:e2e`, `pnpm test:security`. Triage failures: contract mismatch -> owning account; expectation in a test that the contract does not define -> adjust test + note in `tests/README.md` ASSUMPTIONS.
11. **Hardening**: `bash scripts/harden-check.sh` with the production env file and a staging URL.
12. **Backups**: run `backup-postgres.sh` then `restore-test.sh` once; record measured RTO in `docs/backup-dr.md`.
13. **Observability**: start `--profile observability`, add the exporters listed in `docs/observability.md`, confirm app metric names match `alert-rules.yml`, fire one test alert.
14. **Sign-off**: `docs/production-checklist.md` complete; findings log empty of High/Critical; `docs/legal-questions.md` sent to counsel.

## Known test assumptions that may need adjusting at step 10
Query param `range` for `ceo.dashboard`; `organizations.current` returns `{data:{id}}`; locked users' live sessions stop working; `audit.list` supports `search` by entity id; ADMIN may create CEO/other users via `users.create`; Agent lacks `files.uploadUrl` permission (those tests skip on 403); 403 precedes 404 for unauthorized callers; new users can log in with the supplied password without a forced change.
