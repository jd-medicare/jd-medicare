# .github/ (Account 5)
Endpoints implemented: none. Workflows: `ci.yml` (PR/main gates), `cd.yml` (images -> staging -> approval -> production, rollback). Reusable `actions/setup`. `dependabot.yml`, `CODEOWNERS` (replace `@org/*`).
## Env / secrets
Environment secrets: `DEPLOY_HOST DEPLOY_USER DEPLOY_SSH_KEY DEPLOY_KNOWN_HOSTS E2E_SUPERADMIN_EMAIL E2E_SUPERADMIN_PASSWORD E2E_SUPERADMIN_TOTP_SECRET E2E_ORG2_ADMIN_EMAIL E2E_ORG2_ADMIN_PASSWORD E2E_CI_BYPASS_TOKEN`; variable `BASE_URL`; GitHub `production` environment must have required reviewers (this is the manual approval gate).
## ASSUMPTIONS
Registry is GHCR; deployment target is an SSH-reachable Docker host at `/opt/app`; every package defines `typecheck/lint/test` scripts.
