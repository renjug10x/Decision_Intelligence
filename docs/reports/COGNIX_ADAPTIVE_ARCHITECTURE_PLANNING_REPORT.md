# COGNIX ADAPTIVE INTELLIGENCE & MULTI-SERVICE ARCHITECTURE PLANNING REPORT

**Document Status:** Authoritative Planning Report  
**Execution Date:** 12 August 2026  
**Repository Branch:** `Feature/MatchingContract-AutoActivate`  
**Commit Baseline:** `7f37e76dc4a09d179e6a9da7f4b3a0283b27df0f` (`7f37e76d`)  
**Work Package Classification:** **GOVERNANCE & ARCHITECTURE PLANNING ONLY**  
**Production Code Status:** **NO PRODUCTION CODE, APIs, SERVICES, CONTAINERS, OR MIGRATIONS WERE CREATED**  
**Author:** CogniX Lead Architect & Transformation Team  

---

## 1. Executive Summary & Context

Following official Owner Authorization, the CogniX transformation programme has completed a comprehensive **planning and governance wave** for the next strategic evolution: **Adaptive Intelligence & API-first Multi-Service Architecture**.

### Fundamental Statement of Planning Compliance
> **NO PRODUCTION CODE, BACKEND SERVICES, CONTAINERS, API ENDPOINTS, DATABASE MIGRATIONS, EVENT BUSES, OR FRONTEND COMPONENTS WERE IMPLEMENTED DURING THIS WORK PACKAGE.**

This wave was strictly dedicated to establishing the authoritative architectural blueprints, service domain boundaries, multi-tenancy models, ML layer separations, governance frameworks, and master implementation roadmaps required before future execution begins.

---

## 2. Why This Planning Wave Was Initiated

CogniX has successfully established its core functional baseline, including two-tier assets (Innovation Experiments & Demonstration Solutions), Enterprise Memory, Opportunity Intelligence, Contract Verification, and pervasive Enterprise Learning Patterns.

However, as CogniX grows, maintaining all business logic, scenario simulation, pattern matching, decision state, and commercial verification inside a single Next.js frontend codebase creates critical limitations:
1. **Coupled Intelligence:** UI components directly own decision state and simulation logic.
2. **Limited Telemetry & Observability:** User interactions do not stream to an observable event log.
3. **Static Match Operations:** Pattern matching relies on deterministic mock assignments rather than statistical similarity algorithms.
4. **Single-Tenant Scoping:** State is isolated to client-side memory rather than multi-tenant enterprise data stores.
5. **Monolithic Scaling:** The entire application must be redeployed to update a single domain rule or model.

---

## 3. Overview of Proposed Future Architecture

The proposed future state establishes CogniX as an **API-first, event-aware, multi-tenant adaptive intelligence platform**:

### A. Core Architectural Principles
- **Principle A:** *Screens Do Not Own Intelligence. Domain Services Own Intelligence.*
- **Principle B:** *Every Meaningful Interaction Is Observable.*
- **Principle C:** *API-First Contracts (`Domain Model → API Contract → Event Schema → Implementation`).*
- **Principle D:** *Decompose by Business Capability (Domain, Data, Security, Scaling).*
- **Principle E:** *Shared Enterprise Reality (One Enterprise World + Shared Decision State).*
- **Principle F:** *Strict Intelligence Separation (Deterministic Rules vs ML/Statistical vs Optimisation vs GenAI).*

### B. Initial 7-Deployable Service Topology
1. **`cognix-web`:** Next.js presentation frontend.
2. **`cognix-core`:** API Gateway / BFF & Portfolio Metadata.
3. **`cognix-world`:** Synthetic Enterprise World Engine (`T-90` to `T+30`).
4. **`cognix-decision`:** Shared Decision State Orchestrator.
5. **`cognix-learning`:** Enterprise Memory & Learning Pattern Service.
6. **`cognix-intelligence`:** ML Model Serving & Gemini Reasoning Service.
7. **`cognix-governance`:** Commercial Contract Verification & Execution Engine.

---

## 4. Governance & Architectural Artifacts Created / Updated

