#!/usr/bin/env bash
# Remote validation script — runs on the private app EC2 via CI (sudo).
# Checks container health and public /api/health endpoint; writes deployment report.

set -euo pipefail

DEPLOY_DIR="${1:?DEPLOY_DIR required}"
PUBLIC_BASE_URL="${2:?PUBLIC_BASE_URL required}"

REPORT_DIR="${DEPLOY_DIR}/deploy-reports"
mkdir -p "${REPORT_DIR}"

REPORT_FILE="${REPORT_DIR}/deployment-report.md"
HEALTH_URL="${PUBLIC_BASE_URL%/}/api/health"

log() { echo "[ci-validate] $*"; }

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "ERROR: docker compose not available on host"
  exit 1
fi

cd "${DEPLOY_DIR}"

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
fi
DI_HTTP_PORT="${DI_HTTP_PORT:-8080}"

compose() {
  local args=(--env-file .env.images -f docker-compose.yml)
  if [[ -f .env ]]; then
    args=(--env-file .env "${args[@]}")
  fi
  ${COMPOSE} "${args[@]}" "$@"
}

VALIDATE_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DEPLOY_ENV="${REPORT_DIR}/deploy.env"
COMMIT_SHA="unknown"
COMMIT_BRANCH="unknown"
DI_NEXTJS_IMAGE="unknown"
DI_NGINX_IMAGE="unknown"

if [[ -f "${DEPLOY_ENV}" ]]; then
  # shellcheck disable=SC1091
  source "${DEPLOY_ENV}"
fi

log "Compose service status:"
compose ps | tee "${REPORT_DIR}/compose-ps.txt"

CONTAINER_HEALTH="unknown"
if docker inspect --format='{{.State.Health.Status}}' nextjs-app 2>/dev/null; then
  CONTAINER_HEALTH="$(docker inspect --format='{{.State.Health.Status}}' nextjs-app 2>/dev/null || echo unknown)"
fi

NGINX_HEALTH="unknown"
if docker inspect --format='{{.State.Health.Status}}' nginx-proxy 2>/dev/null; then
  NGINX_HEALTH="$(docker inspect --format='{{.State.Health.Status}}' nginx-proxy 2>/dev/null || echo unknown)"
fi

HTTP_STATUS="000"
HEALTH_BODY=""
REDIRECT_NOTE="not checked"

LOCAL_NGINX_STATUS="000"
if command -v curl >/dev/null 2>&1; then
  log "Checking local nginx on :${DI_HTTP_PORT}/api/health"
  LOCAL_NGINX_STATUS="$(curl -s -o /tmp/di-local-health.json -w "%{http_code}" "http://127.0.0.1:${DI_HTTP_PORT}/api/health" || echo "000")"

  log "Checking public health endpoint: ${HEALTH_URL}"
  HTTP_STATUS="$(curl -s -o /tmp/di-health.json -w "%{http_code}" "${HEALTH_URL}" || echo "000")"
  if [[ -f /tmp/di-health.json ]]; then
    HEALTH_BODY="$(cat /tmp/di-health.json)"
  fi

  BASE_HTTP="${PUBLIC_BASE_URL/https:\/\//http://}"
  REDIRECT_CODE="$(curl -s -o /dev/null -w "%{http_code}" "${BASE_HTTP}" || echo "000")"
  REDIRECT_NOTE="HTTP ${BASE_HTTP} returned ${REDIRECT_CODE}"
else
  log "WARNING: curl not installed — skipping public URL checks."
fi

OVERALL="PASS"
if [[ "${LOCAL_NGINX_STATUS}" != "200" ]]; then
  OVERALL="FAIL"
fi
if [[ "${HTTP_STATUS}" != "200" ]]; then
  OVERALL="FAIL"
fi
if [[ "${NGINX_HEALTH}" != "healthy" && "${NGINX_HEALTH}" != "unknown" ]]; then
  OVERALL="FAIL"
fi
if ! docker ps --format '{{.Names}}' | grep -qx 'nginx-proxy'; then
  OVERALL="FAIL"
fi

cat > "${REPORT_FILE}" <<EOF
# Decision Intelligence Deployment Report

| Field | Value |
|-------|-------|
| Validate time (UTC) | ${VALIDATE_TIME} |
| Commit SHA | ${COMMIT_SHA} |
| Branch | ${COMMIT_BRANCH} |
| Public URL | ${PUBLIC_BASE_URL} |
| Health URL | ${HEALTH_URL} |
| DI_HTTP_PORT | ${DI_HTTP_PORT} |
| Local nginx health | http://127.0.0.1:${DI_HTTP_PORT}/api/health → ${LOCAL_NGINX_STATUS} |
| Overall | **${OVERALL}** |

Host nginx / ALB must forward \`${PUBLIC_BASE_URL}\` → \`http://127.0.0.1:${DI_HTTP_PORT}\`.

## Images

- nextjs-app: \`${DI_NEXTJS_IMAGE}\`
- nginx-proxy: \`${DI_NGINX_IMAGE}\`

## Container health

| Service | Health |
|---------|--------|
| nextjs-app | ${CONTAINER_HEALTH} |
| nginx-proxy | ${NGINX_HEALTH} |

## Public health check

- HTTP status: ${HTTP_STATUS}
- ${REDIRECT_NOTE}

### Response body

\`\`\`json
${HEALTH_BODY}
\`\`\`

## Manual sign-off

- [ ] Application loads in browser at ${PUBLIC_BASE_URL}
- [ ] Login / onboarding flow works
- [ ] AI features respond (Gemini key entered via platform setup UI)

EOF

log "Validation report written to ${REPORT_FILE}"
cat "${REPORT_FILE}"

if [[ "${OVERALL}" == "FAIL" ]]; then
  echo "ERROR: Validation failed (HTTP ${HTTP_STATUS}, container health ${CONTAINER_HEALTH})."
  exit 1
fi

log "Validation passed."
