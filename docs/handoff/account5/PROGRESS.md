# PROGRESS (Account 5: DevOps, QA, Docs)  - updated after milestone 11
## Done (B5 steps)
1. registry (exact A4, 67 routes, sha256 b872d75c...be32b), `route.ts`, root `check:contract` script; `check-contract.mjs` is **PROVISIONAL**
2. Dockerfiles web/api/worker(+migrate), compose dev + staging
3. CI (`ci.yml`) and CD (`cd.yml`, approval gate, rollback), deploy/smoke scripts
4. `.env.{development,staging,production,backup}.example`, `init-env.mjs`
5. nginx proxy template + snippets, TLS/CDN/WAF doc
6. `harden-check.sh`, production-checklist
7. backup / restore-test scripts, lifecycle, cron, backup-dr
8. OTel collector, Prometheus, 16 alert rules, Alertmanager, observability doc (configs only)
9. Playwright E2E (4 specs) - typechecks, 136 tests listed incl. security
10. Security specs 00-05, 99; ASVS map; findings template
11. Docs: architecture, deployment, ci-cd, env, dev setup, runbook, backup-dr, security overview, checklist, legal-questions, MERGE_AND_VERIFY; README + CHANGE_REQUESTS in each owned folder
## In progress
nothing
## Remaining / blockers
- **Part E script**: paste real `scripts/check-contract.mjs` (not provided to me).
- Compose lacks postgres/redis/node/blackbox exporters referenced by prometheus.yml and alerts.
- Nothing executed live: no Docker/nginx/Prometheus in sandbox; E2E/security never run against an API. Validated only: YAML/shell syntax, TS typecheck, contract-checker negative tests, env generator.
- UI-level (browser) E2E and DOM-XSS pass need apps/web.
- `pnpm-workspace.yaml` must include `tests`; no lockfile yet for `tests/`.
- Reconcile env var names / metric names with modules at merge (MERGE_AND_VERIFY steps 3, 13).
