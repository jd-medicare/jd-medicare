# CHANGE_REQUESTS (infrastructure)
- Account 1/2/3: `apps/api` must emit `dist/main.js` (HTTP) and `dist/worker.js` (BullMQ processors, Account 3 jobs); `prisma` as a production dependency; `TRUST_PROXY`, `COOKIE_*`, `CORS_ALLOWED_ORIGINS` honoured; pino JSON logs with requestId + redaction; OTel SDK; metric names per docs/observability.md.
- Account 1: list the env variables actually read in `apps/api/src/*/README.md` so the examples can be reconciled.
- Account 6: `StorageService` presigned URLs must use `S3_ENDPOINT`/`STORAGE_PUBLIC_ORIGIN`; integrations must not make unreviewed outbound calls (SSRF review).
- Account 4: build output `apps/web/dist`; no API base URL baked in.
- Integrator: add `tests` to `pnpm-workspace.yaml`; merge root package.json.
