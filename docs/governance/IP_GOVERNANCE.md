# COGNIX IP GOVERNANCE & ASSET CLASSIFICATION FRAMEWORK

**Document Status:** Approved & Authoritative  
**Version:** 1.0.0  
**Effective Date:** August 2026  
**Owner:** G10X IP Governance & Legal Counsel  

---

## 1. Overview & Objectives

As G10X’s Enterprise Innovation Lab, **CogniX** creates, refines, and demonstrates valuable intellectual property (IP). This framework governs the classification, tracking, provenance, and commercial protection of all concepts, code, data models, and visual assets within CogniX.

> *Note: Formal legal enforceability remains subject to specific G10X client contracts and jurisdiction-specific legal review.*

---

## 2. IP Classification Hierarchy

Every experiment, data model, and code asset in CogniX must carry one of five explicit IP classifications:

| Classification | Definition & Usage Boundaries |
| :--- | :--- |
| **Open Innovation** | Publicly shareable concepts, open thought leadership, and generic industry patterns. Safe for public executive presentations and whitepapers. |
| **G10X Proprietary** | Core G10X lab IP, algorithms, decision models, visual components, and accelerator code. Kept strictly within G10X and demonstrated to prospective clients under NDA/demo terms. |
| **Client Confidential** | Synthetic datasets, scenario parameters, or domain logic created specifically to mirror a client's operating environment during a private validation session. |
| **Joint Innovation** | Co-created concepts developed under formal joint-innovation agreements between G10X and strategic corporate partners. |
| **Client Exclusive** | Bespoke code, custom connectors, or specific algorithms built during a paid engagement for exclusive client ownership. *Must never be stored in the core CogniX repository.* |

---

## 3. The Value Progression Hierarchy

CogniX establishes a clear boundary between lab assets and client deliverables:

```text
  [ Concept ] ──────>  High-level strategic idea or provocative question.
       ↓
[ G10X Blueprint ] ──> Architectural pattern, causal schema, and UX flow.
       ↓
[ Reference Accelerator ] ──> Standardized, reusable G10X software code module.
       ↓
[ Client Implementation ] ─> Production deployment built on client's infrastructure.
```

- **CogniX Repository Scope:** Stores *Concepts*, *G10X Blueprints*, and *Reference Accelerators*.
- **Client Workspace Scope:** *Client Implementations* are delivered in isolated client repositories owned by the client.

---

## 4. Provenance & Metadata Requirements

All experiment metadata objects must declare IP provenance attributes:

```typescript
export interface IpProvenance {
  ipClassification: 'Open Innovation' | 'G10X Proprietary' | 'Client Confidential' | 'Joint Innovation' | 'Client Exclusive';
  originator: string;          // Author / Lab Group
  createdDate: string;         // ISO Date
  lastAuditDate: string;       // ISO Date
  patentPending: boolean;      // True if patent application filed
  derivativeAllowed: boolean;  // True if reusable in client engagements
}
```
