# COGNIX TARGET ARCHITECTURE SPECIFICATION

**Document Status:** Approved & Authoritative  
**Version:** 1.0.0  
**Effective Date:** August 2026  
**Owner:** G10X Architecture Review Board  

---

## 1. Architectural Overview & Philosophy

The CogniX Target Architecture is designed for **flexibility, rapid experiment iteration, client-neutral core isolation, and deterministic demo fidelity**.

It transitions the codebase from a single-brand retail POC into a layered, modular Enterprise Innovation Lab platform.

---

## 2. Layered Target Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          COGNIX PRESENTATION LAYER                       │
│  [ Innovation Portfolio ] [ Curiosity Engine ] [ Experiment Canvas ]    │
│  [ Executive Journey ]    [ Questions Worth Asking ] [ Evidence Drawer]  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                         COGNIX EXPERIMENT REGISTRY                      │
│   Commitment Intelligence  │ Decision Ripple  │ Enterprise Memory       │
│   Opportunity Intelligence │ Category (Pack)  │ Supply Chain (Pack)     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                        COGNIX CORE DOMAIN SERVICES                      │
│   [ Commitment Propagation Engine ] [ Decision Ripple Simulator ]       │
│   [ Curiosity Question Generator ]  [ Evidence & Confidence Scorer ]    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                        ABSTRACTION & ADAPTER LAYER                      │
│   [ Industry Pack Adapter ]   [ Client Demo Context Config ]             │
│   [ AI Provider Abstraction ] [ Semantic Data Layer Adapter ]           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                       EXTERNAL INTEGRATION PROVIDERS                    │
│   [ Google Gemini AI (2.0/1.5)]  [ Looker Semantic Layer Mock ]         │
│   [ Synthetic Causal Datasets ]  [ G10X Accelerator Blueprints ]        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Layer Definitions

### 3.1 Presentation Layer (`app/*`, `components/*`)
- **App Shell (`app/page.tsx`):** Light, spacious frame hosting topbar, logo, global client context switcher, and tab view renderer.
- **Sidebar (`components/Sidebar.tsx`):** Clean navigation grouped into:
  - *Innovation Lab* (Portfolio, Explorer, Questions Worth Asking)
  - *Active Experiments* (Commitment Intelligence, Decision Ripple Intelligence, Enterprise Memory)
  - *Industry Demonstration Packs* (Retail & Supply Chain Pack)
  - *Governance & Architecture* (IP Registry, Platform Architecture)
- **Design System Tokens (`app/globals.css`):** Replaced legacy Lidl colors with G10X Enterprise palette (Slate neutrals, Precision Blue `#0066FF`, Violet curiosity `#8B5CF6`).

### 3.2 Experiment Registry & Canvas (`lib/experiment-registry.ts`, `components/ExperimentCanvas.tsx`)
- Centralized registration mechanism loading canonical experiment definitions.
- Dynamic rendering of problem statements, provocative questions, business value, confidence metrics, and interactive scenario controls.

### 3.3 Core Domain Engines (`lib/commitment-engine.ts`, `lib/ripple-engine.ts`)
- **Commitment Propagation Engine:** Models multi-stage operational chains:
  `Marketing → Demand → Supplier → Inventory → Fulfilment → Delivery → Customer`
  Detects drift, calculates financial exposure, and determines broken commitment points.
- **Decision Ripple Engine:** Evaluates 1st, 2nd, and 3rd order impacts across enterprise functions when a strategic decision parameter (e.g. promo spend +15%) is mutated.

### 3.4 AI & Provider Abstraction (`lib/gemini.ts`, `lib/ai-provider.ts`)
- Isolates LLM interactions behind an abstract interface: `generateNarrative(context)`, `generateCuriosityQuestions(evidence)`.
- Generates natural language summaries and executive brief synthesis based on deterministic causal engine output.

### 3.5 Industry Pack & Client Context (`config/industry-packs.ts`, `context/ClientContext.tsx`)
- Decouples sector terminology and synthetic data.
- Allows switching runtime context between **Grocery / Retail**, **Omnichannel**, or **Generic Enterprise** during live demos without code changes.

---

## 4. Security, Governance & Observability

- **IAM Role Simulation:** Executive, Category Lead, Store Lead role switcher demonstrating governed access to metrics.
- **IP Metadata Tracking:** Every experiment view displays IP status badge (`G10X Proprietary`, `Open Innovation`).
- **Telemetry & Logging:** Client interaction telemetry logged to facilitate post-demo learning capture.
