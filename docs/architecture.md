# Architecture (delivery view)

Account 5 owns the *runtime* architecture. Application internals are defined by the shared contract (Part A) and owned by Accounts 1-4 and 6.

```
                    Internet
                       |
              [CDN / WAF  (optional, recommended)]          see tls-cdn-waf.md
                       |  HTTPS (TLS 1.2+)
                 +-----v------+
                 |   proxy    |  nginx: TLS, HSTS, CSP + security headers, edge rate limits,
                 |  (edge net)|  request-id, hides /health /ready /api/docs-json
                 +--+-------+-+
        /api/*      |       |   /
              +-----v--+  +-v------+
              |  api   |  |  web   |   NestJS(Fastify) / static React build (nginx-unprivileged)
              +--+--+--+  +--------+
   +-------------+  +-------------+
   |                              |      internal network (no published ports, no internet)
+--v-------+   +--------+   +-----v----+
| Postgres |   | Redis  |   |  worker  |  BullMQ processors: exports, notifications
+----------+   +--------+   +----+-----+
                                 |
                          +------v------+
                          | S3 (private)|  presigned URLs only; browsers talk to it directly via STORAGE_PUBLIC_ORIGIN
                          +-------------+
   api / worker --OTLP--> otel-collector --> Prometheus --> Alertmanager ;  Sentry for errors
   backups: pg_dump | age | S3 (separate bucket, versioned, object-locked)
```

## Networks (docker-compose.staging.yml)
| Network | Members | Purpose |
|---|---|---|
| `edge` | proxy | the only thing with published ports (80/443) |
| `internal` (`internal: true`) | everything | no route to the internet or host |
| `egress` | api, worker, collector, alertmanager | outbound only (SMTP, Sentry, webhooks) |

Postgres, Redis and MinIO are on `internal` only. Nothing but the proxy publishes a port.

## Images
`app-web`, `app-api`, `app-worker` (= api image, `dist/worker.js`), `app-migrate` (api image + `prisma migrate deploy`). Multi-stage, Node 20 slim / nginx-unprivileged, non-root, tini as PID 1, read-only root filesystem and `cap_drop: ALL` at runtime, healthchecks, tags are the git SHA (never `latest`), SBOM + provenance attached and signed with cosign in CD.

## Request path guarantees
- The proxy generates `X-Request-Id`; API echoes it in every response and in error bodies.
- `X-Forwarded-For` is overwritten, not appended (no client spoofing). API must set `TRUST_PROXY` to the hop count.
- API responses get `Cache-Control: no-store`.
- Uploads never pass through the API: `files.uploadUrl` returns a presigned PUT URL (proxy body limit is 1 MB).
