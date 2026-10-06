#!/usr/bin/env bash
# CI helper: sync infra files to the host and run scripts/deploy.sh there.
# usage: ci-remote-deploy.sh <staging|production> <tag|rollback>
# env: SSH_KEY KNOWN_HOSTS HOST USER_
set -euo pipefail
ENVNAME="${1:?env}"; ARG="${2:?tag|rollback}"
: "${SSH_KEY:?}" "${KNOWN_HOSTS:?}" "${HOST:?}" "${USER_:?}"
install -m 700 -d ~/.ssh
printf '%s\n' "$SSH_KEY" > ~/.ssh/deploy_key && chmod 600 ~/.ssh/deploy_key
printf '%s\n' "$KNOWN_HOSTS" > ~/.ssh/known_hosts
SSH="ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=yes -o BatchMode=yes"
APP_DIR="/opt/app"
rsync -az --delete -e "$SSH" infrastructure scripts "$USER_@$HOST:$APP_DIR/"
$SSH "$USER_@$HOST" "cd $APP_DIR && bash scripts/deploy.sh $ENVNAME $ARG"
