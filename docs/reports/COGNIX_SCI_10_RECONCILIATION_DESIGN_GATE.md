# `SCI-10` — Reconciliation Design Gate: Attested Upload

**Type:** Design gate. **No application code changed.** `SCI-10` is **not started**; no implementation
branch exists; Wave 4 is **not started**.
**Baseline:** `feature/cognix-sci-08-create-your-own` at `aad33e90b4ee3fb4b65c85d8cdd38e63d709f6c6`
(SCI-08 convergence gate PASSED, 2026-09-25).
**Declares:** the Attested Upload contract — [`COGNIX_ATTESTED_UPLOAD_CONTRACT.md`](../governance/COGNIX_ATTESTED_UPLOAD_CONTRACT.md).
**Decision:** ADR-086.

---

## 1. Baseline, verified

| Fact | Verdict |
|---|---|
| `SCI-08` head | `aad33e90` — local = `origin/feature/cognix-sci-08-create-your-own`, working tree clean |
| `SCI-08` convergence | **PASSED**, recorded in the work-packet register and both Master Plans |
| `SCI-10` | **Not started** — no branch on `origin`, register row "Not started" |
| Wave 4 | **Not started** — no convergence branch, no gate |
| `origin/main` | `dea39ba`, untouched by `SCI-07R`/`SCI-08` |

Read: the `SCI-10` packet, the frozen-contract table and its Gate-D row, ADR-077 … ADR-085, the Scenario
Intelligence architecture (§4, §6), the planning report (§4, §5, §7), `SCI-07`'s record (readiness and
`MEASUREMENT`/`DECLARATION`), the `SCI-07R` and `SCI-08` records, the ESF-6 design gate and its
contract, and the code those name.

## 2. `SCI-10`'s original intent, recovered from the record

| Question | What the record says | Where |
|---|---|---|
| Capability | *"A prospect's own extract enriches a scenario, with provenance, tenancy and auditability inherited rather than rebuilt."* | packet, Business outcome |
| Mechanism | *"Admit user CSV as scenario enrichment through the `ESF-6` attested-observation path"*; *"Admission as attested observations with server-issued identifiers and receipts."* | packet, Objective and Scope |
| What it is not | *"Not a Data Ingestion feature … Uploaded data is scenario enrichment … the product concept is the scenario."* | Scenario Intelligence §6 |
| Why it matters | Readiness reserves `Ready` for observed or attested evidence; a stated MEASUREMENT is `Limited` *"until a file or an attested source supplies it (`SCI-10`)"* | Scenario Draft contract, `SCI-07` record |
| Who creates the artefact | the prospect or demo owner, exporting CSV from their own systems | packet |
| Who attests | ESF-6's model: a **named accountable human**, `FIRST_PARTY_OPERATOR_ATTESTATION`, never defaulted | ESF-6 contract |
| What must never happen | XLSX; ETL; a scenario database; connectors; **raw cell values reaching the model**; formula evaluation; cell values in logs | packet, Non-scope and Security |
| Why deferred | a **scheduling** decision for the 23 September demonstration (priority table, *DEFER — CSV enrichment*), then Gate D's FREEZE and the `R-SCI07-6` blocker. **No record defers it on technical grounds** | §7 of the register; Gate D §18 |

**The original contract row** reads *"CSV source registration and admission mapping over `ESF-6`"*,
frozen "at Gate C" in the planning table and recorded as **NOT DECLARED** at Gate D. It was never
written down beyond that line — which is the Wave-4 blocker this gate removes.

## 3. Reconciliation against the architecture that now exists

### 3.1 The one material finding — ESF-6's observation path is the wrong target

Verified in code rather than inferred:

- ESF-6 admits observations whose category is closed to **`REALISED_COMMERCIAL_ACTUAL`** and
  **`REALISED_OPERATIONAL_ACTUAL`** (`attested-observation-model.ts`), stored as **`OutcomeObservation`**s
  (`lib/attested-observation-store.ts`).
- Its design gate names its purpose: to let **`CDI-08`** reach `WITHIN_DECLARED_ENVELOPE` honestly — the
  comparison of a **committed decision contract** with what then happened.
- `prediction-comparison` resolves observation-admission receipts to `OutcomeObservation`s
  (`app/api/v1/campaigns/decision-contract/[id]/prediction-comparison/route.ts`).

