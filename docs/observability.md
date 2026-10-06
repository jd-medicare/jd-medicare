# Observability
**Logs**: apps write structured JSON to stdout (pino): `time, level, msg, requestId, userId, organizationId, route, status, durationMs`. Redact `authorization`, `cookie`, `set-cookie`, `x-csrf-token`, `password`, `newPassword`, `token`, `code`, and customer PII (`dateOfBirth`, `address`). Docker json-file driver rotates (20 MB x 5); ship to your log platform with a collector of choice. Every log line for a request carries the same `requestId` returned in `X-Request-Id` and in error bodies.

**Metrics + traces**: OpenTelemetry SDK in api and worker, OTLP/HTTP to `otel-collector` (`OTEL_EXPORTER_OTLP_ENDPOINT`). No `/metrics` route is added to the API (the registry is closed). Collector exposes Prometheus metrics on :8889; traces forward to `OTLP_TRACES_ENDPOINT`. Collector scrubs auth headers and hashes `db.statement`.

**Errors**: Sentry (`SENTRY_DSN`), `beforeSend` must strip request bodies/cookies/PII.

**Alerts** (`infrastructure/observability/alert-rules.yml`, 16 rules): ApiDown, CertificateExpiringSoon, PostgresDown, RedisDown, High5xxRate, HighLatencyP95, LoginFailureSpike, RateLimitSpike, AccountLockSpike, ForbiddenSpike, QueueBacklog, FailedJobs, BackupStale, RestoreTestStale, DiskFillingUp, PostgresConnectionsHigh. Each has a runbook anchor in `operations-runbook.md`.

**Metrics the apps must emit** (assumed names; reconcile at merge, see `infrastructure/CHANGE_REQUESTS.md`): `http_server_request_duration_seconds` (OTel HTTP semconv), `app_auth_login_total{outcome}`, `app_rate_limited_total`, `app_queue_jobs{queue,state}`. Exporters needed in compose for the db/redis/host/cert alerts: postgres-exporter, redis-exporter, node-exporter (with textfile collector for backup metrics), blackbox-exporter. **Not yet added to the compose file.**

**Audit vs logs**: audit events (A11 names) live in PostgreSQL and are never deleted; logs are operational and expire.
