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
