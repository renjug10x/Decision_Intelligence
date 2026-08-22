/**
 * Per-record governance checks (ATL-07, ADR-068).
 *
 * These read what the estate controls: whether a capability record is complete for the lifecycle
 * state it claims, whether the files it cites still exist, whether the code it describes has moved
 * since a human last read it, and whether its market evidence has expired.
 *
 * Every check returns a FINDING. None of them edits anything, and none of them can: the engine has no
 * write path, which is `AC-ATL-07-3` made structural rather than promised. A governance engine that
 * could correct a record would eventually be asked to tidy one up, and the maturity dimensions this
 * programme spent six phases keeping honest are exactly what a tidy-up would smooth over.
 *
 * The completeness tiers are `CAPABILITY_KNOWLEDGE_MODEL.md` §9.1 transcribed, not reinterpreted. The
 * freshness bounds are ATL-06A's, imported rather than restated, so market-evidence currency cannot
 * mean one thing to the Atlas and another to its governance.
 */

import type {
  GovernanceCheckDefinition, GovernanceFinding
} from '../../../packages/contracts/src/atlas-governance-model';
import type {
  CapabilityIdentity, CapabilityKnowledge, LifecycleState
} from '../../../packages/contracts/src/capability-atlas-model';
import { NON_REAL_STATUSES } from '../../../packages/contracts/src/capability-atlas-model';
import { assessFreshness } from '../grounding/provenance';

export const RECORD_CHECKS: GovernanceCheckDefinition[] = [
  { check_id: 'GOV-REC-1', subject: 'capability', severity: 'blocking',
    assertion: 'The record meets the completeness tier for the lifecycle state it claims.',
    governs: 'AC-ATL-07-2 · CAPABILITY_KNOWLEDGE_MODEL.md §9.1' },
  { check_id: 'GOV-REC-2', subject: 'capability', severity: 'blocking',
    assertion: 'Every path the record claims as CURRENT — implementation reference, contract, test runner — exists.',
    governs: 'AC-ATL-07-2 · ADR-045, the Atlas never cites what is not there' },
  { check_id: 'GOV-REC-2H', subject: 'capability', severity: 'advisory',
    assertion: 'A historical observation naming a path that no longer exists is confirmed as historical, not stale.',
    governs: 'ADR-045 — validation evidence records what was observed and when, so a retired surface is legitimate provenance' },
  { check_id: 'GOV-REC-3', subject: 'capability', severity: 'advisory',
    assertion: 'No cited source file has changed since the record was last reviewed.',
    governs: 'AC-ATL-07-1' },
  { check_id: 'GOV-REC-4', subject: 'capability', severity: 'advisory',
    assertion: 'The record is within the review window for its lifecycle state.',
    governs: 'CAPABILITY_KNOWLEDGE_MODEL.md §9.1 review windows' },
  { check_id: 'GOV-REC-5', subject: 'capability', severity: 'blocking',
    assertion: 'The record names an owner and a review date.',
    governs: 'AC-ATL-07-2 · rule V14' },
  { check_id: 'GOV-REC-6', subject: 'capability', severity: 'advisory',
    assertion: 'The record carries a lifecycle state, so a completeness tier can be applied.',
    governs: 'ADR-047 — a null dimension is preserved honestly, and is also untestable' },
  { check_id: 'GOV-REC-7', subject: 'capability', severity: 'advisory',
    assertion: 'A capability demonstrated at production readiness carries a Demo Path.',
    governs: 'ADR-047 demonstration maturity' },
  { check_id: 'GOV-REC-8', subject: 'capability', severity: 'advisory',
    assertion: 'Recorded market evidence is within the ATL-06A currency window for its topic.',
    governs: 'AC-ATL-07-4 · ADR-054' },
  { check_id: 'GOV-REC-9', subject: 'capability', severity: 'advisory',
    assertion: 'A capability that is not fully implemented records at least one known limitation.',
    governs: 'ADR-047 · ADR-053 — a constraint nobody wrote down cannot protect anyone' }
];

