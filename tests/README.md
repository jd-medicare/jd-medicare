# tests/ (Account 5)
Endpoints implemented: none. All calls use `route(registryKey, params)`; `check:contract` fails on hard-coded `/api/v1` strings in `tests/` (security specs excepted).
Run: `pnpm test:e2e`, `pnpm test:e2e:smoke` (`@smoke`), `pnpm test:security`. Security `99-rate-limits` runs last on purpose.
## Env variables
`E2E_BASE_URL` (default http://localhost:8080), `E2E_SUPERADMIN_EMAIL/PASSWORD/TOTP_SECRET`, `E2E_ORG2_ADMIN_EMAIL/PASSWORD/TOTP_SECRET` (tenant test skips without), `E2E_CI_BYPASS_TOKEN`, `E2E_EXPECT_RATE_LIMITS=1` (edge proxy present), `E2E_INSECURE_TLS=1` (self-signed).
## Coverage
E2E: full lifecycle, reject, modify, modify-after-accept/reject, concurrency, lock/unlock, permission removal, unauthorized accept/reject, tenant isolation. Security: see `docs/security/asvs-coverage.md`.
## ASSUMPTIONS
API-level E2E only (no UI selectors were available to Account 5); a UI pass with `apps/web` is still needed. Other assumptions listed at the end of `docs/MERGE_AND_VERIFY.md`. Tests verified to typecheck and enumerate (136 tests); **never executed** against a live API.
