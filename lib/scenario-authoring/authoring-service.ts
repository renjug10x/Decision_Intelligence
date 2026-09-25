/**
 * The scenario authoring lifecycle (`SCI-07`, ADR-083)
 * ───────────────────────────────────────────────────────────────────────────────
 * DRAFT → a person confirms → CONFIRMED → deterministic resolution → certification.
 *
 * The four rules this module exists to enforce, each of them structurally
 * --------------------------------------------------------------------
 *  1. **A draft never activates.** Confirmation registers and certifies a scenario; making it
 *     demo-active stays where ADR-077 and ADR-080 put it, behind the registry's gate. There is
 *     no code path from here to `activateScenario`, and that is asserted rather than promised.
 *  2. **GenAI cannot confirm.** Confirmation requires `confirmed_by`, a human actor, supplied
 *     by the caller. A drafting call cannot produce one and the drafting route never sets one.
 *  3. **Confirmation cannot bypass certification.** `confirmDraft` registers the resolved
 *     scenario and runs the full gate. A draft whose scenario does not certify does NOT become
 *     `CONFIRMED`; it stays `DRAFT` carrying the failed dimensions, so the author can correct
 *     it. "Confirmed but not certified" is not a state this lifecycle can reach.
 *  4. **A confirmed scenario reproduces without the provider.** Resolution reads the draft
 *     inputs and the governed masters and nothing else. The drafting envelopes are kept as an
 *     AUDIT of what the model proposed; nothing in resolution reads them.
 *
 * Why the scenario is registered before it is certified, and why that is safe
 * --------------------------------------------------------------------------
 * Certification dimension `C-1.2` asserts that a scenario's identity resolves THROUGH THE
 * REGISTRY back to the same record, so the gate cannot evaluate a scenario the registry has
 * never seen. Registration is not activation: ADR-080 gates activation on certification and
 * the registry refuses an uncertified scenario at `activateScenario` whatever is registered.
 * Re-confirming a corrected draft re-registers the same identity, which the registry
 * explicitly supports, so a failed attempt leaves no second record behind.
 */

import { createHash, randomBytes } from 'node:crypto';
import {
  SCENARIO_DRAFT_EXPORT_DISCLOSURE,
  SCENARIO_DRAFT_EXPORT_FORMAT,
  SCENARIO_DRAFT_ID_PREFIX,
  canonicaliseScenarioDraftInputs,
  scenarioDraftField,
  validateScenarioDraftInputs,
  type ScenarioCapabilityReadiness,
  type ScenarioDraft,
  type ScenarioDraftEnvelope,
  type ScenarioDraftExport,
  type ScenarioDraftFieldProvenance,
  type ScenarioDraftInputs,
  type ScenarioDraftIssue,
  type ScenarioDraftProposal,
  type ScenarioSituationId
} from '@/packages/contracts/src/scenario-draft-model';
import { CanonicalScenario } from '@/packages/contracts/src/canonical-scenario-model';
import { isScenarioRegistered, registerScenario, resolveScenario } from '@/packages/contracts/src/scenario-registry';
import { certifyScenario } from '@/lib/scenario-certification';
import {
  certificationStateOf,
  summariseCertification
} from '@/packages/contracts/src/scenario-certification-model';
import { openingPosturesFor } from './scenario-model-defaults';
import {
  ScenarioDraftResolutionError,
  authoredScenarioIdFor,
  resolveScenarioDraft,
  type ResolvedScenarioDraft
} from './draft-resolution';
import { assessDecisionCaseCoherence } from './draft-coherence';
import { assessCapabilityReadiness, describeScenarioProvenance } from './draft-readiness';
import { scenarioDraftStore } from './draft-store';
import {
  AuthoredScenarioOwnershipError,
  assertAuthoredScenarioAssignable,
  recordAuthoredScenarioOwner
} from './authored-scenario-ownership';

export const SCENARIO_AUTHORING_VERSION = 'sci07_scenario_authoring_v1.0.0';

/** Raised where an authoring request cannot be honoured. Carries a field so a caller can point at it. */
export class ScenarioAuthoringError extends Error {
  readonly field: string;
  readonly issues: ScenarioDraftIssue[];
  constructor(message: string, field: string, issues: ScenarioDraftIssue[] = []) {
    super(message);
    this.name = 'ScenarioAuthoringError';
    this.field = field;
    this.issues = issues;
  }
}

