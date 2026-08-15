# COGNIX UX & VISUAL DESIGN PRINCIPLES

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** G10X Experience & Design Systems Group

---

## 1. Visual Identity & Aesthetic Vision

CogniX reflects **G10X's visual identity**: sleek, premium, spacious, intellectual, and enterprise-ready. It communicates innovation through composition, typography, whitespace, and intelligent storytelling rather than visual gimmicks.

### What CogniX FEELS Like:
- **Intelligent & Calm:** Crisp typography, generous whitespace, balanced visual rhythm.
- **Spacious & Executive:** Clean light/neutral background primary palette with subtle dark elevation accents.
- **Curious & Exploratory:** Prominent curiosity prompts, evidence drawers, interactive scenario controls.
- **Credible & Authoritative:** High data density when inspecting evidence, zero placeholder metrics.

### What CogniX NEVER Looks Like:
- ❌ NOT a dark-mode cybersecurity matrix or neon AI demo
- ❌ NOT a generic admin template full of repetitive cards
- ❌ NOT a cluttered BI dashboard with 20 competing charts
- ❌ NOT branded for any single customer (e.g. Lidl retail identity completely removed)

---

### 1.1 Brand Wordmark & Visual Identity
CogniX is branded cleanly through typography rather than heavy decorative icons or waveforms:
- **C** = G10X Orange (`#FF6B00`)
- **ogni** = Near-Black Charcoal (`#0F172A`)
- **X** = G10X Red (`#E11D48`)
- **Secondary Descriptor:** `G10X INNOVATION STUDIO` (10px, weight 500, uppercase).

### 1.2 G10X Semantic Color Model
Color in CogniX is strictly semantic and functional:
- **Canvas & Surfaces:** White (`#FFFFFF`) / Light neutral (`#F8FAFC`).
- **Navigation (Sidebar & Top Bar):** Light neutral surfaces (`#F8FAFC` / `#FFFFFF` with `#E2E8F0` border).
- **Curiosity, Opportunity & Exploration:** G10X Orange (`#FF6B00`).
- **Risk, Tension, Constraint & Commitment Gap:** G10X Red (`#E11D48`).
- **Success & Protection:** Semantic Green (`#059669`).
- **Primary Typography:** Near-Black Charcoal (`#0F172A`).
- **Secondary Typography:** Muted Slate (`#475569` / `#64748B`).

---

## 3. Shell Architecture & One-Title UX Rules

### 3.1 One Authoritative Page Title Rule
- **The body owns page identity:** Every CogniX experience has one primary visible page title rendered inside the page body content.
- **Header simplification:** The global top bar header does NOT duplicate or repeat the current page name.
- **Top bar role:** The top bar functions strictly as a quiet **context and control bar** (Domain Context + Persona + Notifications).

### 3.2 Global Shell Controls & Navigation
- **CogniX Wordmark = Home:** Clicking the CogniX wordmark returns the user to the Innovation Portfolio while preserving active Domain Context and Persona.
- **Domain Context Selector:** Specifies the active enterprise environment (e.g. `Retail & Grocery` [Active]). Unavailable domains are listed with `(Coming Soon)` and present honest teaser preview feedback without switching to empty/fake states.
- **Persona / Decision Lens Selector:** Specifies the user's decision perspective (e.g. `Innovation Executive`, `Chief Operating Officer`, `Category Lead`).
- **Notification Feedback:** Interactive notification controls provide clear "Notifications coming soon" feedback when clicked and avoid displaying fake unread counts.
- **Exit Demo Control:** In demo mode, the sidebar footer provides an explicit `Exit Demo` action that clears session state and returns to the platform setup entry screen.

---

## 4. Refined Typography Scale & Hierarchy

CogniX enforces a smaller, lighter, spacious typographic scale:
- **Primary Hero:** `28–32px`, Weight `600`
- **Page Title:** `20–22px`, Weight `600`
- **Section Heading:** `16–18px`, Weight `600`
- **Card / Item Title:** `14–16px`, Weight `500–600`
- **Body Text:** `13–14px`, Weight `400`
- **Secondary Body:** `12–13px`, Weight `400`
- **Metadata:** `10–12px`, Weight `400–500`
- **Buttons & Actions:** `12–13px`, Weight `500–600`

---

## 3. Three-Tier Action Button Hierarchy

1. **Primary Action:** Used sparingly (e.g. `Execute Action`).
2. **Secondary Action:** Subtly bordered surface (`#FFFFFF` with `#E2E8F0`).
3. **Exploratory Action:** Text-first links (`Explore →`, `Inspect Evidence →`, `Open Solution →`).

---

## 3. The Five-Second Rule & Word Ceiling Criteria

Every primary CogniX screen and Demonstration Solution MUST answer within approximately **five seconds**:
1. **What am I looking at?**
2. **Why is something interesting?**
3. **What can I explore or do next?**

### Word Ceiling Design Guardrail:
> No primary CogniX screen should normally require an executive to read more than **40–60 words** before reaching meaningful interaction, visual signals, or causal evidence.

### Progressive Disclosure Flow:
```text
Situation → Signal → Curiosity → Interaction → Consequence → Evidence → Explanation
```
Long-form narratives belong behind explicit *"Why?"*, *"Evidence"*, and *"Deep Analysis"* drawers, never blocking the initial discovery.

