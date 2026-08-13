import * as http from 'http';
import { generateCanonicalScenario, ScenarioFamilyId } from '../../../packages/contracts/src/index';
import { generateSyntheticSignalSnapshot } from './enterprise-signal-generator';

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

  // ── ROUTE 3: /api/v1/signals/health ────────────────────────────────────────
  if (pathname === '/api/v1/signals/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      service: 'cognix-world',
      domain: 'enterprise-signals',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // ── ROUTE 4: /api/v1/signals or /api/v1/signals/current ────────────────────
  if (pathname === '/api/v1/signals' || pathname === '/api/v1/signals/current') {
    const scenarioFamily = searchParams.get('family_id') || searchParams.get('scenario_family') || 'promotion_surge';
    const scenarioId = searchParams.get('scenario_id') || 'SCN-PROMO-01';
    const signalType = searchParams.get('signal_type');
    const category = searchParams.get('category');
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');

    let signals = generateSyntheticSignalSnapshot(scenarioFamily, tenantId, scenarioId);

    // Apply filtering
    if (signalType) signals = signals.filter(s => s.signal_type === signalType);
    if (category) signals = signals.filter(s => s.category === category);
    if (entityType) signals = signals.filter(s => s.entity_type === entityType);
    if (entityId) signals = signals.filter(s => s.entity_id === entityId);

    console.log(`[cognix-world] HTTP GET ${pathname} | tenant: ${tenantId} | family: ${scenarioFamily} | count: ${signals.length}`);

    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'success',
      service: 'cognix-world',
      domain: 'enterprise-signals',
      tenant_id: tenantId,
      scenario_id: scenarioId,
      count: signals.length,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      data: signals
    }));
    return;
  }

  // ── ROUTE 5: /api/v1/signals/{id} ──────────────────────────────────────────
  if (pathname.startsWith('/api/v1/signals/')) {
    const id = pathname.split('/')[4];
    if (id) {
      const allSignals = [
        ...generateSyntheticSignalSnapshot('promotion_surge', tenantId, 'SCN-PROMO-01'),
        ...generateSyntheticSignalSnapshot('supplier_breach', tenantId, 'SCN-BREACH-02')
      ];
      const match = allSignals.find(s => s.signal_id === id);
      if (match) {
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'success',
          service: 'cognix-world',
          domain: 'enterprise-signals',
          data: match
        }));
        return;
      }
    }
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
