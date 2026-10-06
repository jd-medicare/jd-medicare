#!/usr/bin/env bash
# Post-deploy smoke test (no credentials needed). usage: smoke-test.sh https://app.example.com
set -uo pipefail
BASE="${1:?base url}"; BASE="${BASE%/}"; fails=0
ok(){ echo "PASS  $*"; }; bad(){ echo "FAIL  $*"; fails=$((fails+1)); }
curl_(){ curl -sS --max-time 15 "$@"; }

code=$(curl_ -o /dev/null -w '%{http_code}' "$BASE/live");                     [ "$code" = 200 ] && ok "/live 200" || bad "/live -> $code"
code=$(curl_ -o /dev/null -w '%{http_code}' "$BASE/");                         [ "$code" = 200 ] && ok "web index 200" || bad "web index -> $code"
curl_ "$BASE/" | grep -qi '<div id="root"' && ok "SPA root present" || bad "SPA root not found"

hdrs=$(curl_ -D - -o /dev/null "$BASE/api/v1/auth/csrf")
echo "$hdrs" | head -1 | grep -q ' 200' && ok "auth.csrf 200" || bad "auth.csrf not 200"
echo "$hdrs" | grep -qi '^x-request-id:' && ok "X-Request-Id present" || bad "X-Request-Id missing"
echo "$hdrs" | grep -qi '^strict-transport-security:' && ok "HSTS present" || bad "HSTS missing"
echo "$hdrs" | grep -qi '^x-content-type-options: *nosniff' && ok "nosniff present" || bad "nosniff missing"

body=$(curl_ -w '\n%{http_code}' "$BASE/api/v1/auth/me"); code=${body##*$'\n'}
[ "$code" = 401 ] && echo "$body" | grep -q '"UNAUTHENTICATED"' && ok "auth.me anonymous -> 401 UNAUTHENTICATED" || bad "auth.me anonymous -> $code"

if [[ "$BASE" == https://* ]]; then
  h="http://${BASE#https://}"
  loc=$(curl_ -o /dev/null -w '%{http_code} %{redirect_url}' "$h/")
  [[ "$loc" == 301* && "$loc" == *https://* ]] && ok "HTTP redirects to HTTPS" || bad "HTTP redirect wrong: $loc"
fi
code=$(curl_ -o /dev/null -w '%{http_code}' "$BASE/api/docs-json"); [ "$code" != 200 ] && ok "/api/docs-json not public ($code)" || bad "/api/docs-json is PUBLIC"
code=$(curl_ -o /dev/null -w '%{http_code}' "$BASE/ready");         [ "$code" != 200 ] && ok "/ready not public ($code)" || bad "/ready is PUBLIC"
echo; [ $fails -eq 0 ] && echo "SMOKE OK" || { echo "SMOKE FAILED ($fails)"; exit 1; }
