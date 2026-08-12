# COGNIX EXECUTIVE DEMONSTRATION RUNBOOK (10-MINUTE FACILITATION GUIDE)

**Document Status:** Approved & Authoritative  
**Version:** 1.0.0  
**Effective Date:** August 2026  
**Target Audience:** G10X Executive Consultants, Managing Directors, Solution Architects  

---

## 1. Facilitation Purpose & Mindset

> **Core Rule:** Do NOT position CogniX as a software product you are attempting to sell to the client. Position CogniX as G10X's Enterprise Innovation Lab where novel operational concepts are rapidly prototyped and tested.

The goal of this 10-minute demonstration is to **trigger C-suite curiosity**, challenge siloed operational assumptions, and open a strategic dialogue regarding a custom G10X Discovery Pilot or Cloud Solution engagement.

---

## 1.1 Local Environment Prerequisites & Demo Auth Mode

Before running a local demonstration on `http://localhost:3000`:
- Ensure `.env.local` includes:
  ```env
  NEXT_PUBLIC_COGNIX_DEMO_MODE=true
  ```
- This activates the controlled CogniX demo authentication bypass, establishing a synthetic identity (`Name: Demo User`, `Role: Innovation Executive`, `Org: G10X`) and bypassing backend identity microservice calls.

---

## 2. 10-Minute Executive Facilitation Script

### 00:00 – 01:30 | Opening: What CogniX Is
- **Screen:** CogniX Landing Page (`/` — Innovation Portfolio)
- **Facilitator Script:**
  > *"Welcome. What you are looking at is **CogniX**, G10X’s Enterprise Innovation Lab. CogniX isn't another BI dashboard or software product we sell. It’s a living innovation environment where we prototype emerging enterprise operating models, validate them with executive leadership, and convert successful experiments into bespoke client solutions built on your existing cloud infrastructure."*

---

### 01:30 – 03:00 | Curiosity Engine: "Questions Worth Asking"
- **Navigation:** Click **Questions Worth Asking** in the top prompt banner or sidebar navigation.
- **Screen:** `Questions Worth Asking` (`/curiosity`)
- **Facilitator Script:**
  > *"Most enterprise platforms wait for a user to type a search query or inspect 20 dashboard charts. CogniX inverts that experience through curiosity-driven analytics. Here, CogniX continuously evaluates enterprise signals to surface provocative executive questions."*
- **Action:** Click card: *"What if the enterprise could detect a broken promise 14 days before the customer experiences it?"*
- **Facilitator Script:**
  > *"Notice how the Gemini AI engine synthesizes the underlying telemetry—revealing that while marketing's demand forecast is accurate, supplier capacity limits will cause a 1,400-case deficit in week 3."*
- **Action:** Click **Launch Underlying Experiment Workspace**.

---

### 03:00 – 06:00 | Flagship 1: Commitment Intelligence
- **Screen:** `Commitment Intelligence` Experiment Canvas (`EXP-COMMITMENT-01`)
- **Facilitator Script:**
  > *"Here is our first flagship prototype: **Commitment Intelligence**. Traditional BI tools report out-of-stock events days after they occur. ERPs evaluate inventory independently of marketing campaigns."*
  >
  > *"CogniX models the continuous commitment chain from Marketing Promotion to Demand, Supplier Capacity, Inventory Buffer, Delivery SLA, and Customer Promise."*
- **Action:** Adjust the **Marketing Promo Lift** slider to `+28%`. Point out how the red drift indicator highlights the broken commitment stage.
- **Key Insight Statement (Emphasize Clearly):**
  > ***"The forecast hasn't failed (+28% demand accurately predicted). The business commitments surrounding it have become incompatible."***
- **Action:** Click **Execute Intervention** to toggle *Secondary Supplier SLA Flex Rule #4*. Point out how financial risk drops from £168,000 to £0 and customer promise is protected.

---

### 06:00 – 08:30 | Flagship 2: Decision Ripple Intelligence
- **Navigation:** Click **Decision Ripple Intel** (`EXP-RIPPLE-02`) in sidebar.
- **Screen:** `Decision Ripple Intelligence` Canvas
- **Facilitator Script:**
  > *"Our second flagship experiment addresses cross-functional side effects: **Decision Ripple Intelligence**. When a commercial leader decides to boost promotional spend by 15%, what happens everywhere else?"*
- **Action:** Toggle between **National**, **Regional**, and **Phased** deployment scopes.
- **Facilitator Script:**
  > *"Notice how CogniX distinguishes 1st, 2nd, and 3rd order effects:"*
  > - ***1st Order (Direct Impact):*** *£480,000 gross revenue lift.*
  > - ***2nd Order (Operational Side Effects):*** *£32,000 warehouse overtime cost due to DC bottlenecks.*
  > - ***3rd Order (Net Impact):*** *Net margin compresses by 2.2% due to emergency air freight fees.*
  > *"Stakeholders can rehearse strategic choices before committing budget."*

---

### 08:30 – 10:00 | Closing & Client Transition
- **Navigation:** Click **Innovation Portfolio** (`/portfolio`).
- **Facilitator Script:**
  > *"Every experiment in CogniX follows a strict lifecycle. Successful prototypes mature into G10X reference accelerators or custom client implementations deployed directly on your GCP/Snowflake stack."*
  >
  > *"How does your organization currently detect commitment drift between marketing promotions and supplier delivery capabilities? Where could a 4-week G10X Discovery Pilot validate these ideas on your data?"*

---

## 3. Post-Demo Action Items for Consultants
1. Log executive feedback, resonance levels, and edge cases in the client meeting notes.
2. Share the exportable experiment blueprint summary sheet with the client sponsor.
3. Initiate scoping for a G10X 4-week Discovery Pilot engagement.
