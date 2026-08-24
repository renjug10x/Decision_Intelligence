/**
 * The Level 2 evaluation set (ATL-06C, ADR-058).
 *
 * `ATL-06B` descoped Level 2 semantic retrieval and left it unassigned. Before spending an embedding
 * index on it, the question worth answering is narrower than "would embeddings help" — everything
 * helps something. It is: **what is actually failing, and is it semantic?**
 *
 * These eighteen questions are how that was measured. Each is phrased the way a business person
 * would ask it, deliberately avoiding the capability's own vocabulary, and each has one intended
 * capability. They are not paraphrases of the ATL-04 acceptance queries — those already pass, which
 * is why they cannot answer this question.
 *
 * The control was an un-shipped alias prototype, which reached 18 of 18. The owner then authorised
 * the approach, and the prototype was **replaced** by the governed vocabulary in
 * `content/atlas/vocabulary.ts` (ADR-059). The replacement was not a rename: validation rule W6
 * requires every term an alias introduces to appear in the governed text of a capability the alias
 * names, and it rejected six prototype terms outright — *hindsight*, *urgency*, *volatility*,
 * *provenance*, *precedent*, *stale*. None of them is in the corpus. They were replaced with the
 * words the records actually use, and one of those substitutions — *half-life*, straight out of the
 * capability's own name — proved better than the term it replaced.
 *
 * The cases below are therefore run twice on every test run: once with expansion off, which
 * reproduces the measured baseline, and once with the shipped vocabulary.
 */

export interface Level2Case {
  question: string;
  /** The capability a competent human would say this question is about. */
  expect: string;
  /** What kind of gap the phrasing creates. */
  gap: 'vocabulary' | 'framing';
}

export const LEVEL2_CASES: Level2Case[] = [
  { question: 'how do I know if the plan we committed to was actually the right call afterwards', expect: 'CAP-DECISION-REGRET', gap: 'vocabulary' },
  { question: 'what would have happened if we had done nothing', expect: 'CAP-COUNTERFACTUAL-BASELINE', gap: 'vocabulary' },
  { question: 'is there still time to act on this', expect: 'CAP-DECISION-WINDOW', gap: 'framing' },
  { question: 'how confident should I be that the numbers will not move again', expect: 'CAP-FORECAST-STABILITY', gap: 'vocabulary' },
  { question: 'why do two teams see different versions of the same situation', expect: 'CAP-SHARED-DECISION-STATE', gap: 'vocabulary' },
  { question: 'what promise are we about to break', expect: 'CAP-COMMITMENT-INTELLIGENCE', gap: 'vocabulary' },
  { question: 'show me the knock on effects somewhere else in the business', expect: 'CAP-DECISION-RIPPLE', gap: 'vocabulary' },
  { question: 'can I trust where this number came from', expect: 'CAP-OBSERVATION-CORRESPONDENCE', gap: 'vocabulary' },
  { question: 'what did we learn from the last time we tried this', expect: 'CAP-ENTERPRISE-MEMORY', gap: 'framing' },
  { question: 'there is no single best answer, show me the trade offs', expect: 'CAP-OUTCOME-FRONTIER', gap: 'vocabulary' },
  { question: 'how long before this recommendation goes off', expect: 'CAP-DECISION-CONTRACT', gap: 'vocabulary' },
  { question: 'what could go wrong before we commit', expect: 'CAP-DECISION-READINESS', gap: 'framing' },
  { question: 'break the number down into what is driving it', expect: 'CAP-DECISION-TIMELINE', gap: 'vocabulary' },
  { question: 'which shops near this store will actually be affected', expect: 'CAP-OPPORTUNITY-WINDOW', gap: 'vocabulary' },
  { question: 'stop me making the same mistake twice', expect: 'CAP-LEARNING-LOOP', gap: 'vocabulary' },
  { question: 'what should I be asking that I have not thought of', expect: 'CAP-CURIOSITY-QUESTIONS', gap: 'framing' },
  { question: 'can I plug our own data feed into this', expect: 'CAP-SIGNAL-CONNECTOR', gap: 'vocabulary' },
  { question: 'does the discount actually pay for itself', expect: 'CAP-PROMOTION-INTELLIGENCE', gap: 'vocabulary' }
];
