#!/usr/bin/env bash
# Deploy TechHind Solar Web (Next.js) to the Proxmox LXC VPS.
# PM2 process techhind-solar-web on 127.0.0.1:3000. Host/LXC Caddy terminates TLS.
# Usage: ./deploy/vps/deploy.sh [user@host]
# Env:
#   SKIP_ENV_SYNC=1 — never overwrite remote .env* (used by GitHub Actions)
#   VULTR_SSH_PORT / TECHHIND_SSH_PORT — SSH port (default 20130)
# Build runs on the VPS so NEXT_PUBLIC_* come from remote .env.production / .env.local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE="${1:-${TECHHIND_SSH:-root@135.125.222.22}}"
APP_ROOT="/opt/techhind-solar/web"
SSH_PORT="${VULTR_SSH_PORT:-${TECHHIND_SSH_PORT:-20130}}"
SSH=(ssh -p "${SSH_PORT}" -o StrictHostKeyChecking=accept-new)
export RSYNC_RSH="ssh -p ${SSH_PORT} -o StrictHostKeyChecking=accept-new"

echo "==> Deploy target: ${REMOTE} (port ${SSH_PORT})"
echo "==> Local repo: ${ROOT}"
echo "==> Remote path: ${APP_ROOT}"

"${SSH[@]}" "${REMOTE}" "mkdir -p ${APP_ROOT}"

echo "==> Rsync web (preserve remote .env* and skip local .next)"
# Exit 24 = some files vanished mid-transfer (harmless under concurrent deploys).
set +e
rsync -az --delete \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.git/' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '.env*.local' \
  --exclude 'e2e/' \
  --exclude '.DS_Store' \
  --exclude 'ai-context/' \
  --exclude '.cursor/' \
  --exclude '.agents/' \
  "${ROOT}/" "${REMOTE}:${APP_ROOT}/"
RSYNC_EC=$?
set -e
if [[ "${RSYNC_EC}" -ne 0 && "${RSYNC_EC}" -ne 24 ]]; then
  echo "ERROR: rsync failed with exit ${RSYNC_EC}"
  exit "${RSYNC_EC}"
fi
if [[ "${RSYNC_EC}" -eq 24 ]]; then
  echo "WARN: rsync exit 24 (vanished files) — continuing"
fi

if [[ "${SKIP_ENV_SYNC:-0}" == "1" ]]; then
  echo "==> SKIP_ENV_SYNC=1 — remote .env* left unchanged"
elif [[ -f "${ROOT}/.env.production" ]]; then
  echo "==> Sync .env.production → remote"
  rsync -az "${ROOT}/.env.production" "${REMOTE}:${APP_ROOT}/.env.production"
  "${SSH[@]}" "${REMOTE}" "chmod 600 ${APP_ROOT}/.env.production"
else
  echo "WARN: no local .env.production — remote .env* left unchanged"
fi

echo "==> npm ci + build + pm2 restart"
"${SSH[@]}" "${REMOTE}" bash -s <<EOF
set -euo pipefail
cd ${APP_ROOT}
if [[ ! -f .env.production && ! -f .env.local ]]; then
  echo "ERROR: missing ${APP_ROOT}/.env.production (or .env.local) — create once on VPS with NEXT_PUBLIC_API_BASE_URL and NEXT_PUBLIC_SITE_URL"
  exit 1
fi
npm ci
npm run build
if pm2 describe techhind-solar-web >/dev/null 2>&1; then
  pm2 restart techhind-solar-web --update-env
else
  cd ${APP_ROOT}
  NODE_ENV=production pm2 start node_modules/next/dist/bin/next --name techhind-solar-web --max-memory-restart 800M -- start -H 127.0.0.1 -p 3000
  pm2 save
fi
pm2 show techhind-solar-web | head -n 25
EOF

echo "==> Deploy complete"