A scenario's weekly demand, store count or stock cover is a **pre-decision input** the record is built
from, not the realised outcome of a decision. Admitting inputs through that path would put non-outcome
data where the learning loop reads outcomes — a semantic contamination of the evidence `CDI-08`'s
authority rests on. **The original mechanism text is therefore not executable as written.**

**Resolved from code, not escalated** — the same way ESF-6 resolved E1–E7: reuse ESF-6's **trust
primitives** unchanged (`SourceAttestation`, server-issued prefixed identifiers,
`checkNoReservedServerFields`, server-derived `synthetic_demo`, the per-tenant monotonic `ServerReceipt`
with one additive kind); **do not** reuse its observation store. The intent — *provenance, tenancy and
auditability inherited rather than rebuilt* — is preserved exactly. ADR-086 part 2.

### 3.2 What an upload produces — the options, weighed

| Option | Verdict |
|---|---|
| a new scenario / candidate scenario | **No.** A second origin of scenarios would bypass the draft, its confirmation and the one lifecycle (ADR-085) |
| a scenario proposal | **No.** Proposals are GenAI's shape (ADR-083) and carry no authority; measured data should |
| evidence *attached to* a draft, read by a separate path | **No.** A second read path to the same inputs is a second authority |
| **measured inputs admitted INTO a draft, with derived `attested` provenance, plus an audit record** | **Yes.** One lifecycle, one set of inputs, one resolver; the upload is the audit of where the values came from |

### 3.3 The established boundaries, checked

| Boundary | Holds? | How |
|---|---|---|
| BFF is the scenario authority | **Yes** | uploads live in the authoring domain in the BFF, bound to a draft |
| `cognix-world` is a stateless consumer | **Yes** | untouched; it sees a record only once a scenario exists |
| browser is a projection | **Yes** | the browser uploads bytes and renders profiles; it computes nothing |
| certification authoritative | **Yes** | unchanged; admitted values are ordinary inputs to it |
| GenAI advisory | **Yes** | mapping proposals only, confirmed by a person; acceptance runs provider-off |
| evaluator authoritative | **Yes** | no published quantity in the contract |
| no browser economics | **Yes** | reductions run server-side and produce inputs only |
| no second registry or engine | **Yes** | the two declared reductions are admission rules, not a model |

## 4. The trust model — selected

**First-party operator attestation over a fingerprinted file, admitted into a draft.** Identity,
provenance, integrity, attestation (what it proves and does not), validation, tenant isolation,
authority, certification, failure semantics, reproduction and persistence are specified normatively in
the contract, §4. In business terms: *a named person tells CogniX where a file came from; CogniX checks
its form, keeps its fingerprint, and lets it replace assumptions in a draft — and the draft still has to
be confirmed and certified like any other.*

## 5. Persistence

**No new persistence.** Uploads share their draft's lifetime; raw cells are discarded at admission; the
reproducibility need is met by the file and a deterministic admission (contract §4.10–4.11).

**Does SCI-10 make persistence unavoidable?** No — measured against what it needs: a person re-uploading
the same bytes with the same mapping gets the same values; a confirmed scenario's inputs are its
registered record, unchanged by `SCI-10`. `R-SCI07R-1` (non-durable authored state; single BFF instance)
stands **unchanged**, and `SCI-10` is not the packet that should lift it. What *would* make it
unavoidable is named: a requirement that an attested scenario survive a BFF restart, be shared across
people, or be audited after the session — none of which the packet or the demonstration requires.

## 6. Residual dispositions

