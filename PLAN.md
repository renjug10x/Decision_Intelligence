# Lidl UK Decision Intelligence POC — Plan & Roadmap

This document serves as the project plan and implementation roadmap for refining the Lidl Decision Intelligence POC into a highly-focused, premium retail executive demo.

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

---

## 5. Acceptance Criteria
* **Execution Time**: Entire demo flow completes under 20 minutes.
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
