#!/usr/bin/env bash
# Encrypted PostgreSQL backup -> private versioned S3 bucket. Run daily (cron/systemd) and before each deploy.
# Needs: pg_dump (or docker + BACKUP_DOCKER_NETWORK), age, aws cli. Config: infrastructure/env/.env.backup
set -euo pipefail
umask 077
ENV_FILE="${BACKUP_ENV_FILE:-infrastructure/env/.env.backup}"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE" >&2; exit 2; }
set -a; . "$ENV_FILE"; set +a
: "${BACKUP_DATABASE_URL:?}" "${BACKUP_S3_BUCKET:?}" "${BACKUP_AGE_RECIPIENTS:?}"
case "$BACKUP_AGE_RECIPIENTS" in *SET_ME*) echo "BACKUP_AGE_RECIPIENTS not configured" >&2; exit 2;; esac
PREFIX="${BACKUP_S3_PREFIX:-postgres}"
AWS=(aws); [ -n "${BACKUP_S3_ENDPOINT:-}" ] && AWS+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
TMP="$(mktemp -d "${BACKUP_TMPDIR:-/tmp}/pgbackup.XXXXXX")"; trap 'rm -rf "$TMP"' EXIT
ts="$(date -u +%Y%m%dT%H%M%SZ)"; dow="$(date -u +%u)"; dom="$(date -u +%d)"
name="db-$ts.dump.age"
args=(); for r in $BACKUP_AGE_RECIPIENTS; do args+=(-r "$r"); done

if command -v pg_dump >/dev/null && [ -z "${BACKUP_DOCKER_NETWORK:-}" ]; then
  DUMP=(pg_dump)
else
  DUMP=(docker run --rm -i --network "${BACKUP_DOCKER_NETWORK:?need pg_dump or BACKUP_DOCKER_NETWORK}" postgres:16-alpine pg_dump)
fi
echo ">> dumping"; start=$(date +%s)
"${DUMP[@]}" --format=custom --compress=6 --no-owner --no-privileges --dbname "$BACKUP_DATABASE_URL" | age "${args[@]}" > "$TMP/$name"
[ -s "$TMP/$name" ] || { echo "empty backup" >&2; exit 3; }
sha="$(sha256sum "$TMP/$name" | cut -d' ' -f1)"; size="$(stat -c %s "$TMP/$name")"
printf '{"file":"%s","sha256":"%s","sizeBytes":%s,"createdAt":"%s","tookSeconds":%s,"dumpFormat":"pg_dump custom","encrypted":"age"}\n' \
  "$name" "$sha" "$size" "$ts" "$(( $(date +%s) - start ))" > "$TMP/$name.json"

put() { "${AWS[@]}" s3 cp "$TMP/$name" "s3://$BACKUP_S3_BUCKET/$PREFIX/$1/$name" --sse AES256 --only-show-errors \
        && "${AWS[@]}" s3 cp "$TMP/$name.json" "s3://$BACKUP_S3_BUCKET/$PREFIX/$1/$name.json" --sse AES256 --only-show-errors; }
put daily
[ "$dow" = 7 ]  && put weekly  || true
[ "$dom" = 01 ] && put monthly || true
# verify the upload (size + existence)
remote=$("${AWS[@]}" s3api head-object --bucket "$BACKUP_S3_BUCKET" --key "$PREFIX/daily/$name" --query ContentLength --output text)
[ "$remote" = "$size" ] || { echo "upload size mismatch ($remote != $size)" >&2; exit 4; }
echo ">> OK $name ($size bytes, sha256 $sha)"
if [ -n "${BACKUP_TEXTFILE_DIR:-}" ] && [ -d "$BACKUP_TEXTFILE_DIR" ]; then
  { echo "backup_last_success_timestamp_seconds $(date +%s)"; echo "backup_last_size_bytes $size"; } > "$BACKUP_TEXTFILE_DIR/pg_backup.prom.$$" && mv "$BACKUP_TEXTFILE_DIR/pg_backup.prom.$$" "$BACKUP_TEXTFILE_DIR/pg_backup.prom"
fi
