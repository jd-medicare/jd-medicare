#!/usr/bin/env bash
# Proves backups are restorable. Downloads the latest daily backup, verifies checksum, decrypts, restores into a
# throwaway Postgres container, runs sanity queries, reports measured RPO (backup age) and RTO (duration). Run weekly on a DR/test host.
# Needs: docker, aws cli, age. Config: infrastructure/env/.env.backup (incl. BACKUP_AGE_IDENTITY_FILE)
set -euo pipefail
umask 077
ENV_FILE="${BACKUP_ENV_FILE:-infrastructure/env/.env.backup}"; set -a; . "$ENV_FILE"; set +a
: "${BACKUP_S3_BUCKET:?}" "${BACKUP_AGE_IDENTITY_FILE:?}"
PREFIX="${BACKUP_S3_PREFIX:-postgres}"; MAXH="${RESTORE_MAX_BACKUP_AGE_HOURS:-26}"; RTO_T="${RESTORE_RTO_TARGET_MINUTES:-60}"
AWS=(aws); [ -n "${BACKUP_S3_ENDPOINT:-}" ] && AWS+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
TMP="$(mktemp -d)"; CN="restore-test-$$"
cleanup(){ docker rm -f "$CN" >/dev/null 2>&1 || true; rm -rf "$TMP"; }; trap cleanup EXIT
start=$(date +%s); fails=0
chk(){ if [ "$1" = ok ]; then echo "PASS  $2"; else echo "FAIL  $2"; fails=$((fails+1)); fi; }

latest=$("${AWS[@]}" s3 ls "s3://$BACKUP_S3_BUCKET/$PREFIX/daily/" | awk '{print $4}' | grep -E '\.dump\.age$' | sort | tail -1)
[ -n "$latest" ] || { echo "FAIL no backups found"; exit 1; }
stamp=${latest#db-}; stamp=${stamp%%.dump.age}
epoch=$(date -u -d "${stamp:0:4}-${stamp:4:2}-${stamp:6:2} ${stamp:9:2}:${stamp:11:2}:${stamp:13:2}" +%s)
age_h=$(( ( $(date +%s) - epoch ) / 3600 ))
[ "$age_h" -le "$MAXH" ] && chk ok "latest backup $latest is ${age_h}h old (RPO observed; limit ${MAXH}h)" || chk bad "latest backup is ${age_h}h old (> ${MAXH}h)"

"${AWS[@]}" s3 cp "s3://$BACKUP_S3_BUCKET/$PREFIX/daily/$latest" "$TMP/b.age" --only-show-errors
"${AWS[@]}" s3 cp "s3://$BACKUP_S3_BUCKET/$PREFIX/daily/$latest.json" "$TMP/b.json" --only-show-errors
want=$(sed -E 's/.*"sha256":"([a-f0-9]+)".*/\1/' "$TMP/b.json"); got=$(sha256sum "$TMP/b.age" | cut -d' ' -f1)
[ "$want" = "$got" ] && chk ok "checksum matches manifest" || chk bad "checksum mismatch"

age -d -i "$BACKUP_AGE_IDENTITY_FILE" < "$TMP/b.age" > "$TMP/b.dump" && chk ok "decryption" || { chk bad "decryption"; exit 1; }

docker run -d --name "$CN" -e POSTGRES_PASSWORD="$(openssl rand -hex 16)" postgres:16-alpine >/dev/null
for i in $(seq 1 60); do docker exec "$CN" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
if docker exec -i "$CN" pg_restore -U postgres -d postgres --no-owner --no-privileges --exit-on-error < "$TMP/b.dump"; then chk ok "pg_restore completed without errors"; else chk bad "pg_restore failed"; fi
q(){ docker exec "$CN" psql -U postgres -d postgres -Atc "$1"; }
n=$(q "select count(*) from information_schema.tables where table_schema='public'"); [ "$n" -gt 0 ] && chk ok "$n tables restored" || chk bad "no tables restored"
for t in ${RESTORE_EXPECT_TABLES:-users organizations}; do c=$(q "select count(*) from \"$t\"" 2>/dev/null || echo ERR); [[ "$c" =~ ^[0-9]+$ ]] && [ "$c" -gt 0 ] && chk ok "table $t has $c rows" || chk bad "table $t missing or empty ($c)"; done
[ "$(q "select to_regclass('public._prisma_migrations') is not null")" = t ] && chk ok "_prisma_migrations present" || chk bad "_prisma_migrations missing"
inv=$(q "select count(*) from pg_index where not indisvalid"); [ "$inv" = 0 ] && chk ok "no invalid indexes" || chk bad "$inv invalid indexes"

dur=$(( $(date +%s) - start )); mins=$(( dur / 60 ))
echo "Measured RTO for restore step: ${dur}s (target ${RTO_T} min). Observed RPO: backup age ${age_h}h."
[ "$mins" -le "$RTO_T" ] && chk ok "within RTO target" || chk bad "exceeds RTO target"
if [ -n "${BACKUP_TEXTFILE_DIR:-}" ] && [ -d "${BACKUP_TEXTFILE_DIR}" ] && [ $fails -eq 0 ]; then
  { echo "restore_test_last_success_timestamp_seconds $(date +%s)"; echo "restore_test_duration_seconds $dur"; } > "$BACKUP_TEXTFILE_DIR/pg_restore_test.prom"
fi
[ $fails -eq 0 ] && echo "RESTORE TEST OK" || { echo "RESTORE TEST FAILED ($fails)"; exit 1; }