---

## 4. Executive Journey & Progressive Disclosure

### The First 30 Seconds ("The Hook")
When an executive opens CogniX, they are greeted by the **Curiosity Engine**:
1. **Header Statement:** Clear positioning as G10X Enterprise Innovation Lab.
2. **Questions Worth Asking:** High-impact provocative question cards triggering immediate interest.
3. **Active Experiment Showcase:** Highlighting active lab experiments (Commitment Intelligence, Decision Ripple Intelligence).

### Progressive Disclosure Flow:
```text
  [ Provocative Question ]
             ↓
  [ Innovation Canvas ]  ──> Problem statement, hypothesis, business value.
             ↓
 [ Interactive Demo ]    ──> Scenario controls, live simulation, causal node graphs.
             ↓
  [ Evidence & Reasoning ] ──> Data telemetry, confidence breakdown, Gemini synthesis.
```

---

## 4. Design System Component Tokens

- **Border Radius:** Subtly rounded (`var(--radius-sm)` = 6px, `var(--radius-md)` = 8px, `var(--radius-lg)` = 12px)
- **Elevation Shadows:** Very light, crisp directional shadows (`box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)`).
- **Glassmorphism:** Prohibited except for floating modal backdrop filters where readability demands it.

---

## 5. Campaign Decision Intelligence UX & Progressive Disclosure Patterns

### 5.1 Non-Cockpit Decision Surface
Campaign Decision Intelligence surfaces MUST NOT create dense, cluttered dashboard cockpits. Primary views present progressive disclosure, answering five executive questions in order:
1. **What are we considering?** (Campaign Intent & Objective)
2. **What does CogniX predict?** (Decision Timeline & Counterfactual Baseline)
3. **Should we proceed?** (Campaign Decision Readiness: GO / CONDITIONAL GO / REVIEW / DO NOT PROCEED)
4. **Is there a better intervention?** (Multi-Objective Outcome Frontier & AI Competing Strategies)
5. **What should I investigate?** (Curiosity-Driven Demand Decomposition & Pre-Mortem)

### 5.2 Progressive Disclosure Pattern: `What? → Why? → Evidence → What If?`
Executives are never forced to inspect dense numbers or complex multi-variable breakdown charts upfront:
- **`What?`** High-level headline prediction (e.g. `Campaign Demand +28% · 84% Confidence`).
- **`Why?`** Clicking *Why?* surfaces progressive driver contributions (Mechanic +18.2pp, Audience +6.4pp, Weather +4.1pp, Competitor -2.1pp).
- **`Evidence`** Clicking *Show Evidence* exposes underlying data telemetry, historical analogues, and confidence bounds.
- **`What If?`** Clicking *What If?* opens scenario adjustment controls and alternative trade-off frontiers.

### 5.3 Multi-Objective Outcome Frontier UX
Trade-offs between Revenue, Profit Contribution, Waste Reduction, and Customer Availability are presented as clear strategy cards (*Maximum Growth*, *Maximum Contribution*, *Maximum Waste Reduction*, *Balanced*) with visible, explainable trade-offs—never as opaque single-number optimizations.

### 5.4 Primary Campaign Delta Decision Surface ("Should We Intervene?")
The "Do Nothing vs Proposed Intervention" comparison (Campaign Delta) is elevated as a mandatory primary decision surface. It exposes true incremental net monetary value (£ contribution delta, net volume delta, waste reduction delta), answering: *"Does intervention create more value than doing nothing?"*

### 5.5 Decision Readiness UX: Compact Summary → 6-Dimension Evidence
Decision Readiness is never reduced to a static badge or generic AI text. It follows a 2-tier structure:
- **Tier 1 (Compact Summary):** Overall state (`GO` | `CONDITIONAL GO` | `REVIEW` | `DO NOT PROCEED`) with confidence score.
- **Tier 2 (Progressively Disclosed Evidence):** Interactive drawer exposing 6-dimension evaluation breakdown (*Commercial*, *Demand*, *Operational*, *Context*, *Customer*, *Strategic*) with evidence provenance.

### 5.6 Decision Half-Life UX: Compact Validity Indicator → Validity Evidence
Decision Half-Life is never implemented as a countdown timer, expiry estimate or duration. It follows an evidence-driven pattern:
- **Tier 1 (Compact Indicator):** Validity state only — `STABLE` | `WATCH` | `DEGRADED` | `REASSESS_REQUIRED` | `INDETERMINATE`. No hours, no percentage remaining, no progress bar, no clock, no decay animation. `INDETERMINATE` means insufficient evidence and is rendered distinctly, never as a fifth severity step and never collapsed into `STABLE`.
- **Tier 2 (Progressively Disclosed Evidence):** Assumption and trigger drawer showing each declared assumption, the value it held when the decision was resolved, and which triggers fired, did not fire, or could not be assessed — with the specific signal drifts behind any fired trigger (e.g. weather shift +3.2°C, competitor price change −5%) and whether that movement was scenario-driven or world-driven.

Quantitative duration is unavailable until calibrated temporal evidence exists, and its absence is shown rather than filled. Authoritative semantics: `docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md` §5.
