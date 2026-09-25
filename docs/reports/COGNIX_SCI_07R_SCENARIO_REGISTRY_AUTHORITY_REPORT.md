# `SCI-07R` — Scenario Registry Authority (closes the `SCI-08` entry blocker `R-SCI07-6`)

**Governs:** ADR-085 (new), ADR-077 part 4, ADR-080, ADR-083, ADR-084 parts 1–2.
**Base:** head of `feature/cognix-sci-wave3-convergence` at
`331b3ed12d9c5bc2b37f0ed58e826367b5d315a8` — one governance-only commit ahead of
SHA-D `2f8d7ed8b479452a804c61e4202c87697b62e4de`. Gate D **PASSED** (2026-09-22).
`SCI-08` and `SCI-10`: **NOT STARTED**, and not started by this packet.

**Status of this record.** Sections 1–9 are the architecture decision, written and committed
**before** any implementation. Sections 10 onward are the evidence and are added only once measured.

---

## 1. Baseline, verified before anything was changed

| Fact | Verdict |
|---|---|
| `origin/feature/cognix-sci-wave3-convergence` head | `331b3ed1` — contains `331b3ed` |
| Certified Wave-3 implementation SHA recorded by Gate D | `2f8d7ed8b479452a804c61e4202c87697b62e4de` — present, and `331b3ed` is exactly one governance commit on it (5 files, all under `docs/` and `MASTER_PLAN.md`) |
| Gate D | **PASSED**, closed 2026-09-22 (§17 of the assessment) |
| `SCI-08` / `SCI-10` | **Not started** in the packet inventory and in `MASTER_PLAN.md` ("NOT AUTHORISED") |
| The convergence branch | **Not modified.** This packet is a new branch cut from its head |

Residuals as recorded at Gate D (§19 of the assessment and the residual register), read rather than
assumed:

| Id | Recorded wording (abridged) | Recorded status |
|---|---|---|
| `R-SCI07-6` | An authored, certified scenario is invisible to the selector in `service` mode — the BFF registers it, `cognix-world` serves the catalogue | **OPEN, blocks `SCI-08`** |
| `R-28` | `cognix-world` does not install the certification gate | **OPEN — GOVERNED** |
| `R-32` | Two registries answer "which scenario is active?" differently | **MITIGATED — underlying split open with `R-28`** |
| `R-SCI07-1` | Live Google drafting unverified — no credential, no egress | **OPEN** |
| `R-SCI07-2` | Three governed situations, not the full archetype catalogue | **OPEN by design** |
| `R-SCI07-3` | Drafts are in-process and tenant-scoped; they do not survive a restart | **OPEN by design**, "should be decided with `R-SCI07-6`" |
| `R-SCI07-4` | `CDI-01`'s route still resolves a caller-supplied key from the request body | **RETAINED as security debt** |
| `R-SCI09-2` | Two `origin` branches differ only in case; the lower-case one is stale | **OPEN** |
| `R-SCI09-3` | `SCI-09`'s completion record quotes closed-form figures the evaluator superseded | **OPEN** |

**A correction to the work order, stated rather than absorbed.** The work order groups `R-SCI07-2`
with `R-SCI07-3` as persistence residuals. The register says otherwise: `R-SCI07-2` is **situation
coverage** (three governed situations, a fourth needs a fourth signal family). It has no persistence
dimension and this packet does not touch it. Only `R-SCI07-3` is a persistence residual.

---

## 2. Reproduction — measured, not inherited from Gate D

**Topology:** the `output: 'standalone'` production build of this base, `cognix-world` on 8081 and
`cognix-learning` on 8082, three native processes, `COGNIX_WORLD_MODE=service`,
`GEMINI_API_KEY` absent. Driven over HTTP.