| Id | Disposition | Owner |
|---|---|---|
| **`R-SCI08-2`** — no governed "unset" | **Required by `SCI-10`, delivered as its first slice.** Withdrawing an admitted upload must return its fields to CogniX's assumption, which is exactly the missing unset. It belongs to the authoring domain (`lib/scenario-authoring/`, the update operation and its route) and needs **no contract change** — the frozen Scenario Draft contract already represents an unset field as an absent key. `SCI-08`'s "empty box means CogniX's assumption" adopts it in the same slice, closing `R-SCI08-2` | `SCI-10` |
| **`R-SCI08-1`** — archetype taxonomy label on Promotion | **Not `SCI-10`'s.** Verified: `scenarioArchetypeProjection` keeps the declared archetype's identity and name and takes every number from the scenario; the planner's cards render the static archetype names. The fix belongs with the archetype projection (`lib/campaign-archetypes.ts`) and the planner (`PromotionPlanner.tsx`) — engine territory `SCI-10` is *never-with*. A small independent repair, parallelisable, **not Wave-4 blocking** | a repair packet (`SCI-03R` lineage) |
| **`R-SCI07R-1`** — non-durable authored state | **Unchanged** — §5 | future persistence decision |
| **`R-SCI07-1` / `R-SCI08-3`** — live Gemini unverified | **Does not block `SCI-10`.** GenAI mapping is optional and acceptance is provider-off. It blocks only *demonstrating* AI-assisted mapping live — the same constraint as `SCI-08`'s assist path | owner (credential) |
| `R-SCI07R-2` — tenant self-declared | **Inherited and restated** in the contract: scoping, not authentication — which is also why an attestation cannot prove identity | future identity work |
| `R-SCI09-2` — stale branch | **Owner action**, unchanged | owner |
| `R-25` | Unchanged | Atlas provider configuration |

## 7. Wave-4 dependency graph — reconstructed from what now exists

```
 SCI-07 (domain) ──► SCI-07R (authority, ADR-085) ──► SCI-08 (experience) ── DONE, converged aad33e90
                                                          │
             this gate: Attested Upload DECLARED (ADR-086)│
                                                          ▼
                     ┌──────────────────────── SCI-10 ─────────────────────────┐
                     │ S1 governed unset (authoring domain + SCI-08 adoption)  │  closes R-SCI08-2
                     │ S2 contract file + validation + profile (upload route)  │
                     │ S3 mapping, attestation, admission, withdrawal,         │
                     │    derived `attested` provenance, receipt kind          │
                     │ S4 upload UI inside the SCI-08 studio (Review step)     │
                     └──────────────────────────┬──────────────────────────────┘
                                                ▼
                                   Gate E — Wave-4 convergence → SHA-E

   Parallel, off the critical path, not blocking:   R-SCI08-1 repair · live Gemini credential (R-SCI07-1)
```

| | |
|---|---|
| **Wave-4 packets** | `SCI-08` — **delivered** single-lane ahead of the wave; `SCI-10` — the **only remaining** Wave-4 packet |
| **Prerequisites of `SCI-10`** | `SCI-07` ✔ · `SCI-07R` ✔ (tenant-scoped authority) · `SCI-08` ✔ (the experience its UI lives in) · this declaration ✔ · the governed unset — **its own first slice** |
| **Parallelisable** | nothing *inside* Wave 4: `SCI-08` is done, so there is no second lane. Outside it: the `R-SCI08-1` repair (disjoint files) and obtaining a Gemini credential |
| **Shared files / contracts** | `SCI-10` edits `SCI-08`'s studio and the `SCI-07` authoring domain — both converged, so sequential ownership is clean; adds `attested-upload-model.ts`; one additive member to ESF-6's `ReceiptKind` |
| **Convergence point** | Gate E, evaluated from `SCI-10`'s head against `aad33e90` — with only one lane, it is `SCI-10`'s own acceptance plus the full estate, the frozen-contract check and browser acceptance |
| **Critical path** | owner authorisation → S1 → S2 → S3 → S4 → Gate E |
| **Stale sequencing corrected** | the register's *"Concurrent with `SCI-08`"* and base *"SHA-D"* no longer apply: `SCI-10` is sequential after `SCI-08` and is cut from `aad33e90` |

**Is `SCI-10` genuinely the next implementation packet?** **Yes.** The only prerequisite not yet
built — the governed unset — is a precondition of `SCI-10`'s withdrawal semantics and is scoped as its
first slice rather than a separate packet, because nothing else needs it before `SCI-10` does.

## 8. `SCI-10` entry and acceptance criteria

