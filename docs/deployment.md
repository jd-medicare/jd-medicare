# Deployment

## Pipeline
`PR` -> CI (install, typecheck, lint, unit, integration, `check:contract`, build, dependency scan, migration validation, container build + scan) -> merge to `main` -> CD: build/push/sign images (tag = git SHA) -> **staging** deploy -> smoke -> E2E -> security suite -> **manual approval** (GitHub `production` environment with required reviewers) -> **production** deploy -> smoke. Failure at any deploy step triggers rollback. Details: `ci-cd.md`.

## One-time host setup (staging / single-host production)
1. Docker Engine + compose plugin; user `deploy` in the `docker` group; `/opt/app` owned by `deploy`.
2. `ufw`/security group: allow 80, 443 from the world (or from the CDN only), 22 from the bastion/VPN only. Nothing else.
3. TLS certificates in `/etc/app/certs/{fullchain.pem,privkey.pem}` (see `tls-cdn-waf.md`).
4. `node scripts/init-env.mjs staging` (or production) on the host, then fill every `SET_ME`. `chmod 600`. Never commit it.
5. Backup env + cron: `infrastructure/env/.env.backup.example`, `infrastructure/backup/crontab.example`.
6. GitHub: create environments `staging` and `production` (required reviewers on production). Secrets per environment: `DEPLOY_HOST DEPLOY_USER DEPLOY_SSH_KEY DEPLOY_KNOWN_HOSTS E2E_*`; variable `BASE_URL`. Replace `@org/...` in `.github/CODEOWNERS`.
7. Enable branch protection on `main`: require the `ci-ok` check, 1+ review, signed commits (recommended).

## Deploy / rollback commands (what CD runs)
```
scripts/deploy.sh <staging|production> <git-sha>     # pull -> pre-deploy backup -> migrate -> up -d -> wait healthy -> record tag
scripts/deploy.sh <staging|production> rollback      # redeploy previous tag recorded in .state-<env>/previous-tag
```
Automatic rollback: if the new `api` does not become healthy in 120 s, `deploy.sh` redeploys the previously running tag and exits non-zero (so CD also stops).

## Migrations
- `prisma migrate deploy` runs once per release from the `migrate` image **before** new app containers start.
- **Rollback does not revert the database.** All migrations must be backward compatible with the previous release (expand/contract): add nullable columns/tables first; remove or tighten only in a later release after nothing reads them.
- CI fails if migrations don't apply to an empty database or drift from `schema.prisma`, and warns on `DROP`/`TRUNCATE`.
- Every deploy takes a pre-deploy backup (aborts if it fails). To undo a bad migration: restore from that backup (`backup-dr.md`) — expect downtime and data loss since the backup.
- Initial migration is created **at merge** (`MERGE_AND_VERIFY.md`), not before.

## Zero-downtime notes
Compose does a recreate-per-service (brief blip per container). For true zero-downtime use two api replicas behind the proxy (`deploy: replicas: 2` / orchestrator rolling updates); sessions are in Redis so replicas are stateless.

## Kubernetes / ECS
Images, env var names, health endpoints (`/live` liveness, `/ready` readiness) and the one-shot `migrate` job map directly. Not provided here; nothing in the contract prevents it.
