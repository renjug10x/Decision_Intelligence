# Lidl UK Decision Intelligence POC — Plan & Roadmap

This document serves as the project plan and implementation roadmap for refining the Lidl Decision Intelligence POC into a highly-focused, premium retail executive demo.

> **Parallel workstream:** the **CogniX Capability Atlas** programme (`CAT-01`…`CAT-07`) is tracked in
> [§11](#11-cognix-capability-atlas-parallel-workstream) of this document and governed by
> [`COGNIX_CAPABILITY_ATLAS.md`](COGNIX_CAPABILITY_ATLAS.md). It runs alongside Phases 1–15 below and
> changes none of them.

---

## 1. Current State Summary
The project is a Next.js (React 19, TypeScript) application serving as a Proof of Concept (POC) for Lidl UK.
It currently implements:
* **Command Centre**: Dashboard with KPI cards, regional and category revenue charts, active anomaly alerts with interactive root cause and resolution drawers.
* **Store Ops Copilot**: NLQ chatbot interface for querying store-level metrics.
* **Category Intelligence**: SKU and category performance data with Looker Row-Level Security (RLS) mock locks.
* **Supply Chain Radar**: National logistics map and supplier delay alerts.
* **Promotion Planner**: Campaign simulator estimating gross margins and cannibalization.
* **Forecasting**: Demand projections with sliders and toggles.
* **Settings**: Control Centre containing thresholds, AI options, and Looker User Attributes overrides.
* **Semantic Layer**: Governing queries against a local mock database of 50 stores, 200 products, sales history, delivery events, and promotions.

---

## 2. New Demo Objective
**Narrative**: **Signal → Insight → Decision → Action**
Demonstrate to Lidl executives how their existing Google Cloud/Looker ecosystem (BigQuery, Looker, Gemini, AppSheet) can be unified into a proactive decision-making cockpit, rather than a passive analytics dashboard. The demo shows how each role (Executive, Category Manager, Store Manager) gets a tailored operational cockpit to execute decisions with a clear financial impact and confidence score, concluding with AppSheet integration.

---

## 3. Prioritised Backlog
1. **PLAN.md Setup**: Complete project roadmap. (Phase 0)
2. **Navigation & Module Rebranding**: Rename items in the navigation to fit the Lidl cockpit style. (Phase 1)
3. **Today's Priorities Landing Page**: Create the decision landing page displaying prioritized, impact-ranked operational risks. (Phase 2)
4. **New Use Case 1: Waste Intelligence**: Create a dedicated waste analysis view correlating promotions, weather, delivery delays, and footfall. (Phase 3)
5. **New Use Case 2: Stock Availability Intelligence**: Create a dedicated view tracking stock-outs, lost sales, and store rebalancing. (Phase 4)
6. **New Use Case 3: Labour Optimisation**: Create a dedicated view correlating sales, transaction count, footfall, and staffing levels. (Phase 5)
7. **Executive Briefing Centre**: Build a dedicated narrative weekly operating brief view. (Phase 6)
8. **Dynamic Persona Switching**: Customize sidebar navigation items and defaults based on active persona. (Phase 7)
9. **Decision Confidence Score**: Embed a transparent confidence card with data signals, gaps, and human review requirements. (Phase 8)
10. **Governance Page & AppSheet Citizen Developer Vision**: Rebrand settings into "Governance" and add the AppSheet vision panel. (Phase 9)
11. **Simulated Write-Back Actions**: Ensure all CTAs simulate write-backs showing before/after status. (Phase 10)
12. **Design Polish & Build Verification**: Ensure FinOptX compact style and compile production build. (Phase 11)
13. **Interactive Architecture Explorer & Decision Journey Storyboard**: Build a native React Miro/Figma-style architecture deck with 9 pages, Decision Journey, and Decision Memory. (Phase 12)

---

## 4. Step-by-Step Execution Plan

### Phase 1: Navigation Rebranding
* **Goal**: Alias navigation labels to Lidl-specific terminology.
* **Files**: [Sidebar.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/Sidebar.tsx), [page.tsx](file:///Users/renjunair/projects/Decision_Intelligence/app/page.tsx).
* **Changes**:
  * Command Centre ➔ **Today’s Priorities**
  * Store Ops Copilot ➔ **Store Intelligence** (or Q&A/Copilot)
  * Category Intelligence ➔ **Trading Intelligence**
  * Supply Chain Radar ➔ **Supply Intelligence**
  * Promotion Planner ➔ **Promotion Optimiser**
  * Forecasting ➔ **Forward View**
  * Settings ➔ **Governance**

### Phase 2: Today’s Priorities Landing Page
* **Goal**: Refactor the home screen into a decision cockpit displaying prioritized business risks.
* **Files**: Create [components/TodayPriorities.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/TodayPriorities.tsx), update [app/page.tsx](file:///Users/renjunair/projects/Decision_Intelligence/app/page.tsx).
* **Details**: Show 3 key cards:
  1. *Trafford Store (Piccadilly)*: Revenue Risk (£42k), Waste Risk (£8k), Availability Risk (£12k), Confidence (87%), Recommended Action: Transfer surplus stock.
  2. *Chilled Category*: Margin Erosion (3.2%), Forecast Risk (High), Confidence (82%), Recommended Action: Review promotion threshold.
  3. *Supplier FreshDirect*: SLA Breach (18%), Affected Stores (42), Revenue Exposure (£96k), Confidence (79%), Recommended Action: Activate secondary supplier.
  * Card CTAs: Investigate, Ask AI, Simulate Action, Mark Reviewed.

### Phase 3: Waste Intelligence Screen
* **Goal**: Correlate promotions, weather, delivery delays, and store footfall to pinpoint food waste drivers.
* **Files**: Create [components/WasteIntelligence.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/WasteIntelligence.tsx).
* **Details**: Show a detailed waste breakdown, top 3 waste drivers, weather/footfall correlation chart, and markdown actions with a human review checkpoint.

### Phase 4: Stock Availability Intelligence Screen
* **Goal**: Display stock-outs, lost sales revenue, and stock rebalancing suggestions.
* **Files**: Create [components/AvailabilityIntelligence.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/AvailabilityIntelligence.tsx).
* **Details**: Highlight the highest lost revenue lines (e.g. chilled ready meals: £27k lost sales), root causes (delivery latency), and stock rebalancing trigger controls.

### Phase 5: Labour Optimisation Screen
* **Goal**: Correlate transaction volumes, footfall forecasts, and schedules to identify overstaffed/understaffed stores.
* **Files**: Create [components/LabourOptimisation.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/LabourOptimisation.tsx).
* **Details**: Display Leicester Central understaffing warning peak (16:00–19:00), shift transfers, and productivity metrics.

### Phase 6: Executive Briefing Centre
* **Goal**: Narrative-driven operating brief replacing manual reporting packs.
* **Files**: Create [components/BriefingCentre.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/BriefingCentre.tsx).
* **Details**: Renders structured Daily/Weekly brief: Business Summary, Top 5 Risks, Top 3 Opportunities, Decisions Awaiting Approval.

### Phase 7: Dynamic Persona Scoping
* **Goal**: Custom-tailor the navigation layout and default page based on user persona.
* **Files**: [Sidebar.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/Sidebar.tsx), [page.tsx](file:///Users/renjunair/projects/Decision_Intelligence/app/page.tsx).
* **Permissions mapping**:
  * **Executive**: Today’s Priorities, Briefing Centre, Trading Intelligence, Supply Intelligence, Promotion Optimiser, Forward View, Governance.
  * **Category Manager**: Trading Intelligence, Promotion Optimiser, Waste Intelligence, Stock Availability Intelligence, Store Intelligence (Category Q&A), Governance.
  * **Store Manager**: Store Intelligence, Waste Intelligence, Stock Availability Intelligence, Labour Optimisation, Store Intelligence (Copilot Q&A), Governance.

### Phase 8: Decision Confidence Score Component
* **Goal**: Provide transparent calculations explaining recommendations.
* **Files**: Create a reusable [components/ConfidenceScore.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/ConfidenceScore.tsx).
* **Metrics**: Display Confidence %, Data Signals Used, Data Gaps/Caveats, Human Review requirement.

### Phase 9: Governance Page & AppSheet Vision Panel
* **Goal**: Show settings + AppSheet integration flow.
* **Files**: [components/Settings.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/Settings.tsx) (Rebranded to Governance).
* **Vision Diagram**: Render a premium diagram illustrating:
  `AppSheet Mobile App ➔ Decision Intelligence API ➔ Gemini AI ➔ Looker Semantic Layer ➔ BigQuery`.

### Phase 10: Simulated Write-Back Actions
* **Goal**: CTAs must result in simulated operations showing before/after metrics.
* **Files**: Today’s Priorities, Waste, Availability, and Labour components.
* **Simulation**: Clicking "Simulate Action" or "Approve Transfer" triggers a success state showing resolved risks (e.g. Revenue Risk £42k ➔ Mitigated).

### Phase 11: Design Polish & Compilation
* **Goal**: Apply FinOptX style (dark background, dense tables, pill tabs, thin in-page scrollbars) and test production builds.
* **Files**: [globals.css](file:///Users/renjunair/projects/Decision_Intelligence/app/globals.css).

### Phase 12 (Phase 3): Persona-Driven Architecture Storyboard
* **Goal**: Build an interactive React slides deck with 10 pages, applying a 4-layer architecture pattern (Persona, Intelligence, Technology/Connectivity, Outcome) to explain how Lidl's personas execute decisions using Looker, Gemini, and AppSheet. Integrates the MCP Connector layer, Decision Journey panel, Decision Memory component, and Fullscreen Presentation Mode.
* **Files**: [components/ArchitectureExplorer.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/ArchitectureExplorer.tsx), [components/Sidebar.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/Sidebar.tsx), [app/page.tsx](file:///Users/renjunair/projects/Decision_Intelligence/app/page.tsx).

#### Phase 12 Acceptance Criteria
The Architecture Storyboard is complete only when:
* **Timing Constraints**:
  * Core demo must complete in 10 minutes.
  * Extended demo including Architecture Explorer must complete in 20–30 minutes.
  * Architecture Explorer should support both quick executive walkthrough and deeper technical walkthrough.
* **Storyboard Content Rules**:
  * Every page starts with a user persona or business trigger.
  * Every page ends with a measurable business outcome.
  * Each diagram follows the 4-layer pattern:
    1. Persona Layer
    2. Decision Intelligence Layer
    3. Technology / Connectivity Layer
    4. Outcome / Action Layer
  * Diagrams are interactive, not static images.
  * Icons are used meaningfully for business users and technical systems.
  * Fullscreen presentation mode works.
  * Dot navigation and previous/next navigation work.
  * User can explain the platform without opening PowerPoint.
  * Page 0 clearly explains why the platform exists.
  * MCP Connector Layer is visible in at least the integration and future-state diagrams.
  * Decision Memory is visible as a learning loop, not just a text block.

#### Icon and Connector Requirements
Use recognisable enterprise icons for:
* **Business personas**: Executive, Store Manager, Category Manager, Supply Chain Lead, Citizen Developer, BI/Data Team, Decision Owner.
* **Retail and operations**: Store, Product/SKU, Promotion, Stock availability, Waste, Labour, Supplier, Delivery truck, Warehouse.
* **Technology**: Gemini, Vertex AI, BigQuery, Looker, AppSheet, IAM, MCP, API, RAG / knowledge base, Workflow engine, Audit / observability.
* **Actions**: Ask question, Diagnose, Recommend, Validate, Approve, Create task, Trigger workflow, Escalate, Measure outcome, Learn.
* *Do not use generic boxes where icons can make the diagram clearer.*

#### Phase 12 Page Inventory
0. **Why This Exists**: Business motivation, strategic goals, and the gap from *Signal ➔ Action*.
1. **Executive Overview**: Standard 4-layer platform blueprint overview.
2. **Store Manager Journey**: "Why is waste increasing today?" Store Manager ➔ Store Intel ➔ Gemini/Looker/BigQuery + MCP ➔ Outcome: Chilled markdown rule adjust (Waste Reduced by 14%).
3. **Category Manager Journey**: "Why is this promotion underperforming?" Category Manager ➔ Trading Intel ➔ RLS metrics ➔ Outcome: Chilled margin recovery (+4.2%).
4. **Supply Chain Journey**: "Which supplier delays affect revenue?" Supply Lead ➔ Supply Intel ➔ Supplier SLA/BigQuery ➔ Outcome: FreshDirect delay resolved, backup activated (£24K revenue protected).
5. **Executive Journey**: "Summarise today's business." Executive ➔ Briefing Centre ➔ Business anomalies ➔ Outcome: National strategic inventory transfers approved.
6. **AppSheet AI Enablement Blueprint**: Three AppSheet apps (Store, Category, Supply) connecting to DI API with side-by-side Current vs Future state comparisons.
7. **How A Recommendation Is Generated**: AI Decision Lifecycle details from User Question ➔ validation ➔ Looker semantic query ➔ Gemini reasoning ➔ Confidence Score ➔ Human Validation ➔ workflow trigger.
8. **Governance & Trust**: IAM, LookML, RLS access scoping, and human-in-the-loop review.
9. **Future-State Lidl 2028**: "A Day in the Life of Lidl 2028" timeline slide.

#### Page Behaviour Requirements
Each Architecture Explorer page should include:
* Title
* Persona/business question
* Interactive diagram (conforming to 4-layer layout)
* Key message
* Business value callout
* Technical explanation panel
* Expandable node details
* Optional presenter notes (for walkthrough)

#### Final Build Order
1. Update `PLAN.md` (Completed)
2. Add `ArchitectureExplorer` route/navigation in `app/page.tsx` and `components/Sidebar.tsx`
3. Build base explorer shell in `components/ArchitectureExplorer.tsx`
4. Add navigation/presentation controls
5. Build reusable diagram node components
6. Build icon system
7. Build Page 0 and Executive Overview
8. Build persona journey pages
9. Build AppSheet and Recommendation Generation pages
10. Build Governance and Future-State pages
11. Add Decision Journey and Decision Memory components
12. Apply FinOptX styling
13. Run build
14. Provide screenshots and demo script

---

### Phase 13: Architecture Storyboard V2 Redesign
* **Goal**: Redesign the Architecture Storyboard into an interactive, Miro-style solution blueprint and decision journey storyteller. Integrates the deck directly into the "Help" page via tabs, implements explicit visual wiring (curved connectors, animated pulse paths, glow effects) connecting all layers, establishes high-visibility persona triggers and dominant business outcomes, relocates controls into the diagram canvas frame, and creates a comprehensive enterprise integration blueprint.
* **Files**: [components/Help.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/Help.tsx), [components/ArchitectureExplorer.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/ArchitectureExplorer.tsx), [components/Sidebar.tsx](file:///Users/renjunair/projects/Decision_Intelligence/components/Sidebar.tsx), [app/page.tsx](file:///Users/renjunair/projects/Decision_Intelligence/app/page.tsx).

#### 1. Gap Analysis
* **What was built**:
  * Slide deck with 10 slides (Page 0 to 9) using 4 horizontal swimlanes (Persona, Intelligence, Technology, Outcome) representing architectural tiers.
  * Floating cards showing static stack capabilities with disconnected layouts.
  * A separate navigation link ("Architecture Storyboard") in the left sidebar.
  * Global presentation and fullscreen buttons in the page-level topbar.
  * Side-by-side static text lists for AppSheet Current vs Future states.
* **Why it does not meet the storytelling objective**:
  * *Feels like static documentation*: The swimlanes act as a generic capability map instead of a dynamic business-to-technology walkthrough.
  * *No visual wiring*: Nodes float in lanes without explicit dependency arrows or data flow paths, making it hard to follow the journey.
  * *Triggers & Outcomes are obscured*: The user persona and final business values are styled like minor technology nodes instead of the clear starting point and destination.
  * *Navigation bloat*: Exposing the explorer as a primary sidebar item clutters the interface, bypassing the logical "Help" section.
  * *Mismatched canvas controls*: Global page headers manage diagram functions; native fullscreen expands the entire browser window instead of only the drawing canvas.
* **What will be redesigned**:
  * **Visual Journey Flow**: A combination of vertical and horizontal steps wired with multi-directional arrows (like an architectural design, not a single straight step diagram) representing the exact business decision path (e.g. Persona ➔ Trigger Event ➔ Application ➔ Gemini Analysis ➔ Looker Validation ➔ Recommendation Generated ➔ Manager Approval ➔ Workflow Triggered ➔ Outcome).
  * **Wiring & Pulse Effects**: directional arrows, curved connectors, animated pulse paths, highlighted active routes, and glowing effects when hovered or selected. Hovering/clicking a node (like Gemini) illuminates the active path from `User ➔ Gemini ➔ Looker ➔ Outcome`.
  * **Dominant Triggers & Outcomes**: Large, stylized persona cards at the top (name, role, location, business question) and visually dominant KPI panels at the bottom of each journey slide representing the "destination" (e.g. "Waste Reduced / £18.6K saved").
  * **First-Class Help Tabs**: Integrated tabs on the Help Page:
    1. *Architecture Storyboard* (the V2 presentation deck).
    2. *Decision Lifecycle* (flowchart lifecycle showing query validation - *renamed from Decision Journey*).
    3. *Resolution Pattern Library* (Decision Memory V2) representing an interactive database showing incident details (Trigger, Action Taken, Outcome, Confidence, Stores Impacted) and active `[Apply Similar Resolution]` buttons.
  * **Interactive Enterprise Blueprint**: Slide 2 becomes a detailed enterprise blueprint (centerpiece of the entire section) showing interconnected Business, Application, Decision, AI, Governance, Data, and Action layers.
  * **Before vs After Decision Making Slide**: A new slide illustrating the comparison:
    * *Current State*: Store ➔ Spreadsheet ➔ Email ➔ Analyst ➔ Report ➔ Manager ➔ Decision.
    * *Future State*: Store ➔ Decision Intelligence ➔ Recommendation ➔ Approval ➔ Action.
  * **"Why Gemini Cannot Hallucinate" Slide**: An explicit new page tracing the flow: `User Question ➔ IAM Check ➔ Looker Semantic Layer ➔ Approved Metrics ➔ Gemini Reasoning ➔ Recommendation`.
  * **Canvas-only Fullscreen**: Full-screen button expands only the diagram canvas container to a large modal view, keeping the sidebar and presenter notes panel visible.
  * **AppSheet Transformation Blueprint**: Flow diagrams comparing Current State (App ➔ Manual report) vs Future State (App ➔ API ➔ Gemini ➔ Looker ➔ BQ ➔ Action).
* **What components will be reused**:
  * Slide copy definitions (SLIDES meta array, presenter notes, values).
  * Node detail handlers.
* **What components will be removed**:
  * Horizontal 4-layer swimlane structures.
  * Sidebar main navigation item for `architecture-explorer`.
  * Browser-level native fullscreen overrides.
  * Side-by-side card lists for AppSheet.

#### 2. Architecture Storyboard Success Test
A new stakeholder must be able to answer these 8 questions in under 5 minutes without verbal explanation:
1. What problem does the platform solve?
2. How does a Store Manager use it?
3. How does a Category Manager use it?
4. How does AppSheet integrate?
5. How are recommendations generated?
6. How is governance enforced?
7. How are actions executed?
8. How does the platform learn over time?

If any answer requires the presenter to verbally explain missing context, the page has failed.

#### 3. Executive Readability Test (Core Validation Check)
Ask a person unfamiliar with the project to view the **Enterprise Blueprint**, **AppSheet Transformation**, and **Why Gemini Cannot Hallucinate** slides.
They must be able to explain:
1. What problem the platform solves.
2. How recommendations are generated.
3. Why AI is trusted.
4. How AppSheet integrates.
without assistance. If they cannot explain these in under 5 minutes, the diagram must be redesigned.

#### 4. Final Redesign Build Order
1. Update `PLAN.md` (Completed)
2. Remove separate left-sidebar entry from `components/Sidebar.tsx` and default router case in `app/page.tsx`
3. Refactor `components/Help.tsx` to host tabs for:
   * **Architecture Storyboard** (V2 presentation deck)
   * **Decision Lifecycle** (flowchart lifecycle)
   * **Resolution Pattern Library** (Decision Memory V2)
4. Rebuild `components/ArchitectureExplorer.tsx` to support the Visual Journey Blueprint:
   * Stepped layout with multi-directional SVG arrow connectors, curved wires, and active route illumination.
   * Large, styled persona starting cards.
   * Visually dominant KPI outcome panels at the bottom.
   * Node clicks detailing Looker semantic models, BigQuery tables, MCP APIs, or Gemini models.
   * Relocated toolbar inside the canvas frame.
   * Local canvas fullscreen overlay.
5. Implement V2 AppSheet Transformation diagrams showing current vs future wired flows.
6. Implement centerpiece Unified Enterprise System Integration blueprint page.
7. Implement "Why Gemini Cannot Hallucinate" slide.
8. Implement "Before vs After Decision Making" slide.
9. Integrate presenter notes panel and switch controls.
10. Run build verification.

---

## 5. Acceptance Criteria
* **Demo Timing**: Core demo completes under 10 minutes. Extended demo including Architecture Explorer completes in 20-30 minutes. Architecture Explorer supports both quick executive walkthrough and deeper technical walkthrough.
* **Aesthetics**: Premium near-black UI (`#080B12`), compact info density, outlined icons.
* **Persona Switching**: Navigation completely updates based on persona, enforcing RLS.
* **Write-Back Simulation**: Clicking actions show status transitions.
* **Compile State**: Passes Next.js production build check.

---

## 6. Demo Flow (30-Minute Narrative)
1. **Today’s Priorities (Exec)**: Land on landing page showing 3 key risks. Approve stock transfer.
2. **Executive Briefing Centre**: Generate narrative operating brief.
3. **Category Manager Mode**: Switch persona. Navigation updates. Open Trading Intelligence, experience category RLS lock, open Promotion Optimiser.
4. **Store Manager Mode**: Switch persona. Open Waste Intelligence and review drivers, open Labour Optimisation and resolve understaffing.
5. **Supply Intelligence**: Open Supply Intelligence as Exec, click delayed supplier, trigger rerouting.
6. **Governance & AppSheet**: Showcase Looker attribute overrides and AppSheet mobile vision panel.

---

## 7. Design Manifest
* **Page Base Background**: `#080B12` (near-black deep navy)
* **Panel/Card Backgrounds**: `#101624` & `#141B2D`
* **Typography**: Inter (compact headings, dense margins)
* **Scrollbars**: Custom thin webkit scrollbars for internal scroll containers
* **Color semantics**: Red (Risk/Decline), Amber (Warning), Green (Resolved/Opportunity), Blue (Accent)

---

## 8. Risks and Guardrails
* **API Key Safe Handling**: Read Gemini key from sessionStorage context, never commit to files.
* **Mock Mode Integrity**: Keep local JSON query engine functioning in keyless mode.
* **Non-destructive upgrades**: Modify existing files conservatively, adding new features as separate components.

---

## 9. Phase 14: Stable Dockerized Monolith Deployment (AWS EC2)
* **Goal**: Re-architect the deployment to run the entire Next.js application as a production-build container behind an Nginx reverse proxy with automated Let's Encrypt SSL certificates inside Docker Compose, deployed to an AWS EC2 instance at `di.glassx.ai`.
* **Services**:
  1. `nextjs-app`: Runs the monolithic Next.js application in production mode (`npm run start`), exposed only to the internal Docker network on port `3000`.
  2. `nginx-proxy`: Serves as the gateway on ports `80` and `443`. Redirects HTTP to HTTPS, sets security headers, preserves client IP headers (`X-Real-IP`, `X-Forwarded-For`), supports WebSockets/streaming, and exposes the app.
  3. `certbot`: An automated SSL helper that coordinates Let's Encrypt validation and automatically renews the SSL certificates for `di.glassx.ai`.
* **Host Platform**: AWS EC2 instance running Ubuntu 24.04 LTS (recommended: `t3.medium`, 20–30GB gp3 SSD).
* **Security Requirements**:
  - `GEMINI_API_KEY` loaded dynamically from a host-level `.env` file; secrets are never committed.
  - Ports `80` and `443` open globally. Port `22` (SSH) restricted to trusted IPs.
  - Internal application port `3000` is blocked from public exposure.
  - UFW (Uncomplicated Firewall) enabled on the host.

---

## 10. Phase 15: Future Decoupled Microservices Evaluation
* **Goal**: Only after the monolithic deployment is stable on EC2, evaluate extracting functions into separate services:
  - `api-service`: Express/NodeJS backend handling business logic and LLM reasoning.
  - `data-service`: Mock BigQuery storage layer.
  - `looker-connector-service`: Governed Semantic Layer wrapper.
  - `gemini-orchestrator-service`: Generative AI handler.
  - `observability-service`: Logging and audit trail collection.

---

## 11. CogniX Capability Atlas (Parallel Workstream)

> **The CogniX Capability Atlas is an independently scheduled workstream. Its existence does not
> supersede, close, reorder or implicitly deprioritise existing unfinished CogniX work packages.**

### 11.1 Separation statement

- Phases 1–15 above keep their identifiers, sequence and status. Establishing the Atlas has changed,
  completed, reordered and reinterpreted **none** of them.
- The Atlas uses the `CAT-nn` namespace specifically so that it cannot collide with the `Phase N`
  numbering used above.
- No CAT phase depends on a Phase 1–15 item completing, and no Phase 1–15 item depends on a CAT phase.
  Atlas work may proceed in parallel whenever dependencies within its own programme allow.
- Work items from Phases 1–15 must not be moved into the Atlas namespace, and no Atlas phase may be
  marked complete on the strength of adjacent non-Atlas delivery.

### 11.2 What the Atlas is

The governed knowledge, discovery, explanation and enablement layer for the CogniX Innovation Lab —
*"Explore what CogniX can do, how capabilities work, where they apply, how to demonstrate them, and how
they can be reused."* It is not merely a replacement About page; the About section is only its first
exposure surface. Capability knowledge is backend-driven and is never stored as static JSX/HTML.

Naming note: no occurrence of "CogniX" exists in this repository's code or data today. CogniX is the
platform identity introduced at the governance layer by this programme. **Renaming this application,
its packages, its UI or Phases 1–15 is explicitly out of scope for CAT-01…CAT-07.**

### 11.3 Programme phases

| Phase | Name | Purpose | Depends on |
|-------|------|---------|-----------|
| **CAT-01** | Capability Discovery, Governance & Information Model | Forensic, evidence-reconciled inventory; taxonomy; schema instantiation; storyboard migration assessment. **No runtime implementation.** | — |
| **CAT-02** | Capability Knowledge Backend | Canonical model, validator, repository, read APIs, filtering, versioning, provenance, tests. | CAT-01 |
| **CAT-03** | Retail & Grocery Knowledge Population | Governed records for every inventoried capability, evidence-checked against implementation. | CAT-01, CAT-02 |
| **CAT-04** | Atlas UX & Structured Search | Search-first landing, capability detail, filters, audience lenses, relationships, Demo Path. Storyboard retirement only if SB-GATE passes. | CAT-02, CAT-03 |
| **CAT-05** | Internal AI Retrieval & Ask CogniX | Semantic retrieval, internal RAG, AI gateway, citations, guardrails, evaluation tests. Internal knowledge only. | CAT-04 |
| **CAT-06** | Google AI, Search Grounding & Market Intelligence | Gemini behind the backend, controlled grounding, provenance, internal/external separation, **"Prepare me for a client conversation"**. | CAT-05 |
| **CAT-07** | Capability Lifecycle Governance & Automation | Completeness, evidence, drift and freshness checks; review dates; publication gates. | CAT-02, CAT-03 (may run parallel to CAT-05/06) |

### 11.4 Current status

**Programme governance:** established (2026-08-20).
**Current phase:** CAT-01 — NOT STARTED.
**Last completed work package:** NONE.
**Next executable work package:** **CAT-01**.
**Blocked by other CogniX work:** NO.

The authoritative status board is §0 of [`COGNIX_CAPABILITY_ATLAS.md`](COGNIX_CAPABILITY_ATLAS.md).
This section is a pointer; if the two disagree, the Atlas charter is correct and this section must be
resynchronised.

### 11.5 Governance documents

| Document | Covers |
|----------|--------|
| [`COGNIX_CAPABILITY_ATLAS.md`](COGNIX_CAPABILITY_ATLAS.md) | Programme charter, status board, CAT-01…CAT-07 work-package contracts, SB-GATE, **How to Resume Capability Atlas Work** |
| [`CAPABILITY_KNOWLEDGE_MODEL.md`](CAPABILITY_KNOWLEDGE_MODEL.md) | Canonical schema, maturity model, field tiers, validation rules, publication readiness, audience lenses, Demo Path, Questions Worth Asking |
| [`CAPABILITY_ATLAS_ARCHITECTURE.md`](CAPABILITY_ATLAS_ARCHITECTURE.md) | Backend architecture, knowledge store, API surface, domain independence, architecture documentation model, Platform Capability Map, storyboard migration |
| [`CAPABILITY_ATLAS_CONTENT_STANDARD.md`](CAPABILITY_ATLAS_CONTENT_STANDARD.md) | Truthfulness gate, writing standard, internal-vs-external truth, market intelligence standard, provenance, review and ownership |
| [`CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md`](CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md) | Three search levels, Atlas AI Gateway, Gemini architecture, query routing, **"Prepare me for a client conversation"**, evaluation |
| [`CAPABILITY_ATLAS_UX_SPEC.md`](CAPABILITY_ATLAS_UX_SPEC.md) | Design intent, anti-patterns, progressive disclosure, search-first landing, evidence presentation, accessibility |
| [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) | ADR-0001…ADR-0009 |

### 11.6 Observation on existing unfinished work (status unchanged)

Recorded for accuracy while establishing the Atlas; **nothing about it has been altered, resolved or
absorbed into the Atlas**: Phase 5 (Labour Optimisation Screen, §4 above) has no corresponding
component in the tree — `components/LabourOptimisation.tsx` does not exist and `app/page.tsx` has no
`labour` route case. Only an anomaly branch in `lib/query-engine.ts` (~line 386) emits a `labour`
anomaly type. This remains existing unfinished non-Atlas work and retains its Phase 5 identity and
position. CAT-01 will record it as a plan/implementation contradiction; resolving it is not Atlas work.

