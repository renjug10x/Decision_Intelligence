import * as http from 'http';
import { generateCanonicalScenario, ScenarioFamilyId } from '../../../packages/contracts/src/index';

const PORT = parseInt(process.env.PORT || '8081', 10);
const startTime = Date.now();

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost:8081'}`);
  const pathname = reqUrl.pathname;
  const searchParams = reqUrl.searchParams;
  const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Math.random().toString(36).substr(2, 9)}`;
  const tenantId = (req.headers['x-tenant-id'] as string) || searchParams.get('tenant_id') || 'tenant_uk_retail_01';

  // Set CORS & JSON Content Type
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Tenant-ID, X-Correlation-ID');
  res.setHeader('X-Correlation-ID', correlationId);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // ── ROUTE 1: /api/v1/health ────────────────────────────────────────────────
  if (pathname === '/api/v1/health') {
    const healthType = searchParams.get('type') || 'live';
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      service: 'cognix-world',
      version: '1.0.0',
      type: healthType,
      uptimeSeconds,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // ── ROUTE 2: /api/v1/scenarios ─────────────────────────────────────────────
  if (pathname === '/api/v1/scenarios') {
    const familyId = searchParams.get('family_id') as ScenarioFamilyId | undefined;
    const scenarios = generateCanonicalScenario(familyId || undefined, tenantId);

    console.log(`[cognix-world] HTTP GET /api/v1/scenarios | tenant: ${tenantId} | family: ${familyId || 'all'} | count: ${scenarios.length} | corr: ${correlationId}`);

    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'success',
      service: 'cognix-world',
      tenant_id: tenantId,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      data: scenarios
    }));
    return;
  }

  // ── 404 Not Found ──────────────────────────────────────────────────────────
  res.writeHead(404);
  res.end(JSON.stringify({
    status: 'error',
    error: 'NotFound',
    message: `Route ${pathname} not found on cognix-world service`,
    timestamp: new Date().toISOString()
  }));
});

server.listen(PORT, () => {
  console.log(`[cognix-world] Enterprise World Domain Service running on port ${PORT}`);
});
