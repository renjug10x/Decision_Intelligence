/**
 * Questions for a client conversation (ATL-06D §22, §23).
 *
 * Two different things, deliberately kept apart:
 *
 *   QUESTIONS TO ASK      governed `CuriosityQuestion` records, selected for this conversation.
 *                         These are CogniX's own Questions Worth Asking — authored, owned and
 *                         reviewed — and §22 requires that they be selected rather than dumped, and
 *                         that the selection explain itself.
 *
 *   LIKELY CLIENT QUESTIONS  what the person across the table will ask back, drawn from the
 *                         `client_questions` authored on each capability, answered from governed
 *                         text, and — where the corpus cannot answer — answered with an explicit
 *                         inability rather than an improvisation.
 *
 * ── The concession rule ─────────────────────────────────────────────────────
 * A prepared answer that only ever flatters the product is worse than no preparation, because it
 * fails at the first hard question and takes the seller's credibility with it. Where a capability's
 * honest answer is a limitation, `concedes` is set and the limitation is the answer. Rule `P6`
 * requires every response to be either grounded in a `CAP-*` or an explicit inability, so there is
 * no shape in this contract for a confident answer with nothing behind it.
 */

import type {
  CapabilityId, CuriosityQuestion, ResolvedCapability
} from '../../../packages/contracts/src/capability-atlas-model';
import type {
  AnticipatedQuestion, CapabilityRecommendation, ClientContext, SuggestedQuestion
} from '../../../packages/contracts/src/atlas-preparation-model';

/** At most this many governed questions. §22 forbids dumping the registry into the pack. */
export const MAX_SUGGESTED_QUESTIONS = 4;
export const MAX_ANTICIPATED_QUESTIONS = 6;

export interface QuestionInput {
  recommendations: CapabilityRecommendation[];
  resolved: Map<CapabilityId, ResolvedCapability>;
  questions: CuriosityQuestion[];
  context: ClientContext;
}

/**
 * Select governed Questions Worth Asking, each with the reason it suits THIS conversation.
 *
 * `why_here` is not `why_asking` restated. `why_asking` is the governed field explaining why the
 * question is worth asking at all; `why_here` names the capability, problem or objective in this
 * particular conversation that makes it worth asking now. §22 asks for the second, and a pack that
 * only echoed the first would be dumping questions with extra words attached.
 */
export function selectQuestions(input: QuestionInput): SuggestedQuestion[] {
  const leadIds = new Set(input.recommendations.filter(r => r.tier === 'lead').map(r => r.capability_id));
  const allIds = new Set(input.recommendations.map(r => r.capability_id));
  const nameOf = new Map(input.recommendations.map(r => [r.capability_id, r.name]));
  const objective = input.context.objective?.value;
  const role = input.context.client_role?.value;

  const scored = input.questions
    .map(q => {
      const links = q.related_capabilities.filter(l => allIds.has(l.ref));
      if (!links.length) return null;
      const leadLinks = links.filter(l => leadIds.has(l.ref));
      // A question linked to a LEAD capability outranks one linked only to a supporting capability:
      // the conversation is going to be about the leads.
      const score = leadLinks.length * 3 + links.length;

      const anchor = leadLinks[0] ?? links[0];
      const anchorName = nameOf.get(anchor.ref) ?? anchor.ref;

      const reasons: string[] = [
        `${anchorName} is ${leadLinks.length ? 'a lead recommendation' : 'in this pack'} for this conversation, and this question is linked to it because: ${anchor.rationale}`
      ];
      if (objective === 'understand-challenges') {
        reasons.push('The objective is discovery, so a question that opens their situation is worth more than a statement about ours.');
      }
      if (role) reasons.push(`It is a question ${role} is positioned to answer.`);

      return {
        score,
        question: {
          question_id: q.question_id,
          question: q.question,
          why_asking: q.why_asking,
          why_here: reasons.join(' '),
          related_capabilities: links.map(l => l.ref)
        } as SuggestedQuestion
      };
    })
    .filter((x): x is { score: number; question: SuggestedQuestion } => x !== null)
    .sort((a, b) => b.score - a.score || a.question.question_id.localeCompare(b.question.question_id));

  return scored.slice(0, MAX_SUGGESTED_QUESTIONS).map(s => s.question);
}

