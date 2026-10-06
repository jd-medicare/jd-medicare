# CI/CD reference
| Stage | Where | Gate |
|---|---|---|
| install, typecheck, lint, unit | `ci.yml` | required |
| integration (Postgres, Redis, MinIO services) | `ci.yml` | required |
| `pnpm check:contract:full` | `ci.yml` | required |
| build | `ci.yml` | required |
| dependency scan: `pnpm audit --prod` (high+), Trivy fs (vuln+misconfig+secret), gitleaks | `ci.yml` | required |
| migration validation: validate, apply to empty DB, drift check, destructive-SQL warning | `ci.yml` | required |
| container build + non-root assertion + Trivy image scan (HIGH/CRITICAL) | `ci.yml` | required |
| images: build, push, SBOM, provenance, cosign sign | `cd.yml` | automatic on green `main` |
| staging deploy -> smoke -> E2E -> security suite | `cd.yml` (`staging` env) | automatic |
| production deploy -> smoke | `cd.yml` (`production` env) | **manual approval** (required reviewers) |
| rollback | `cd.yml` (`if: failure()`) + `deploy.sh rollback` | automatic |

Notes
- `pnpm -r --if-present` skips packages lacking a script. At merge, confirm every package defines `typecheck`, `lint`, `test` or the gate is weaker than it looks.
- Actions are pinned to major tags; pin to commit SHAs for production use (Dependabot keeps them current).
- CD runs against the exact commit CI validated (`workflow_run` head SHA). Manual redeploy of an older SHA: *Actions -> CD -> Run workflow*.
- Staging tests use `X-CI-Bypass` so the edge limiter does not throttle test logins; rate-limit tests deliberately omit it.
