# COGNIX INFORMATION ARCHITECTURE & COMPONENT STRATEGY

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** CogniX UX & Architecture Team

---

## 1. Information Architecture Overview

CogniX transitions from a monolithic BI tab layout to a structured **Innovation Lab Information Architecture**.

```text
COGNIX LAB SHELL
  │
  ├── 1. INNOVATION LAB (Primary Landing)
  │    ├── 1.1 Innovation Portfolio (Default view — active experiment grid)
  │    ├── 1.2 Innovation Explorer (Search & filter experiments by industry/maturity)
  │    └── 1.3 Questions Worth Asking (Proactive curiosity engine)
  │
  ├── 2. FLAGSHIP EXPERIMENTS (Interactive Workspaces)
  │    ├── 2.1 Commitment Intelligence (Interactive commitment graph & drift simulator)
  │    ├── 2.2 Decision Ripple Intelligence (Multi-order cross-functional impact simulator)
  │    └── 2.3 Enterprise Memory (Historical decision lookup & pattern matching)
  │
  ├── 3. DEMONSTRATION PACKS (Industry Vertical Contexts)
  │    ├── 3.1 Retail & Grocery Pack (Store, supplier, waste, availability metrics)
  │    └── 3.2 Supply Chain & Logistics Pack (Fulfillment & delivery risk telemetry)
  │
  └── 4. GOVERNANCE & ARCHITECTURE
       ├── 4.1 IP Registry & Asset Provenance
       └── 4.2 Platform Architecture Explorer (Interactive 14-slide G10X presentation)
```

---

## 2. Component Strategy & Architecture

### 2.1 Shared Layout & Shell
- `app/layout.tsx`: Root HTML shell with font configuration & global context provider (`Providers`).
- `app/page.tsx`: Dynamic page shell holding the topbar, G10X brand header, demo role switcher, industry pack selector, notification bell, and active experiment view renderer.
- `components/Sidebar.tsx`: Navigation sidebar cleanly partitioned into Innovation Lab, Active Experiments, Industry Packs, and Governance sections.

### 2.2 CogniX Core Components
- `components/InnovationPortfolio.tsx`: [NEW] Executive landing grid presenting active experiments, provocative questions, maturity badges, and IP tags.
- `components/QuestionsWorthAsking.tsx`: [NEW] Curiosity engine displaying high-value executive prompts with direct evidence panel links.
- `components/ExperimentCanvas.tsx`: [NEW] Reusable canvas rendering experiment metadata, scenario parameters, interactive simulators, evidence drawers, and Gemini AI narrative synthesis.
- `components/CommitmentIntelligence.tsx`: [NEW] Flagship experiment workspace for commitment chain drift analysis.
- `components/DecisionRippleIntelligence.tsx`: [NEW] Flagship experiment workspace for 1st, 2nd, 3rd order decision ripple simulation.

### 2.3 Refactored Existing Components
- `components/BriefingCentre.tsx`: Updated to generate Executive Briefings based on experiment evidence rather than retail store KPIs.
- `components/SupplyChainRadar.tsx`: Integrated into Retail/Supply Chain Industry Pack as underlying data provider.
- `components/ArchitectureExplorer.tsx`: Updated 14-slide deck to present CogniX Enterprise Innovation Lab positioning and G10X accelerators.
- `components/G10XLogo.tsx`: Primary brand logo asset.

---

## 3. Configuration & Registry Services
- `config/experiments.ts`: Metadata for all 4 flagship experiments (`EXP-COMMITMENT-01`, `EXP-RIPPLE-02`, `EXP-MEMORY-03`, `EXP-OPPORTUNITY-04`).
- `config/solutions.ts`: Metadata for all 4 demonstration solutions (`SOL-PROMO-01`, `SOL-DEMAND-02`, `SOL-INV-03`, `SOL-CAT-04`).
- `config/patterns.ts`: Enterprise Learning Pattern registry (`PAT-COMMIT-01`, `PAT-RIPPLE-04`, `PAT-FRESH-02`, `PAT-WEATHER-06`).
- `config/domains.ts`: [NEW] Configuration-driven domain catalogue (Commerce & Consumer, Hospitality, Transport, Tech, Industrial, Financial).
- `config/personas.ts`: [NEW] Configuration-driven decision lens catalogue (Executive, Commercial & Planning, Data & Intelligence, Operations, Technology).

