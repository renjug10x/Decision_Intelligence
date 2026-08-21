/**
 * Interpretation assembly (ATL-06C, ADR-057).
 *
 * Additive, like every layer before it. `groundAnswer` still produces the ATL-06A envelope; this
 * runs afterwards and returns a new one whose AI Interpretation block may carry provider readings
 * **that survived verification**, alongside the templated readings ATL-06A already derived.
 *
 * Three properties hold in every state, including the states nobody demonstrates:
 *
 *   1. With no interpretation provider configured, the block is exactly what ATL-06A produced, and
 *      the audit says so. Nothing is generated from a fallback path (ADR-049).
 *   2. With a provider that fails, the same is true, and the failure is stated rather than hidden.
 *   3. With a provider that misbehaves, only verified statements survive; the rest are recorded in
 *      the audit with the rule they broke. A dropped interpretation is visible, not vanished.
 *
 * The templated readings are kept even when generated ones exist. They are the deterministic
 * account of a contradiction, reproducible without any provider, and losing them to a more fluent
 * paragraph would trade the one thing here that can be re-derived from the records.
 */

import type {
  AIInterpretationStatement, GroundedEnvelope, InterpretationAudit, DroppedInterpretation
} from '../../../packages/contracts/src/atlas-grounding-model';
import { buildPremises, governedPremises } from './premises';
import { verifyInterpretation } from './verification';
import { activeInterpretationProvider } from './provider';

/** Bounds a caller in a loop. Interpretation makes no external retrieval, but it does cost. */
export const INTERPRETATION_CALL_BUDGET = 40;
let interpretationCalls = 0;

export function interpretationCallCount(): number { return interpretationCalls; }
export function resetInterpretationCalls(): void { interpretationCalls = 0; }

export interface InterpretInput {
  question: string;
  envelope: GroundedEnvelope;
}

const NO_PREMISES_NOTICE =
  'No interpretation is offered. An interpretation is only emitted where it rests on a governed CogniX statement it can cite, and this answer produced none.';

export async function applyInterpretation(input: InterpretInput): Promise<GroundedEnvelope> {
  const { envelope, question } = input;
  const premises = buildPremises(envelope);

  const templated: AIInterpretationStatement[] = envelope.ai_interpretation.statements.map(s => ({
    ...s,
    origin: 'templated' as const
  }));

  const provider = activeInterpretationProvider();
  const baseAudit: InterpretationAudit = {
    provider: provider?.name ?? null,
    model: null,
    origin: templated.length > 0 ? 'templated' : 'none',
    premises,
    proposed: 0,
    verified: 0,
    dropped: [],
    degraded: true,
    notice: null
  };

  const finish = (
    statements: AIInterpretationStatement[],
    audit: InterpretationAudit
  ): GroundedEnvelope => ({
    ...envelope,
    ai_interpretation: {
      ...envelope.ai_interpretation,
      available: statements.length > 0,
      absence_reason: statements.length > 0 ? null : (audit.notice ?? NO_PREMISES_NOTICE),
      statements
    },
    interpretation_audit: audit
  });

  if (governedPremises(premises).length === 0) {
    return finish(templated, {
      ...baseAudit,
      notice: NO_PREMISES_NOTICE
    });
  }

  if (!provider) {
    return finish(templated, {
      ...baseAudit,
      notice: templated.length > 0
        ? 'This reading is derived deterministically from the governed record it cites. No interpretation provider is configured, so nothing here was generated.'
        : NO_PREMISES_NOTICE
    });
  }

  if (interpretationCalls >= INTERPRETATION_CALL_BUDGET) {
    return finish(templated, {
      ...baseAudit,
      notice: 'The interpretation call budget for this process is exhausted, so no reading was generated. Nothing has been substituted.'
    });
  }

  let candidates: { text: string; rests_on: string[] }[] = [];
  let model: string | null = null;
  try {
    interpretationCalls++;
    const result = await provider.interpret({
      question,
      premises,
      contradictionSummaries: envelope.contradictions.map(c => `${c.capability_name} — ${c.dimension}`)
    });
    candidates = result.candidates;
    model = result.model;
  } catch {
    return finish(templated, {
      ...baseAudit,
      notice: 'The interpretation provider was unavailable, so only readings derived directly from governed records are shown. No interpretation has been generated.'
    });
  }

  const generated: AIInterpretationStatement[] = [];
  const dropped: DroppedInterpretation[] = [];
  const byId = new Map(premises.map(p => [p.premise_id, p]));

  for (const candidate of candidates) {
    const outcome = verifyInterpretation(candidate, premises, envelope.rejected_claims);
    if (!outcome.accepted) {
      if (outcome.drop) dropped.push(outcome.drop);
      continue;
    }
    generated.push({
      text: candidate.text.trim(),
      rests_on: outcome.cited.filter(p => p.kind === 'governed').map(p => p.citation),
      informed_by: outcome.cited.filter(p => p.kind === 'market').map(p => p.citation),
      premises: candidate.rests_on.filter(id => byId.has(id)),
      origin: 'generated'
    });
  }

  const statements = [...templated, ...generated];
  return finish(statements, {
    ...baseAudit,
    model,
    origin: generated.length > 0 ? 'generated' : (templated.length > 0 ? 'templated' : 'none'),
    proposed: candidates.length,
    verified: generated.length,
    dropped,
    degraded: false,
    notice: statements.length > 0
      ? (dropped.length > 0
        ? `${dropped.length} proposed reading(s) failed verification and were dropped rather than shown.`
        : null)
      : (candidates.length > 0
        ? `Every proposed reading failed verification, so none is shown. ${dropped.map(d => d.reason.replace(/-/g, ' ')).join(', ')}.`
        : NO_PREMISES_NOTICE)
  });
}
