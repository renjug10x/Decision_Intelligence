# COGNIX — CURRENT STATE ASSESSMENT & CODEBASE AUDIT

**Date:** 12 August 2026  
**Repository Baseline:** `gitlab/Feature/MatchingContract-AutoActivate`  
**Commit:** `aef18ba2ee89b99a4d328003cfe7c79764635bbb`  
**Author:** CogniX Transformation Team

---

## 1. Executive Summary

This document establishes the authoritative current-state assessment of the codebase prior to its transformation into **CogniX** (the G10X Enterprise Innovation Lab). 

The repository originated as a retail Decision Intelligence Proof of Concept (POC) specifically branded and formatted for Lidl UK. It is built on modern web technologies: Next.js 16 (Turbopack), React 19, TypeScript 5, Chart.js, and Lucide React icons, with integration into Google Generative AI (Gemini 1.5/2.0 API).

While the application features strong interactive components (e.g. Executive Briefing, Store Copilot, Category Intelligence, Supply Chain Radar, Waste & Availability Intelligence), it is currently tightly coupled to a single retail customer brand (Lidl UK), monolithic dashboard navigation, and rigid retail domain data schemas.

---

## 2. Git & Repository Continuity Audit

| Property | Status / Value |
| :--- | :--- |
| **Repository Root** | `/Users/renjunair/projects/Decision_Intelligence` |
| **Active Local Branch** | `Feature/MatchingContract-AutoActivate` |
| **Remote Tracking Branch** | `gitlab/Feature/MatchingContract-AutoActivate` |
| **HEAD Commit** | `aef18ba2ee89b99a4d328003cfe7c79764635bbb` |
| **Commit Message** | `Added reset button and approve option clearance on cache clear and removed server data storing` |
| **Divergence State** | Clean, up-to-date with remote |
| **Working Tree** | Clean (1 untracked scratch file: `scratch_slides.txt`) |
| **Remotes** | `gitlab` (`https://repo.glassx.ai/development/decision-intelligence.git`), `origin` (`git@github.com:renjug10x/Decision_Intelligence.git`) |

---

## 3. Application & Architectural Analysis

### 3.1 Framework & Core Stack
- **Framework:** Next.js 16.2.7 (Turbopack) App Router
- **Runtime & Language:** Node.js, React 19.2.4, TypeScript 5
- **Styling:** Vanilla CSS (`globals.css`) with custom CSS variables (dark theme with legacy `--lidl-blue`, `--lidl-yellow`, `--lidl-red` tokens)
- **Visuals & Icons:** Lucide React (`lucide-react`)
- **Data Visualisation:** Chart.js 4.5.1 + `react-chartjs-2`
- **AI Integration:** `@google/generative-ai` (Gemini API wrapper in `lib/gemini.ts`)
- **HTTP & Utilities:** Axios, `pdf-lib` (optional PDF contract parser script)

### 3.2 Routes & Page Shell
The application currently uses a client-side tab state rendered within `app/page.tsx`, wrapped by `Sidebar.tsx`.
- `/page.tsx` — Main application shell with tab switcher (`dashboard`, `briefing`, `store-copilot`, `category`, `supply-chain`, `waste`, `availability`, `promotions`, `forecasting`, `settings`, `help`).
- `/login/page.tsx` — Authentication screen (supporting email + passkey demo login).
- `/platform-setup/page.tsx` — Initial wizard for configuring role & industry context.
- `/reset-password/page.tsx` & `/complete-registration/page.tsx` — Auth auxiliary pages.
- `/api/*` — Next.js API route handlers for Gemini AI chat (`/api/ask`), decisions state (`/api/decisions`), executive briefing generation (`/api/briefing`), health check (`/api/health`), and mock data (`/api/data`).

### 3.3 Components Audit
1. `Sidebar.tsx`: Navigation sidebar with role-based IAM lock checks and brand headers.
2. `CommandCentre.tsx` / `TodayPriorities.tsx`: KPI summary cards, decision action queue, financial exposure metrics.
3. `BriefingCentre.tsx`: Executive brief generator with Gemini integration, audio playback simulation, and confidence scores.
4. `CategoryIntelligence.tsx`: Category margin, revenue, and store-level breakdown tables.
5. `SupplyChainRadar.tsx`: Supplier lead time, delivery fulfillment, OOS risk tracking, contract auto-activation modal.
6. `WasteIntelligence.tsx`: Perishable waste tracking, markdown recommendations, spoil predictions.
7. `AvailabilityIntelligence.tsx`: On-shelf availability, store gap analysis, replenishment triggers.
8. `PromotionPlanner.tsx`: Promotional scenario modeling, ROI simulator, cannibalisation metrics.
9. `Forecasting.tsx`: Multi-model forecast charts (Base, Promotional, Weather adjusted).
10. `StoreCopilot.tsx`: Store manager task execution interface & AppSheet workflow bridge.
11. `ArchitectureExplorer.tsx`: 14-slide interactive presentation deck on platform architecture.
12. `Settings.tsx`: Role & IAM rules, Looker instance configuration, AI model selection.
13. `Help.tsx`: Documentation, architecture diagrams, user guides.
14. `G10XLogo.tsx`: Clean SVG logo component for G10X branding.

