/**
 * ATL-04R — Unified Capability Exploration Experience
 *
 * Run via: npx tsx tests/unit/run-atl04r-tests.ts
 *
 * `ATL-04` proved the backend-driven Atlas. `ATL-04R` refines the interaction architecture over it:
 * one Atlas instead of three destinations, a governed landscape instead of a flat list, persona and
 * domain as exploration dimensions instead of global state, and a discovery input that asks rather
 * than guesses.
 *
 * What this suite exists to prevent, in order of how badly each would hurt:
 *
 *   1. A LANDSCAPE THAT LIES. The areas claim to partition the registry. If that stops being true,
 *      a capability becomes unreachable from the map while the map still looks complete (§A).
 *   2. CLARIFICATION THAT INVENTS. A clarification choice may only narrow to capabilities the query
 *      already reached, and may never manufacture a persona or a domain the reader did not imply
 *      (§C). The whole feature is only safe because it cannot widen.
 *   3. A VISUAL THAT ASSERTS A NUMBER. `ATL-01` found twelve fabricated outcome constants in the
 *      storyboard. The visual schema has no numeric field and the labels are checked anyway (§D).
 *   4. TRUTH COLLAPSING INTO ONE BADGE. Lifecycle, demonstration maturity and implementation status
 *      are three independent dimensions and stay three (§G).
 *   5. GOVERNANCE DRIFT. About must not return as a destination, the storyboard must not vanish
 *      before its gate passes, and no fabricated certification may appear (§F, §H).
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

import { CAPABILITY_REGISTRY } from '../../config/capabilities';
import { CAPABILITY_AREAS, AREA_BY_CAPABILITY, getArea } from '../../content/atlas/capability-areas';
import { BUSINESS_PROBLEMS, businessProblemLabel } from '../../content/atlas/business-problems';
import { validateLandscape, validateVisual } from '../../lib/atlas/landscape-validator';
import { capabilityRepository } from '../../services/atlas/src/capability-registry';
import { loadKnowledge } from '../../services/atlas/src/capability-knowledge-store';
import { searchCapabilities } from '../../lib/atlas/capability-search';
import { understandQuery, singularize, STOPWORDS } from '../../lib/atlas/query-understanding';
import {
  clarify, applyChoice, removeContext, isPlatformQuestion, AREA_DOMINANCE_THRESHOLD
} from '../../lib/atlas/clarification';
import { resolvePlatformMetadata, PLATFORM_VERSION } from '../../config/platform-metadata';
import { MAX_CLARIFICATION_STEPS, ATLAS_LENSES } from '../../packages/contracts/src/capability-atlas-model';
import { LENS_PROFILES } from '../../lib/atlas/lens';
import type { ExplorationContext } from '../../packages/contracts/src/capability-atlas-model';

const ROOT = join(__dirname, '..', '..');

let passed = 0, failed = 0;
function assert(c: boolean, name: string, detail?: string) {
  if (c) { console.log(`[PASS] ${name}`); passed++; }
  else { console.error(`[FAIL] ${name} - ${detail || 'Assertion failed'}`); failed++; }
}

const ctx = { resolveDemoMaturity: (c: any) => capabilityRepository.resolveDemoMaturity(c) };
const identities = CAPABILITY_REGISTRY;

/** Every .tsx under components/atlas, recursively — subdirectories included on purpose. */
function atlasComponentFiles(dir = join(ROOT, 'components', 'atlas')): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return atlasComponentFiles(full);
    return entry.endsWith('.tsx') ? [full] : [];
  });
}

