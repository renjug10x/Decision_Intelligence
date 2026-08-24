# COGNIX `ATL-07` — CAPABILITY LIFECYCLE GOVERNANCE & AUTOMATION

**Work Package:** `ATL-07` — Capability Lifecycle Governance & Automation
**Status:** COMPLETED
**Date:** 2026-08-21
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Governing decisions:** ADR-045, ADR-047, ADR-054, ADR-067, **ADR-068** (new)
**Branch:** `claude/cognix-capability-atlas-v2`

---

## 1. What was built, and what was deliberately not

Seven phases produced a corpus that was accurate on the day each record was written. Nothing was
checking the day after. `ATL-07` is that check, and it is a **command, a check registry and a test
suite** — no new surface, no new content, no new product. The instruction was to automate truthfulness
and lifecycle without turning this into another development phase, and the deliverable is sized to it.

| Area | Artefact |
|------|----------|
| Contract | `packages/contracts/src/atlas-governance-model.ts` — findings, severities, subjects, the provider verification record |
| Record checks | `lib/atlas/governance/checks-record.ts` — completeness tiers, cited-path existence, source drift, review windows, ownership, demo readiness, market freshness, undeclared limitations |
| **Provider checks** | `lib/atlas/governance/checks-provider.ts` — drift, staleness, model configuration, verification integrity |
| Engine | `lib/atlas/governance/engine.ts` — runs everything, no write path |
| Verification record | `config/atlas-provider-verification.ts` — what was verified, on which commit, and what invalidates it |
| Command | `scripts/atlas-governance-check.ts` — advisory by default, `--enforce`, `--json` |
| CI | `.gitlab-ci.yml` — `atlas-governance`, reporting only, full history fetched |
| Tests | `tests/unit/run-atl07-tests.ts` — **51 assertions** |
| Governance | ADR-068; charter §0 and §4; `MASTER_PLAN.md` |

**Not built, deliberately:** no governance UI, no automated remediation, no content population. The
findings below are reported and left for their owners.

---

## 2. Live-provider drift, as a first-class subject

This was the instruction, and it is the half of `ATL-07` with hard evidence behind it.

The `ATL-06` sequence established that the estate had **no defence at all** against its belief about a
live provider going out of date. Three defects reached a credentialed run before anything failed:

| Defect | What was wrong | What noticed |
|---|---|---|
| Credential path | no deployment provisioned `GEMINI_API_KEY`, and the docs said it wasn't needed | a human, after the round trip could not run |
| Model aliases | `gemini-2.5-*` retired, hard-coded in four places | a human, from a failed live call |
| Segment offsets | `startIndex` elided at its default value | a human, reading the first real response |

**Every fixture-backed suite stayed green through all three.** That is not a testing failure. Fixtures
prove refusal behaviour a live search cannot be made to produce on demand — a stale source, an
inadmissible tier — which is exactly why they are the right instrument. They cannot notice that the
contract they recorded has changed. Both instruments are needed, and only one existed.

`config/atlas-provider-verification.ts` now records what was verified, the commit it passed on, **the
files whose change invalidates it**, and the six wire-contract assumptions individually — each naming
the code that depends on it and how it was verified. Four checks run from that record, and **none
needs a credential**:

| Check | Fires when | Severity |
|---|---|---|
| `GOV-PROV-1` | a provider-layer file moved ahead of the verified commit | advisory |
| `GOV-PROV-2` | the verification aged past its window, though nothing in the repo changed | advisory |
| `GOV-PROV-3` | the configured model is not the one that actually passed | **blocking** |
| `GOV-PROV-4` | the verification cites a file that no longer exists | **blocking** |

`GOV-PROV-1` is the general form of all three `ATL-06` defects: the recorded round trip describes code
that has since moved. `GOV-PROV-3` is the retired-alias defect caught before a call is made.

**An unanswerable question is reported, never read as a pass.** A shallow CI clone with no history
produces a finding saying drift could not be measured — because a governance check that reads silence
as health is worse than no check. The CI job fetches full history for exactly this reason.

---

## 3. What the first real run found

Seven phases of work, checked for the first time:

| Finding | Count | Severity |
|---|---|---|
| `GOV-REC-1` records claiming a lifecycle tier they do not meet | **20 of 38** | blocking |
| `GOV-REC-6` records with no lifecycle state, so no tier applies | **12** | advisory |
| `GOV-REC-3` records whose cited source files moved since review | **11** | advisory |
| `GOV-REC-2H` validation evidence naming a path that no longer exists | 1 | advisory |
| Live provider | **0 — no drift** | — |

