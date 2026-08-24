# COGNIX INTERNAL DEMONSTRATION RUNBOOK

**Document Status:** Approved & Authoritative
**Version:** 2.0.0
**Effective Date:** 22 August 2026
**Supersedes:** v1.0.0 (10-Minute Facilitation Guide, 12 August 2026)
**Target Audience:** G10X Innovation Executives, Solution Architects, Client-Facing Consultants

---

## 0. What changed, and why you should not use the old script

Version 1.0.0 walked a facilitator through the Innovation Portfolio, then Questions Worth Asking at
`/curiosity`, then two experiment canvases reached from the sidebar. **None of those routes exists as
described.** `ATL-04R` folded Portfolio and Questions into the Capability Atlas as views of one
surface, and a demonstration surface is now reached from the capability record that names it.

The old script also carried figures in its own prose — a financial risk *"dropping from £168,000 to
£0"*, a *"£480,000 gross revenue lift"*, a *"1,400-case deficit"* — and attributed reasoning to *"the
Gemini AI engine"* on a screen that makes no model call. Some of those numbers are still produced by
the running engines; a runbook is simply the wrong place to hold them, because it cannot notice when
they change and it carries no provenance.

**This version quotes no figures.** Where you need numbers for a specific meeting, use *Prepare me for
a client conversation* (§4). It reads the governed records at the moment you ask, tells you what you
may claim, and tells you what you must not.

---

## 1. Before you start

Local demonstration on `http://localhost:3000`:

```env
# .env.local
NEXT_PUBLIC_COGNIX_DEMO_MODE=true
```

This activates the demo authentication bypass and establishes a synthetic identity (Demo User,
Innovation Executive, G10X). It is a build-time variable: rebuild after changing it.

**Optional — live market research.** Off by default and unnecessary for every scenario below. If you
intend to show it, the server needs `GEMINI_API_KEY` set in its environment (see `.env.example`). The
credential is server-side only and is never entered in the interface. Without it, the Atlas states in
as many words that it holds no external evidence and cannot substantiate a market question — which is
a perfectly good thing to show, and often a better one.

**Check before a client meeting.** Open Observability & Governance → **Atlas health**. If anything is
reported as blocking, find out what before you demonstrate.

---

## 2. The shape of the product

One destination. Everything below is reached from the **Capability Atlas**, and the Atlas answers one
question in four ways:

| View | Question it answers |
|------|--------------------|
| **Explore** | What can CogniX do? |
| **Portfolio** | What has CogniX built? |
| **Questions** | What is worth asking? |
| **Prepare me for a client conversation** | What can I honestly say in this meeting? |

Two surfaces sit outside it: **Observability & Governance** (how the platform is governed, and how
honest its own records are) and **About** (a header control — version, environment, and an explicit
statement that no certification is held).

---

## 3. The demonstration journey

Run as much of this as your time allows. It works at ten minutes and at forty-five; the pacing notes
say what to cut.

### 3.1 Landing — *What would you like to understand?*

Open `/`. One question, one input, six worked examples underneath.

> *"This is not a dashboard and not a search box over documentation. It is the answer to 'what can
> this platform do', and it will tell you what it cannot do just as readily."*

Point out that nothing on the landing screen is a metric. Every number you will see today is a count
of governed records or an engine output, and the interface says which.

### 3.2 Discovery — ask it something in your own words

Type: **`What capabilities does CogniX have on Promotions?`**

The Atlas settles on Campaign & Promotion and offers one narrowing question — which aspect. Take
*Show me everything* if you are short of time.

Then try: **`Promotions, demand, signals and inventory`**

This one genuinely spans four areas, and the interface says so and asks which you meant, offering
multi-select and a free-text box. **The clarification is deterministic** — no model runs — which is
worth saying aloud to a technical audience.

> *"It asks because the question has more than one reading, not because it did not understand you.
> One question is typical, two is the ceiling."*

### 3.3 Persona lens — the same facts, a different reading

Select **Sales**, then **Architect**, then **Developer** on the lens bar, and open the same
capability each time.

The four lenses ask genuinely different questions — Sales is asked *"What must I not claim?"* among
the first four; Architect is asked *"How does it actually work?"*; Developer is asked *"Where is the
code?"*. **The facts underneath never change.** The three maturity dimensions, the limitations and
the name are identical in every lens, and no lens can hide that something is simulated.

### 3.4 A capability record

Open **Decision Gap Intelligence** from the results.

Three separate maturity dimensions are shown as three separate things — LIFECYCLE, DEMO, BUILD — and
never averaged into one badge. A capability can legitimately be ready to demonstrate and only partly
built.

Scroll to **Where it comes from**. The solution or experiment that demonstrates the capability is a
link: follow it to reach the live surface, and use the browser's back navigation to return.

### 3.5 Visual explainability

Decision Gap renders as two frontiers on one track with the gap between them named. Nothing on that
visual carries a number. Each visual is configuration carried by the capability's own knowledge
record, with a text description beside it that says the same thing in prose.

Two more worth showing if you have time: a **flow** capability (Intent Fusion) and a **comparison**
capability (Counterfactual Baseline).

### 3.6 Questions Worth Asking

