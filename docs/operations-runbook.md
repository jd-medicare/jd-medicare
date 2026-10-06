# Operations runbook
Compose shorthand (on the host, in /opt/app): `DC="docker compose -f infrastructure/compose/docker-compose.staging.yml --env-file infrastructure/env/.env.production"` (export `ENV_FILE`, `REGISTRY`, `IMAGE_TAG` from `.state-production/current-tag`).

## Daily / routine
- Check Alertmanager, Sentry, `docker ps` health, disk. Weekly: restore-test result. Monthly: Dependabot/Trivy backlog, rotate access reviews, review Admin/CEO accounts and MFA enrolment, test `deploy.sh rollback` on staging.
- Certificates: auto-renew (certbot/CDN); `CertificateExpiringSoon` alerts at 14 days.

## <a id="api-down"></a>API down / `ApiDown`
1. `curl -i https://<domain>/live`. 502/503 JSON from proxy = upstream down. 2. `$DC ps`, `$DC logs --tail=200 api`. 3. Config/secret error? Fix env file, `$DC up -d api`. 4. Bad release? `bash scripts/deploy.sh production rollback`. 5. DB/Redis down? see below.

## <a id="postgres-down"></a>Postgres down
`$DC ps postgres; $DC logs postgres`. Disk full -> free space/extend volume. Corruption -> `backup-dr.md`. Managed DB -> provider console/failover. API returns 5xx until it recovers; no data is written elsewhere.

## <a id="redis-down"></a>Redis down
All sessions invalid and logins fail while Redis is unavailable; queues pause. Restart (`$DC up -d redis`); AOF is on so queues survive. If data lost, users re-login; re-trigger exports.

## <a id="high-5xx"></a>High 5xx
Sentry by release/route; `logs api | grep requestId`; correlate with deploy time; check DB connections (`PostgresConnectionsHigh`), Redis, worker. Roll back if it began at deploy.

## <a id="slow-api"></a>Slow API
Traces by slow route; DB slow queries (`pg_stat_statements`); check unindexed filters on list endpoints (phone, dates, status); check CPU/memory; scale api replicas.

## <a id="queue-backlog"></a>Queue backlog / failed exports
`$DC logs worker`; confirm worker running and Redis reachable; look at failed jobs; restart worker `$DC restart worker`. Exports (`reports.exportGet` status FAILED) can be re-requested by the user.

## <a id="auth-attack"></a>Credential stuffing / brute force (`LoginFailureSpike`, `RateLimitSpike`)
1. Identify source IPs from proxy logs; block at the CDN/WAF or `deny` in nginx. 2. Check `ACCOUNT_LOCKED` counts; contact affected users; never unlock without identity checks. 3. Confirm MFA enforced for privileged roles. 4. If any account compromised: lock it (`users.lock`), invalidate sessions, review `audit.list` for its actions, open a finding. 5. Consider temporarily lowering edge `auth` rate.

## Locked-out Primary Super Admin / lost MFA
No API path exists by design (PROTECTED_USER). Recovery is a controlled DB/ops procedure owned by Account 1 (document it in `apps/api/src/auth/README.md`); require two-person approval and write an audit entry.

## Security incident (suspected breach)
Contain (rotate secrets, block, lock accounts) -> preserve evidence (logs, DB snapshot, audit; do not delete) -> assess data exposure per tenant -> involve legal (`legal-questions.md` #6) -> notify per their guidance -> postmortem.

## Common commands
```
$DC logs -f --tail=100 api worker proxy
bash scripts/deploy.sh production <sha> | rollback
bash scripts/backup-postgres.sh && bash scripts/restore-test.sh
bash scripts/harden-check.sh --env infrastructure/env/.env.production --url https://<domain> --public-host <domain> --docker
bash scripts/smoke-test.sh https://<domain>
```
