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
 * `ALIAS_PROTOTYPE` is the control. It is a **prototype and is deliberately not shipped**: it maps
 * business phrasing onto governed vocabulary, which is governed content, and governed content is not
 * invented inside a work package that was not authorised to create it. It exists here so the
 * comparison in ADR-058 is reproducible rather than asserted.
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

/** PROTOTYPE ONLY — not shipped, not consumed by any runtime module. See ADR-058. */
export const ALIAS_PROTOTYPE: [string, string][] = [
  ['right call afterwards', 'regret hindsight'],
  ['was it the right call', 'regret'],
  ['done nothing', 'counterfactual baseline'],
  ['what would have happened', 'counterfactual'],
  ['still time', 'window closes urgency'],
  ['not move again', 'stability volatility'],
  ['different versions', 'shared decision state single source'],
  ['same situation', 'shared decision state'],
  ['promise', 'commitment'],
  ['knock on effects', 'ripple propagation'],
  ['where this number came from', 'provenance attestation observation'],
  ['last time we tried', 'memory precedent'],
  ['trade offs', 'frontier pareto objectives'],
  ['goes off', 'half-life expiry decision contract'],
  ['go wrong', 'pre-mortem resilience readiness'],
  ['break the number down', 'decomposition timeline drivers'],
  ['what is driving it', 'decomposition drivers'],
  ['shops near', 'catchment micro-market'],
  ['same mistake twice', 'learning loop'],
  ['not thought of', 'curiosity questions'],
  ['plug our own data feed', 'connector adapter ingestion'],
  ['pay for itself', 'promotion uplift']
];

export function expandWithAliasPrototype(question: string): string {
  const lower = question.toLowerCase();
  const extra = ALIAS_PROTOTYPE.filter(([phrase]) => lower.includes(phrase)).map(([, terms]) => terms);
  return extra.length > 0 ? `${question} ${extra.join(' ')}` : question;
}