Switch to the **Questions** view. Four registered questions, each carrying why it is worth asking, the
evidence behind it, the capabilities that answer it *with the reason each is linked*, and the
experiment or solution that demonstrates it.

> *"These are curated, not generated. Four is honest — the record says so."*

### 3.7 Ask CogniX

Open **Ask CogniX about these capabilities**, and ask something the estate can answer:

**`What is the Decision Gap and how mature is it?`**

The answer arrives in an evidence class labelled **FROM COGNIX**, quoting the governed record and
naming the capability it came from. With no AI provider configured it says so and assembles the answer
directly from records rather than narrating it — which is the point worth making:

> *"It degrades to quoting its own records. It does not degrade to guessing."*

### 3.8 Optional — external market research

Only if the server has a credential, and only if a market question is genuinely on the agenda.

Tick **Include external market research** — it is off by default — and ask a market question. Three
classes stay visually and structurally separate: **From CogniX**, **Market Context**, **AI
Interpretation**. Nothing merges them.

**Without a credential, ask the same question anyway.** The answer reads *PARTLY ANSWERABLE*, states
which half of the question the governed corpus can answer, and says the other half needs a grounding
provider. Showing the refusal is often more persuasive than showing the answer.

---

## 4. Prepare me for a client conversation

This is the surface to use before a real meeting, and it is worth five minutes of any demonstration.

From the Atlas, open **Prepare me for a client conversation** and describe the meeting in your own
words — who, what is going wrong for them, and how long you have. For example:

> *"Meeting a grocery demand-planning leader who wants better forecast accuracy and fewer stock-outs.
> I have 30 minutes."*

What comes back, and what to look at:

| Section | What it gives you |
|---------|-------------------|
| **Overview** | What CogniX understood, with *"COGNIX INFERRED — CHECK THIS"* naming the phrase each inference was read from |
| **Capabilities** | The lead capabilities, each carrying the reason it is there. A capability that could not produce a reason is not in the list |
| **Sequence** | A demonstration path shaped to the time you stated, with a *"before you show this"* warning on each step |
| **Questions to ask** | What to put to them |
| **They will ask** | Their likely questions with grounded answers, each naming the capability it rests on |
| **Demo warnings** | Field-level caveats — where a value inside an implemented capability is simulated |
| **Do not claim** | The single most useful section. Each entry pairs what not to say with **"Say instead"** |
| **Market context** | Empty unless external research was requested and admitted, with the reason it is empty |

The demonstration steps are **quoted** from each capability's authored demo path, never written for
the occasion. If a capability has no demo path it does not appear in the sequence.

> **Use this for real.** It is faster than reading eleven capability records, and it is the only place
> that assembles the "do not claim" list for you.

---

## 5. Observability & Governance

Seven sections, reached from the sidebar (below 1024px, from the menu control in the header).

Worth showing to an architect or a governance-minded executive:

- **Capability lifecycle** — every capability that is not fully implemented, named, with all three
  dimensions kept apart.
- **Atlas health** — the governance engine, run on request. Four lenses of its own. It reports what
  the records get wrong, including counts that overlap (and says they overlap), and reports reference
  drift as *unmeasured* rather than zero where change history is unavailable.
- **Architecture** — the Architectural Storyboard, retained and labelled, with its retirement gate at
  three of six conditions.

> *"The platform audits its own honesty and shows you the result. Nothing here can promote a
> capability or close a gap — it only ever flags."*

---

## 6. About

The **ⓘ** control in the header. Version, build, environment, release, last updated — and a
certification line that reads: *"No certification or compliance record is held for this platform. None
is claimed."*

That sentence is deliberate and is worth reading aloud to a risk-sensitive audience. Build and release
show *"not recorded"* in a local environment because the deployment did not supply them; the surface
does not invent a value.

---

## 7. Pacing

| Time | Cover |
|------|-------|
| **10 minutes** | §3.1, §3.2 (first query only), §3.4, §3.5, §3.7 |
| **20 minutes** | Add §3.3 persona lens and §3.6 Questions |
| **30 minutes** | Add §4 preparation pack, generated live from the room's own scenario |
| **45 minutes** | Add §5 Observability & Governance and §3.8 if a credential is configured |

---

## 8. What not to say

- Do not describe a simulated capability as live. The record says which it is; so should you.
- Do not quote a monetary figure as a measured outcome. The engines produce modelled values and the
  interface labels them; the defensible claim is the ordering between options, not the absolute
  number.
- Do not present the demonstration data as client data. It is the synthetic Enterprise World.
- Do not make a comparative claim about a named competitor. The Atlas holds no market evidence, so any
  such claim is yours and not the platform's.
- Do not say access scoping is enforced. It is a demonstration affordance and the interface says so.

The preparation pack assembles all of this for the specific capabilities you are about to show. Read
its **Do not claim** section before the meeting, not after.

---

## 9. After the meeting

1. Record what resonated and what was challenged.
2. If a client question exposed something the estate could not answer, that is a governed finding —
   raise it against the capability rather than answering it from memory next time.
3. Scope any follow-up against what the record actually claims, not against what the demonstration
   appeared to show.