/**
 * Governed answer categories.
 *
 * A `client_question` is authored with an `audience` and a `difficulty` but no answer — the answer
 * lives in the capability's own governed text. These matchers decide WHICH governed field answers
 * WHICH kind of question, so a question about integration is answered from contracts rather than
 * from an innovation thesis.
 */
type Answerer = {
  category: string;
  matches: RegExp;
  answer: (c: ResolvedCapability) => { text: string; concedes: boolean } | null;
};

const ANSWERERS: Answerer[] = [
  {
    category: 'integration',
    matches: /integrat|connect|api|interface|existing (system|platform)|plug|fit with/i,
    answer: c => {
      const apis = c.knowledge?.apis ?? [];
      const contracts = c.knowledge?.contracts ?? [];
      if (!apis.length && !contracts.length) return null;
      const surface = [
        apis.length ? `${apis.length} declared API${apis.length === 1 ? '' : 's'} (${apis[0].method} ${apis[0].path})` : null,
        contracts.length ? `${contracts.length} published contract${contracts.length === 1 ? '' : 's'}` : null
      ].filter(Boolean).join(' and ');
      return { text: `It integrates through ${surface}. ${apis[0]?.purpose ?? contracts[0]?.name ?? ''}`.trim(), concedes: false };
    }
  },
  {
    category: 'data',
    matches: /data|feed|source|what do you need from us|inputs?/i,
    answer: c => {
      const sources = c.knowledge?.data_sources ?? [];
      if (!sources.length) return null;
      const synthetic = sources.filter(s => s.kind === 'synthetic');
      if (synthetic.length === sources.length) {
        return {
          text: `Every data source behind this capability today is synthetic: ${sources.map(s => s.name).join(', ')}. It has not been run against client data, and saying otherwise would be inaccurate.`,
          concedes: true
        };
      }
      return { text: `It reads ${sources.map(s => `${s.name} (${s.kind})`).join(', ')}.`, concedes: synthetic.length > 0 };
    }
  },
  {
    category: 'architecture',
    matches: /architect|how does it work|under the hood|pipeline|flow/i,
    answer: c => {
      const flow = c.knowledge?.architecture_flow ?? [];
      if (flow.length) return { text: flow.join(' → '), concedes: false };
      return c.knowledge?.architecture_narrative
        ? { text: c.knowledge.architecture_narrative, concedes: false }
        : null;
    }
  },
  {
    category: 'explainability',
    matches: /explain|why did|black box|trust|justif|audit|provenance/i,
    answer: c => {
      const governance = c.knowledge?.related_governance ?? [];
      const decisions = c.knowledge?.related_decisions ?? [];
      if (!governance.length && !decisions.length) return null;
      return {
        text: `The reasoning is governed rather than implicit: ${[...decisions, ...governance].slice(0, 3).join(', ')} record how this capability is allowed to behave, and the Atlas exposes the evidence behind each claim.`,
        concedes: false
      };
    }
  },
  {
    category: 'accuracy',
    matches: /accur|how do you know|proven|validat|confiden|reliab/i,
    answer: c => {
      const evidence = c.knowledge?.validation_evidence ?? [];
      if (!evidence.length) return null;
      return {
        text: `Validation is recorded rather than asserted: ${evidence.slice(0, 2).map(e => `${e.kind} — ${e.outcome}`).join('; ')}.`,
        concedes: false
      };
    }
  },
  {
    category: 'implementation-effort',
    matches: /how long|effort|implement|deploy|roll ?out|resource/i,
    answer: c => {
      const assumptions = c.knowledge?.assumptions ?? [];
      if (!assumptions.length) return null;
      return {
        text: `No implementation estimate is recorded for this capability, so any figure would be invented. What is recorded is what it assumes: ${assumptions.join('; ')}.`,
        concedes: true
      };
    }
  },
  {
    category: 'replacement',
    matches: /replace|rip and replace|instead of|get rid of|substitut/i,
    answer: c => ({
      text: `CogniX does not replace a planning platform. ${c.identity.name} reads what the existing estate already produces and adds the judgement layer above it — which is why the integration surface matters more than feature overlap.`,
      concedes: false
    })
  }
];