/** `CAPABILITY_KNOWLEDGE_MODEL.md` §9.1, transcribed. */
const TIER_REQUIREMENTS: Record<LifecycleState, (k: CapabilityKnowledge, c: CapabilityIdentity) => string[]> = {
  'Concept': k => k.innovation_thesis?.trim() ? [] : ['innovation_thesis'],
  'Research': (k, c) => [
    ...(k.innovation_thesis?.trim() ? [] : ['innovation_thesis']),
    ...(c.business_problems.length ? [] : ['business_problems']),
    ...(k.assumptions?.length ? [] : ['assumptions'])
  ],
  'Prototype': (k, c) => [
    ...TIER_REQUIREMENTS['Research'](k, c),
    ...(k.usage_instructions?.trim() ? [] : ['usage_instructions']),
    ...(k.implementation_references?.length ? [] : ['implementation_references']),
    ...(k.architecture_narrative?.trim() ? [] : ['architecture_narrative']),
    ...(k.demo_scenarios?.length ? [] : ['demo_scenarios'])
  ],
  'Pilot Ready': (k, c) => [
    ...TIER_REQUIREMENTS['Prototype'](k, c),
    ...(k.testing_instructions?.trim() ? [] : ['testing_instructions']),
    ...(k.test_runners?.length ? [] : ['test_runners']),
    ...(k.validation_evidence?.length ? [] : ['validation_evidence']),
    ...((k.apis?.length || k.contracts?.length) ? [] : ['apis or contracts'])
  ],
  'Accelerator': (k, c) => [
    ...TIER_REQUIREMENTS['Pilot Ready'](k, c),
    ...(k.cross_domain_applicability?.length ? [] : ['cross_domain_applicability'])
  ],
  'Industry Pattern': (k, c) => [
    ...TIER_REQUIREMENTS['Accelerator'](k, c),
    ...(k.client_questions?.length ? [] : ['client_questions'])
  ],
  'Retired': k => k.known_limitations?.length ? [] : ['known_limitations (retirement rationale)']
};

/** §9.1 review windows, in months. */
const REVIEW_WINDOW_MONTHS: Record<LifecycleState, number> = {
  'Concept': 12, 'Research': 12, 'Prototype': 6, 'Pilot Ready': 6,
  'Accelerator': 3, 'Industry Pattern': 3, 'Retired': 12
};
const DEFAULT_REVIEW_MONTHS = 12;
const DAY_MS = 86_400_000;

export interface RecordCheckContext {
  identity: CapabilityIdentity;
  knowledge: CapabilityKnowledge | null;
  demoMaturity: string | null;
  fileExists: (path: string) => boolean;
  lastChangedAt: (path: string) => string | null;
  now: Date;
}

/** Repository paths look like paths. A runner name or an ADR reference is not one, and is not checked here. */
function isRepositoryPath(ref: string): boolean {
  return /^[a-zA-Z0-9_./@-]+\.(ts|tsx|md|json|css|yml|sh)$/.test(ref) && ref.includes('/');
}

