# Security overview (what exists, where, and who verifies it)
This is an engineering description, **not a compliance statement**. This project makes **no claim of HIPAA, GDPR, PCI-DSS or any other certification/compliance**; see `legal-questions.md`.

| Control | Implemented by | Verified by |
|---|---|---|
| Server-side sessions in Redis, httpOnly/Secure/SameSite cookies, CSRF header, TOTP MFA | Account 1 | `tests/security/03`, `harden-check.sh` |
| AuthZ on every endpoint (permission + tenant + ownership); `organizationId` only from session | Accounts 1-3,6 | `01`, `02`, E2E `04` |
| Primary Super Admin protection (PROTECTED_USER) | Account 1 | `02` |
| Double Accept/Reject prevention (row lock + status check) | Account 2 | E2E `02` concurrency test |
| Audit trail, never deleted | Account 1 | E2E `03` (events present, no passwords) |
| CSV formula-injection protection | Account 3 | `05` |
| TLS 1.2+, HSTS, CSP, nosniff, frame deny, no-store on API | Account 5 proxy | `smoke-test.sh`, `harden-check.sh`, `03` |
| Edge rate limits + app limits | Account 5 + Account 1 | `99-rate-limits` |
| Private network for DB/Redis/S3, non-root read-only containers, cap_drop ALL | Account 5 | `harden-check.sh --docker --public-host` |
| Supply chain: lockfile installs, audit, Trivy, gitleaks, SBOM, cosign, Dependabot | Account 5 | CI |
| Encrypted, versioned, object-locked backups; restore tested weekly | Account 5 | `restore-test.sh`, `BackupStale` alert |

## SSRF review (manual, required)
The registry has no endpoint fetching client-supplied URLs. `apps/api/src/integrations/` (Account 6) is the only place outbound calls may be added. Rule: allow-list hosts, resolve DNS and block private/link-local/metadata ranges, disable redirects, short timeouts. Review before merge.

## Known gaps to track
- `MFA_ENCRYPTION_KEY` rotation has no tooling.
- Edge limiter keys on IP; behind a CDN the real-IP config must be set or all users share one bucket (`tls-cdn-waf.md`).
- No malware scan of uploads, no DLP, no SIEM forwarding (observability covers metrics/errors, not security analytics).
- Hiding Primary Super Admin activity from ordinary users while retaining audit evidence needs a design review (Account 1) so the hiding cannot be abused to conceal actions from the CEO/auditors.
