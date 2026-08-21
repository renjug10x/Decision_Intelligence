/**
 * The premise set (ATL-06C, ADR-057).
 *
 * An interpretation is only as safe as what it is allowed to read. This module decides that, and it
 * decides it by construction rather than by instruction: the premise set is assembled from exactly
 * two places — the governed statements in the From CogniX block, and the **admitted** statements in
 * the Market Context block.
 *
 * What is deliberately absent is the point. `rejected_claims` and the ungrounded segments counted in
 * `search_transparency` are never read here, so a rejected claim cannot enter reasoning by being
 * paraphrased, summarised or "used for context". They remain in the envelope because an auditor
 * needs to see what was dropped and why; they are audit material, not evidence, and the two are not
 * the same thing. A prompt could be told to ignore them. A function that never receives them cannot
 * be persuaded.
 *
 * Premise ids are short (`G1`, `M2`) for a practical reason: a model asked to cite
 * `CAP-PROMOTION-INTELLIGENCE` and `https://www.gartner.com/en/documents/...` inside a JSON field
 * will eventually mistype one, and a mistyped citation is indistinguishable from an invented one.
 * Short opaque ids are cheap to emit exactly and trivial to verify.
 */

import type {
  GroundedEnvelope, InterpretationPremise
} from '../../../packages/contracts/src/atlas-grounding-model';

export function buildPremises(envelope: GroundedEnvelope): InterpretationPremise[] {
  const premises: InterpretationPremise[] = [];

  envelope.from_cognix.statements.forEach((s, i) => {
    premises.push({
      premise_id: `G${i + 1}`,
      kind: 'governed',
      text: s.text,
      citation: s.capability_id,
      label: s.capability_name
    });
  });

  // Only what survived admission. `envelope.rejected_claims` is not consulted, here or anywhere in
  // this directory.
  envelope.market_context.statements.forEach((s, i) => {
    premises.push({
      premise_id: `M${i + 1}`,
      kind: 'market',
      text: s.claim,
      citation: s.source.url,
      label: `${s.source.publisher} · ${s.source.published_at}`
    });
  });

  return premises;
}

export function governedPremises(premises: InterpretationPremise[]): InterpretationPremise[] {
  return premises.filter(p => p.kind === 'governed');
}

export function marketPremises(premises: InterpretationPremise[]): InterpretationPremise[] {
  return premises.filter(p => p.kind === 'market');
}

/** Rendered into the prompt. Numbers and publishers a statement may use come from here and nowhere else. */
export function renderPremises(premises: InterpretationPremise[]): string {
  return premises
    .map(p => `[${p.premise_id}] (${p.kind === 'governed' ? 'CogniX record' : 'market source'}) ${p.text}`)
    .join('\n');
}