async function run() {
  console.log('\n=== ATL-04R — Unified Capability Exploration Experience ===\n');

  // ── A. The governed landscape is a partition, not a selection ─────────────
  const landscape = validateLandscape(CAPABILITY_AREAS, BUSINESS_PROBLEMS, identities);
  assert(landscape.valid,
    'A1: The capability landscape validates against every landscape rule',
    landscape.errors.map(e => `${e.rule} ${e.capability_id}: ${e.message}`).join(' | '));

  const memberTotal = CAPABILITY_AREAS.reduce((n, a) => n + a.members.length, 0);
  assert(memberTotal === identities.length,
    'A2: L3 — the areas partition the registry: every capability has exactly one home',
    `${memberTotal} memberships for ${identities.length} capabilities`);

  assert(identities.every(c => Boolean(AREA_BY_CAPABILITY[c.capability_id])),
    'A3: …so no registered capability is unreachable from the landscape');

  const homes = new Map<string, number>();
  for (const area of CAPABILITY_AREAS) for (const m of area.members) homes.set(m, (homes.get(m) ?? 0) + 1);
  assert([...homes.values()].every(n => n === 1),
    'A4: …and none is double-counted across two areas');

  assert(CAPABILITY_AREAS.every(a => a.members.length > 0 && a.rationale.length >= 40),
    'A5: L2 — every area carries members and a rationale a reviewer can disagree with');

  assert(CAPABILITY_AREAS.every(a =>
    a.aspects.every(x => x.selects.every(ref => a.members.includes(ref)))),
    'A6: L5 — an aspect may only select its own area’s members, so a choice can never widen the result set');

  const emptyAreaCheck = validateLandscape(
    [...CAPABILITY_AREAS, { ...CAPABILITY_AREAS[0], area_id: 'CAPAREA-FAKE', members: [] }],
    BUSINESS_PROBLEMS, identities);
  assert(!emptyAreaCheck.valid && emptyAreaCheck.errors.some(e => e.rule === 'L3'),
    'A7: An area invented with no members is refused — the landscape cannot be padded to a neat grid');

  const outsideAspect = validateLandscape(
    CAPABILITY_AREAS.map((a, i) => i === 0
      ? { ...a, aspects: [{ aspect_id: 'x-bad', label: 'Bad', selects: ['CAP-PROMOTION-INTELLIGENCE'] }] }
      : a),
    BUSINESS_PROBLEMS, identities);
  assert(!outsideAspect.valid && outsideAspect.errors.some(e => e.rule === 'L5'),
    'A8: An aspect reaching a capability its area does not own is refused');

  // ── B. Business problems have governed names, not slugs ───────────────────
  const claimed = new Set(identities.flatMap(c => c.business_problems));
  assert([...claimed].every(id => BUSINESS_PROBLEMS.some(p => p.problem_id === id)),
    'B1: L6 — every business problem the registry uses has a catalogue entry');
  assert(BUSINESS_PROBLEMS.every(p => claimed.has(p.problem_id)),
    'B2: …and no catalogue entry describes a problem no capability claims');
  assert(BUSINESS_PROBLEMS.every(p => p.question.trim().endsWith('?')),
    'B3: …each stated as the question a reader would actually ask');
  assert(businessProblemLabel('bp-ai-trust') === 'Trust in automated reasoning',
    'B4: A `bp-*` identifier renders as a governed label rather than a de-slugged identifier');
  assert(businessProblemLabel('bp-not-registered') === 'not registered',
    'B5: …and an unknown identifier degrades to readable text rather than throwing');

  // ── C. Clarification asks rather than guessing, and never invents ─────────
  const clarifySource = readFileSync(join(ROOT, 'lib', 'atlas', 'clarification.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const ambiguous = clarify(identities, { query: 'What capabilities does CogniX have on Promotions?' }, {}, ctx);
  assert(ambiguous.state === 'multiple-interpretations' && ambiguous.question !== null,
    'C1: Scenario A — an ambiguous question produces a clarification rather than a flat result set',
    `state ${ambiguous.state}`);
  assert(ambiguous.area_relevance.length >= 2 && ambiguous.question!.dimension === 'area',
    'C2: …asking which of the capability areas it reaches was meant');
  assert(ambiguous.question!.choices.some(c => c.value === 'all'),
    'C3: …always offering a way to decline to narrow');
  assert(ambiguous.question!.multi_select === true,
    'C4: …and allowing several readings at once, because a question may legitimately span areas');
  assert(ambiguous.area_relevance[0].area_id === 'CAPAREA-CAMPAIGN',
    'C5: …with the area the reader actually named leading the landscape',
    ambiguous.area_relevance.map(a => a.area_id).join(', '));

  const architect = clarify(identities, { query: 'Show me Promotion capabilities from an architect perspective.' }, {}, ctx);
  assert(architect.context.lens?.value === 'architect' && architect.context.lens.source === 'inferred',
    'C6: Scenario B — a declared perspective is read from the question and marked as inferred');
  assert(architect.question === null || architect.question.dimension !== 'lens',
    'C7: …and the reader is never asked which perspective they meant when they have already said');
  assert(architect.state === 'clear',
    'C8: …a stated lens over a dominant area is enough to show results', architect.state);

  const demo = clarify(identities, { query: 'How do I demo promotion intelligence to a client?' }, {}, ctx);
  assert(demo.context.lens?.value === 'sales',
    'C9: Scenario C — demonstration intent reads as the Sales lens');
  assert(demo.state === 'clear',
    'C10: …and is not interrogated further, because clarification asks only where it must', demo.state);

  const platform = clarify(identities, { query: 'What is CogniX?' }, {}, ctx);
  assert(isPlatformQuestion('What is CogniX?') && platform.state === 'clear' && platform.question === null,
    'C11: Scenario D — a question about the platform is not forced through capability-area clarification');

  const multi = clarify(identities, { query: 'Promotions, demand, signals and inventory' }, {}, ctx);
  assert(multi.state === 'multiple-interpretations' && multi.question?.multi_select === true,
    'C12: Scenario E — a question naming several areas stays multi-area rather than being forced into one');
  assert(multi.area_relevance.length >= 3,
    'C13: …with every area it reaches carried through', `${multi.area_relevance.length} areas`);

  // Progressive: an area, then what the reader wants to know about it. Never more than the ceiling.
  const step0 = clarify(identities, { query: 'Promotions' }, {}, ctx);
  assert(step0.state === 'needs-clarification' && step0.question?.dimension === 'aspect',
    'C14: A bare term with one clear area is asked which aspect, not which area', step0.state);
  const aspectChoice = step0.question!.choices.find(c => c.dimension === 'aspect' && c.value !== 'all')!;
  const ctx1 = applyChoice(step0.context, aspectChoice);
  const step1 = clarify(identities, { query: 'Promotions', context: ctx1, step: 1 }, {}, ctx);
  assert(step1.question?.dimension === 'depth',
    'C15: …then what they would like to understand about it', String(step1.question?.dimension));
  const depthChoice = step1.question!.choices[0];
  const ctx2 = applyChoice(step1.context, depthChoice);
  const step2 = clarify(identities, { query: 'Promotions', context: ctx2, step: 2 }, {}, ctx);
  assert(step2.question === null && step2.state === 'clear',
    'C16: …and then it stops. Clarification is bounded, not an interrogation');
  assert(MAX_CLARIFICATION_STEPS === 2 && clarifySource.includes('MAX_CLARIFICATION_STEPS'),
    'C17: The ceiling is published in the contract and read by the engine rather than restated in it');

  // The rule that makes clarification safe.
  const areaChoice = ambiguous.question!.choices.find(c => c.dimension === 'area' && c.value !== 'all')!;
  const reached = new Set(ambiguous.in_scope);
  assert(areaChoice.selects.every(id => reached.has(id)),
    'C18: A clarification choice narrows only to capabilities the query already reached');
  const narrowed = clarify(identities, {
    query: 'What capabilities does CogniX have on Promotions?',
    context: applyChoice(ambiguous.context, areaChoice), step: 1
  }, {}, ctx);
  assert(narrowed.in_scope.length <= ambiguous.in_scope.length,
    'C19: …so answering a clarification never widens the result set',
    `${ambiguous.in_scope.length} -> ${narrowed.in_scope.length}`);

  // Nothing is manufactured, and nothing is permanent.
  const neutral = clarify(identities, { query: 'forecast uncertainty' }, {}, ctx);
  assert(neutral.context.lens === null,
    'C20: A question implying no perspective never has a persona manufactured for it');
  assert(neutral.context.domain === null || neutral.context.domain.source === 'inferred',
    'C21: …and a domain is only ever present when read from the question, and is marked as such');
  const withLens = clarify(identities, { query: 'capabilities for an architect' }, {}, ctx);
  assert(withLens.context.lens?.source === 'inferred',
    'C22: Inferred context is labelled as inferred, so the reader can tell it from what they chose');
  const removed = removeContext(withLens.context, 'lens');
  assert(removed.lens === null, 'C23: …and every inferred element can be removed');
  const areaThenRemoved = removeContext(applyChoice(step0.context, aspectChoice), 'area', 'CAPAREA-CAMPAIGN');
  assert(areaThenRemoved.aspects.length === 0,
    'C24: Removing an area removes the aspects that belonged to it — no orphaned context survives');

  const nothing = clarify(identities, { query: 'zzzz quantum tokenomics blockchain' }, {}, ctx);
  assert(nothing.state === 'insufficient-evidence' && nothing.question === null,
    'C25: A question the Atlas cannot ground is said to be ungrounded, not clarified into a guess');

  const identified = clarify(identities, { query: 'CAP-DECISION-GAP' }, {}, ctx);
  assert(identified.state === 'clear' && identified.in_scope.includes('CAP-DECISION-GAP'),
    'C26: A question naming a governed identifier has already said what it means');

  const freeText = clarify(identities, {
    query: 'Promotions',
    context: { ...step0.context, refinements: ['architecture and integration'] }, step: 1
  }, {}, ctx);
  assert(freeText.context.refinements.includes('architecture and integration'),
    'C27: A reader may answer in their own words — prepared responses are shortcuts, not restrictions');
  assert(freeText.question === null || freeText.question.dimension !== 'depth',
    'C28: …and their own words are honoured rather than re-asked');

  assert(!/gemini|generative-ai|openai|embedding|fetch\(/i.test(clarifySource),
    'C29: Clarification is deterministic — no provider, no credential, no network call');
  assert(!/confidence\s*[:=]\s*\d|percent/i.test(clarifySource),
    'C30: …and states intent qualitatively rather than inventing a confidence percentage');
  assert(AREA_DOMINANCE_THRESHOLD > 0 && AREA_DOMINANCE_THRESHOLD < 1,
    'C31: The threshold that decides whether to ask is published, so an unwanted question is checkable');

  // ── D. Visual explainability explains, and never asserts a number ─────────
  const withVisuals: { id: string; kind: string; description: string }[] = [];
  for (const identity of identities) {
    if (!identity.knowledge_ref) continue;
    const knowledge = await loadKnowledge(identity.knowledge_ref);
    if (!knowledge?.visualisation) continue;
    withVisuals.push({
      id: identity.capability_id,
      kind: knowledge.visualisation.kind,
      description: knowledge.visualisation.description
    });
    const issues = validateVisual(identity.capability_id, knowledge.visualisation);
    assert(issues.length === 0,
      `D-${identity.capability_id}: its visual satisfies rule L7`,
      issues.map(i => i.message).join(' | '));
  }
  assert(withVisuals.length >= 8,
    'D1: Visual explainability is delivered across the estate, not on one showcase record',
    `${withVisuals.length} capabilities carry a visual`);
  assert(withVisuals.some(v => v.id === 'CAP-DECISION-GAP' && v.kind === 'gap'),
    'D2: Decision Gap is the reference implementation and uses the gap pattern');
  assert(withVisuals.every(v => v.description.length >= 40),
    'D3: Every visual carries a text equivalent, so a reader who cannot see it still learns what it says');
  assert(withVisuals.every(v => !/\d+\s*(%|per cent|percent)|[£$€]\s*\d/.test(v.description)),
    'D4: No visual asserts a quantity — these explain structure, not measurement');
  assert(withVisuals.length < identities.length,
    'D5: …and most capabilities carry none, because a visual is authored only where it explains');

  const visualSource = readFileSync(join(ROOT, 'components', 'atlas', 'visuals', 'CapabilityVisual.tsx'), 'utf8');
  assert(!/half-life|relationship:/i.test(visualSource),
    'D6: A pattern nothing uses was removed rather than kept for a hypothetical future');
  const kindsUsed = new Set(withVisuals.map(v => v.kind));
  assert([...kindsUsed].every(k => visualSource.includes(`${k.includes('-') ? `'${k}'` : k}:`)),
    'D7: Every governed visual kind has a renderer', [...kindsUsed].join(', '));
  assert(visualSource.includes('aria-hidden') && visualSource.includes('figcaption'),
    'D8: The graphic is hidden from assistive technology and the equivalent is real text, not a label');

  // ── E. The lexical defect ADR-062 closed ─────────────────────────────────
  const plural = searchCapabilities(identities, 'Promotions', {}, ctx);
  const singular = searchCapabilities(identities, 'promotion', {}, ctx);
  assert(plural.total > 0 && plural.total === singular.total,
    'E1: ADR-062 — a plural question reaches the same capabilities as its singular',
    `promotions ${plural.total}, promotion ${singular.total}`);
  assert(singularize('promotions') === 'promotion' && singularize('capabilities') === 'capability',
    'E2: …by declared normalisation, not by a model');
  assert(singularize('analysis') === null && singularize('bus') === null,
    'E3: …which declines to normalise a word that is not a plural');
  assert(STOPWORDS.has('cognix'),
    'E4: The product’s own name discriminates nothing in its own corpus and is treated as a stopword');
  const formMatch = plural.results.find(r => r.capability_id === 'CAP-PROMOTION-INTELLIGENCE');
  assert(Boolean(formMatch?.matches.some(m => m.via_form)),
    'E5: …and a form-derived match is attributed, so the reader sees why it matched');
  const direct = singular.results.find(r => r.capability_id === 'CAP-PROMOTION-INTELLIGENCE')!;
  assert(direct.score >= (formMatch?.score ?? 0),
    'E6: A word the searcher wrote exactly still outranks one reached by normalisation',
    `direct ${direct.score} vs form ${formMatch?.score}`);

  // ── F. Navigation is unified: one destination, no global identity ─────────
  const sidebar = readFileSync(join(ROOT, 'components', 'Sidebar.tsx'), 'utf8');
  const sidebarJsx = sidebar.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/nav-section-label[^>]*>\s*Explore/.test(sidebarJsx),
    'F1: The Explore sidebar grouping is gone');
  assert(!/onNavigate\('portfolio'\)/.test(sidebarJsx),
    'F2: Portfolio is no longer a sidebar destination');
  assert(!/onNavigate\('curiosity'\)/.test(sidebarJsx),
    'F3: Questions is no longer a sidebar destination');
  assert(/onNavigate\('atlas'\)/.test(sidebarJsx),
    'F4: Capability Atlas is the single discovery destination');
  assert(/Observability/.test(sidebarJsx) && !/onNavigate\('help'\)/.test(sidebarJsx),
    'F5: Governance is renamed Observability & Governance, and About is not a destination');

  const shell = readFileSync(join(ROOT, 'app', 'page.tsx'), 'utf8');
  const shellJsx = shell.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(!/Domain Context/.test(shellJsx) && !/DOMAIN_CATALOGUE/.test(shellJsx),
    'F6: The global Domain selector is removed from the header');
  assert(!/PERSONA_CATALOGUE/.test(shellJsx) && !/handlePersonaChange/.test(shellJsx),
    'F7: The global Persona selector is removed from the header — a user does not become a persona');
  assert(/AboutSurface/.test(shellJsx),
    'F8: About is a lightweight header control instead');
  assert(/useState<string>\('atlas'\)/.test(shellJsx),
    'F9: The Atlas is the landing surface');
  assert(!existsSync(join(ROOT, 'components', 'Help.tsx')),
    'F10: The About module no longer exists as a page');
  assert(existsSync(join(ROOT, 'components', 'ObservabilityGovernance.tsx')),
    'F11: …and Observability & Governance exists in its place');
  assert(/case 'portfolio':/.test(shellJsx) && /case 'curiosity':/.test(shellJsx),
    'F12: The retired page keys still resolve, so a stale reference lands in the Atlas rather than nowhere');

  // ── G. Truth dimensions survive the redesign ─────────────────────────────
  const atlasFiles = atlasComponentFiles();
  const atlasSource = atlasFiles.map(f => readFileSync(f, 'utf8')).join('\n');
  assert(atlasFiles.length >= 10,
    'G1: The Atlas is composed of focused components rather than one screen',
    `${atlasFiles.length} components`);
  assert(!/from '@\/config\/capabilities'/.test(atlasSource) && !/CAPABILITY_REGISTRY/.test(atlasSource),
    'G2: ADR-046 holds recursively — no Atlas component reads the registry directly');
  assert(!/content\/atlas\/capabilities/.test(atlasSource),
    'G3: …nor a knowledge module');
  assert(!/innovation_thesis:\s*'/.test(atlasSource) && !/description:\s*'/.test(atlasSource),
    'G4: …and no capability prose is authored in a component');
  assert(atlasSource.includes('atlas-client'),
    'G5: …every capability string arrives through the Atlas client');

  const landscapeSource = readFileSync(join(ROOT, 'components', 'atlas', 'CapabilityLandscape.tsx'), 'utf8');
  assert(landscapeSource.includes('MaturityTriad'),
    'G6: ADR-047 — the landscape reports the three maturity dimensions, never one badge');
  assert(/implemented_count/.test(landscapeSource) && /capability_count/.test(landscapeSource),
    'G7: …and an area reports what is implemented separately from what is registered');
  const portfolioSource = readFileSync(join(ROOT, 'components', 'atlas', 'PortfolioView.tsx'), 'utf8');
  assert(/Implementation/.test(portfolioSource) && /Innovation lifecycle/.test(portfolioSource) &&
         /Demonstration maturity/.test(portfolioSource),
    'G8: Portfolio reports the three dimensions as three distributions, never a combined score');
  assert(/not fully built|not fully implemented/i.test(portfolioSource),
    'G9: …and names what is not fully built rather than showing only the finished work');

  const atlasContainer = readFileSync(join(ROOT, 'components', 'atlas', 'CapabilityAtlas.tsx'), 'utf8');
  assert(atlasContainer.indexOf('atlas-searchbar') < atlasContainer.indexOf('atlas-filters') &&
         atlasContainer.indexOf('atlas-filters') < atlasContainer.indexOf('atlas-results'),
    'G10: The discovery input still leads the surface, ahead of filters and results');
  assert(/atlas-advanced-toggle/.test(atlasContainer),
    'G11: …and structured filtering is retained behind progressive disclosure rather than removed');
  assert(/View through the lens of/.test(atlasContainer),
    'G12: The persona lens lives inside the Atlas');
  /*
    G13 originally required the lens bar to read "Ordering only". `ATL-06D` removed that sentence
    because it was an accurate description of a defect: owner evaluation of this very interface
    found that selecting Sales, Architect or Developer changed the section order and nothing a
    reader could use (`D-ATL-04R-1`). A note promising the control does little is not something to
    protect once the control has been made to do something.

    What G13 protects is that the lens does not hide or alter facts, and that the interface says so.
    Both are now asserted against the governed profile and the corrected wording — the invariance
    itself is proven field-by-field across the whole registry in `run-atl06d-tests.ts` §B.
  */
  assert(/LENS_PROFILES\[lens\]\.orientation/.test(atlasContainer),
    'G13: The lens bar states what the selected lens actually changes');
  assert(/The facts do not change, and nothing is hidden/.test(atlasContainer),
    'G13a: …and states that it changes no fact and hides nothing');
  assert(ATLAS_LENSES.every(l => LENS_PROFILES[l].orientation.length > 0 && LENS_PROFILES[l].reading_for.length > 0),
    'G13b: …with every lens declaring what it leads with and what it reads for');

  // ── H. About and governance tell the truth ───────────────────────────────
  const meta = resolvePlatformMetadata();
  assert(meta.certifications.length === 0,
    'H1: No certification is claimed, because none is recorded');
  const aboutSource = readFileSync(join(ROOT, 'components', 'AboutSurface.tsx'), 'utf8');
  assert(!/SOC ?2|ISO ?27001|HIPAA|GDPR compliant|certified/i.test(aboutSource),
    'H2: …and no compliance badge is authored into the surface');
  assert(/not recorded/.test(aboutSource),
    'H3: A missing value is shown as absent rather than filled in');
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert(PLATFORM_VERSION === pkg.version,
    'H4: Platform version comes from one governed source and agrees with the manifest',
    `${PLATFORM_VERSION} vs ${pkg.version}`);
  assert(/role="dialog"/.test(aboutSource) && /aria-modal/.test(aboutSource) && /Escape/.test(aboutSource),
    'H5: The About surface is a proper dialog and closes on Escape');

  const og = readFileSync(join(ROOT, 'components', 'ObservabilityGovernance.tsx'), 'utf8');
  // Stripped of comments: the file EXPLAINS which fabricated surfaces were dropped, and naming them
  // in a comment must not read as shipping them.
  const ogRendered = og.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert(/Observability &amp; Governance|Observability & Governance/.test(og),
    'H6: Governance is renamed to Observability & Governance');
  assert(!/3 Connected|client_id_looker|enterprise\.cloud\.looker\.com/.test(ogRendered),
    'H7: The fabricated integration surfaces were not migrated — nothing was connected');
  assert(/simulated/i.test(og) && /not enforced authorisation|not.*enforced authorisation/i.test(og),
    'H8: Access scoping is stated to be a simulation rather than enforced authorisation');
  assert(/Journey telemetry/i.test(og) && /Shared decision state/i.test(og) && /signal/i.test(og),
    'H9: The live diagnostics that lived behind About survived the move');
  assert(/refreshState/.test(og) && /resetScenario/.test(og),
    'H10: …including the only controls in the product that reset and refresh decision state');

  // ── I. The storyboard is retained until its gate passes ──────────────────
  assert(existsSync(join(ROOT, 'components', 'ArchitectureExplorer.tsx')),
    'I1: AC-ATL-04-6 — the Architectural Storyboard is not deleted while SB-GATE is open');
  assert(/ArchitectureExplorer/.test(og),
    'I2: …and remains reachable, now from governance rather than as the default tab of About');
  assert(/Retained pending retirement/.test(og),
    'I3: …labelled honestly as retained, simulated and awaiting its gate');
  const assessment = readFileSync(
    join(ROOT, 'docs', 'reports', 'COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md'), 'utf8');
  assert(/SB-GATE/.test(assessment),
    'I4: The migration assessment that owns the gate state is still the authority on it');

  // ── J. Responsive and accessible ────────────────────────────────────────
  const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
  const block = css.slice(css.indexOf('UNIFIED CAPABILITY ATLAS (ATL-04R)'));
  assert(block.length > 0, 'J1: The ATL-04R surfaces carry their own stylesheet block');
  assert(block.includes('@media (max-width: 1024px)') && block.includes('@media (max-width: 720px)'),
    'J2: …with the laptop and narrow breakpoints the estate validates at');
  assert(/\.atlas-areas \{[^}]*grid-template-columns: repeat\(auto-fill/.test(block),
    'J3: The capability landscape reflows rather than overflowing');
  assert(block.includes(':focus-visible'),
    'J4: …and every new control has a visible keyboard focus state');
  assert(block.includes('prefers-reduced-motion'),
    'J5: …and motion is respected');
  const clarifyPanel = readFileSync(join(ROOT, 'components', 'atlas', 'ClarificationPanel.tsx'), 'utf8');
  assert(/aria-pressed/.test(clarifyPanel) && /<button/.test(clarifyPanel) && /<input/.test(clarifyPanel),
    'J6: Clarification choices are real controls, so they are keyboard reachable');
  assert(/aria-live/.test(clarifyPanel),
    'J7: …and the question is announced when it appears');

  // ── K. Nothing carries assistant attribution ────────────────────────────
  const delivered = [
    join(ROOT, 'lib', 'atlas', 'clarification.ts'),
    join(ROOT, 'lib', 'atlas', 'landscape-validator.ts'),
    join(ROOT, 'content', 'atlas', 'capability-areas.ts'),
    join(ROOT, 'content', 'atlas', 'business-problems.ts'),
    join(ROOT, 'config', 'platform-metadata.ts'),
    ...atlasFiles,
    join(ROOT, 'components', 'ObservabilityGovernance.tsx'),
    join(ROOT, 'components', 'AboutSurface.tsx')
  ].map(f => readFileSync(f, 'utf8')).join('\n');
  assert(!/claude|anthropic|generated by|co-authored/i.test(delivered),
    'K1: No delivered artefact carries assistant attribution');
  assert(!readdirSync(join(ROOT, 'tests', 'unit')).some(f => /live/i.test(f)),
    'K2: …and no test file name collides with the ATL-06C naming guard');

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('ATL-04R test suite failed with an error:', e); process.exit(1); });
