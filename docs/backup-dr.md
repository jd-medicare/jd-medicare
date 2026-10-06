# Backups and disaster recovery

## Objectives (proposed; confirm with the business and lawyer, see legal-questions.md #11)
| | Target | What delivers it |
|---|---|---|
| **RPO** | 24 h with the shipped scripts (nightly dump) + a dump before every deploy | `backup-postgres.sh` |
| **RPO (recommended for prod)** | <= 5 min | managed Postgres with PITR / WAL archiving (pgBackRest, RDS, Cloud SQL). **Not provided here**; nightly dumps alone cannot meet this. |
| **RTO** | 60 min for the database restore step; 2 h for full service | measured weekly by `restore-test.sh` (target `RESTORE_RTO_TARGET_MINUTES`) |

## What is backed up
- **PostgreSQL**: `pg_dump --format=custom`, piped through `age` (public-key encryption), uploaded with SSE to a **separate** bucket. Manifest with sha256 alongside.
- **Object storage (customer files, exports)**: enable S3 versioning + cross-region replication on the app bucket (managed S3), or `mc mirror` for MinIO. Not scripted.
- **Redis**: not backed up. Sessions are disposable (users log in again); queued export jobs are re-creatable.
- **Secrets / env files / age identity / MFA_ENCRYPTION_KEY**: in the secret manager with its own backup. Without `MFA_ENCRYPTION_KEY` restored data cannot decrypt TOTP secrets.

## Retention (infrastructure/backup/lifecycle.json)
daily 35 days, weekly 12 weeks, monthly 12 months, noncurrent versions 7 days. Apply:
`aws s3api put-bucket-lifecycle-configuration --bucket <backup-bucket> --lifecycle-configuration file://infrastructure/backup/lifecycle.json`
Enable bucket **versioning + Object Lock** (retention <= 35 days minimum) and give the backup writer `PutObject` but no `DeleteObject`, so a compromised app host cannot erase backups. Adjust lifecycle if the legal answer on retention differs.

## Schedule
`infrastructure/backup/crontab.example`: nightly backup on the app host; weekly restore test on a **separate** DR host that holds the age identity. Alerts: `BackupStale` (>26 h), `RestoreTestStale` (>9 d).

## <a id="restore-test"></a>Restore test
`bash scripts/restore-test.sh` downloads the latest daily backup, verifies checksum, decrypts, restores into a throwaway Postgres container with `--exit-on-error`, checks tables/rows/migrations/indexes, and prints observed RPO and measured RTO. Exit code is non-zero on any failure.

## Recovery runbook
1. **Declare** the incident; freeze deploys (disable CD); note time and requestIds.
2. **Contain**: if compromise is suspected, rotate secrets first (`environment-setup.md`), block traffic at the CDN/WAF.
3. **Choose the restore point**: latest `daily/` backup, or an earlier one if corruption predates it. For PITR use the provider's restore-to-time.
4. **Provision** a new Postgres (never overwrite the damaged one until the restored copy is verified).
5. **Restore** on the DR host:
   ```
   aws s3 cp s3://<bucket>/postgres/daily/<file>.dump.age .
   age -d -i /secure/age-identity.txt < <file>.dump.age > restore.dump
   pg_restore --no-owner --no-privileges --exit-on-error -d "<NEW_DATABASE_URL>" restore.dump
   ```
6. **Verify**: row counts for `users`, `organizations`, cases; `_prisma_migrations` matches the deployed release; log in as Primary Super Admin; run `scripts/smoke-test.sh` and `pnpm test:e2e:smoke` against a staging copy first when time allows.
7. **Cut over**: update `DATABASE_URL`, `deploy.sh production <current-tag>`, flush Redis sessions if the DB was rolled back (forces re-login).
8. **Reconcile**: records created after the restore point are lost. Compare with exports/audit/outsource notifications and communicate to the business.
9. **Post-incident**: file a finding/postmortem, update this runbook, schedule an extra restore test.

## <a id="failure"></a>When a backup fails
`backup-postgres.sh` exits non-zero and (during deploy) aborts the release. Check disk space in `BACKUP_TMPDIR`, credentials, bucket policy, age recipient. Re-run manually; the `BackupStale` page fires after 26 h without success.