| Step | Request | Result |
|---|---|---|
| author | `POST /api/v1/scenarios/drafts` — Promotion demand surge, P004 | `201`, `SCN-AUTHORED-7597A2B489` |
| confirm | `POST …/drafts/{id}/confirm`, named person | `201` — *"certified on all twelve dimensions (84 checks)"* |
| catalogue | `GET /api/v1/scenarios` | `200`, `service: cognix-world`, **3 entries — the authored one is absent** |
| world | `GET :8081/api/v1/scenarios` | the same 3 |
| **activate** | `POST /api/v1/scenarios` with the authored id | **`200` — accepted** |
| catalogue again | `GET /api/v1/scenarios` | `active_scenario_id` = the authored id, **and still 3 entries, none of them active** |
| decision | `GET /api/v1/scenarios/decision?scenario_id=…` | `200` — evaluated in the BFF |
| signals | `GET /api/v1/signals?scenario_id=…` | **`400` from `cognix-world`** — *"Scenario … is not registered. Registered: …3 curated"* |
| current signals | `GET /api/v1/signals/current?scenario_id=…` | **`200`, `service: cognix-web-demo-fallback`** — in `service` mode |

Repeated in `local` mode on the same build: the catalogue has **4** entries — and
**`tenant_other_02` sees the authored scenario too**.

The defect is therefore larger than Gate D recorded. There are five findings, not one:

1. **The selector cannot see an authored scenario in `service` mode** (`R-SCI07-6` as recorded).
2. **The same scenario can nonetheless be activated**, producing a catalogue whose `active_scenario_id`
   names an entry the catalogue does not contain — `R-32`'s split, re-opened by authoring.
3. **Execution splits by route.** The decision evaluates in the BFF; `/api/v1/signals` is refused by
   `cognix-world`; `/api/v1/signals/current` **silently falls back** to in-process generation while
   the estate is configured `service`, labelling itself `cognix-web-demo-fallback`. `service` mode's
   own rule — no silent fallback — was being broken by a non-OK upstream, not only by an unreachable one.
4. **The browser holds a third registry.** Client engines resolve through the browser's own copy of the
   `SCI-01` registry (`lib/scenario-client-registry.ts`, R-33). It is bootstrapped from the compiled
   packs and nothing ever tells it about an authored record: `syncActiveScenario` returns `false`
   with a warning and every client surface keeps computing the previous scenario. This holds in
   **every** mode, including `local`, where the catalogue appears to work.
5. **Authored scenarios are not tenant-scoped once confirmed.** Drafts are tenant-scoped; the registry
   is process-global, so in `local` mode every tenant's catalogue lists every tenant's scenarios.

---

## 3. Lifecycle trace, stage by stage (from code, then runtime)

The registry is `packages/contracts/src/scenario-registry.ts` — a module-level `Map` plus a module-level
`activeScenarioId`. **It is not a store; it is per-process state.** Every process that imports the
contracts barrel gets its own copy, bootstrapped at module load from the compiled reference scenario
and `scenario-packs`.

