/**
 * ATL-06D — Client Conversation Preparation, and the persona-lens correction it required.
 *
 * Run via: npx tsx tests/unit/run-atl06d-tests.ts
 *
 * `ATL-06D` is where six phases of governed evidence meet commercial pressure. Everything before it
 * could be wrong in a way that embarrassed the estate; this one can be wrong in a way that misleads
 * a client. The suite is ordered by how badly each failure would hurt:
 *
 *   1. A LENS THAT CHANGES A FACT. The whole persona model rests on "a user does not become a
 *      persona". If a lens can alter an implementation status, a limitation or a demo maturity,
 *      then Sales has a quieter version of the truth and the Atlas is a liability (§B, §37).
 *   2. A PACK THAT OVERSELLS. A simulated capability recommended with no warning; a limitation
 *      trimmed because the reader chose Sales; a demonstration scripted for a capability that has
 *      no demo path (§D, §E, §20, §34).
 *   3. A RECOMMENDATION THAT CANNOT EXPLAIN ITSELF. §11 forbids the bare list, and §12 forbids
 *      fifteen capabilities because fifteen matched a keyword (§C).
 *   4. EXTERNAL EVIDENCE LEAKING IN. Research is opt-in and default off; a pack must not reach a
 *      search engine because a component forgot a flag, and must not admit a claim ATL-06A rejected
 *      (§F, §17, §38).
 *   5. A LENS THAT STILL DOES NOTHING. The residual `D-ATL-04R-1` was that selecting Developer
 *      changed nothing a reader could use. §A asserts the correction is real and measurable.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

import { CAPABILITY_REGISTRY } from '../../config/capabilities';
import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import { CURIOSITY_QUESTIONS } from '../../content/atlas/curiosity-questions';
import { BUSINESS_PROBLEMS } from '../../content/atlas/business-problems';
import {
  LENS_PROFILES, DEFAULT_HEADLINES, resolveHeadlines, orderForLens, lensScore, lensSignals
} from '../../lib/atlas/lens';
import { prepare } from '../../lib/atlas/preparation/engine';
import { readContext, declaredDomainIds, catalogueDomainIds, declaredProblemIds, catalogueProblemIds } from '../../lib/atlas/preparation/intake';
import { clarifyPreparation, detectContextContradictions, MAX_PREPARATION_STEPS } from '../../lib/atlas/preparation/clarify';
import { stagesForDuration } from '../../lib/atlas/preparation/sequence';
import { LEAD_RECOMMENDATION_TARGET, validatePack, PREPARATION_VERSION } from '../../packages/contracts/src/atlas-preparation-model';
import { ATLAS_LENSES, type AudienceLens, type ResolvedCapability } from '../../packages/contracts/src/capability-atlas-model';

const ROOT = join(__dirname, '..', '..');

let passed = 0, failed = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} - ${detail || 'Assertion failed'}`); failed++; }
}

/** The §39 scenarios, verbatim from the work package. */
const S1 = "I'm meeting the Head of Demand Planning at a UK grocery retailer. They struggle with promotional volatility and reacting to external demand signals. I have 30 minutes.";
const S2 = "I'm meeting an enterprise architect who wants to understand how CogniX integrates with an existing planning platform.";
const S3 = "I'm meeting an innovation director who wants to understand what is genuinely different about CogniX.";
const S4 = 'Prepare me for a retail client meeting.';
const S5 = 'I have 10 minutes with a demand planning director.';
const S6 = 'Help me position this against Blue Yonder for a grocery demand planning lead. 30 minutes.';

function atlasComponentFiles(dir = join(ROOT, 'components', 'atlas')): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return atlasComponentFiles(full);
    return entry.endsWith('.tsx') ? [full] : [];
  });
}

async function resolveAll(lens?: AudienceLens): Promise<ResolvedCapability[]> {
  const out: ResolvedCapability[] = [];
  for (const identity of CAPABILITY_REGISTRY) {
    const r = await capabilityRepository.resolve(identity.capability_id, { includeKnowledge: true, lens });
    if (r) out.push(r);
  }
  return out;
}