---

## 4. Domain Context & Decision Lens Model

```text
CogniX Shell Context
  ├── Domain Context (config/domains.ts)
  │    ├── Retail & Grocery [ACTIVE]
  │    └── Future Domain Packs [COMING SOON]
  │
  └── Persona / Decision Lens (config/personas.ts)
       ├── Innovation Executive (Strategic opportunity & IP lens)
       ├── Chief Operating Officer (Operational continuity & headroom lens)
       ├── Category Lead (Category yield & vendor capacity lens)
       └── Operations Lead (Store availability & execution compliance lens)
```

- `config/experiments.ts`: Typed experiment registry containing canonical metadata for all lab experiments.
- `config/industry-packs.ts`: Runtime configuration switching terminology, KPIs, and demo scenarios between Retail, CPG, and Logistics.
- `lib/gemini.ts`: Generative AI service wrapper delivering evidence-grounded executive summaries.

---

## 4. Service Architecture IA Decoupling Principles (Planned Future State)

- **Frontend Continuity:** UI navigation remains strictly organized around **Innovation Experiments** and **Demonstration Solutions** so executive user journeys remain intuitive and uncluttered.
- **Service Invisibility:** The underlying 7-deployable service topology (`cognix-web`, `cognix-core`, `cognix-world`, `cognix-decision`, `cognix-learning`, `cognix-intelligence`, `cognix-governance`) operates entirely behind backend API and event boundaries.
- **Presentation Decoupling:** Frontend views consume structured `/api/v1/...` REST endpoints and publish client events without directly embedding domain simulation logic. Technical service boundaries remain 100% invisible to end users.

---

## 5. Campaign Decision Intelligence Information Architecture & Visual Surfaces

### 5.1 Campaign Decision Intelligence UI Workspace (`components/CampaignDecisionCanvas.tsx`)
Campaign Decision Intelligence is mapped into the Information Architecture as a progressive, non-cockpit decision canvas with 5 dedicated progressive disclosure layers:

```text
Campaign Decision Intelligence Workspace
  │
  ├── Layer 1: Campaign Intent & Objective
  │    ├── Intent Selector (Inventory Clearance, Revenue Acceleration, Market Defense, Launch)
  │    └── Baseline & Operational Constraints (Volume, Revenue, Cost, Capacity Caps)
  │
  ├── Layer 2: Decision Timeline & Counterfactual Baseline
  │    ├── Observed Current Run-Rate
  │    ├── Expected Without Intervention (Counterfactual Baseline)
  │    ├── Expected With Intervention (Campaign Demand + Confidence Envelope)
  │    └── Multi-Lens Selector (Demand | Revenue | Contribution | Inventory)
  │
  ├── Layer 3: Campaign Decision Readiness
  │    ├── Overall Readiness Score (GO / CONDITIONAL GO / REVIEW / DO NOT PROCEED)
  │    ├── 6-Dimension Evaluation (Commercial, Demand, Operational, Context, Customer, Strategic)
  │    └── Material Reconsideration Triggers
  │
  ├── Layer 4: Multi-Objective Outcome Frontier & AI Competing Strategies
  │    ├── Strategy Plays (Growth Play, Margin-Protected Play, Waste-Reduction Play, Balanced)
  │    ├── Counterfactual Scenario 0 (Do Nothing)
  │    └── Non-Promotion Alternatives (e.g. Stock Reallocation)
  │
  └── Layer 5: Progressive Evidence & Closed Learning Loop
       ├── Curiosity-Driven Demand Decomposition (What? → Why? → Evidence → What If?)
       ├── Campaign Pre-Mortem (Failure modes, grounding, consequence order, resilience → Decision Ripple)
       └── Closed Learning Loop & Historical Analogues (Enterprise Memory & Learning Patterns)
```