| Stage | Owner | Boundary | Data | Storage | Identity | Tenant | Source of truth | local | service | after restart |
|---|---|---|---|---|---|---|---|---|---|---|
| author | `lib/scenario-authoring` (BFF) | `POST /api/v1/scenarios/drafts` | `ScenarioDraft` | `scenarioDraftStore`, in-process, 50/tenant, 200 tenants | `DRAFT-<hex10>`; `scenario_id` fixed at creation `SCN-AUTHORED-<hex10>` | yes, self-declared | draft store | works | works (BFF) | lost |
| resolve | `draft-resolution.ts` (BFF) | function | `CanonicalScenario` | none | the draft's `scenario_id` | — | draft inputs + governed masters | deterministic | same | reproducible from inputs |
| certify (pre-flight) | `lib/scenario-certification.ts` | function | `ScenarioCertificationResult` | none | same | — | the gate | works | same | recomputable |
| register | `SCI-01` registry | `registerScenario` | record | **BFF process `Map`** | same | **none** | BFF registry | works | **BFF only** | lost |
| certify (authoritative) | gate | function | result | on the draft | same | — | gate | works | BFF only | lost |
| confirm | authoring (BFF) | `POST …/confirm` | draft → `CONFIRMED` | draft store | same | yes | draft store | works | BFF | lost |
| catalogue | BFF route | `GET /api/v1/scenarios` | `ScenarioRegistryEntry[]` | — | same | **not filtered** | **local: BFF registry; service: `cognix-world`'s registry** | 4, cross-tenant | **3** | curated only |
| select | `ScenarioSelectorModal` → BFF | `POST /api/v1/scenarios` | activation | BFF `activeScenarioId` | same | not checked | BFF registry + gate | works | works (but invisible) | reverts to reference |
| project to browser | `scenario-client-registry.ts` | `syncActiveScenario` | — | **browser `Map`** | same | — | compiled packs only | **fails** | **fails** | — |
| execute — decision | `/api/v1/scenarios/decision` → `evaluateAuthoritativeScenarioDecision` | BFF | `AuthoritativeScenarioDecision` | — | same | — | BFF registry | works | works | — |
| execute — signals | `/api/v1/signals`, `/current` | BFF → `cognix-world` `GET ?scenario_id` | `EnterpriseSignal[]` | — | same | — | **`cognix-world`'s registry** | in-process | **400 / silent fallback** | — |
| execute — client engines | Demand, Promotion, Campaign | `scenarioInScope()` | — | browser registry | — | — | browser registry | **wrong scenario** | **wrong scenario** | — |

**The four questions, answered from the trace.**

- **Where does the BFF register an authored scenario?** In the `SCI-01` registry `Map` inside the
  Next.js server process, from `confirmDraft` (`lib/scenario-authoring/authoring-service.ts`).
- **Where does `cognix-world` obtain its catalogue?** From its own copy of the same module, loaded in
  its own process from the compiled packs at start-up (`services/world/src/server.ts` →
  `packages/contracts/src/index.ts` → `scenario-packs`). It has no registration or activation route.
- **Why does the authored scenario not appear?** In `service` mode the BFF catalogue route **proxies
  `cognix-world`'s catalogue** and only decorates it with certification badges. The record exists in
  the BFF's `Map`; the list the selector renders is read from a different process's `Map`.
- **Two registries, two caches, or two views?** **Three independent registries, none a projection of
  another** — BFF, `cognix-world`, browser — which agree only because all three are bootstrapped from
  the same compiled data. The agreement is a coincidence of build, not a property of the design. The
  first scenario that did not exist at build time exposed it.

---

## 4. `R-28` and `R-32` — the same root cause

| Symptom | Boundary | Duplicated / missing authority | Consequence |
|---|---|---|---|
| `R-32`: after a switch the catalogue named the old active scenario | BFF ↔ `cognix-world` | two registries each answering "which is active" | mitigated at Gate B by answering `active_scenario_id` in the BFF; **the catalogue stayed upstream's** |
| `R-28`: `cognix-world` does not install the gate | `cognix-world` tsconfig includes contracts only | a registry that can serve identities with no certification authority in its process | bounded while nothing but compiled, certified packs is registered there |
| `R-SCI07-6`: authored scenario invisible | BFF ↔ `cognix-world` | registration authority (BFF) ≠ catalogue authority (world) | selector cannot offer it; activation still can → incoherent catalogue |
| execution split (new) | BFF ↔ `cognix-world` | signal generation resolves identity in world | `400`, or silent in-process fallback in `service` mode |
| browser split (new) | BFF ↔ browser | browser registry never receives authored records | client engines compute a different scenario |
| cross-tenant catalogue (new) | registry ↔ authoring | ownership is on drafts, not on registered scenarios | any tenant sees any tenant's authored scenario |

**One root cause:** scenario state is held as *per-process module state* in every process that imports
the contracts barrel, and more than one of those processes answers scenario questions. `R-32` was the
first symptom (activation), `R-28` the second (certification), `R-SCI07-6` the third (registration).

---

## 5. Options evaluated

