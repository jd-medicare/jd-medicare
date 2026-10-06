# infrastructure/ (Account 5)
Endpoints implemented: none (infra owns no registry keys). Health endpoints `/health /ready /live` are expected from the API at the ROOT; the proxy exposes only `/live` publicly.
Layout: `docker/` (Dockerfile.{web,api,worker}), `compose/` (dev deps, staging/prod single-host), `proxy/` (nginx template + snippets), `env/` (examples), `backup/`, `observability/`.
## Env variables
Read by compose/scripts: `DOMAIN STORAGE_PUBLIC_ORIGIN CI_BYPASS_TOKEN REGISTRY IMAGE_TAG TLS_CERT_DIR BUNDLED_DATA OBSERVABILITY POSTGRES_* REDIS_PASSWORD MINIO_ROOT_*`; the full documented list is in `env/*.example`.
## ASSUMPTIONS
- apps/api builds `dist/main.js` and `dist/worker.js`; `prisma` is a prod dependency of apps/api; web builds to `apps/web/dist` and calls same-origin `/api/v1`.
- Prisma schema is assembled by `scripts/assemble-prisma.mjs`; migrations live in `prisma/migrations` after merge.
- App env variable names in `env/*.example` are proposals; modules may differ.
- Metrics are pushed via OTLP; metric names in `observability/alert-rules.yml` are assumed (see docs/observability.md).
- Not run in this sandbox (no Docker/nginx): configs are YAML/shell syntax-checked only; first real run happens at MERGE_AND_VERIFY step 7-9.