### 3.4 Data & Domain Services
- `data/*.json`: Static seed data (`contract-library.json`, `decisions.json`, `promotions.json`, `supply_chain.json`, `sales_daily.json`, `contracts.json`, `stores.json`, `products.json`, `suppliers.json`).
- `lib/gemini.ts`: Direct client/server calls to Google Gemini API (`gemini-1.5-flash` / `gemini-2.0-flash`).
- `lib/decision-engine.ts`: In-memory rule engine evaluating decision impact, confidence, and action status.
- `lib/semantic-layer.ts`: Data transformation helpers for Looker LookML-like semantic queries.

---

## 4. Functional Classification Matrix

To guide the transformation into CogniX, existing capabilities are classified as follows:

| Capability / File | Current Role | Target CogniX Classification | Justification & Refactoring Path |
| :--- | :--- | :--- | :--- |
| `G10XLogo.tsx`, `lib/context.tsx`, `lib/gemini.ts` | Core branding & AI utilities | **KEEP & ENHANCE** | Retain as foundation; expand Gemini integration to support Curiosity Engine. |
| `BriefingCentre.tsx` | Executive AI Briefing | **REFACTOR** | Shift focus from retail dashboard summary to Experiment Evidence & Scenario Briefing. |
| `SupplyChainRadar.tsx`, `data/contract-library.json` | Contract auto-activation & supply chain alerts | **REUSE & REFACTOR** | Evolve into core data provider for **Commitment Intelligence** experiment. |
| `PromotionPlanner.tsx` & `Forecasting.tsx` | Promo scenario & demand impact | **REUSE & REFACTOR** | Re-engineer as engine for **Decision Ripple Intelligence** experiment. |
| `CommandCentre.tsx` / `TodayPriorities.tsx` | Retail KPI priority cockpit | **REPLACE** | Replace landing view with Curiosity-driven **Innovation Portfolio** landing experience. |
| `ArchitectureExplorer.tsx` | 14-slide retail presentation | **REFACTOR** | Update slides to present CogniX Innovation Lab philosophy & G10X accelerators. |
| `CategoryIntelligence.tsx`, `WasteIntelligence.tsx` | Retail specific metric grids | **DEFER / PACK** | Move into configurable **Retail Industry Pack**; retain for demo depth. |
| `globals.css` (Lidl Blue/Yellow/Red) | Brand styling | **REMOVE / REPLACE** | Purge Lidl visual identity; apply sleek, spacious G10X Enterprise design system. |
| Hard-coded Lidl Strings (`Lidl UK`, `lidl-decision-poc`) | Branding text | **REMOVE / NEUTRALISE** | Cleanse all customer-specific references; parameterise industry demo context. |

---

## 5. Customer Dependencies & Technical Debt Audit

1. **Brand Branding Hardcoding:**
   - `package.json`: `"name": "lidl-decision-poc"`
   - `app/layout.tsx`: `title: 'LiDL DI'`
   - `globals.css`: `--lidl-blue`, `--lidl-yellow`, `--lidl-red`
   - `components/Sidebar.tsx`: `Lidl UK · Beta`
   - `components/ArchitectureExplorer.tsx`: 20+ references to `Lidl UK Strategy`, `Lidl 2028`, `Lidl Board`.
   - `data/contract-library.json`: Document references formatted as `LIDL-UK/SUP/2024/FD-001`.
2. **Dashboard Monolith Paradigm:**
   - Navigation follows a conventional BI tool structure (Category, Supply Chain, Waste, Availability, Promotions).
   - Needs transformation to an **Innovation Portfolio** & **Curiosity-driven UX** (`Questions Worth Asking`, `Experiment Canvas`, `Commitment Intelligence`, `Decision Ripple Intelligence`).
3. **Data Dependency:**
   - Demo datasets hardcode specific retail locations (e.g. `Piccadilly S001`, `North West`).
   - Needs abstraction into configurable **Industry Demonstration Packs** (e.g. Retail, Grocery, Omnichannel).

---

## 6. Baseline Verification Status

- **Node Dependencies:** Verified (`npm install` executed clean).
- **TypeScript & Build Verification:** Verified (`npm run build` completed with zero TypeScript or compilation errors).
- **Production Smoke Test:** Verified via `scripts/smoke-test.sh`.

---

## 7. Next Steps

With this current-state assessment complete, the transformation sequence moves directly to establishing the **CogniX Governance Foundation** and **Target Architecture** before any production code changes commence.
