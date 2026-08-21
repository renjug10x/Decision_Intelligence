#!/usr/bin/env bash
# Remote deploy script — runs on the private app EC2 via CI (sudo).
# Pulls ECR images and recreates app services. Never runs docker compose down -v.

set -euo pipefail

DEPLOY_DIR="${1:?DEPLOY_DIR required}"
ECR_REGISTRY="${2:?ECR_REGISTRY required}"
ECR_PASSWORD="${3:?ECR_PASSWORD required}"
HEALTH_CHECK_DELAY="${4:-30}"
COMMIT_SHA="${5:?COMMIT_SHA required}"
COMMIT_BRANCH="${6:?COMMIT_BRANCH required}"

REPORT_DIR="${DEPLOY_DIR}/deploy-reports"
mkdir -p "${REPORT_DIR}"

log() { echo "[ci-deploy] $*"; }

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "ERROR: docker compose not available on host"
  exit 1
fi

compose() {
  local args=(--env-file "${DEPLOY_DIR}/.env.images" -f "${DEPLOY_DIR}/docker-compose.yml")
  if [[ -f "${DEPLOY_DIR}/.env" ]]; then
    args=(--env-file "${DEPLOY_DIR}/.env" "${args[@]}")
  fi
  ${COMPOSE} "${args[@]}" "$@"
}

log "Logging into ECR ${ECR_REGISTRY}..."
echo "${ECR_PASSWORD}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

cd "${DEPLOY_DIR}"

if [[ ! -f .env.images ]]; then
  echo "ERROR: ${DEPLOY_DIR}/.env.images missing"
  exit 1
fi

if [[ ! -f .env ]]; then
  log "WARNING: ${DEPLOY_DIR}/.env is missing — create it with AUTH_API_URL and GEMINI_API_KEY (see .env.example)."
fi

# shellcheck disable=SC1091
set -a
source .env.images
if [[ -f .env ]]; then
  source .env
fi
set +a

# Governed server-side GenAI routes read GEMINI_API_KEY from this environment and never from a
# request (ADR-044, ADR-049). Absent, they fail closed rather than fabricating, so this warns and
# does not block — but the Atlas market-research and interpretation layers are inert without it,
# and the platform-setup UI key does NOT substitute for it (ADR-044 Amendment A).
if [[ -z "${GEMINI_API_KEY:-}" ]]; then
  log "WARNING: GEMINI_API_KEY is not set in ${DEPLOY_DIR}/.env — governed GenAI routes (decision-context drafting, Atlas grounded research and interpretation) will refuse rather than generate."
fi

: "${DI_NEXTJS_IMAGE:?DI_NEXTJS_IMAGE not set in .env.images}"
: "${DI_NGINX_IMAGE:?DI_NGINX_IMAGE not set in .env.images}"

DI_HTTP_PORT="${DI_HTTP_PORT:-8080}"

log "Pulling images..."
compose pull nextjs-app nginx-proxy

log "Recreating nextjs-app..."
compose up -d --force-recreate nextjs-app

log "Waiting for nextjs-app health (${HEALTH_CHECK_DELAY}s)..."
sleep "${HEALTH_CHECK_DELAY}"

log "Recreating nginx-proxy on host port ${DI_HTTP_PORT} (host nginx → 127.0.0.1:${DI_HTTP_PORT})..."
compose up -d --force-recreate nginx-proxy

log "Compose status:"
compose ps

if ! docker ps --format '{{.Names}}' | grep -qx 'nginx-proxy'; then
  echo "ERROR: nginx-proxy is not running."
  compose logs --tail=80 nginx-proxy || true
  exit 1
fi

log "Checking internal health via nextjs-app..."
if docker exec nextjs-app wget --no-verbose --tries=3 --spider http://localhost:3000/api/health; then
  log "nextjs-app health check passed."
else
  echo "ERROR: nextjs-app health check failed."
  compose logs --tail=50 nextjs-app || true
  exit 1
fi

log "Checking nginx → app on port ${DI_HTTP_PORT}..."
if curl -sf "http://127.0.0.1:${DI_HTTP_PORT}/api/health" >/dev/null; then
  log "nginx proxy health check passed on :${DI_HTTP_PORT}."
else
  echo "ERROR: nginx not reachable on http://127.0.0.1:${DI_HTTP_PORT}/api/health"
  compose logs --tail=80 nginx-proxy || true
  exit 1
fi

DEPLOY_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
{
  echo "DEPLOY_TIME_UTC=${DEPLOY_TIME}"
  echo "COMMIT_SHA=${COMMIT_SHA}"
  echo "COMMIT_BRANCH=${COMMIT_BRANCH}"
  echo "DI_NEXTJS_IMAGE=${DI_NEXTJS_IMAGE}"
  echo "DI_NGINX_IMAGE=${DI_NGINX_IMAGE}"
  echo "DI_HTTP_PORT=${DI_HTTP_PORT}"
} > "${REPORT_DIR}/deploy.env"

log "Deploy complete — ${COMMIT_SHA} on ${COMMIT_BRANCH}."
log "Host nginx should proxy di.glassx.ai → http://127.0.0.1:${DI_HTTP_PORT}"