| Criterion | A — BFF owns; world and browser consume records | B — world owns; BFF registers through it | C — shared store authoritative | 
|---|---|---|---|
| Domain ownership | Gate, activation, authoring and every economic engine already live in the BFF | World would own state whose every rule lives elsewhere | Splits ownership from the rules |
| Existing APIs / contracts | Consumes the frozen registry unchanged; one new read route; one new world route (not a frozen contract) | World needs register + activate routes; BFF still needs a local copy for its engines | Frozen registry is a synchronous in-memory `Map`; engines read it synchronously — every process still needs a hydrated copy |
| Certification authority | Where the gate is installed (`R-28`'s own constraint) | World cannot install the gate — its tsconfig excludes the engines | Unchanged problem |
| Tenant isolation | One place to scope | Two | Store-level, plus caches |
| Identity | One `Map`, one id | Id travels, record duplicated | Id stable, records duplicated in caches |
| Service-mode topology | Catalogue independent of world; world computes over supplied records | Catalogue depends on world; `local`/`demo-fallback` have no world → authority differs by mode | New dependency in every mode |
| Restart | BFF restart loses authored state (all of it, together); world restart loses nothing | Either restart desynchronises | Survives — the only option that does |
| Concurrency / duplicates | Single-threaded, synchronous confirmation | Distributed write | Needs locking |
| Curated compatibility | Unchanged | Unchanged | Migration |
| Demo mode | Identical in all three modes | Differs | Adds infrastructure to the demo |
| New infrastructure | None | None | **Yes** |
| Production suitability | Single BFF instance only — **recorded** | Same, plus sync | Yes, eventually |
| `SCI-08` / Wave 4 | `SCI-08` renders catalogue + drafts from one authority; `SCI-10`'s attested upload stays a BFF concern | `SCI-08` must reason about two services | Postpones `SCI-08` behind infrastructure |

**Decision: Option A.** It is the only option that *removes* duplicate authority rather than
synchronising it: after it, exactly one process can register, certify, activate or catalogue a
scenario. The other two options both leave at least two mutable copies; Option C also introduces
infrastructure the evidence does not require (§7). Option C is the declared **evolution path** — when
the BFF must run as more than one instance, the BFF remains the only writer and hydrates from a store.

---

## 6. ADR-085 — the decision, in execution-grade terms

### 6.1 Authority

**The gated scenario runtime in the BFF process** (`lib/scenario-runtime.ts` over the frozen `SCI-01`
registry) is the **single authoritative Scenario Registry**. It alone may register, certify, activate
and publish the catalogue.

- **`cognix-world`** holds **no mutable scenario state** and **serves no catalogue**. Its
  `GET /api/v1/scenarios` answers `410 Gone` naming the authority. Scenario-scoped signal generation
  is a **record-carrying** call — `POST /api/v1/signals/snapshot` with the record the BFF resolved —
  so world never resolves a scenario identity for any product request.
- **The browser registry** is a **governed read projection**. It is seeded from the compiled packs as
  today and receives an authored record only from `GET /api/v1/scenarios/record`, which serves only a
  scenario that is registered, **certified**, and visible to the caller's tenant. The projection never
  replaces a record it already holds and grants nothing: activation is still the server's.

### 6.2 Lifecycle

**author → resolve → certify candidate → register → certify authoritatively → confirm (+ record
tenant ownership) → catalogue → select (activation gate) → project → execute**

`project` is the one stage added. It is not an authority: it is the browser learning a record the
authority has already admitted, which is the same thing `syncActiveScenario` already does for the
active pointer.

### 6.3 Authority boundaries

| Act | Who | Where enforced |
|---|---|---|
| draft | a caller, or GenAI **proposing** into a draft | authoring domain; ADR-083 allowlists |
| resolve | CogniX, deterministically | `draft-resolution.ts` — no provider on the path |
| certify | the Scenario Certification Gate | `lib/scenario-certification.ts`, BFF only |
| register | the authoring domain, **only after a clean pre-flight** | `confirmDraft` |
| confirm | **a named person** | `confirmed_by` required; GenAI cannot produce it |
| catalogue | the BFF runtime, filtered by tenant visibility | `GET /api/v1/scenarios` |
| select / activate | a person, through the gate | `POST /api/v1/scenarios` → `activateScenario` + ADR-080 policy + tenant visibility |
| execute | CogniX engines over the registered record | decision route, signal routes, client engines |
| GenAI | proposes structure only | cannot confirm, certify, activate, register, or produce a quantity |

There is **no** path from authoring to activation: confirmation never calls `activateScenario`, and
selection is a separate, human act that goes through the same gate as a curated pack.

### 6.4 Tenant visibility

A scenario is visible to a tenant if it is **compiled** (the reference scenario and the curated packs,
by their declared ids) or **authored and owned by that tenant**. Anything else — including a
registered scenario with no recorded owner — is visible to **no one**: deny by default. Invisible is
indistinguishable from unregistered on every route (catalogue, record, activation, decision, signals),
so a scenario id is not an existence oracle across tenants.

Ownership is recorded by the authoring domain at confirmation, beside the drafts it already scopes.
The frozen registry is not changed to learn about tenants.

**`tenant_id` is self-declared.** There is no authenticated identity in the demonstration; the draft
store records the same limitation. This is **scoping, not a security boundary**, and is recorded as
such (§9).

### 6.5 Failure semantics

| Unavailable | Behaviour |
|---|---|
| BFF | Nothing is available — it is the product's front door and the authority |
| `cognix-world`, `service` mode | Catalogue, selection, activation, decision: **unaffected**. Signal routes: explicit `503` / upstream status. **No silent fallback** on any non-OK upstream |
| `cognix-world`, `demo-fallback` / `local` | As today: signals generated in-process, labelled as fallback |
| Browser cannot fetch a record | The mirror reports disagreement (as `syncActiveScenario` already does); it never guesses |

### 6.6 Compatibility

The three compiled scenarios are registered, certified and active exactly as before; their bytes do
not change; the catalogue shape (`ScenarioRegistryEntry` plus the certification badge) does not
change; the default active scenario is still Fresh Dairy. What changes for them is only *which process
answers* in `service` mode — and every process was answering from the same compiled data.

### 6.7 Economics

Nothing in this decision computes a quantity. The record route returns the record; the world snapshot
runs the existing generator over it; the decision is `evaluateAuthoritativeScenarioDecision`,
unchanged. No revenue, margin, Decision Gap, demand or window arithmetic is added anywhere.

---

## 7. Persistence — reassessed, and deliberately still deferred

| Question | Answer under ADR-085 |
|---|---|
| Authored + confirmed scenario after **BFF** restart | Gone — together with its draft, ownership and certification result. Catalogue returns to the three compiled scenarios; active returns to Fresh Dairy; in-memory session decision state is also reset |
| After **`cognix-world`** restart | **No effect** — world holds no authored state |
| One restarts, not the other | World only: no effect. BFF only: as above; world was never told anything, so there is nothing to disagree about |
| Can a confirmed scenario disappear from the selector? | **Only** by BFF restart. Never by world restart, never by mode |
| Can certification evidence survive independently of runtime state? | **No.** It is reproducible: the draft export (inputs + content hash) re-resolves byte-identically and re-certifies identically (Gate D §6). **But a re-import is a new draft and receives a new `scenario_id`** |
| Can two tenants observe each other's authored scenarios? | **No** (§6.4), within the self-declared tenant model |
| Duplicate scenario ids or confirmations? | A draft confirms once (`CONFIRMED` refuses a second); confirmation is synchronous in a single-threaded process; ids are `SCN-AUTHORED-` + 40 random bits and cannot collide with a compiled id; an id already owned by another tenant is refused before registration |

**Why deferral is correct for `SCI-08` and Wave 4, not merely convenient.** The failure this packet
exists to close is *incoherence* — one process believing a scenario exists while another does not.
Under ADR-085 every piece of authored state lives in one process and dies with it, so the estate is
never incoherent: it is either all there or all gone. Losing work on restart is a **durability**
limitation, not a correctness one, and it is the same limitation every other store in this estate has
(`decision-state-store`, `campaign-intent-store`, `decision-contract-store`, the draft store). Adding
a database would introduce schema, retention and migration questions `SCI-08` should answer with its
UX in front of it — including whether a restored scenario keeps its id, which is a UX decision about
what a person is re-opening.

**Exact residual risk, recorded as `R-SCI07R-1`:** a BFF restart loses every authored scenario and
its evidence; re-import produces a new id; the BFF must run as a **single instance** (two instances
would be two authorities). **Trigger to revisit:** before any horizontally scaled BFF, before any
non-demonstration tenant, or if `SCI-08` requires a scenario to survive a restart. Option C is the
path.

---

## 8. Contract impact assessment

| Contract (frozen through Gate D) | Change required? | Why not |
|---|---|---|
| Scenario Contract `canonical-scenario-model.ts` | **No** | Records are carried, not reshaped |
| Scenario Clock `scenario-clock.ts` | **No** | — |
| Scenario Registry & Activation `scenario-registry.ts` | **No** | Tenancy is held by the authoring domain; visibility is a filter over `scenarioCatalogue()`; the browser uses the existing `registerScenario` |
| Provenance Vocabulary | **No** | — |
| Scenario Certification | **No** | Consumed |
| Living Evidence contracts | **No** | — |
| Scenario Draft (`SCI-07`, frozen at SHA-D) | **No** | Consumed |

New surfaces, none of them a frozen contract: `GET /api/v1/scenarios/record` (BFF), `POST
/api/v1/signals/snapshot` (`cognix-world`, internal), and `410` on `cognix-world`'s catalogue and
`GET` signal routes, which no product surface calls after this packet. **The six Gate-D frozen
contracts are to remain byte-identical**, and that is an acceptance condition.

---

## 9. Implementation authority, and the new residuals it will carry

Every §10 condition of the work order holds: bounded; no frozen contract changes; consistent with
existing service ownership (it *restores* it); no new infrastructure; does not broaden `SCI-08`; testable
deterministically. **Implementation proceeds in this packet.**

Residuals the decision knowingly carries (numbered for this packet):

| Id | Residual | Blocks `SCI-08`? |
|---|---|---|
| `R-SCI07R-1` | Authored scenarios, ownership and certification evidence are BFF-process-lifetime; re-import yields a new id; single BFF instance required. Supersedes `R-SCI07-3` | No — `SCI-08` must show it honestly |
| `R-SCI07R-2` | Activation is estate-global (one active pointer in the frozen registry); `tenant_id` is self-declared, so isolation is scoping, not authentication | No |
| `R-SCI07R-3` | `cognix-world` computes signals over any structurally valid record POSTed to it; it still cannot verify certification (the narrowed form of `R-28`). Its `/signals/{id}` and `/signals/simulate` routes still read the compiled reference copy; no product surface calls them | No |
| `R-SCI07R-4` | The Architecture Surface's scenario switcher lists the browser projection (compiled + projected), not the tenant's full catalogue | No |
| `R-SCI07R-5` | Registered authored scenarios are not bounded per process (the frozen registry has no deregistration seam; drafts are bounded, confirmations are not) | No |

### `SCI-08` entry gate — conditions

1. In `service` mode on the production build, an authored scenario created through the governed
   authoring path resolves, certifies, registers, certifies authoritatively, confirms, **appears in the
   catalogue the selector renders**, is selectable, and executes (decision + signals through
   `cognix-world`) under one canonical id.
2. A refused scenario never enters the catalogue, the record route, activation or execution.
3. Another tenant cannot see, fetch, activate or execute it.
4. `cognix-world` restart does not remove it; BFF restart behaves exactly as §7 states.
5. The three compiled scenarios are unchanged: certified 12/12, 84 checks, same economics.
6. The six frozen contracts are byte-identical to Gate D.
7. Full governed runner estate green except `R-25`'s single known `A6b`.
8. `tsc` and production build clean.
9. Browser acceptance at 1440 / 1024 / 720 in the three-process topology.