**Entry.** (1) Owner authorises `SCI-10` / Wave 4. (2) Branch `feature/cognix-sci-10-csv-admission` cut
from exactly `aad33e90` (or the head carrying this gate's governance, which is governance-only).
(3) The contract here is committed verbatim as the first code change.

**Acceptance — every item deterministic and provider-off.**

1. **Contract:** `attested-upload-model.ts` equals §6 of the contract; the Gate-D six and Scenario Draft
   are byte-identical to SHA-D; the only other contract diff is the additive `ReceiptKind` member.
2. **Unset:** clearing a stated field returns it to `modelled`; `SCI-08`'s empty box clears it.
3. **Validation:** a fixture per refusal reason in contract §4.9 refuses with that reason and changes no
   draft — including oversize, >50,000 rows, >60 columns, non-UTF-8, formula-shaped cells (admitted as
   text, never evaluated), PII-shaped columns, a foreign SKU, a future period, three periods.
4. **Admission:** a valid extract admits exactly the mapped admissible fields, by the declared reductions,
   and nothing else; those fields read `attested`; their capabilities read `Ready`.
5. **Authority:** no route or field accepts a certification, confirmation, activation or published
   quantity; the draft stays `DRAFT` after admission; nothing is registered until a person confirms.
6. **Lifecycle:** the enriched draft confirms, certifies, enters the catalogue, runs through the
   `SCI-07R` path, and its decision equals the evaluator's, figure for figure.
7. **Integrity:** a changed hash at admission is `CONTENT_CHANGED`; the same bytes twice is
   `DUPLICATE_UPLOAD`; an edited admitted field reads `stated`.
8. **Tenancy:** another tenant cannot list, admit, withdraw or see an upload, and its refusals are
   indistinguishable from "not found".
9. **Receipts:** admission receipts are strictly monotonic per tenant and interleave correctly with ESF-6
   receipts; `prediction-comparison` never resolves one.
10. **Model boundary:** with a mocked transport, the mapping prompt contains headers, types and ≤3
    redacted samples and **no raw cell**; responses outside the allowlist are refused, never coerced.
11. **Reproduction:** the same file and mapping produce byte-identical admitted values and an identical
    resolved scenario and certification; with `GEMINI_API_KEY` deleted the path is complete.
12. **Retention:** no cell value in any log; parsed columns are gone after admission or expiry.
13. **Withdrawal:** withdrawing returns the fields to `modelled` and re-resolves the draft; a `CONFIRMED`
    draft refuses it.
14. **Regression:** full estate green except `R-25`'s unchanged `A6b`; tsc and build clean.
15. **Browser:** upload → profile → confirm mapping → attest → admit → confirm → run, at 1440 / 1024 /
    720 on the three-process production topology, no cell value or internal id in primary UX.

## 9. Validation of this governance packet

| Check | Result |
|---|---|
| No contradiction with ADR-085 | **Holds** — the BFF authoring domain owns uploads; one catalogue, one lifecycle |
| No duplicate scenario authority | **Holds** — an upload cannot create, register or activate a scenario |
| No duplicate economic authority | **Holds** — no published quantity in the contract; two declared input reductions only |
| Upload cannot certify itself | **Holds** — no certification field or route; certification stays at confirmation |
| Upload cannot activate itself | **Holds** — no activation field or route; the draft stays `DRAFT` |
| Tenant isolation explicit | **Holds** — contract §4.6 |
| Refusal semantics explicit | **Holds** — closed reasons, contract §4.9 |
| Persistence implications explicit | **Holds** — §5; `R-SCI07R-1` unchanged, and what would change it is named |
| Contract sufficient for implementation | **Holds** — types, limits, admissible fields, reductions, states, reasons, routes, receipt kind |
| Acceptance deterministic | **Holds** — §8, provider-off |

## 10. Gates

**`SCI-10` execution gate: READY** — the contract is declared, the design reconciled with ADR-085, the
one mechanism conflict resolved from code (ADR-086 part 2), and acceptance is deterministic. Starting it
still requires the owner's authorisation, which is a decision, not a missing artefact.

**Wave-4 governance gate: READY** — `SCI-10` is the only remaining Wave-4 packet, its contract is
declared, its dependencies are built, and Gate E is defined. **Neither `SCI-10` nor Wave 4 was started.**

**Owner decisions:** (1) authorise `SCI-10` — the smallest one; (2) optionally, overrule ADR-086 part 2
if the intent really was to feed scenario inputs into ESF-6's outcome store — this gate finds that
unsafe and recommends against it.
