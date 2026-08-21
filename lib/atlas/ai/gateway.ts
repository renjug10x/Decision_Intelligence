/**
 * Atlas AI Gateway (ADR-049).
 *
 * One server-side entry point that owns retrieval orchestration, answer assembly, guardrails and
 * provenance. Everything it touches is governed CogniX knowledge; it makes no network call and
 * imports no provider SDK.
 *
 * ATL-06A adds the grounding envelope, and adds it ADDITIVELY. `assembleAnswer` is called with the
 * same inputs it received before and its result is returned unchanged; the envelope is attached
 * beside it. With no grounding provider configured — the state of this estate today — every ATL-05
 * field is byte-identical to what ATL-05 produced, which is asserted directly in
 * `tests/unit/run-atl06a-tests.ts` rather than assumed.
 */

import { capabilityRepository } from '../../../services/atlas/src/capability-registry';
import { getCapabilityIndex } from '../capability-index';
import { CURIOSITY_QUESTIONS } from '../../../content/atlas/curiosity-questions';
import { retrieve } from './retrieval';
import { assembleAnswer, type AskAnswer } from './answer';
import { narrateIfAvailable } from './provider';
import { groundAnswer, type GroundedAskAnswer } from '../grounding/engine';
import type { ResolvedCapability, AudienceLens } from '../../../packages/contracts/src/capability-atlas-model';

export interface AskRequest {
  question: string;
  lens?: AudienceLens;
}

export async function ask(request: AskRequest): Promise<GroundedAskAnswer> {
  const identities = capabilityRepository.listIdentities();
  const index = await getCapabilityIndex(identities);

  const retrieval = retrieve(request.question, {
    identities,
    index,
    questions: CURIOSITY_QUESTIONS,
    resolveDemoMaturity: c => capabilityRepository.resolveDemoMaturity(c)
  });

  const resolved: ResolvedCapability[] = [];
  for (const c of retrieval.capabilities) {
    const r = await capabilityRepository.resolve(c.capability_id, {
      includeKnowledge: true,
      lens: request.lens
    });
    if (r) resolved.push(r);
  }

  // A provider may narrate an already-grounded answer. None is configured, so the answer is
  // assembled directly from governed records and the degradation is stated (ADR-049).
  const narration = await narrateIfAvailable({
    question: request.question,
    groundedSections: [],
    lens: request.lens
  });

  const answer = assembleAnswer({
    question: request.question,
    retrieval,
    resolved,
    degradationNotice: narration.notice
  });

  // ADR-048's three evidence classes. Policy decides whether external knowledge is permitted at
  // all; the answer above is not altered either way (ADR-053).
  const grounding = await groundAnswer({ question: request.question, answer, resolved });

  return { ...answer, grounding };
}
