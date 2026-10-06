# Development setup
Prereqs: Node 20, pnpm 9 (`corepack enable`), Docker.
```
pnpm install
node scripts/init-env.mjs development
docker compose -f infrastructure/compose/docker-compose.dev.yml --env-file infrastructure/env/.env.development up -d   # postgres, redis, minio(+bucket), mailpit
pnpm prisma:assemble                                      # prisma/schema.base.prisma + fragments -> prisma/schema.prisma
pnpm --filter ./apps/api exec prisma db push --schema ../../prisma/schema.prisma    # local only; never commit migrations (A12)
pnpm --filter ./apps/api dev     &  pnpm --filter ./apps/web dev
```
Dev ports bind to 127.0.0.1 only. Mail appears at http://localhost:8025 (mailpit). MinIO console: http://localhost:9001.

Checks before pushing: `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm check:contract`.
Contract rule: the web app calls the API **only** via `route(key, params)`; `check:contract` fails on hard-coded `/api/v1` strings or unknown keys.

E2E locally (needs the stack running and a seeded Primary Super Admin):
```
cd tests && pnpm install && pnpm exec playwright install chromium
E2E_BASE_URL=http://localhost:5173 E2E_SUPERADMIN_EMAIL=... E2E_SUPERADMIN_PASSWORD=... pnpm test:e2e:smoke
```