1. **[`docs/architecture/ADAPTIVE_INTELLIGENCE_SERVICE_ARCHITECTURE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/ADAPTIVE_INTELLIGENCE_SERVICE_ARCHITECTURE.md):** New authoritative blueprint document consolidating topology, logical domains, multi-tenancy, storage strategy, API specs, event envelopes, containerization, and 8-stage strangler migration plan.
2. **[`docs/governance/MASTER_PLAN.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/MASTER_PLAN.md):** Updated to introduce **Programme: Adaptive Intelligence & Scalable Service Architecture** containing Phases A through M, 7 new User Stories, Non-Goals, and Execution Dependency Order.
3. **[`docs/architecture/ARCHITECTURE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/ARCHITECTURE.md):** Updated with 13 logical domain boundaries, multi-tenant data isolation scopes, and storage architecture.
4. **[`docs/architecture/ARCHITECTURE_DECISIONS.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/ARCHITECTURE_DECISIONS.md):** Added ADR-013 through ADR-022 covering API-first architecture, service decomposition, event propagation, shared state, service-owned schemas, ML/GenAI boundaries, tenant isolation, and strangler migration.
5. **[`docs/architecture/INFORMATION_ARCHITECTURE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/INFORMATION_ARCHITECTURE.md):** Updated with UI presentation decoupling principles.
6. **[`docs/governance/ORGANISATIONAL_LEARNING_INTELLIGENCE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/ORGANISATIONAL_LEARNING_INTELLIGENCE.md):** Updated with ML adaptive learning lifecycle, Intelligence Moments, and Pattern Decay rules.

---

## 5. Summary of Added Architectural Decision Records (ADRs)

- **ADR-013:** API-First Architecture & Service-Oriented Evolution
- **ADR-014:** Initial Seven-Deployable Containerized Topology
- **ADR-015:** Observable Event Telemetry Stream (`journey.event.emitted`)
- **ADR-016:** Shared Temporal Enterprise World Engine (`T-90` to `T+30`)
- **ADR-017:** Shared Cross-Solution Decision State Orchestration
- **ADR-018:** Machine Learning & Generative AI Layer Separation
- **ADR-019:** Service-Owned Schema Isolation & PostgreSQL Strategy
- **ADR-020:** Multi-Tenant Data & Learning Isolation Scopes
- **ADR-021:** Counterfactual Learning & Pattern Confidence Decay
- **ADR-022:** Eight-Stage Strangler Migration Strategy

---

## 6. Execution Discipline & Dependency Discipline

The Master Plan enforces a strict dependency progression:

$$\text{Architecture/APIs} \rightarrow \text{Enterprise World} \rightarrow \text{Journey Telemetry} \rightarrow \text{Shared Decision State} \rightarrow \text{Memory/Learning APIs} \rightarrow \text{ML Models}$$

**Critical Rule:** No ML development or model training may commence before the Enterprise World, Journey Telemetry, and Shared Decision State foundations are fully operational and validated.

---

## 7. Recommended First Executable Work Package

When implementation is authorized by the Owner, the recommended first executable work package is:

> **WORK PACKAGE WP10-A: API Contracts & Enterprise World Extraction Foundation**

### Primary Scope of WP10-A:
1. Define OpenAPI 3.1 specifications for `/api/v1/scenarios` and `/api/v1/health`.
2. Extract scenario simulation logic into an independent `cognix-world` service container (`services/world`).
3. Establish Docker Compose local environment configuration for `cognix-web` and `cognix-world`.
4. Maintain 100% demonstration capability and backwards-compatibility for existing UI routes.

---

## 7.1 WP10-A Architectural Remediation & Execution Status
- **Initial Implementation:** Created OpenAPI contracts, domain types, REST routes inside Next.js, and client adapter.
- **Architectural Remediation Executed:** Following Owner Correction, extracted Enterprise World domain logic and HTTP endpoints into an **independent standalone service** (`services/world/src/server.ts`) running on port 8081 (`cognix-world`).
- **Shared Contracts Package:** Created `packages/contracts/` holding shared types (`enterprise-world-model.ts`) and single canonical scenario generator (`enterprise-world-seed.ts`) covering all **6 scenario families**.
- **Explicit Fallback Modes (`lib/world-client.ts`):** `COGNIX_WORLD_MODE=service`, `COGNIX_WORLD_MODE=local`, and `COGNIX_WORLD_MODE=demo-fallback` (logs explicit warning when falling back).
- **Topology Realignment:** Updated `docker-compose.yml` to remove empty `cognix-core` container, running `cognix-web` (port 3000) and `cognix-world` (port 8081).

