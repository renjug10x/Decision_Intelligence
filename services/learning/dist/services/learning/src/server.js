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
const memory_store_1 = require("./memory-store");
const learning_pattern_store_1 = require("./learning-pattern-store");
const PORT = parseInt(process.env.PORT || '8082', 10);
const startTime = Date.now();
const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost:8082'}`);
    const pathname = reqUrl.pathname;
    const searchParams = reqUrl.searchParams;
    const correlationId = req.headers['x-correlation-id'] || `corr_${Math.random().toString(36).substr(2, 9)}`;
    const tenantId = req.headers['x-tenant-id'] || searchParams.get('tenant_id') || 'tenant_uk_retail_01';
    // CORS & Response Headers
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
    if (pathname === '/api/v1/health' || pathname === '/api/v1/learning/health') {
        const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            service: 'cognix-learning',
            port: PORT,
            version: '1.0.0',
            uptimeSeconds,
            timestamp: new Date().toISOString()
        }));
        return;
    }
    // ── ROUTE 2: /api/v1/memory (GET & POST) ─────────────────────────────────
    if (pathname === '/api/v1/memory') {
        if (req.method === 'GET') {
            const category = searchParams.get('category') || undefined;
            const patternId = searchParams.get('pattern_id') || undefined;
            const limit = parseInt(searchParams.get('limit') || '50', 10);
            const cases = memory_store_1.memoryRepository.queryMemoryCases({ tenant_id: tenantId, category, pattern_id: patternId, limit });
            console.log(`[cognix-learning] GET /api/v1/memory | tenant: ${tenantId} | count: ${cases.length}`);
            res.writeHead(200);
            res.end(JSON.stringify({
                status: 'success',
                service: 'cognix-learning',
                domain: 'enterprise-memory',
                tenant_id: tenantId,
                count: cases.length,
                data: cases
            }));
            return;
        }
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
                try {
                    const caseObj = JSON.parse(body);
                    const registered = memory_store_1.memoryRepository.registerMemoryCase(caseObj);
                    console.log(`[cognix-learning] POST /api/v1/memory | registered: ${registered.memory_id}`);
                    res.writeHead(200);
                    res.end(JSON.stringify({
                        status: 'success',
                        service: 'cognix-learning',
                        domain: 'enterprise-memory',
                        data: registered
                    }));
                }
                catch (e) {
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
    }
    // ── ROUTE 3: /api/v1/memory/search (POST) ──────────────────────────────────
    if (pathname === '/api/v1/memory/search' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const searchReq = JSON.parse(body);
                const results = memory_store_1.memoryRepository.searchMemoryPrecedents(searchReq);
                console.log(`[cognix-learning] POST /api/v1/memory/search | query: ${searchReq.query || 'none'} | results: ${results.length}`);
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'success',
                    service: 'cognix-learning',
                    domain: 'enterprise-memory',
                    count: results.length,
                    data: results
                }));
            }
            catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', error: 'BadRequest', message: e.message }));
            }
        });
        return;
    }
    // ── ROUTE 4: /api/v1/memory/:id (GET) ──────────────────────────────────────
    if (pathname.startsWith('/api/v1/memory/') && req.method === 'GET') {
        const id = pathname.split('/')[4];
        if (id && id !== 'search') {
            const match = memory_store_1.memoryRepository.getMemoryCaseById(id);
            if (match) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'success',
                    service: 'cognix-learning',
                    domain: 'enterprise-memory',
                    data: match
                }));
                return;
            }
            res.writeHead(404);
            res.end(JSON.stringify({ status: 'error', error: 'NotFound', message: `MemoryCase '${id}' not found` }));
            return;
        }
    }
    // ── ROUTE 5: /api/v1/learning-patterns (GET) ─────────────────────────────
    if (pathname === '/api/v1/learning-patterns' && req.method === 'GET') {
        const type = searchParams.get('type') || undefined;
        const category = searchParams.get('category') || undefined;
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const patterns = learning_pattern_store_1.learningPatternRepository.queryLearningPatterns({ tenant_id: tenantId, type, category, limit });
        console.log(`[cognix-learning] GET /api/v1/learning-patterns | tenant: ${tenantId} | count: ${patterns.length}`);
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'success',
            service: 'cognix-learning',
            domain: 'enterprise-learning-patterns',
            tenant_id: tenantId,
            count: patterns.length,
            data: patterns
        }));
        return;
    }
    // ── ROUTE 6: /api/v1/learning-patterns/match (POST) ──────────────────────
    if (pathname === '/api/v1/learning-patterns/match' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const matchReq = JSON.parse(body);
                const matches = learning_pattern_store_1.learningPatternRepository.matchLearningPatterns(matchReq);
                console.log(`[cognix-learning] POST /api/v1/learning-patterns/match | category: ${matchReq.category || 'all'} | matches: ${matches.length}`);
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'success',
                    service: 'cognix-learning',
                    domain: 'enterprise-learning-patterns',
                    count: matches.length,
                    data: matches
                }));
            }
            catch (e) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', error: 'BadRequest', message: e.message }));
            }
        });
        return;
    }
    // ── ROUTE 7: /api/v1/learning-patterns/:id (GET) ──────────────────────────
    if (pathname.startsWith('/api/v1/learning-patterns/') && req.method === 'GET') {
        const parts = pathname.split('/');
        const id = parts[4];
        const subRoute = parts[5];
        if (id && id !== 'match') {
            if (subRoute === 'memories') {
                const supporting = learning_pattern_store_1.learningPatternRepository.getSupportingMemories(id, tenantId);
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'success',
                    service: 'cognix-learning',
                    domain: 'enterprise-learning-patterns',
                    pattern_id: id,
                    count: supporting.length,
                    data: supporting
                }));
                return;
            }
            const match = learning_pattern_store_1.learningPatternRepository.getLearningPatternById(id);
            if (match) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    status: 'success',
                    service: 'cognix-learning',
                    domain: 'enterprise-learning-patterns',
                    data: match
                }));
                return;
            }
            res.writeHead(404);
            res.end(JSON.stringify({ status: 'error', error: 'NotFound', message: `LearningPattern '${id}' not found` }));
            return;
        }
    }
    // ── 404 Not Found ──────────────────────────────────────────────────────────
    res.writeHead(404);
    res.end(JSON.stringify({
        status: 'error',
        error: 'NotFound',
        message: `Route ${pathname} not found on cognix-learning service`,
        timestamp: new Date().toISOString()
    }));
});
server.listen(PORT, () => {
    console.log(`[cognix-learning] Enterprise Memory & Learning Domain Service running on port ${PORT}`);
});