async function run() {
  console.log('\n=== ATL-06D — Client Conversation Preparation ===\n');

  const all = await resolveAll();
  const byId = new Map(all.map(c => [c.identity.capability_id, c]));

  // ══ A. The lens is materially different, which is the D-ATL-04R-1 correction ══
  //
  // The residual was that selecting a lens changed the section order and nothing else. These
  // assertions are what "materially" means, made checkable: four distinct question sets, four
  // distinct lead orders, four distinct opening sections.

  const questionSets = ATLAS_LENSES.map(l => LENS_PROFILES[l].headlines.map(h => h.question).join('|'));
  assert(new Set(questionSets).size === 4,
    'A1: Each of the four lenses asks a DIFFERENT set of four questions',
    `distinct question sets: ${new Set(questionSets).size}`);

  assert(ATLAS_LENSES.every(l => LENS_PROFILES[l].headlines.length === 4),
    'A2: …and every lens asks exactly four, so the shape above the fold is constant');

  const openSets = ATLAS_LENSES.map(l => LENS_PROFILES[l].open_on_arrival.join('|'));
  assert(new Set(openSets).size === 4,
    'A3: Each lens opens a different section on arrival');

  const leadSets = ATLAS_LENSES.map(l => LENS_PROFILES[l].lead_sections.join('|'));
  assert(new Set(leadSets).size === 4, 'A4: Each lens leads with a different set of sections');

  assert(ATLAS_LENSES.every(l => LENS_PROFILES[l].open_on_arrival.every(s => LENS_PROFILES[l].lead_sections.includes(s))),
    'A5 (LN2): A lens never opens a section it does not also lead with');

  // The §5 acceptance test, on the capability the work package names.
  const gap = byId.get('CAP-DECISION-GAP');
  assert(Boolean(gap), 'A6: The Decision Gap reference capability resolves');
  if (gap) {
    const perLens = ATLAS_LENSES.map(l => resolveHeadlines(gap, l));
    const rendered = perLens.map(hs => hs.map(h => `${h.question}::${h.answer}`).join('|'));
    assert(new Set(rendered).size === 4,
      'A7 (§5): Decision Gap produces four materially different information hierarchies');
    assert(perLens.every(hs => hs.length === 4 && hs.every(h => h.answer.trim().length > 0)),
      'A8: …and every question is answered under every lens — no lens produces an empty pane');

    const answered = perLens.map(hs => hs.filter(h => h.answered).length);
    assert(answered.every(n => n >= 3),
      'A9: …with at least three of four substantively answered from the corpus', answered.join(','));
  }

  // Ordering differs per lens across the real registry.
  const orders = ATLAS_LENSES.map(l => orderForLens(all, l).map(c => c.identity.capability_id).join(','));
  assert(new Set(orders).size === 4,
    'A10: The four lenses order the registry four different ways');

  const unlensed = all.map(c => c.identity.capability_id).join(',');
  assert(!orders.includes(unlensed),
    'A11: …and every lens order differs from the unlensed order — the control does something');

  // The interface no longer tells the reader the lens is decorative.
  const atlasShell = readFileSync(join(ROOT, 'components', 'atlas', 'CapabilityAtlas.tsx'), 'utf8');
  assert(!/Ordering only/i.test(atlasShell),
    'A12: The "Ordering only" note is gone — it described the defect accurately and must not survive it');
  const detail = readFileSync(join(ROOT, 'components', 'atlas', 'CapabilityDetail.tsx'), 'utf8');
  assert(/resolveHeadlines/.test(detail) && !/LENS_PRIORITY/.test(detail),
    'A13: Capability detail reads the governed lens profile rather than a local priority table');

  // ══ B. A lens NEVER changes a fact (§37, ADR-045) ══
  //
  // The most important section in this file. Asserted field-by-field across the whole registry
  // under all four lenses, because a comment promising invariance is not invariance.

  const lensed = await Promise.all(ATLAS_LENSES.map(l => resolveAll(l)));
  let factDrift = 0;
  const drifts: string[] = [];
  for (let i = 0; i < all.length; i++) {
    const base = all[i];
    for (let li = 0; li < ATLAS_LENSES.length; li++) {
      const other = lensed[li][i];
      const fields: [string, unknown, unknown][] = [
        ['capability_id', base.identity.capability_id, other.identity.capability_id],
        ['name', base.identity.name, other.identity.name],
        ['summary', base.identity.summary, other.identity.summary],
        ['lifecycle_state', base.identity.lifecycle_state, other.identity.lifecycle_state],
        ['implementation_status', base.identity.implementation_status, other.identity.implementation_status],
        ['demo_maturity', base.demo_maturity, other.demo_maturity],
        ['platform_reusable', base.identity.platform_reusable, other.identity.platform_reusable],
        ['known_limitations', JSON.stringify(base.knowledge?.known_limitations), JSON.stringify(other.knowledge?.known_limitations)],
        ['validation_evidence', JSON.stringify(base.knowledge?.validation_evidence), JSON.stringify(other.knowledge?.validation_evidence)],
        ['architecture_flow', JSON.stringify(base.knowledge?.architecture_flow), JSON.stringify(other.knowledge?.architecture_flow)],
        ['apis', JSON.stringify(base.knowledge?.apis), JSON.stringify(other.knowledge?.apis)],
        ['contracts', JSON.stringify(base.knowledge?.contracts), JSON.stringify(other.knowledge?.contracts)],
        ['demo_scenarios', JSON.stringify(base.knowledge?.demo_scenarios), JSON.stringify(other.knowledge?.demo_scenarios)],
        ['open_defects', JSON.stringify(base.knowledge?.open_defects), JSON.stringify(other.knowledge?.open_defects)]
      ];
      for (const [f, a, b] of fields) {
        if (a !== b) { factDrift++; drifts.push(`${base.identity.capability_id}.${f} under ${ATLAS_LENSES[li]}`); }
      }
    }
  }
  assert(factDrift === 0,
    'B1 (§37): No lens alters identity, maturity, limitations, evidence, architecture or demo facts',
    drifts.slice(0, 5).join('; '));

  assert(ATLAS_LENSES.every(l => orderForLens(all, l).length === all.length),
    'B2 (ADR-045): A lens ordering is a permutation — it never drops a capability');

  const baseIds = new Set(all.map(c => c.identity.capability_id));
  assert(ATLAS_LENSES.every(l => orderForLens(all, l).every(c => baseIds.has(c.identity.capability_id))),
    'B3: …and never introduces one');

  assert(ATLAS_LENSES.every(l =>
    new Set(orderForLens(all, l).map(c => c.identity.capability_id)).size === all.length),
    'B4: …and never duplicates one');

  // A headline answer is a reading of a field that exists, not a new fact.
  const CONTRACT = readFileSync(join(ROOT, 'packages', 'contracts', 'src', 'capability-atlas-model.ts'), 'utf8');
  const declaredReads = [...ATLAS_LENSES.flatMap(l => LENS_PROFILES[l].headlines), ...DEFAULT_HEADLINES]
    .flatMap(h => h.reads);
  const unknownReads = declaredReads.filter(r => {
    const field = r.split('.').pop()!;
    return !new RegExp(`\\b${field}\\b`).test(CONTRACT);
  });
  assert(unknownReads.length === 0,
    'B5 (LN3): Every field a headline claims to read exists on the capability contract',
    unknownReads.join(', '));

  // ══ C. Recommendation explains itself and does not overload (§11, §12) ══

  const p1 = await prepare({ brief: S1, lens: 'sales' });
  assert(p1.pack.state === 'prepared',
    'C1 (§39 Scenario 1): A brief with a role, a domain, a problem and a duration is NOT interrogated',
    p1.pack.state);
  assert(p1.violations.length === 0, 'C2: …and the pack passes every integrity rule', JSON.stringify(p1.violations));

  assert(p1.pack.recommendations.every(r => r.rationale.length > 0),
    'C3 (§11, P1): Every recommendation carries a non-empty rationale — the bare list is unreachable');

  assert(p1.pack.recommendations.every(r => r.rationale.every(x => x.detail.length > 20 && x.evidence.length > 0)),
    'C4: …and every rationale names governed evidence, not "matched keywords"');

  const leads1 = p1.pack.recommendations.filter(r => r.tier === 'lead');
  assert(leads1.length > 0 && leads1.length <= LEAD_RECOMMENDATION_TARGET,
    `C5 (§12, P5): The lead set stays inside the band (got ${leads1.length})`);
  assert(p1.pack.recommendations.length < CAPABILITY_REGISTRY.length,
    'C6 (§12): The pack does not recommend the whole registry');

  assert(p1.pack.recommendations.some(r => r.rationale.some(x => x.basis === 'business-problem')),
    'C7: A stated client problem reaches the capabilities that declare it');

  // A lens signal alone must never justify a recommendation: it says something about the reader.
  assert(p1.pack.recommendations.every(r => r.rationale.some(x => x.basis !== 'lens')),
    'C8: No capability is recommended on a lens signal alone — every one argues from the conversation');

  // ══ D. Sales integrity — the section that protects the client (§20, §21) ══

  const nonReal1 = p1.pack.recommendations.filter(r => r.maturity.implementation_status !== 'implemented');
  assert(nonReal1.every(r => p1.pack.demo_warnings.some(w => w.capability_id === r.capability_id)),
    'D1 (§20, P2): Every non-implemented recommendation carries a demonstration warning');

  assert(p1.pack.demo_warnings.every(w => w.derived_from.length > 0),
    'D2 (§21): Every warning names the governed field it was derived from — none is invented to fill a section');

  assert(p1.pack.avoid_claiming.every(a => a.instead.length > 0 && a.derived_from.length > 0),
    'D3 (§21, P7): Every prohibition carries an honest replacement and a governed source');

  /*
    The lens-invariance of the integrity sections.

    Compared PER CAPABILITY rather than per pack, and the distinction matters: a lens legitimately
    changes WHICH capabilities are recommended and in what order, so two packs comparing unequal as
    whole lists proves nothing. What §37 actually forbids is a capability's limitations or maturity
    reading differently because of who is looking — so every capability that appears under more than
    one lens is compared against itself across all of them.
  */
  const perLensPacks = await Promise.all(ATLAS_LENSES.map(l => prepare({ brief: S1, lens: l })));

  const limitationsByCap = new Map<string, Set<string>>();
  const maturityByCap = new Map<string, Set<string>>();
  for (const p of perLensPacks) {
    for (const r of p.pack.recommendations) {
      if (!limitationsByCap.has(r.capability_id)) limitationsByCap.set(r.capability_id, new Set());
      if (!maturityByCap.has(r.capability_id)) maturityByCap.set(r.capability_id, new Set());
      limitationsByCap.get(r.capability_id)!.add(JSON.stringify(r.limitations));
      maturityByCap.get(r.capability_id)!.add(JSON.stringify(r.maturity));
    }
  }
  const sharedAcrossLenses = [...limitationsByCap.keys()].filter(id =>
    perLensPacks.filter(p => p.pack.recommendations.some(r => r.capability_id === id)).length > 1);
  assert(sharedAcrossLenses.length > 0,
    'D4a: Several capabilities are recommended under more than one lens, so the comparison is meaningful',
    `${sharedAcrossLenses.length} shared`);

  const limitationDrift = [...limitationsByCap.entries()].filter(([, v]) => v.size > 1).map(([k]) => k);
  assert(limitationDrift.length === 0,
    'D4 (§37): A capability\'s limitations are IDENTICAL under every lens that recommends it',
    limitationDrift.join(', '));

  const maturityDrift = [...maturityByCap.entries()].filter(([, v]) => v.size > 1).map(([k]) => k);
  assert(maturityDrift.length === 0,
    'D5 (§37): Maturity is identical under every lens — Sales gets no quieter version',
    maturityDrift.join(', '));

  // A lens must not trim a limitation list either: what the record holds is what the pack carries.
  const trimmed = perLensPacks.flatMap(p => p.pack.recommendations).filter(r => {
    const c = byId.get(r.capability_id);
    return (c?.knowledge?.known_limitations.length ?? 0) !== r.limitations.length;
  });
  assert(trimmed.length === 0,
    'D5a (§37): Every governed limitation reaches the pack — none is trimmed for any reader',
    trimmed.slice(0, 3).map(r => r.capability_id).join(', '));

  const salesPack = perLensPacks[ATLAS_LENSES.indexOf('sales')].pack;
  const devPack = perLensPacks[ATLAS_LENSES.indexOf('developer')].pack;
  const salesWarned = new Set(salesPack.demo_warnings.map(w => `${w.capability_id}::${w.warning}`));
  const devWarned = new Set(devPack.demo_warnings.map(w => `${w.capability_id}::${w.warning}`));
  const sharedCaps = new Set([...salesPack.recommendations].map(r => r.capability_id)
    .filter(id => devPack.recommendations.some(r => r.capability_id === id)));
  const missingUnderSales = [...devWarned].filter(w =>
    sharedCaps.has(w.split('::')[0]) && !salesWarned.has(w));
  assert(missingUnderSales.length === 0,
    'D6 (§20): No warning a Developer pack carries is absent from the Sales pack for the same capability',
    missingUnderSales.slice(0, 3).join(' | '));

  assert(perLensPacks.every(p => p.violations.length === 0),
    'D7: Every lens produces a pack that passes its own integrity rules');

  // ══ E. Sequencing never fabricates (§13, §34) ══

  const p2 = await prepare({ brief: S2, lens: 'architect' });
  assert(p2.pack.state === 'prepared', 'E1 (§39 Scenario 2): The architect brief prepares', p2.pack.state);
  assert(p2.pack.sequences.some(s => s.kind === 'technical'),
    'E2 (§13): An architecture conversation is offered the technical reading');

  const allPacks = [p1.pack, p2.pack, ...perLensPacks.map(p => p.pack)];
  assert(allPacks.every(p => p.sequences.every(s => s.stages.every(st => st.supported_by.length > 0))),
    'E3 (P3, §34): No sequence stage exists without a governed capability behind it');

  // Every demo step must be traceable to an authored DemoPath step on that capability.
  let fabricated = 0;
  for (const pack of allPacks) {
    for (const seq of pack.sequences) {
      for (const stage of seq.stages) {
        for (const step of stage.demo_steps) {
          const c = byId.get(stage.supported_by[0]);
          const authored = (c?.knowledge?.demo_scenarios ?? []).some(dp =>
            dp.steps.some(s => s.action === step.action && s.what_to_say === step.what_to_say));
          if (!authored) fabricated++;
        }
      }
    }
  }
  assert(fabricated === 0,
    'E4 (§34): Every demonstration step is quoted from a governed demo path — none is written here',
    `${fabricated} fabricated steps`);

  // Non-demonstration readings never carry demo steps: they discuss, they do not script.
  assert(allPacks.every(p => p.sequences.filter(s => s.kind !== 'demonstration')
    .every(s => s.stages.every(st => st.demo_steps.length === 0))),
    'E5 (§13): Executive and technical readings carry no demo script — the corpus authors none');

  // Duration bands (§14).
  assert(stagesForDuration(10) < stagesForDuration(30) && stagesForDuration(30) < stagesForDuration(60),
    'E6 (§14): A longer meeting carries more movements');
  assert(stagesForDuration(null) > 0, 'E7: …and an unstated duration still produces a sequence');

  const p5 = await prepare({ brief: S5, lens: 'sales' });
  assert(p5.pack.state === 'prepared', 'E8 (§39 Scenario 5): A ten-minute brief prepares', p5.pack.state);
  assert(p5.pack.sequences.every(s => s.stages.length <= stagesForDuration(10)),
    'E9 (§14): …and ten minutes is held to two movements, not compressed into six');
  assert(p5.pack.context.duration_mins?.value === 10, 'E10: …with the stated duration actually read');

  // ══ F. External research is opt-in, and the gate is not reopened (§17, §18, §38) ══

  assert(allPacks.every(p => p.envelope.market_context.available === false),
    'F1 (§17): With research off, no pack carries market context');
  assert(allPacks.every(p => p.envelope.market_context.statements.length === 0),
    'F2: …and no market statement is present at all');
  assert(allPacks.every(p => p.envelope.market_context.absence_reason !== null),
    'F3: …and the absence is a RENDERED REASON, never a silent empty list');

  const p6 = await prepare({ brief: S6, lens: 'sales' });
  assert(p6.pack.context.vendors_mentioned.includes('blue yonder'),
    'F4 (§19): A named vendor is recognised without inventing anything about them');
  const positioning = p6.pack.likely_client_questions.find(q => q.category === 'competitive');
  assert(Boolean(positioning), 'F5 (§39 Scenario 6): The competitive question is answered');
  assert(Boolean(positioning) && positioning!.grounded_in.length > 0,
    'F6 (§19): …grounded in CogniX capabilities rather than in a claim about the competitor');
  assert(Boolean(positioning) && /require|no admitted evidence|research is off/i.test(positioning!.response),
    'F7 (§19): …and it states that a competitor claim needs market evidence this pack does not hold');
  assert(Boolean(positioning) && !/better than|superior|outperform|beats/i.test(positioning!.response),
    'F8 (§19): …and asserts no superiority');

  // The engine has no second door to the outside.
  const prepFiles = readdirSync(join(ROOT, 'lib', 'atlas', 'preparation'))
    .map(f => readFileSync(join(ROOT, 'lib', 'atlas', 'preparation', f), 'utf8')).join('\n');
  assert(!/fetch\(|googleapis|https?:\/\//.test(prepFiles),
    'F9 (§38): The preparation engine makes no network call and names no endpoint — it reaches outward only through the ATL-06A gate');
  assert(!/GEMINI_API_KEY|apiKey|api_key/i.test(prepFiles),
    'F10 (ADR-049): …and touches no credential');

  // ══ G. Clarification asks the minimum (§8, §28) ══

  const p4 = await prepare({ brief: S4 });
  assert(p4.pack.state === 'needs-clarification',
    'G1 (§39 Scenario 4): An ambiguous brief clarifies rather than guessing', p4.pack.state);
  assert(Boolean(p4.pack.clarification) && p4.pack.clarification!.choices.length > 0,
    'G2: …offering prepared responses');
  assert(p4.pack.recommendations.length === 0,
    'G3: …and recommends nothing until it knows something');

  const p3 = await prepare({ brief: S3, lens: 'innovation-executive' });
  assert(p3.pack.state === 'prepared',
    'G4 (§39 Scenario 3): A role plus an objective is enough — the executive brief is not interrogated', p3.pack.state);

  assert([p1, p2, p3, p5, p6].every(p => p.pack.clarification === null),
    'G5 (§28): Four of the six scenarios reach a pack with no questions asked at all');

  assert(clarifyPreparation({ ...p1.pack.context }, MAX_PREPARATION_STEPS) === null,
    'G6: Clarification stops at the declared step ceiling — preparation never becomes a questionnaire');

  // Contradiction is surfaced, not resolved (§34).
  const conflicted = readContext('I have 10 minutes to go through the full architecture and integration with their enterprise architect.');
  assert(detectContextContradictions(conflicted).length > 0,
    'G7 (§34): Contradictory context is detected');
  const pConflict = await prepare({ brief: 'I have 10 minutes to go through the full architecture and integration with their enterprise architect.' });
  assert(pConflict.pack.interpretation.contradictions.length > 0,
    'G8 (§34): …and surfaced in the pack rather than silently resolved');

  // ══ H. Client facts are never invented (§28, §23) ══

  const tesco = readContext('Prepare me for Tesco.');
  assert(tesco.business_problems.length === 0 && tesco.client_role === null && tesco.objective === null,
    'H1 (§28): Naming a company infers no problem, no role and no objective from model memory');
  const pTesco = await prepare({ brief: 'Prepare me for Tesco.' });
  assert(pTesco.pack.state === 'needs-clarification',
    'H2 (§28): "Prepare me for Tesco" is insufficient and is treated as insufficient', pTesco.pack.state);

  // Supplied and inferred never merge into one apparently factual statement (§10, §16).
  assert(allPacks.every(p => p.interpretation.inferred.every(i => i.because.length > 0)),
    'H3 (§10): Every inferred statement names why it was inferred');
  assert(p1.pack.interpretation.supplied.length > 0 && p1.pack.interpretation.inferred.length > 0,
    'H4 (§16): Supplied and inferred are separate arrays and both are populated');

  // ══ I. Anticipated answers are grounded or are explicit inabilities (P6) ══

  assert(allPacks.every(p => p.likely_client_questions.every(q => q.grounded_in.length > 0 || q.concedes)),
    'I1 (P6): No confident answer stands on nothing');
  assert(allPacks.every(p => p.likely_client_questions.every(q => q.response.trim().length > 0)),
    'I2: …and no answer is empty');

  // A non-implemented capability's answers always carry the status caveat.
  let uncaveated = 0;
  for (const p of allPacks) {
    for (const q of p.likely_client_questions) {
      for (const id of q.grounded_in) {
        const c = byId.get(id);
        if (!c || c.identity.implementation_status === 'implemented') continue;
        if (!new RegExp(c.identity.implementation_status.replace(/-/g, '[- ]'), 'i').test(q.response)) uncaveated++;
      }
    }
  }
  assert(uncaveated === 0,
    'I3 (§20): Every answer about a non-implemented capability states its status',
    `${uncaveated} uncaveated`);

  // Governed questions are selected, not dumped (§22).
  assert(allPacks.every(p => p.questions_to_ask.length <= CURIOSITY_QUESTIONS.length),
    'I4 (§22): Questions Worth Asking are selected rather than dumped');
  assert(allPacks.every(p => p.questions_to_ask.every(q => q.why_here.length > 0 && q.why_here !== q.why_asking)),
    'I5 (§22): …and each explains why it suits THIS conversation, not only why it is a good question');
  const knownQuestionIds = new Set(CURIOSITY_QUESTIONS.map(q => q.question_id));
  assert(allPacks.every(p => p.questions_to_ask.every(q => knownQuestionIds.has(q.question_id))),
    'I6: …and every one is a governed record, never generated');

  // ══ J. Refinement refines (§31) ══

  const refined = await prepare({
    brief: S1, lens: 'sales',
    context: p1.pack.context,
    refinement: 'I only have 15 minutes.'
  });
  assert(refined.pack.context.duration_mins?.value === 15,
    'J1 (§31): A refinement updates the duration', String(refined.pack.context.duration_mins?.value));
  assert(refined.pack.context.client_role?.value === p1.pack.context.client_role?.value,
    'J2 (§31): …without discarding the client role established earlier');
  assert(refined.pack.context.domain?.value === p1.pack.context.domain?.value,
    'J3 (§31): …or the domain');
  assert(refined.pack.context.refinements.includes('I only have 15 minutes.'),
    'J4: …and the refinement itself is recorded');

  const technical = await prepare({ brief: S1, lens: 'sales', context: p1.pack.context, refinement: 'Make this more technical.' });
  assert(technical.pack.context.objective?.value === 'architecture',
    'J5 (§31): "Make this more technical" moves the objective', String(technical.pack.context.objective?.value));

  // A chosen value outranks a later inference.
  const chosen = await prepare({ brief: S4, choices: ['objective:pilot'] });
  assert(chosen.pack.context.objective?.value === 'pilot' && chosen.pack.context.objective?.source === 'chosen',
    'J6: A value the user chose is marked chosen and is not overwritten by inference');

  // ══ K. Lens versus client role stay separate (§9) ══

  assert(p1.pack.lens === 'sales' && p1.pack.context.client_role?.value === 'Head of Demand Planning',
    'K1 (§9): The Atlas lens and the client role are carried as different dimensions',
    `${p1.pack.lens} / ${p1.pack.context.client_role?.value}`);
  assert(!(ATLAS_LENSES as readonly string[]).includes(String(p1.pack.context.client_role?.value ?? '').toLowerCase()),
    'K2 (§9): …and a client role is never normalised into an AudienceLens');

  const prepRoute = readFileSync(join(ROOT, 'app', 'api', 'v1', 'atlas', 'prepare', 'route.ts'), 'utf8');
  assert(!/client_role/.test(prepRoute) || /brief/.test(prepRoute),
    'K3 (§9): The route takes a lens and a free-text brief — the client role is not a lens parameter');

  // ══ L. Intake lexicons name only governed values ══

  const catalogue = catalogueDomainIds();
  const badDomains = declaredDomainIds().filter(d => !catalogue.has(d));
  assert(badDomains.length === 0,
    'L1 (PR1): Every declared domain phrase names a real catalogue domain', badDomains.join(', '));

  const problems = catalogueProblemIds();
  const badProblems = declaredProblemIds().filter(p => !problems.has(p));
  assert(badProblems.length === 0,
    'L2 (PR2): Every declared problem phrase names a real governed business problem', badProblems.join(', '));

  assert(new Set(declaredProblemIds()).size === declaredProblemIds().length,
    'L3: …and no business problem is declared twice');
  assert(BUSINESS_PROBLEMS.length >= declaredProblemIds().length,
    'L4: …and the lexicon does not exceed the governed catalogue');

  // ══ M. No invented metrics reach the interface (Principle 12) ══

  const prepComponent = readFileSync(join(ROOT, 'components', 'atlas', 'ClientPreparation.tsx'), 'utf8');
  assert(!/\b\d{1,3}\s*%|confidence|relevance score|match score/i.test(prepComponent),
    'M1 (Principle 12): The preparation surface renders no percentage, confidence or relevance score');

  const packJson = JSON.stringify(p1.pack);
  assert(!/"score"|"confidence"|"relevance"/.test(packJson),
    'M2: …and no score reaches the API response at all');
  assert(typeof lensScore(all[0], 'sales') === 'number' && lensSignals(all[0], 'sales').every(s => s.rationale.length > 0),
    'M3: Lens affinity is computed for ordering and expressed to the reader only in words');

  // ══ N. Governance hygiene ══

  assert(p1.pack.preparation_version === PREPARATION_VERSION,
    'N1: Every pack records the governed version it was built under');
  assert(validatePack(p1.pack).length === 0, 'N2: The reference pack satisfies every declared rule');

  const delivered = [
    join(ROOT, 'lib', 'atlas', 'lens.ts'),
    join(ROOT, 'lib', 'atlas', 'preparation', 'engine.ts'),
    join(ROOT, 'lib', 'atlas', 'preparation', 'intake.ts'),
    join(ROOT, 'lib', 'atlas', 'preparation', 'recommend.ts'),
    join(ROOT, 'lib', 'atlas', 'preparation', 'sequence.ts'),
    join(ROOT, 'lib', 'atlas', 'preparation', 'questions.ts'),
    join(ROOT, 'lib', 'atlas', 'preparation', 'integrity.ts'),
    join(ROOT, 'lib', 'atlas', 'preparation', 'clarify.ts'),
    join(ROOT, 'packages', 'contracts', 'src', 'atlas-preparation-model.ts'),
    join(ROOT, 'app', 'api', 'v1', 'atlas', 'prepare', 'route.ts'),
    ...atlasComponentFiles()
  ].map(f => readFileSync(f, 'utf8')).join('\n');
  assert(!/claude|anthropic|generated by|co-authored/i.test(delivered),
    'N3: No delivered artefact carries assistant attribution');

  // The ATL-06D placeholder is gone and the real entry has replaced it.
  assert(!/Planned for ATL-06D|not yet available/i.test(detail),
    'N4: The "planned for ATL-06D, not yet available" placeholder is replaced by the real entry');
  assert(/atlas-prep-entry/.test(detail) && /atlas-prep-entry/.test(atlasShell),
    'N5 (§35): The entry exists on the Atlas and on capability detail — two surfaces, not every surface');

  // Accessibility of the new surface, matching the ATL-04R bar.
  assert(/aria-pressed/.test(prepComponent) && /aria-label/.test(prepComponent),
    'N6: Preparation controls are real, labelled controls');
  assert(/aria-live/.test(prepComponent),
    'N7: …and the clarification question is announced when it appears');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('ATL-06D test suite failed with an error:', e); process.exit(1); });