**The 20 blocking findings are one gap, not twenty.** Every one is the same missing field:
`CAPABILITY_KNOWLEDGE_MODEL.md` §9.1 requires `assumptions` from `Research` upward, and `ATL-03`
populated the corpus without it. That is a corpus-population gap for its owner to close, and it is
exactly the kind of systematic omission that no amount of per-record review finds, because every
record looks complete next to its neighbours.

**Nothing was changed to make these numbers better.** The engine has no write path. The findings are
committed as the baseline, asserted in the suite, so the next run shows movement rather than a new
opinion.

### A defect this phase found in itself

On the first run against the real corpus, `GOV-REC-2` flagged `CAP-DECISION-LIFECYCLE-VIEW` for citing
`components/Help.tsx`, which no longer exists. The record is **correct**: the citation is a validation
observation recording that the six-stage lifecycle outlived the surface `ATL-04R` retired.

A governance check that cries wolf on a correct record is worse than no check — it trains people to
ignore the output. Corrected by separating what a record claims as **current** (implementation
references, contracts, test runners — must exist, blocking) from what it records as **observed**
(validation evidence — may name something since retired, advisory, worded to ask for confirmation
rather than assert an error).

---

## 4. Automation flags and blocks; it never promotes

`AC-ATL-07-3` is structural rather than promised:

- `GovernanceFinding` has **no field capable of changing a record** — identifier, severity, subject,
  detail, remedy, and nothing else.
- The governance layer has **no write path**: no `writeFileSync`, no registry mutation. Asserted by
  scanning its own source.
- Running the full corpus leaves every record **byte-identical**, asserted by comparison.
- The remedy for a failed completeness tier says in as many words that the automation will not lower
  the lifecycle state to make the finding go away.

The reason is specific. An engine that could correct a record would eventually be asked to tidy one
up, and the three ADR-047 maturity dimensions this programme spent seven phases keeping honest are
precisely what a tidy-up smooths over.

**Publication is refused per record**, not corpus-wide: one incomplete record does not unpublish the
other thirty-seven.

---

## 5. Advisory before blocking

Every check declares one of **two** severities — a middle value is where a check goes to be ignored.
The command is advisory by default; `--enforce` exits non-zero on blocking findings; the CI job is
`allow_failure` and does not pass `--enforce`.

This is the risk the work package named: governance automation that blocks on the day it lands teaches
contributors to route around it. Which families become blocking, and when, is an **owner decision now
made with the findings on the table** rather than in the abstract.

```
npx tsx scripts/atlas-governance-check.ts            # report, exit 0
npx tsx scripts/atlas-governance-check.ts --enforce  # fail on blocking findings
npx tsx scripts/atlas-governance-check.ts --json     # machine-readable
```

Drift is measured from **git commit dates**, not file mtimes, which a checkout resets.

---

## 6. Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | 0 diagnostics |
| `run-atl07-tests.ts` | **51 / 51** |
| `run-atl06a` / `06b` / `06c` / `06d` | 115 / 133 / 127 / 96 — unchanged |
| `run-atl02` / `03` / `04` / `04r` / `05` | unchanged |
| `npm run build` | clean |
| Estate regression | 32 of 34 runners exit 0; `run-cdi07a` (154/1) and `run-cdi07b` (228/7) at their pre-existing baseline |
| Governance command | runs clean, 44 findings, 0 provider drift |

---

## 7. Findings and honest limitations

1. **The 20 tier gaps are real and unfixed.** Populating `assumptions` across the corpus is content
   work owned by whoever owns `ATL-03`'s output, not by the phase that detected it. Doing it here
   would be the tidy-up this design exists to prevent.
2. **`GOV-REC-3` cannot detect the one evasion that matters** — moving `reviewed_at` without reading
   the record. The remedy text says so rather than implying a guarantee.
3. **Provider checks compare belief against repository state.** They cannot detect a provider changing
   its contract while our code sits still; only a credentialed run does that, which is why
   `GOV-PROV-2` exists and why the verification carries a currency window.
4. **No governance surface.** Findings are a command and a JSON document. Whether they belong on the
   Observability & Governance surface `ATL-04R` created is an owner decision, deliberately not taken
   here.
5. **Carried open, unchanged:** `external_evidence` empty estate-wide and unassigned · SB-GATE 3/6 ·
   `tsx` not a declared dependency, the cause of the two pre-existing runner failures ·
   `CDI-07A`/`CDI-07B` ADR-052 split candidates.

---

## 8. The programme completes

`ATL-07` was the last work package. The Atlas now discovers, explains, grounds, interprets, prepares
and — from this phase — **checks itself**. Subsequent work is ordinary capability maintenance under
this governance, which is what the charter said completion would look like.

The charter's longer-term principle stands as the summary: *a CogniX capability is not complete merely
because code exists. It must also be explainable, testable, demonstrable, architecturally traceable and
governed.* The governance command is how that stops being an aspiration and becomes a number that
either moves or does not.
