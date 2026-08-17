import * as http from 'http';
import {
  generateCanonicalScenario,
  ScenarioFamilyId,
  SignalSimulationRequest,
  ExternalSignalIngestRequest
} from '../../../packages/contracts/src/index';
import { generateSyntheticSignalSnapshot } from './enterprise-signal-generator';
import { simulateEnterpriseSignalTimelines } from './dynamic-signal-simulator';
import {
  ingestExternalSignals,
  listExternalSignalConnectors,
  listIngestedExternalSignals,
  getExternalSignalConnector
} from './external-signal-connector';

const PORT = parseInt(process.env.PORT || '8081', 10);
const startTime = Date.now();

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost:8081'}`);
  const pathname = reqUrl.pathname;
  const searchParams = reqUrl.searchParams;
  const correlationId = (req.headers['x-correlation-id'] as string) || `corr_${Math.random().toString(36).substr(2, 9)}`;
  // Tenant scope supplied explicitly by the caller (header or query). Distinct from `tenantId`,
  // which falls back to the lab default and therefore cannot be used to enforce a boundary.
  const explicitTenantScope = (req.headers['x-tenant-id'] as string) || searchParams.get('tenant_id') || null;
  const tenantId = explicitTenantScope || 'tenant_uk_retail_01';

  // Set CORS & JSON Content Type
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  // ── ROUTE 4: POST /api/v1/signals/simulate ────────────────────────────────
  if (pathname === '/api/v1/signals/simulate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload: SignalSimulationRequest = JSON.parse(body);
        const result = simulateEnterpriseSignalTimelines(payload);

        console.log(`[cognix-world] HTTP POST /api/v1/signals/simulate | sim_id: ${result.simulation_id} | tenant: ${result.tenant_id} | state_v: ${result.decision_state_version} | timelines: ${result.timelines.length}`);

        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'success',
          service: 'cognix-world',
          domain: 'enterprise-signals',
          data: result
        }));
      } catch (e: any) {
        console.error(`[cognix-world] HTTP POST /api/v1/signals/simulate failed: ${e.message}`);
        res.writeHead(400);
        res.end(JSON.stringify({
          status: 'error',
          error: 'BadRequest',
          message: e.message,
          timestamp: new Date().toISOString()
        }));
      }
    });
    return;
  }

  // ── ROUTE 5a: GET /api/v1/signals/connectors ───────────────────────────────
  if (pathname === '/api/v1/signals/connectors' && req.method === 'GET') {
    const category = searchParams.get('category') || undefined;
    const status = searchParams.get('status') || undefined;
    const connectors = listExternalSignalConnectors({ category, status });

    console.log(`[cognix-world] HTTP GET /api/v1/signals/connectors | tenant: ${tenantId} | count: ${connectors.length} | corr: ${correlationId}`);

    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'success',
      service: 'cognix-world',
      domain: 'enterprise-signal-connectors',
      tenant_id: tenantId,
      count: connectors.length,
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      data: connectors
    }));
    return;
  }

  // ── ROUTE 5b: POST /api/v1/signals/connectors/ingest ───────────────────────
  if (pathname === '/api/v1/signals/connectors/ingest' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload: ExternalSignalIngestRequest = JSON.parse(body);
        // Enforce the tenant boundary whenever the caller scoped the request explicitly
        // (X-Tenant-ID header or tenant_id query), regardless of which channel carried it.
        if (payload.tenant_id && explicitTenantScope && payload.tenant_id !== explicitTenantScope) {
          res.writeHead(403);
          res.end(JSON.stringify({
            status: 'error',
            error: 'TenantBoundaryViolation',
            message: `Request tenant_id (${payload.tenant_id}) does not match scoped tenant (${explicitTenantScope})`,
            timestamp: new Date().toISOString()
          }));
          return;
        }
        if (!payload.tenant_id) {
          payload.tenant_id = tenantId;
        }

        const result = ingestExternalSignals(payload);

        console.log(`[cognix-world] HTTP POST /api/v1/signals/connectors/ingest | ingest_id: ${result.ingest_id} | accepted: ${result.accepted_count} | rejected: ${result.rejected_count}`);

        res.writeHead(result.accepted_count > 0 ? 200 : 400);
        res.end(JSON.stringify({
          status: result.accepted_count > 0 ? 'success' : 'error',
          service: 'cognix-world',
          domain: 'enterprise-signal-connectors',
          data: result
        }));
      } catch (e: any) {
        console.error(`[cognix-world] HTTP POST /api/v1/signals/connectors/ingest failed: ${e.message}`);
        res.writeHead(400);
        res.end(JSON.stringify({
          status: 'error',
          error: 'BadRequest',
          message: e.message,
          timestamp: new Date().toISOString()
        }));
      }
    });
    return;
  }

  // ── ROUTE 5c: GET /api/v1/signals/connectors/ingested ──────────────────────
  if (pathname === '/api/v1/signals/connectors/ingested' && req.method === 'GET') {
    const sessionId = searchParams.get('session_id') || undefined;
    const signals = listIngestedExternalSignals(tenantId, sessionId);

    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'success',
      service: 'cognix-world',
      domain: 'enterprise-signal-connectors',
      tenant_id: tenantId,
      count: signals.length,
      timestamp: new Date().toISOString(),
      data: signals
    }));
    return;
  }

  // ── ROUTE 5d: GET /api/v1/signals/connectors/{id} ──────────────────────────
  if (pathname.startsWith('/api/v1/signals/connectors/') && req.method === 'GET') {
    const connectorId = pathname.split('/')[5];
    const reserved = new Set(['ingest', 'ingested']);
    if (!connectorId || reserved.has(connectorId)) {
      res.writeHead(404);
      res.end(JSON.stringify({
        status: 'error',
        error: 'NotFound',
        message: `Route ${pathname} not found on cognix-world service`,
        timestamp: new Date().toISOString()
      }));
      return;
    }
    const connector = getExternalSignalConnector(connectorId);
    if (!connector) {
      res.writeHead(404);
      res.end(JSON.stringify({
        status: 'error',
        error: 'NotFound',
        message: `Connector ${connectorId} not found`,
        timestamp: new Date().toISOString()
      }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'success',
      service: 'cognix-world',
      domain: 'enterprise-signal-connectors',
      data: connector
    }));
    return;
  }

  // ── ROUTE 5: /api/v1/signals or /api/v1/signals/current ────────────────────
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

  // ── ROUTE 6: /api/v1/signals/{id} ──────────────────────────────────────────
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
