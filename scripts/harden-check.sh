#!/usr/bin/env bash
# Production hardening verifier. Exit 1 if any FAIL. Safe to run read-only against live systems.
# usage: harden-check.sh --env infrastructure/env/.env.production [--url https://app.example.com] [--public-host app.example.com]
#                        [--backup-env infrastructure/env/.env.backup] [--prometheus http://prometheus:9090] [--docker]
set -uo pipefail
ENVF=""; URL=""; PHOST=""; BENV=""; PROM=""; DOCKER=0
while [ $# -gt 0 ]; do case "$1" in
  --env) ENVF="$2"; shift 2;; --url) URL="${2%/}"; shift 2;; --public-host) PHOST="$2"; shift 2;;
  --backup-env) BENV="$2"; shift 2;; --prometheus) PROM="${2%/}"; shift 2;; --docker) DOCKER=1; shift;;
  *) echo "unknown arg $1"; exit 2;; esac; done
pass=0; fail=0; warn=0
P(){ echo "PASS  $*"; pass=$((pass+1)); }; F(){ echo "FAIL  $*"; fail=$((fail+1)); }; W(){ echo "WARN  $*"; warn=$((warn+1)); }
val(){ grep -E "^$1=" "$2" 2>/dev/null | tail -1 | cut -d= -f2- | sed -E 's/[[:space:]]+#.*$//; s/^"//; s/"$//'; }
WEAK_RE='^(password|postgres|admin|changeme|change_me|minioadmin|secret|123456|redis|test|root|letmein|app)$'

echo "== 1. Environment file =="
if [ -n "$ENVF" ] && [ -f "$ENVF" ]; then
  perm=$(stat -c %a "$ENVF" 2>/dev/null || stat -f %Lp "$ENVF"); [ "${perm: -2}" = "00" ] && P "env file mode $perm" || F "env file mode $perm (want 600)"
  [ "$(val NODE_ENV "$ENVF")" = production ] && P "NODE_ENV=production" || F "NODE_ENV is not production"
  if grep -vE '^\s*#' "$ENVF" | grep -qE 'GENERATE_ME|SET_ME|__[A-Z_]+__|CHANGE_ME'; then F "placeholder tokens remain: $(grep -vE '^\s*#' "$ENVF" | grep -E 'GENERATE_ME|SET_ME|__[A-Z_]+__|CHANGE_ME' | cut -d= -f1 | tr '\n' ' ')"; else P "no placeholder tokens"; fi
  bad=""
  while IFS='=' read -r k v; do
    v="${v%%  #*}"; v="${v%\"}"; v="${v#\"}"
    case "$k" in *PASSWORD|*SECRET|*SECRET_ACCESS_KEY|MFA_ENCRYPTION_KEY)
      [ -z "$v" ] && continue; [ "$v" = unused ] && continue
      if echo "$v" | grep -qiE "$WEAK_RE"; then bad="$bad $k(default)"; elif [ ${#v} -lt 16 ]; then bad="$bad $k(short)"; fi;; esac
  done < <(grep -vE '^\s*#|^\s*$' "$ENVF")
  [ -z "$bad" ] && P "no default/weak passwords or secrets" || F "weak secrets:$bad"
  for k in SESSION_SECRET CSRF_SECRET MFA_ENCRYPTION_KEY DATABASE_URL REDIS_URL; do [ -n "$(val $k "$ENVF")" ] || F "$k is empty"; done
  [ "$(val SESSION_SECRET "$ENVF")" != "$(val CSRF_SECRET "$ENVF")" ] && P "SESSION_SECRET and CSRF_SECRET differ" || F "SESSION_SECRET equals CSRF_SECRET"
  [ "$(val COOKIE_SECURE "$ENVF")" = true ] && P "COOKIE_SECURE=true" || F "COOKIE_SECURE must be true"
  case "$(val COOKIE_SAMESITE "$ENVF")" in Lax|Strict) P "COOKIE_SAMESITE=$(val COOKIE_SAMESITE "$ENVF")";; *) F "COOKIE_SAMESITE must be Lax or Strict";; esac
  [ -z "$(val COOKIE_DOMAIN "$ENVF")" ] && P "COOKIE_DOMAIN empty (host-only cookie)" || W "COOKIE_DOMAIN set: confirm subdomain sharing was reviewed"
  cors="$(val CORS_ALLOWED_ORIGINS "$ENVF")"
  if echo "$cors" | grep -q '\*'; then F "CORS contains wildcard"; elif echo "$cors" | grep -qE 'http://'; then F "CORS contains http:// origin"; elif [ -z "$cors" ]; then F "CORS_ALLOWED_ORIGINS empty"; else P "CORS restricted to: $cors"; fi
  [[ "$(val APP_ORIGIN "$ENVF")" == https://* ]] && P "APP_ORIGIN is https" || F "APP_ORIGIN not https"
  tp="$(val TRUST_PROXY "$ENVF")"; [ "${tp:-0}" -ge 1 ] 2>/dev/null && P "TRUST_PROXY=$tp" || F "TRUST_PROXY must be >=1 behind the proxy"
  db="$(val DATABASE_URL "$ENVF")"; dbhost=$(echo "$db" | sed -E 's#^[a-z]+://[^@]*@([^:/?]+).*#\1#')
  if [ "$dbhost" = postgres ] || [ "$dbhost" = localhost ]; then P "DB on private network ($dbhost)"; echo "$db" | grep -q 'sslmode=' && P "DB sslmode set" || W "DB sslmode not set (ok only on private compose network)"
  else echo "$db" | grep -qE 'sslmode=(require|verify-ca|verify-full)' && P "external DB requires TLS" || F "external DB without sslmode=require"; fi
  case "$(val MFA_ENFORCED_ROLES "$ENVF")" in *ADMIN*) P "MFA enforced for ADMIN";; *) F "MFA_ENFORCED_ROLES must include ADMIN";; esac
  [ "$(val LOG_LEVEL "$ENVF")" = debug ] || [ "$(val LOG_LEVEL "$ENVF")" = trace ] && F "LOG_LEVEL too verbose for production" || P "LOG_LEVEL ok"
  [ -n "$(val SENTRY_DSN "$ENVF")" ] && P "error monitoring configured" || W "SENTRY_DSN empty (no error monitoring)"
  [ -n "$(val OTEL_EXPORTER_OTLP_ENDPOINT "$ENVF")" ] && P "OTLP exporter configured" || W "OTEL exporter empty (no traces/metrics)"