/**
 * A capability's authored client questions, answered from that capability's governed text.
 *
 * Where no answerer matches, the response states what CogniX can say and what it cannot, naming
 * the capability. That is a grounded response — it cites the capability — and it is honest, which
 * is the pair of properties rule `P6` requires.
 */
export function anticipateQuestions(input: QuestionInput): AnticipatedQuestion[] {
  const out: AnticipatedQuestion[] = [];
  const seen = new Set<string>();

  const ordered = [
    ...input.recommendations.filter(r => r.tier === 'lead'),
    ...input.recommendations.filter(r => r.tier === 'supporting')
  ];

  for (const rec of ordered) {
    const c = input.resolved.get(rec.capability_id);
    if (!c) continue;
    for (const cq of c.knowledge?.client_questions ?? []) {
      const key = cq.question.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);

      const answerer = ANSWERERS.find(a => a.matches.test(cq.question));
      const answered = answerer?.answer(c) ?? null;

      // The status caveat is prepended wherever the capability is not fully real, on every answer,
      // regardless of how confident the governed text sounds. A confident sentence about a
      // simulated capability is the specific failure §20 exists to prevent.
      const notReal = c.identity.implementation_status !== 'implemented';
      const caveat = notReal
        ? `This capability is ${c.identity.implementation_status.replace(/-/g, ' ')} in the current estate. `
        : '';

      if (answered) {
        out.push({
          question: cq.question,
          category: answerer!.category,
          difficulty: cq.difficulty,
          response: `${caveat}${answered.text}`,
          grounded_in: [c.identity.capability_id],
          concedes: answered.concedes || notReal
        });
      } else {
        const limitation = (c.knowledge?.known_limitations ?? [])[0];
        out.push({
          question: cq.question,
          category: 'capability',
          difficulty: cq.difficulty,
          response: limitation
            ? `${caveat}Answer from ${c.identity.name}: ${c.identity.summary} The governed limitation that bears on this answer is: ${limitation.limitation}`
            : `${caveat}Answer from ${c.identity.name}: ${c.identity.summary}`,
          grounded_in: [c.identity.capability_id],
          concedes: notReal || Boolean(limitation)
        });
      }
    }
  }

  // Hardest first: the question that will land badly is the one worth rehearsing.
  const rank = { high: 3, medium: 2, low: 1 } as const;
  return out
    .sort((a, b) => rank[b.difficulty] - rank[a.difficulty])
    .slice(0, MAX_ANTICIPATED_QUESTIONS);
}

/**
 * The competitor answer (§19), WITHOUT external research.
 *
 * Returns a response that describes CogniX from internal evidence and states plainly that a claim
 * about what the named vendor does today requires market evidence this pack does not hold. It never
 * describes the competitor's functionality, and never asserts superiority — both of which would be
 * fabrication about a third party, which is worse than fabrication about ourselves.
 */
export function vendorPositioning(
  vendors: string[],
  recommendations: CapabilityRecommendation[],
  researchAdmitted: boolean
): AnticipatedQuestion[] {
  if (!vendors.length) return [];
  const leads = recommendations.filter(r => r.tier === 'lead').slice(0, 3);
  if (!leads.length) return [];

  return vendors.map(vendor => {
    const proper = vendor.replace(/\b\w/g, ch => ch.toUpperCase());
    const ours = leads.map(l => l.name).join(', ');
    const base =
      `Position from what CogniX can evidence, not from a claim about ${proper}. The governed ground here is ${ours}` +
      `${leads.some(l => l.maturity.implementation_status !== 'implemented') ? ', with the maturity caveats attached to each above' : ''}. ` +
      `Ask what ${proper} gives them today and where it stops — their answer is evidence; ours would be a guess.`;
    return {
      question: `How should I position this against ${proper}?`,
      category: 'competitive',
      difficulty: 'high' as const,
      response: researchAdmitted
        ? `${base} Any market statement about ${proper} in this pack appears only in the Market Context section, with its source and date attached; nothing in this response is a claim about their product.`
        : `${base} External research is off for this pack, so CogniX holds no admitted evidence about ${proper}'s current capabilities. Turn on market research if you need a sourced comparison — and treat anything without a source as unusable.`,
      grounded_in: leads.map(l => l.capability_id),
      concedes: true
    };
  });
}