/**
 * Everything a caller needs to render a draft, computed rather than stored.
 *
 * Readiness, provenance and coherence are all DERIVED from the inputs, so holding them on the
 * draft record would create a second copy that an edit could leave stale. `SCI-08` renders
 * this; it does not recompute any of it.
 */
export interface ScenarioDraftAssessment {
  draft: ScenarioDraft;
  /** Present once the draft holds enough to resolve. Absent drafts are still legitimate drafts. */
  resolves: boolean;
  issues: ScenarioDraftIssue[];
  readiness: ScenarioCapabilityReadiness[];
  field_provenance: ScenarioDraftFieldProvenance[];
  /** ADR-082 part 3: the one sentence a business reader can hold in their head. */
  provenance_statement: string;
  /** What the scenario will be called once it is confirmed. */
  scenario_id: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function contentHash(inputs: ScenarioDraftInputs): string {
  return createHash('sha256').update(canonicaliseScenarioDraftInputs(inputs)).digest('hex').slice(0, 32);
}

function newDraftSuffix(): string {
  return randomBytes(5).toString('hex').toUpperCase();
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface CreateDraftRequest {
  tenant_id: string;
  situation?: ScenarioSituationId;
  inputs?: ScenarioDraftInputs;
}

/**
 * Open a draft.
 *
 * Where a situation is named, the draft opens on that situation's declared postures — VISIBLY,
 * as inputs the author can see and change, rather than as hidden defaults applied later. An
 * assumption a person cannot see is exactly what `origin: 'modelled'` exists to prevent, and a
 * default they cannot edit is worse than one they were never offered.
 */
export function createDraft(request: CreateDraftRequest): ScenarioDraftAssessment {
  const suffix = newDraftSuffix();
  const opening = request.situation ? openingPosturesFor(request.situation) : {};
  const inputs: ScenarioDraftInputs = { ...opening, ...(request.inputs ?? {}) };

  const validation = validateScenarioDraftInputs(inputs);
  if (!validation.valid) {
    throw new ScenarioAuthoringError(
      'These authoring inputs are not usable yet.',
      validation.issues[0]?.field ?? '*',
      validation.issues
    );
  }

  const created = nowIso();
  const draft: ScenarioDraft = {
    draft_id: `${SCENARIO_DRAFT_ID_PREFIX}${suffix}`,
    scenario_id: authoredScenarioIdFor(suffix),
    tenant_id: request.tenant_id,
    state: 'DRAFT',
    inputs,
    field_provenance: [],
    genai_envelopes: [],
    created_at: created,
    updated_at: created,
    confirmed_at: null,
    confirmed_by: null,
    last_certification: null,
    content_hash: contentHash(inputs)
  };

  scenarioDraftStore.put(draft);
  return assessDraft(draft);
}

// ── Update ────────────────────────────────────────────────────────────────────

export interface UpdateDraftRequest {
  tenant_id: string;
  draft_id: string;
  inputs: ScenarioDraftInputs;
  /**
   * Proposals a person has KEPT from a drafting envelope.
   *
   * Passed separately from `inputs` for one reason and it is the load-bearing one: a kept
   * proposal is recorded as `origin: 'drafted'` on that field, so the provenance sentence can
   * say *"the summary was drafted by AI"* about exactly the fields where that is true. Merging
   * them into `inputs` would lose the distinction and make every drafted value indistinguishable
   * from an authored one — the failure ADR-044's stamp exists to prevent.
   */
  accepted_proposals?: ScenarioDraftProposal[];
  accepted_from_model?: string;
}

export function updateDraft(request: UpdateDraftRequest): ScenarioDraftAssessment {
  const existing = requireDraft(request.tenant_id, request.draft_id);
  if (existing.state !== 'DRAFT') {
    throw new ScenarioAuthoringError(
      `This draft is ${existing.state.toLowerCase()} and can no longer be edited. Start a new one to change the scenario.`,
      'state'
    );
  }

  const accepted = request.accepted_proposals ?? [];
  const acceptedInputs: Record<string, unknown> = {};
  for (const proposal of accepted) {
    const spec = scenarioDraftField(proposal.field as string);
    if (!spec) {
      throw new ScenarioAuthoringError(`"${proposal.field}" is not an authorable scenario field.`, proposal.field as string);
    }
    if (!spec.genai_authorable) {
      // Belt and braces: the drafting route cannot produce such a proposal, and this refuses
      // one that reached here by any other route.
      throw new ScenarioAuthoringError(
        `"${spec.label}" is calculated or stated by you — a drafted proposal may not set it.`,
        proposal.field as string
      );
    }
    acceptedInputs[proposal.field as string] = spec.id === 'channels'
      ? proposal.value.split(',').map(v => v.trim()).filter(Boolean)
      : spec.id === 'qualitative_assumptions'
        // Appended rather than replaced — assumptions accumulate — and de-duplicated, so keeping
        // the same proposal twice does not record it twice.
        ? [...new Set([...(existing.inputs.qualitative_assumptions ?? []), proposal.value])]
        : proposal.value;
  }

  const inputs: ScenarioDraftInputs = { ...existing.inputs, ...acceptedInputs, ...request.inputs };
  const validation = validateScenarioDraftInputs(inputs);
  if (!validation.valid) {
    throw new ScenarioAuthoringError(
      'These authoring inputs are not usable yet.',
      validation.issues[0]?.field ?? '*',
      validation.issues
    );
  }

  const draft: ScenarioDraft = {
    ...existing,
    inputs,
    updated_at: nowIso(),
    content_hash: contentHash(inputs)
  };
  scenarioDraftStore.put(draft);

  const acceptedFields = new Map(accepted.map(p => [p.field as string, request.accepted_from_model ?? 'gemini']));
  return assessDraft(draft, acceptedFields);
}

/** Record a drafting envelope against a draft, as the audit of what the model proposed. */
export function recordDraftEnvelope(
  tenantId: string,
  draftId: string,
  envelope: ScenarioDraftEnvelope
): ScenarioDraft {
  const existing = requireDraft(tenantId, draftId);
  const draft: ScenarioDraft = {
    ...existing,
    genai_envelopes: [...existing.genai_envelopes, envelope],
    updated_at: nowIso()
  };
  return scenarioDraftStore.put(draft);
}

// ── Assess ────────────────────────────────────────────────────────────────────

/**
 * Resolve the draft as far as it goes and report what it would mean.
 *
 * A draft that cannot resolve yet is not an error — it is a draft. The assessment says what
 * is still missing, in business language, and the readiness ladder reads `Unavailable` for
 * every capability that depends on it.
 */
export function assessDraft(
  draft: ScenarioDraft,
  draftedFields: ReadonlyMap<string, string> = new Map()
): ScenarioDraftAssessment {
  const structural = validateScenarioDraftInputs(draft.inputs);
  let resolved: ResolvedScenarioDraft | null = null;
  const issues: ScenarioDraftIssue[] = [...structural.issues];

  try {
    resolved = resolveScenarioDraft(draft.inputs, draft.scenario_id);
  } catch (error) {
    if (error instanceof ScenarioDraftResolutionError) {
      issues.push({ field: error.field, severity: 'ERROR', message: error.message });
    } else {
      throw error;
    }
  }

  if (resolved) issues.push(...assessDecisionCaseCoherence(resolved.scenario));

  /*
   * Stamp the fields a person kept from a drafting proposal. The value is theirs now — they
   * chose to keep it — but WHERE IT CAME FROM is a fact about the scenario a reader is owed,
   * and ADR-082's `drafted` origin is the word for it.
   */
  const fieldProvenance = (resolved?.field_provenance ?? []).map(entry => {
    const model = draftedFields.get(entry.field as string) ?? draft.field_provenance
      .find(p => p.field === entry.field && p.drafted_by_model)?.drafted_by_model;
    return model
      ? {
        ...entry,
        drafted_by_model: model,
        note: `${entry.note} It was drafted by AI and kept by the author.`
      }
      : entry;
  });

  /*
   * The derived provenance is written back, and this is the one place an assessment writes.
   * It has to: `drafted_by_model` records that a person kept a proposal, and that fact is not
   * recoverable from the inputs — a kept `'limited'` and a typed `'limited'` are the same value.
   * Written only when it actually changed, so a read of an unchanged draft is a read.
   */
  if (fieldProvenance.length > 0
    && JSON.stringify(draft.field_provenance) !== JSON.stringify(fieldProvenance)) {
    scenarioDraftStore.put({ ...draft, field_provenance: fieldProvenance });
  }

  const structuralBlocks = resolved ? {} : blockEveryCapability(issues);

  return {
    draft: scenarioDraftStore.get(draft.tenant_id, draft.draft_id) ?? draft,
    resolves: resolved !== null,
    issues,
    readiness: assessCapabilityReadiness(fieldProvenance, structuralBlocks),
    field_provenance: fieldProvenance,
    provenance_statement: fieldProvenance.length > 0
      ? describeScenarioProvenance(fieldProvenance)
      : 'Nothing has been supplied yet, so this scenario has no provenance to describe.',
    scenario_id: draft.scenario_id
  };
}

function blockEveryCapability(issues: readonly ScenarioDraftIssue[]): Record<string, string> {
  const blocking = issues.find(i => i.severity === 'ERROR');
  const reason = blocking
    ? `This scenario cannot be built yet: ${blocking.message}`
    : 'This scenario cannot be built yet.';
  return {
    DEMAND_OUTLOOK: reason,
    PROMOTION_ECONOMICS: reason,
    SUPPLY_CONSEQUENCE: reason,
    INVENTORY_POSITION: reason,
    SIGNAL_EVIDENCE: reason,
    CAMPAIGN_DECISION: reason
  };
}

// ── Confirm ───────────────────────────────────────────────────────────────────

export interface ConfirmDraftRequest {
  tenant_id: string;
  draft_id: string;
  /**
   * Who is confirming. Required, and required to be a person.
   *
   * This is the human confirmation ADR-083 turns on. A drafting call has no way to supply it,
   * and the drafting route never does.
   */
  confirmed_by: string;
  /** An explicit act, not an implied one. A caller that merely saves a draft does not confirm it. */
  confirm: true;
  /**
   * The content hash the author was looking at.
   *
   * Optional, and checked when supplied: confirming a draft that has changed since it was last
   * read would be confirming something nobody reviewed, which is the one thing confirmation is
   * for.
   */
  expected_content_hash?: string;
}

export interface ConfirmDraftResult {
  draft: ScenarioDraft;
  scenario: CanonicalScenario;
  certified: boolean;
  certification_summary: string;
  failed_dimensions: string[];
  readiness: ScenarioCapabilityReadiness[];
  provenance_statement: string;
  /** Said plainly, because a confirmed scenario is NOT yet the one the estate is running. */
  activation_note: string;
}

/*
 * The only checks that can fail purely because a candidate is not yet registered: `C-1.2`, which
 * asks the registry to resolve the identity, and `C-12.8`, which reports that an earlier dimension
 * failed. Measured against the gate rather than assumed, and asserted in
 * `run-sci07-scenario-authoring-tests.ts`.
 */
const REGISTRATION_ONLY_CHECKS = new Set(['C-1.2', 'C-12.8']);

export const CONFIRMED_NOT_ACTIVE_NOTE =
  'This scenario is confirmed and certified. It is registered and can be chosen; it does not become the '
  + 'scenario the estate is running until someone activates it.';

export function confirmDraft(request: ConfirmDraftRequest): ConfirmDraftResult {
  const draft = requireDraft(request.tenant_id, request.draft_id);

  if (request.confirm !== true) {
    throw new ScenarioAuthoringError('A scenario is only confirmed by an explicit act.', 'confirm');
  }
  if (!request.confirmed_by || !request.confirmed_by.trim()) {
    throw new ScenarioAuthoringError(
      'A scenario must be confirmed by a person. Nothing else may confirm one.',
      'confirmed_by'
    );
  }
  if (draft.state === 'CONFIRMED') {
    throw new ScenarioAuthoringError('This draft has already been confirmed.', 'state');
  }
  if (draft.state === 'WITHDRAWN') {
    throw new ScenarioAuthoringError('This draft was withdrawn and cannot be confirmed.', 'state');
  }
  if (request.expected_content_hash && request.expected_content_hash !== draft.content_hash) {
    throw new ScenarioAuthoringError(
      'This draft has changed since you last read it. Review it again before confirming.',
      'content_hash'
    );
  }

  const assessment = assessDraft(draft);
  const blocking = assessment.issues.filter(i => i.severity === 'ERROR');
  if (blocking.length > 0) {
    throw new ScenarioAuthoringError(
      'This scenario is not ready to confirm.',
      blocking[0].field,
      blocking
    );
  }

  const resolved = resolveScenarioDraft(draft.inputs, draft.scenario_id);

  /*
   * ── R-SCI07-5, closed at Wave-3 convergence without touching a frozen contract ────────────
   *
   * The order used to be REGISTER → CERTIFY → leave a failed registration behind, because `C-1.2`
   * asks that the identity resolve through the registry to the record being certified, so the
   * candidate has to be registered for the gate to pass. The consequence was that a confirmation
   * that FAILED certification left an uncertified scenario in the catalogue, and `SCI-01`'s
   * registry — a frozen contract this packet does not own — has no deregistration seam to take it
   * back out. The residual named a convergence event as the only way to correct it.
   *
   * It does not need one. Certification of an UNREGISTERED candidate is a complete discriminator:
   * measured against the gate, the only checks that can fail for the absence of registration alone
   * are `C-1.2` itself and `C-12.8`, the cascade check that exists to say an earlier dimension
   * failed. Every other dimension is a property of the record, and the record is the same object
   * before and after it is put in the registry.
   *
   * So the gate is run first, on the candidate, while it is registered nowhere. If anything fails
   * that registration would not have fixed, the confirmation is refused HERE — and nothing has been
   * registered to leave behind. The authoritative certification below is unchanged and is still the
   * one that binds: this is a pre-flight, not a second gate, and it evaluates no dimension of its
   * own.
   */
  const preflight = certifyScenario(resolved.scenario);
  const preflightFailures = preflight.dimensions
    .flatMap(d => d.checks)
    .filter(c => c.applicable && !c.passed)
    .map(c => c.id)
    .filter(id => !REGISTRATION_ONLY_CHECKS.has(id));

  if (preflightFailures.length > 0) {
    const preSummary = summariseCertification(preflight);
    const stillDraft: ScenarioDraft = {
      ...draft,
      updated_at: nowIso(),
      last_certification: {
        state: certificationStateOf(preflight),
        summary: preSummary,
        failed_dimensions: preflight.failed_dimensions.map(String),
        assertion_count: preflight.assertion_count,
        evaluated_at_scenario_clock: preflight.evaluated_at_scenario_clock
      }
    };
    scenarioDraftStore.put(stillDraft);
    throw new ScenarioAuthoringError(
      `This scenario does not certify, so it has not been confirmed and nothing was registered. ${preSummary}`,
      'certification',
      preflight.failed_dimensions
        .filter(d => d !== 'C-1' || preflightFailures.some(id => id.startsWith('C-1.')))
        .map(d => ({
          field: 'certification',
          severity: 'ERROR' as const,
          message: `${d}: ${preflight.dimensions.find(x => x.dimension === d)?.reason ?? 'failed'}`
        }))
    );
  }

  /*
   * The candidate has passed everything the gate can evaluate unregistered. Registration is what
   * lets `C-1.2` resolve the identity to this record, and the certification below is authoritative.
   */
  /*
   * `SCI-07R` (ADR-085 part 4): an id another workspace owns is refused BEFORE registration, so a
   * collision can never replace someone else's certified record.
   */
  try {
    assertAuthoredScenarioAssignable(resolved.scenario.identity.scenario_id, draft.tenant_id);
  } catch (error) {
    if (error instanceof AuthoredScenarioOwnershipError) {
      throw new ScenarioAuthoringError(error.message, 'scenario_id');
    }
    throw error;
  }

  const priorRecord = isScenarioRegistered(resolved.scenario.identity.scenario_id)
    ? resolveScenario(resolved.scenario.identity.scenario_id)
    : null;
  registerScenario(resolved.scenario);
  const result = certifyScenario(resolved.scenario);
  const state = certificationStateOf(result);
  const summary = summariseCertification(result);

  const certification = {
    state,
    summary,
    failed_dimensions: result.failed_dimensions.map(String),
    assertion_count: result.assertion_count,
    evaluated_at_scenario_clock: result.evaluated_at_scenario_clock
  };

  if (state !== 'CERTIFIED') {
    /*
     * Unreachable in practice, and kept because "unreachable" is a claim a lifecycle should not
     * rest on: the pre-flight above has already evaluated every dimension of this record and found
     * it clean, so a failure here would mean registration itself changed a verdict. If it ever
     * does, the previous record for this identity is put back — a re-confirmation of a corrected
     * draft does not damage what was already certified — and a FIRST confirmation is the one case
     * the registry cannot be returned to, because there is nothing to return it to. That last
     * sliver is all that remains of `R-SCI07-5`.
     *
     * The draft stays DRAFT. "Confirmed but not certified" is not a state this lifecycle can
     * reach, because it is the state a demonstration would eventually be run from.
     */
    if (priorRecord) registerScenario(priorRecord);
    const stillDraft: ScenarioDraft = {
      ...draft,
      updated_at: nowIso(),
      last_certification: certification
    };
    scenarioDraftStore.put(stillDraft);
    throw new ScenarioAuthoringError(
      `This scenario does not certify, so it has not been confirmed. ${summary}`,
      'certification',
      result.failed_dimensions.map(d => ({
        field: 'certification',
        severity: 'ERROR' as const,
        message: `${d}: ${result.dimensions.find(x => x.dimension === d)?.reason ?? 'failed'}`
      }))
    );
  }

  /*
   * Certified: the scenario now belongs to the workspace that confirmed it. The scenario runtime shows
   * it to that tenant only (ADR-085 part 4); the registry itself stays tenant-free.
   */
  recordAuthoredScenarioOwner(resolved.scenario.identity.scenario_id, draft.tenant_id);

  const confirmed: ScenarioDraft = {
    ...draft,
    state: 'CONFIRMED',
    field_provenance: assessment.field_provenance,
    confirmed_at: nowIso(),
    confirmed_by: request.confirmed_by.trim(),
    updated_at: nowIso(),
    last_certification: certification
  };
  scenarioDraftStore.put(confirmed);

  return {
    draft: confirmed,
    scenario: resolved.scenario,
    certified: true,
    certification_summary: summary,
    failed_dimensions: [],
    readiness: assessment.readiness,
    provenance_statement: assessment.provenance_statement,
    activation_note: CONFIRMED_NOT_ACTIVE_NOTE
  };
}

export function withdrawDraft(tenantId: string, draftId: string): ScenarioDraft {
  const draft = requireDraft(tenantId, draftId);
  if (draft.state === 'CONFIRMED') {
    throw new ScenarioAuthoringError('A confirmed scenario cannot be withdrawn from here.', 'state');
  }
  return scenarioDraftStore.put({ ...draft, state: 'WITHDRAWN', updated_at: nowIso() });
}

// ── Export / import ───────────────────────────────────────────────────────────

export function exportDraft(tenantId: string, draftId: string): ScenarioDraftExport {
  const draft = requireDraft(tenantId, draftId);
  return {
    format: SCENARIO_DRAFT_EXPORT_FORMAT,
    scenario_id: draft.scenario_id,
    inputs: draft.inputs,
    content_hash: draft.content_hash,
    exported_at: nowIso(),
    disclosure: SCENARIO_DRAFT_EXPORT_DISCLOSURE
  };
}

/**
 * Import an exported draft.
 *
 * The hash is RECOMPUTED from the inputs and compared, so a hand-edited file is refused rather
 * than admitted under the hash it used to carry. The import takes a new draft identity: an
 * imported draft is a new piece of work in this process, and reusing the old scenario identity
 * would let two different records claim one name.
 */
export function importDraft(tenantId: string, payload: unknown): ScenarioDraftAssessment {
  const file = payload as ScenarioDraftExport;
  if (!file || file.format !== SCENARIO_DRAFT_EXPORT_FORMAT) {
    throw new ScenarioAuthoringError(
      `This file is not a CogniX scenario draft (${SCENARIO_DRAFT_EXPORT_FORMAT}).`,
      'format'
    );
  }
  const validation = validateScenarioDraftInputs(file.inputs);
  if (!validation.valid) {
    throw new ScenarioAuthoringError(
      'This scenario draft file contains inputs CogniX cannot author.',
      validation.issues[0]?.field ?? '*',
      validation.issues
    );
  }
  const recomputed = contentHash(file.inputs);
  if (file.content_hash && file.content_hash !== recomputed) {
    throw new ScenarioAuthoringError(
      'This scenario draft file has been changed since it was exported, so it is refused.',
      'content_hash'
    );
  }
  return createDraft({ tenant_id: tenantId, inputs: file.inputs });
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getDraftAssessment(tenantId: string, draftId: string): ScenarioDraftAssessment {
  return assessDraft(requireDraft(tenantId, draftId));
}

export function listDrafts(tenantId: string): ScenarioDraft[] {
  return scenarioDraftStore.list(tenantId);
}

function requireDraft(tenantId: string, draftId: string): ScenarioDraft {
  const draft = scenarioDraftStore.get(tenantId, draftId);
  if (!draft) {
    throw new ScenarioAuthoringError(`Draft "${draftId}" was not found.`, 'draft_id');
  }
  return draft;
}
