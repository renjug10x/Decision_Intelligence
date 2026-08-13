"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const index_1 = require("../../../packages/contracts/src/index");
const enterprise_signal_generator_1 = require("./enterprise-signal-generator");
const PORT = parseInt(process.env.PORT || '8081', 10);
const startTime = Date.now();
const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost:8081'}`);
    const pathname = reqUrl.pathname;
    const searchParams = reqUrl.searchParams;
    const correlationId = req.headers['x-correlation-id'] || `corr_${Math.random().toString(36).substr(2, 9)}`;
    const tenantId = req.headers['x-tenant-id'] || searchParams.get('tenant_id') || 'tenant_uk_retail_01';
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
        const familyId = searchParams.get('family_id');
        const scenarios = (0, index_1.generateCanonicalScenario)(familyId || undefined, tenantId);
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
        let signals = (0, enterprise_signal_generator_1.generateSyntheticSignalSnapshot)(scenarioFamily, tenantId, scenarioId);
        // Apply filtering
        if (signalType)
            signals = signals.filter(s => s.signal_type === signalType);
        if (category)
            signals = signals.filter(s => s.category === category);
        if (entityType)
            signals = signals.filter(s => s.entity_type === entityType);
        if (entityId)
            signals = signals.filter(s => s.entity_id === entityId);
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
                ...(0, enterprise_signal_generator_1.generateSyntheticSignalSnapshot)('promotion_surge', tenantId, 'SCN-PROMO-01'),
                ...(0, enterprise_signal_generator_1.generateSyntheticSignalSnapshot)('supplier_breach', tenantId, 'SCN-BREACH-02')
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
