# OWASP ASVS (v4.0.3) baseline coverage map
Automated coverage lives in `tests/security`. **Manual / out-of-suite items are listed explicitly**; this map is a test plan, not a certification.

| ASVS area | Automated by | Not automated (manual / other owner) |
|---|---|---|
| V2 Authentication | `03` (no user enumeration, reset token abuse, fixation, brute force `99`) | password policy details, MFA enrol/recovery flows, credential storage hashing (code review, Account 1) |
| V3 Session | `03` (cookie flags, no token in body, logout invalidation, tampered cookie, rotation on login) | idle/absolute timeout (needs time control; verify in staging manually) |
| V4 Access control | `00` (all 60+ protected keys anonymous -> 401), `01` (role matrix default-deny), `02` (IDOR, escalation, protected user), E2E `04` (tenant isolation) | per-field visibility (`dateOfBirth`/`address` null when unauthorized) - add once UI/DTO rules are final |
| V5 Validation / injection / XSS | `04` (SQLi incl. time-based, XSS storage/headers, mass assignment, type confusion, prototype pollution, oversize) | **DOM XSS needs a browser pass against `apps/web`** (React escapes by default; grep for `dangerouslySetInnerHTML`, run ZAP baseline) |
| V8 Data protection | `02`/`05` (no secrets in responses/audit), headers `no-store` | encryption at rest on DB/S3 (infra setting, see production checklist) |
| V9 Communications | `harden-check.sh` (TLS1.1 rejected, HSTS, redirect, cert expiry) | `testssl.sh`/SSL Labs scan after each proxy change |
| V10 Malicious code | CI: Trivy, gitleaks, audit, signed images | dependency pinning review |
| V11 Business logic | E2E `02` (double accept race, transitions, CONFIRM, version conflict) | finance void/edit rules (Account 6 module tests) |
| V12 Files | `05` (MIME/size/name, presigned host, file IDOR) | malware scanning, content sniffing of uploaded bytes (not in contract) |
| V13 API | `00`, `03` (CORS, error shape, no stack traces), `05` (export abuse, CSV injection), `99` (rate limits) | GraphQL N/A; OpenAPI vs controllers via `check:contract:full` |
| V14 Configuration | `harden-check.sh`, `smoke-test.sh`, CI container/misconfig scans | cloud account hardening, WAF rules review |
| SSRF (V12.6 / API7) | `05` (no URL-fetch features in registry; URL inputs inert) | **manual review of `integrations/`** for outbound HTTP |
| Logging (V7) | observability config scrubs auth headers | verify no PII/passwords in logs: grep staging logs after E2E run |

Run order for a full pass: `pnpm test:security` (staging) -> ZAP baseline against the web origin -> manual list above -> file findings with `FINDINGS_TEMPLATE.md`.