else W "no --env file given/found: skipping env checks"; fi

if [ -n "$URL" ]; then
  echo "== 2. Live HTTP(S) =="
  [[ "$URL" == https://* ]] && P "URL is https" || F "URL is not https"
  host="${URL#https://}"; host="${host%%/*}"
  h=$(curl -sS -m 15 -D - -o /dev/null "$URL/api/v1/auth/csrf" 2>/dev/null || true)
  echo "$h" | grep -qi '^strict-transport-security:.*max-age=\(1[5-9][0-9]\{6\}\|[2-9][0-9]\{7,\}\)' && P "HSTS max-age >= 6 months" || F "HSTS missing/too short"
  for hd in x-content-type-options x-frame-options referrer-policy content-security-policy permissions-policy x-request-id; do echo "$h" | grep -qi "^$hd:" && P "header $hd" || F "header $hd missing"; done
  echo "$h" | grep -qiE '^server:.*[0-9]+\.[0-9]+' && F "Server header leaks version" || P "no server version leak"
  echo "$h" | grep -qi '^x-powered-by:' && F "X-Powered-By present" || P "no X-Powered-By"
  sc=$(echo "$h" | grep -i '^set-cookie:' || true)
  if [ -n "$sc" ]; then for a in HttpOnly Secure SameSite; do echo "$sc" | grep -qi "$a" && P "cookie flag $a" || F "cookie flag $a missing"; done; else W "no Set-Cookie on auth.csrf to inspect"; fi
  loc=$(curl -sS -m 15 -o /dev/null -w '%{http_code} %{redirect_url}' "http://$host/" 2>/dev/null); [[ "$loc" == 301*https://* || "$loc" == 308*https://* ]] && P "http redirects to https" || F "http does not redirect to https ($loc)"
  acao=$(curl -sS -m 15 -D - -o /dev/null -H 'Origin: https://evil.example' "$URL/api/v1/auth/csrf" | grep -i '^access-control-allow-origin:' || true)
  [ -z "$acao" ] && P "CORS does not echo evil origin" || F "CORS allows evil origin: $acao"
  for p in /api/docs-json /health /ready; do c=$(curl -sS -m 15 -o /dev/null -w '%{http_code}' "$URL$p"); [ "$c" = 200 ] && F "$p is public" || P "$p not public ($c)"; done
  if curl -sS -m 10 --tlsv1.1 --tls-max 1.1 -o /dev/null "$URL/" 2>/dev/null; then F "TLS 1.1 accepted"; else P "TLS 1.1 rejected"; fi
  if command -v openssl >/dev/null; then
    end=$(echo | openssl s_client -servername "$host" -connect "$host:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
    if [ -n "$end" ]; then days=$(( ( $(date -d "$end" +%s) - $(date +%s) ) / 86400 )); [ "$days" -gt 14 ] && P "certificate valid for $days more days" || F "certificate expires in $days days"; else W "could not read certificate"; fi
  fi
fi

if [ -n "$PHOST" ]; then
  echo "== 3. Private services not reachable from here ($PHOST) =="
  for port in 5432 6379 9000 9001 3000 8080 9090 9093 4317 4318; do
    if timeout 4 bash -c "exec 3<>/dev/tcp/$PHOST/$port" 2>/dev/null; then F "port $port is OPEN"; else P "port $port closed"; fi
  done
  for port in 22; do timeout 4 bash -c "exec 3<>/dev/tcp/$PHOST/$port" 2>/dev/null && W "ssh (22) reachable from here: restrict to a bastion/VPN"; done
fi

if [ $DOCKER -eq 1 ] && command -v docker >/dev/null; then
  echo "== 4. Docker host =="
  exposed=$(docker ps --format '{{.Names}} {{.Ports}}' | grep -E '0\.0\.0\.0:|:::' | grep -vE ':(80|443)->' || true)
  [ -z "$exposed" ] && P "only 80/443 published" || F "unexpected published ports: $exposed"
  for c in $(docker ps --format '{{.Names}}' | grep -E 'api|web|worker'); do
    u=$(docker inspect -f '{{.Config.User}}' "$c"); [ -n "$u" ] && [ "$u" != root ] && [ "$u" != 0 ] && P "$c runs as $u" || F "$c runs as root"
    [ "$(docker inspect -f '{{.HostConfig.Privileged}}' "$c")" = false ] && P "$c not privileged" || F "$c is privileged"
  done
fi

if [ -n "$BENV" ] && [ -f "$BENV" ]; then
  echo "== 5. Backups =="
  grep -qE 'SET_ME|age1SET_ME' "$BENV" && F "backup env has placeholders" || P "backup env configured"
  if command -v aws >/dev/null; then
    set -a; . "$BENV"; set +a
    last=$(aws s3 ls "s3://$BACKUP_S3_BUCKET/${BACKUP_S3_PREFIX:-postgres}/daily/" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"} 2>/dev/null | sort | tail -1 | awk '{print $1" "$2}')
    if [ -n "$last" ]; then age=$(( ( $(date +%s) - $(date -d "$last" +%s) ) / 3600 )); [ "$age" -le 26 ] && P "latest backup ${age}h old" || F "latest backup ${age}h old (>26h)"; else F "no backups found in bucket"; fi
    v=$(aws s3api get-bucket-versioning --bucket "$BACKUP_S3_BUCKET" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"} --query Status --output text 2>/dev/null); [ "$v" = Enabled ] && P "backup bucket versioning enabled" || F "backup bucket versioning not enabled"
  else W "aws cli missing: cannot verify backup freshness"; fi
fi

if [ -n "$PROM" ]; then
  echo "== 6. Monitoring =="
  curl -fsS -m 10 "$PROM/-/ready" >/dev/null 2>&1 && P "prometheus ready" || F "prometheus not ready"
  n=$(curl -fsS -m 10 "$PROM/api/v1/rules" 2>/dev/null | grep -o '"alert"' | wc -l); [ "$n" -ge 5 ] && P "$n alert rules loaded" || F "only $n alert rules loaded"
  t=$(curl -fsS -m 10 "$PROM/api/v1/alerts" 2>/dev/null | grep -o '"state":"firing"' | wc -l); [ "$t" -eq 0 ] && P "no alerts firing" || W "$t alerts firing"
fi
echo; echo "Result: $pass passed, $warn warnings, $fail failed"; [ $fail -eq 0 ]
