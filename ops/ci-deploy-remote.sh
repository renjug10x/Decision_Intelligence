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

log "Logging into ECR ${ECR_REGISTRY}..."
echo "${ECR_PASSWORD}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

cd "${DEPLOY_DIR}"

if [[ ! -f .env.images ]]; then
  echo "ERROR: ${DEPLOY_DIR}/.env.images missing"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source .env.images
set +a

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
else
  log "WARNING: ${DEPLOY_DIR}/.env is missing — GEMINI_API_KEY may be unset."
fi

: "${DI_NEXTJS_IMAGE:?DI_NEXTJS_IMAGE not set in .env.images}"
: "${DI_NGINX_IMAGE:?DI_NGINX_IMAGE not set in .env.images}"

log "Pulling images..."
${COMPOSE} -f docker-compose.yml pull nextjs-app nginx-proxy

log "Recreating application services (no volume teardown)..."
${COMPOSE} -f docker-compose.yml up -d --force-recreate --no-deps nextjs-app
log "Waiting for nextjs-app health (${HEALTH_CHECK_DELAY}s)..."
sleep "${HEALTH_CHECK_DELAY}"
${COMPOSE} -f docker-compose.yml up -d --force-recreate --no-deps nginx-proxy

# Ensure certbot stays running (idempotent if image unchanged).
${COMPOSE} -f docker-compose.yml up -d certbot

log "Compose status:"
${COMPOSE} -f docker-compose.yml ps

log "Checking internal health via nextjs-app..."
if docker exec nextjs-app wget --no-verbose --tries=3 --spider http://localhost:3000/api/health; then
  log "nextjs-app health check passed."
else
  echo "ERROR: nextjs-app health check failed."
  ${COMPOSE} -f docker-compose.yml logs --tail=50 nextjs-app || true
  exit 1
fi

DEPLOY_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
{
  echo "DEPLOY_TIME_UTC=${DEPLOY_TIME}"
  echo "COMMIT_SHA=${COMMIT_SHA}"
  echo "COMMIT_BRANCH=${COMMIT_BRANCH}"
  echo "DI_NEXTJS_IMAGE=${DI_NEXTJS_IMAGE}"
  echo "DI_NGINX_IMAGE=${DI_NGINX_IMAGE}"
} > "${REPORT_DIR}/deploy.env"

log "Deploy complete — ${COMMIT_SHA} on ${COMMIT_BRANCH}."
