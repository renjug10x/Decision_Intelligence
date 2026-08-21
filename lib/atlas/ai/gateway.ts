/**
 * Atlas AI Gateway (ADR-049).
 *
 * One server-side entry point that owns retrieval orchestration, answer assembly, guardrails and
 * provenance. Everything it touches is governed CogniX knowledge; it makes no network call and
 * imports no provider SDK.
 */

import { capabilityRepository } from '../../../services/atlas/src/capability-registry';
import { getCapabilityIndex } from '../capability-index';
import { CURIOSITY_QUESTIONS } from '../../../content/atlas/curiosity-questions';
import { retrieve } from './retrieval';
import { assembleAnswer, type AskAnswer } from './answer';
import { narrateIfAvailable } from './provider';
import type { ResolvedCapability, AudienceLens } from '../../../packages/contracts/src/capability-atlas-model';

export interface AskRequest {
  question: string;
  lens?: AudienceLens;
}

export async function ask(request: AskRequest): Promise<AskAnswer> {
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

  return assembleAnswer({
    question: request.question,
    retrieval,
    resolved,
    degradationNotice: narration.notice
  });
}