---

## 7.2 Browser-to-World Service Routing Correction Executed
- **Diagnostic Finding:** Browser JS was attempting direct fetch to `http://localhost:8081` via `NEXT_PUBLIC_WORLD_SERVICE_URL`, causing browser CORS/connection errors and unhandled promise rejections.
- **Architectural Correction:** Enforced rule *The browser talks to CogniX Web. CogniX Web talks to internal domain services.* Updated `lib/world-client.ts` to execute same-origin relative fetch (`/api/v1/scenarios`) on port 3000.
- **Server-Side BFF Routing:** `app/api/v1/scenarios/route.ts` receives same-origin request on port 3000 and forwards server-side to internal service `COGNIX_WORLD_SERVICE_URL` (`http://localhost:8081` or `http://cognix-world:8081` in Compose). Internal hostnames/IPs are 100% hidden from browser JS.
- **Promise Rejection Elimination:** Added `.catch()` error handlers to `fetchWorldScenario` in `Forecasting.tsx` and `AvailabilityIntelligence.tsx` to eliminate unhandled promise rejections.

---

## 7.3 Final Configuration Cleanup Executed
- **World Client Simplification:** Updated `lib/world-client.ts` so browser JS always executes same-origin relative fetch `/api/v1/scenarios` on port 3000. Removed all dependence on `NEXT_PUBLIC_COGNIX_WORLD_MODE` or `NEXT_PUBLIC_WORLD_SERVICE_URL`. Zero internal service URLs exposed to browser JS.
- **Server-Side Mode Control:** Proxy `app/api/v1/scenarios/route.ts` controls runtime behavior server-side via `COGNIX_WORLD_MODE` (`service` | `demo-fallback` | `local`) and `COGNIX_WORLD_SERVICE_URL`. In strict `service` mode, fails with HTTP 503 if upstream service is unreachable (zero silent fallback).
- **Docker Compose Cleanliness:** Removed obsolete top-level `version:` attribute from `docker-compose.yml`. Configured `cognix-web` with `COGNIX_WORLD_MODE=service` and `COGNIX_WORLD_SERVICE_URL=http://cognix-world:8081`. `docker compose config` verified 100% clean with zero warnings.

---

## 7.4 Docker Web Image Standalone Build Correction & Container Validation
- **Diagnostic Finding:** `docker/Dockerfile.web` build failed because `output: 'standalone'` was not enabled in `next.config.ts`.
- **Standalone Build Enabling:** Added `output: 'standalone'` to `next.config.ts`. Verified `.next/standalone` directory generation (`server.js`, `.next`, `node_modules`, `package.json`).
- **Container Hostname Binding:** Added `ENV HOSTNAME="0.0.0.0"` in `docker/Dockerfile.web` and `docker-compose.yml` to allow Next.js standalone server to bind cleanly to all network interfaces inside container network.
- **Docker Compose Validation:** Ran `docker compose build` and `docker compose up -d`. Verified both `cognix-web` (port 3000) and `cognix-world` (port 8081) container status: **healthy**.
- **Runtime Proxy Verification:** Verified `curl http://localhost:8081/api/v1/health?type=live` $\rightarrow$ `HTTP 200 OK` and `curl http://localhost:3000/api/v1/scenarios?tenant_id=tenant_uk_retail_01&family_id=promotion_surge` $\rightarrow$ `HTTP 200 OK` (proxied successfully to `cognix-world`). Docker runtime validation was completed only after correcting the standalone web build.

---

## 7.5 Security Correction & Build-Time Secret Stripping
- **Diagnostic Finding:** Next.js standalone mode automatically copied `.env` (containing `GEMINI_API_KEY`) into `.next/standalone/.env`, exposing secrets inside the container layer.
- **Image Sanitization:** Added `RUN rm -f .env .env.*` in runner stage of `docker/Dockerfile.web` to explicitly strip build-time `.env` files from final runner image layer. Secrets are strictly injected via runtime environment variables.
- **Verification Proof:** Rebuilt containers via `docker compose build --no-cache` and verified `docker exec cognix-web find /app -name ".env*"` returned **ZERO files**. Both containers verified **healthy**.

---

## 8. Git Governance Confirmation

**NO git commit, push, merge, rebase, or reset has been performed.**

All created and modified governance documents remain local in your working directory for manual owner review, commit, and push.
