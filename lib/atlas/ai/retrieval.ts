/**
 * Governed retrieval for Ask CogniX (ATL-05).
 *
 * The corpus is the capability knowledge store and the curiosity-question registry. NOTHING ELSE.
 * There is no web retrieval, no search grounding and no external market evidence anywhere in this
 * module — those belong to ATL-06B and are deliberately absent rather than stubbed.
 *
 * Retrieval sits behind an interface so ATL-05's Level 2 embedding retriever can be added later
 * without changing answer assembly. The retriever shipped here is deterministic and local.
 */

import type { CapabilityIdentity, CuriosityQuestion } from '../../../packages/contracts/src/capability-atlas-model';
import type { CapabilityIndex } from '../capability-index';
import { understandQuery } from '../query-understanding';
import { searchCapabilities } from '../capability-search';

export interface RetrievedCapability {
  capability_id: string;
  name: string;
  score: number;
  /** Which governed field groups matched. Carried through to the citation. */
  matched_fields: string[];
}

export interface RetrievalResult {
  capabilities: RetrievedCapability[];
  questions: CuriosityQuestion[];
  /** `structured` today. `semantic` once an embedding retriever is registered. */
  level: 'structured' | 'semantic';
  /** True when the question asks for knowledge the internal Atlas cannot hold. */
  requiresExternalKnowledge: boolean;
  externalTopics: string[];
}

/**
 * Declared markers of a question that needs CURRENT EXTERNAL knowledge. The Atlas cannot
 * substantiate these from governed records, and saying so is the correct answer — not guessing.
 * ATL-06A owns the grounding contract; ATL-06B owns retrieval.
 */
const EXTERNAL_KNOWLEDGE_MARKERS: { phrases: string[]; topic: string }[] = [
  { phrases: ['market', 'competitor', 'competitors', 'competitive landscape', 'vendor', 'vendors'], topic: 'market and competitor landscape' },
  { phrases: ['industry trend', 'trends', 'latest research', 'recent research', 'state of the art'], topic: 'current industry research' },
  { phrases: ['gartner', 'forrester', 'idc', 'analyst'], topic: 'analyst commentary' },
  { phrases: ['pricing', 'how much does it cost', 'licence cost', 'license cost'], topic: 'commercial pricing' },
  { phrases: ['who else uses', 'other customers', 'case study', 'references'], topic: 'external customer references' },
  { phrases: ['blue yonder', 'sap', 'oracle', 'o9', 'kinaxis', 'anaplan'], topic: 'third-party platform capability' }
];

export function detectExternalKnowledgeNeed(question: string): string[] {
  const lower = question.toLowerCase();
  const topics: string[] = [];
  for (const marker of EXTERNAL_KNOWLEDGE_MARKERS) {
    if (marker.phrases.some(p => lower.includes(p)) && !topics.includes(marker.topic)) {
      topics.push(marker.topic);
    }
  }
  return topics;
}

export interface RetrievalContext {
  identities: CapabilityIdentity[];
  index: CapabilityIndex;
  questions: CuriosityQuestion[];
  resolveDemoMaturity: (c: CapabilityIdentity) => any;
}

export function retrieve(question: string, ctx: RetrievalContext, limit = 6): RetrievalResult {
  const understood = understandQuery(question);

  const search = searchCapabilities(ctx.identities, question, {}, {
    resolveDemoMaturity: ctx.resolveDemoMaturity
  }, { index: ctx.index });

  const capabilities: RetrievedCapability[] = search.results.slice(0, limit).map(r => ({
    capability_id: r.capability_id,
    name: r.name,
    score: r.score,
    matched_fields: r.matches.map(m => m.field)
  }));

  // Curiosity questions are governed knowledge too. A question that echoes one of them should
  // surface it, and its EXPLICIT capability links are a retrieval signal in their own right.
  const terms = understood.terms;
  const questions = ctx.questions.filter(q => {
    const hay = `${q.question} ${q.why_asking} ${q.category} ${q.summary_narrative}`.toLowerCase();
    return terms.length > 0 && terms.filter(t => hay.includes(t)).length >= Math.min(2, terms.length);
  });

  const externalTopics = detectExternalKnowledgeNeed(question);

  return {
    capabilities,
    questions,
    level: 'structured',
    requiresExternalKnowledge: externalTopics.length > 0,
    externalTopics
  };
}