export function runRecordChecks(ctx: RecordCheckContext): GovernanceFinding[] {
  const { identity: c, knowledge: k } = ctx;
  const findings: GovernanceFinding[] = [];
  const about = c.capability_id;

  const flag = (check_id: string, severity: 'blocking' | 'advisory', detail: string, remedy: string) =>
    findings.push({ check_id, subject: 'capability', severity, about, detail, remedy });

  // GOV-REC-5 — provenance.
  if (!c.owner?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(c.reviewed_at ?? '')) {
    flag('GOV-REC-5', 'blocking',
      'The record does not name both an owner and an ISO review date.',
      'Set owner and reviewed_at in config/capabilities.ts.');
  }

  if (!k) {
    flag('GOV-REC-1', 'blocking',
      'The record has no knowledge module, so no completeness tier can be met.',
      'Add a knowledge module under content/atlas/capabilities/ and point knowledge_ref at it.');
    return findings;
  }

  // GOV-REC-1 / GOV-REC-6 — completeness for the claimed lifecycle state.
  if (c.lifecycle_state === null) {
    flag('GOV-REC-6', 'advisory',
      'The record carries no lifecycle state, so no completeness tier applies. The null is preserved honestly (ADR-047); it also means this record is exempt from the check that would otherwise govern it.',
      'Assign a lifecycle state where one is genuinely known. Do not invent one to satisfy this check.');
  } else {
    const missing = TIER_REQUIREMENTS[c.lifecycle_state](k, c);
    if (missing.length > 0) {
      flag('GOV-REC-1', 'blocking',
        `Lifecycle state '${c.lifecycle_state}' requires ${missing.join(', ')}, which the record does not carry.`,
        'Populate the missing fields, or record the lower lifecycle state the evidence actually supports. Automation will not lower it for you.');
    }
  }

  // GOV-REC-2 — paths the record claims as CURRENT must exist.
  //
  // The distinction matters and was found by running this check: `validation_evidence` records an
  // observation made at a stated time by a stated observer, so it may legitimately name a surface
  // that has since been retired — `CAP-DECISION-LIFECYCLE-VIEW` cites `components/Help.tsx` precisely
  // to say the stages outlived it. Blocking on that would flag a correct record, and a governance
  // check that cries wolf on correct records is worse than no check. Historical references get their
  // own advisory instead.
  const currentPaths = [
    ...(k.implementation_references ?? []).map(r => r.path),
    ...(k.test_runners ?? []),
    ...(k.contracts ?? []).map(x => x.path)
  ].filter(isRepositoryPath);

  const missingPaths = [...new Set(currentPaths.filter(p => !ctx.fileExists(p)))];
  if (missingPaths.length > 0) {
    flag('GOV-REC-2', 'blocking',
      `The record claims ${missingPaths.length} path(s) as current implementation, contract or test evidence, and they do not exist: ${missingPaths.join(', ')}.`,
      'Correct the reference, or remove the claim it supports. A citation that does not resolve is indistinguishable from an invented one.');
  }

  const historical = [...new Set((k.validation_evidence ?? []).map(e => e.ref)
    .filter(isRepositoryPath).filter(p => !ctx.fileExists(p)))];
  if (historical.length > 0) {
    flag('GOV-REC-2H', 'advisory',
      `Validation evidence names ${historical.length} path(s) that no longer exist: ${historical.join(', ')}. That is legitimate if the entry records an observation of something since retired, and stale if it does not.`,
      'Confirm the entry reads as a past observation with its observed_at date, or replace it with evidence that still resolves.');
  }

  const citedPaths = [...currentPaths, ...(k.validation_evidence ?? []).map(e => e.ref).filter(isRepositoryPath)];

  const reviewedAt = new Date(c.reviewed_at).getTime();
  if (!Number.isNaN(reviewedAt)) {
    const drifted: string[] = [];
    const unknown: string[] = [];
    for (const path of [...new Set(citedPaths.filter(p => ctx.fileExists(p)))]) {
      const changed = ctx.lastChangedAt(path);
      if (changed === null) { unknown.push(path); continue; }
      // A same-day change is drift: the review and the edit cannot both be assumed later.
      if (new Date(changed).getTime() > reviewedAt) drifted.push(path);
    }
    if (drifted.length > 0) {
      flag('GOV-REC-3', 'advisory',
        `${drifted.length} cited source file(s) changed after the record was reviewed on ${c.reviewed_at}: ${drifted.join(', ')}. The description may no longer match the code.`,
        'Re-read the record against the changed files and move reviewed_at, or correct the record. Moving the date without reading is the one thing this check cannot detect.');
    }
    if (unknown.length > 0) {
      flag('GOV-REC-3', 'advisory',
        `Change history is unavailable for ${unknown.length} cited path(s), so drift could not be measured.`,
        'Run where git history is available. An unanswerable drift question is reported, never treated as a pass.');
    }
  }

  // GOV-REC-4 — review window.
  const months = c.lifecycle_state ? REVIEW_WINDOW_MONTHS[c.lifecycle_state] : DEFAULT_REVIEW_MONTHS;
  const ageDays = Math.floor((ctx.now.getTime() - reviewedAt) / DAY_MS);
  if (!Number.isNaN(reviewedAt) && ageDays > months * 30) {
    flag('GOV-REC-4', 'advisory',
      `Last reviewed ${ageDays} days ago; the window for ${c.lifecycle_state ?? 'an unstated lifecycle state'} is ${months} months.`,
      'Re-read the record and move reviewed_at.');
  }

  // GOV-REC-7 — demonstration readiness.
  if (ctx.demoMaturity === 'Production Ready' && !(k.demo_scenarios ?? []).length) {
    flag('GOV-REC-7', 'advisory',
      'The capability resolves to Production Ready demonstration maturity but carries no Demo Path.',
      'Add the demo scenario, or check whether the solution that confers this maturity really demonstrates this capability.');
  }

  // GOV-REC-8 — market evidence currency, on ATL-06A's bounds.
  for (const evidence of k.external_evidence ?? []) {
    if (!evidence.published_at || evidence.published_at === 'undated') {
      flag('GOV-REC-8', 'advisory',
        `Recorded market evidence from ${evidence.publisher} carries no usable publication date.`,
        'Replace it with a dated source, or remove it. A date is never inferred.');
      continue;
    }
    const freshness = assessFreshness(
      { url: evidence.source_url, publisher: evidence.publisher, title: evidence.source_title,
        published_at: evidence.published_at, retrieved_at: evidence.retrieved_at,
        tier: 'analyst', retrieval_method: evidence.retrieval_method },
      'market and competitor landscape', ctx.now
    );
    if (freshness.verdict === 'stale') {
      flag('GOV-REC-8', 'advisory',
        `Recorded market evidence from ${evidence.publisher} is stale: ${freshness.label}`,
        'Refresh or remove it. Stale evidence is flagged here rather than silently served (AC-ATL-07-4).');
    }
  }

  // GOV-REC-9 — an unbuilt capability with nothing written down about what is missing.
  if (NON_REAL_STATUSES.includes(c.implementation_status) && !(k.known_limitations ?? []).length) {
    flag('GOV-REC-9', 'advisory',
      `Implementation status is '${c.implementation_status}' but the record states no known limitation, so the ADR-053 contradiction rule has nothing to protect this capability with.`,
      'Record what is actually missing. A constraint nobody wrote down cannot separate a market claim from this record.');
  }

  return findings;
}
