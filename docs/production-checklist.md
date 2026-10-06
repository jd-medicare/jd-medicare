# Production checklist
Automated items: `bash scripts/harden-check.sh --env <file> --url https://<domain> --public-host <domain> --backup-env <file> --prometheus <url> --docker` (exit code 0 required). Manual items below.

## Automated by harden-check.sh
- [ ] No default/weak/placeholder secrets; env file mode 600; `NODE_ENV=production`
- [ ] HTTPS only, HTTP redirects, HSTS >= 6 months, TLS 1.1 rejected, cert > 14 days
- [ ] Cookies HttpOnly + Secure + SameSite; `COOKIE_SECURE=true`; `COOKIE_DOMAIN` empty
- [ ] CORS restricted, https only, evil origin not echoed
- [ ] `/health`, `/ready`, `/api/docs-json` not public
- [ ] Postgres/Redis/MinIO/API/Prometheus ports closed from outside; only 80/443 published; containers non-root, unprivileged
- [ ] Latest backup < 26 h, backup bucket versioned
- [ ] Prometheus ready, >= 5 rules loaded, nothing firing
## Manual
- [ ] Primary Super Admin created, MFA enrolled, credentials in the vault; E2E accounts exist ONLY in staging
- [ ] MFA enforced for PRIMARY_SUPER_ADMIN, ADMIN, CEO (recommended: all roles)
- [ ] DB and S3 encryption at rest enabled; S3 bucket blocks public access; backup bucket Object Lock + no-delete writer
- [ ] Managed Postgres with PITR if RPO < 24 h is required
- [ ] Backup lifecycle applied; restore test passed this week; age identity stored offline
- [ ] WAF in block mode; origin locked to CDN ranges; real-IP config verified (rate limits per user, not per CDN)
- [ ] SSH only via bastion/VPN, key auth, no root login; OS auto-updates; host firewall
- [ ] GitHub: branch protection, `production` environment reviewers, secrets scoped per environment, CODEOWNERS real
- [ ] Alert destinations tested (fire a test alert); on-call defined; runbook read
- [ ] Sentry/log scrubbing verified with a test event containing PII
- [ ] Security suite green on staging; ZAP baseline run; open High/Critical findings = 0
- [ ] `docs/legal-questions.md` answered; privacy notice/DPA in place
- [ ] Load test of list/search/export endpoints at expected peak
- [ ] Rollback rehearsed on staging within the last 30 days
