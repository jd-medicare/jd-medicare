# Environment setup and secrets

Files: `infrastructure/env/.env.{development,staging,production}.example` (+ `.env.backup.example`). Every variable has an inline description.

```
node scripts/init-env.mjs staging      # copies example -> .env.staging, fills GENERATE_ME / __X_PASSWORD__ with random values, mode 600
```
Remaining `SET_ME` values (domains, SMTP, S3 keys, DSNs) must be set by hand. `scripts/harden-check.sh --env <file>` fails while any placeholder or default/weak secret remains.

## Rules
- Real `.env.*` files are git-ignored; CI has secret scanning (gitleaks + Trivy) that fails the build on committed secrets.
- Production secrets should come from a secret manager and be injected as environment at deploy time; the env file is the fallback for single-host setups.
- Use URL-safe passwords (hex) — they are embedded in `DATABASE_URL`/`REDIS_URL`.
- Backup credentials live in a **separate** file; the app never sees them. Backup writer cannot delete (retention by bucket lifecycle).
- Variable names are the proposed set for apps/api. Each module README lists what it actually reads; reconcile at merge (`MERGE_AND_VERIFY.md` step 3).

## Rotation
| Secret | How | Effect |
|---|---|---|
| `SESSION_SECRET`, `CSRF_SECRET` | change + redeploy | all users logged out |
| `MFA_ENCRYPTION_KEY` | **needs a re-encryption job** (not provided); losing it locks every MFA user out | back it up in the secret manager |
| DB / Redis password | change in service, env file, redeploy | brief downtime |
| S3 keys | create new key, deploy, delete old key | none |
| `CI_BYPASS_TOKEN` | change in env file + GitHub secret `E2E_CI_BYPASS_TOKEN` | none |
| Backup age key | add new recipient, keep old identity until old backups expire | none |

## CI-only values (GitHub environment secrets, not in env files)
`E2E_SUPERADMIN_EMAIL/PASSWORD/TOTP_SECRET`, `E2E_ORG2_ADMIN_EMAIL/PASSWORD` (a second tenant, needed for the tenant-isolation test), `E2E_CI_BYPASS_TOKEN`. The E2E super admin should be a dedicated account in a **staging** organization only. Never run the E2E/security suites against production with real data.
