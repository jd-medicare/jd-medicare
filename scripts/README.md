# scripts/ (Account 5)
Endpoints implemented: none. Used by registry: `check-contract.mjs` validates against `packages/shared-types/api-registry.json`.
| Script | Purpose |
|---|---|
| `check-contract.mjs` | **PROVISIONAL** (Part E script was not supplied). `pnpm check:contract` / `check:contract:full` |
| `assemble-prisma.mjs` | base + fragments -> `prisma/schema.prisma` |
| `init-env.mjs` | create `.env.<name>` with generated secrets |
| `harden-check.sh` | production hardening verifier |
| `backup-postgres.sh`, `restore-test.sh` | encrypted backup, restore proof, RPO/RTO |
| `deploy.sh`, `ci-remote-deploy.sh` | deploy with auto-rollback; CI wrapper |
| `smoke-test.sh` | post-deploy smoke test |
## Env variables
`BACKUP_*`, `AWS_*`, `RESTORE_*` (see `infrastructure/env/.env.backup.example`); `ENV_FILE`, `REGISTRY`, `IMAGE_TAG`, `BUNDLED_DATA`, `OBSERVABILITY` for deploy; `SSH_KEY KNOWN_HOSTS HOST USER_` for CI deploy.
## ASSUMPTIONS
Target host has bash, docker compose, aws cli, age, rsync. Table names `users`, `organizations` exist for restore sanity checks (`RESTORE_EXPECT_TABLES`).
