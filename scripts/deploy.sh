#!/usr/bin/env bash
# Runs ON the host in /opt/app.   usage: deploy.sh <staging|production> <tag|rollback>
# Expects /opt/app/infrastructure/env/.env.<env> (created once by an operator; never in git).
# Rollback strategy: the previous image tag is kept in .previous-tag; migrations MUST be backward compatible
# (expand/contract) so the previous version keeps working against the new schema. See docs/deployment.md.
set -euo pipefail
ENVNAME="${1:?env}"; ARG="${2:?tag|rollback}"
cd "$(dirname "$0")/.."
STATE=".state-$ENVNAME"; mkdir -p "$STATE"
ENV_FILE="$PWD/infrastructure/env/.env.$ENVNAME"
[ -f "$ENV_FILE" ] || { echo "missing $ENV_FILE"; exit 2; }
set -a; . "$ENV_FILE"; set +a
export ENV_FILE REGISTRY="${REGISTRY:?REGISTRY must be set in env file}"
DC=(docker compose -f infrastructure/compose/docker-compose.staging.yml --env-file "$ENV_FILE")
PROFILES=(); [ "${BUNDLED_DATA:-false}" = "true" ] && PROFILES=(--profile bundled-data)
[ "${OBSERVABILITY:-false}" = "true" ] && PROFILES+=(--profile observability)

current="$(cat "$STATE/current-tag" 2>/dev/null || true)"
if [ "$ARG" = "rollback" ]; then
  TAG="$(cat "$STATE/previous-tag" 2>/dev/null || true)"
  [ -n "$TAG" ] || { echo "no previous tag recorded"; exit 3; }
  echo ">> ROLLBACK $ENVNAME to $TAG (migrations are NOT reverted)"
else TAG="$ARG"; fi
export IMAGE_TAG="$TAG"

wait_healthy() { # service timeout
  local s="$1" t="${2:-120}" i=0 cid st
  while [ "$i" -lt "$t" ]; do
    cid="$("${DC[@]}" "${PROFILES[@]}" ps -q "$s" 2>/dev/null || true)"
    if [ -n "$cid" ]; then
      st="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
      case "$st" in healthy|running) return 0 ;; esac   # 'running' only when the image defines no healthcheck
    fi
    sleep 2; i=$((i+2))
  done
  echo "service $s not healthy after ${t}s"; return 1
}

echo ">> pulling images for $TAG"; "${DC[@]}" "${PROFILES[@]}" pull
echo ">> starting data services"; "${DC[@]}" "${PROFILES[@]}" up -d redis $( [ "${BUNDLED_DATA:-false}" = "true" ] && echo postgres minio )
wait_healthy redis 60
[ "${BUNDLED_DATA:-false}" = "true" ] && wait_healthy postgres 90

if [ "$ARG" != "rollback" ]; then
  echo ">> pre-deploy backup"; bash scripts/backup-postgres.sh || { echo "backup failed; aborting deploy"; exit 4; }
  echo ">> migrations"; "${DC[@]}" "${PROFILES[@]}" --profile migrate run --rm migrate
fi

echo ">> rolling services"
if ! "${DC[@]}" "${PROFILES[@]}" up -d --remove-orphans web api worker proxy || ! wait_healthy api 120; then
  echo "!! deploy of $TAG failed"
  if [ "$ARG" != "rollback" ] && [ -n "$current" ]; then
    echo "!! auto rollback to $current"; export IMAGE_TAG="$current"
    "${DC[@]}" "${PROFILES[@]}" up -d --remove-orphans web api worker proxy || true
  fi
  exit 1
fi
if [ "$ARG" != "rollback" ]; then echo "$current" > "$STATE/previous-tag"; echo "$TAG" > "$STATE/current-tag"; else echo "$TAG" > "$STATE/current-tag"; fi
echo ">> deployed $TAG to $ENVNAME"
