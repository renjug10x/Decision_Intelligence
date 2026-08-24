import { ok } from '../_shared';
import {
  ADMISSIBLE_SOURCE_TIERS, EVIDENCE_CLASSES, EVIDENCE_CLASS_LABEL,
  GROUNDING_INTENTS, SOURCE_TIERS
} from '@/packages/contracts/src/atlas-grounding-model';
import {
  AGING_THRESHOLD_RATIO, COGNIX_IDENTITY_SIGNALS, DEFAULT_MAX_AGE_DAYS,
  GROUNDING_POLICY_VERSION, INTERNAL_QUESTION_SHAPES, TOPIC_MAX_AGE_DAYS
} from '@/lib/atlas/grounding/policy';
import { TRUSTED_SOURCE_HOSTS } from '@/lib/atlas/grounding/provenance';
import { CLAIM_ASSERTION_MARKERS } from '@/lib/atlas/grounding/contradiction';
import { activeGroundingProvider } from '@/lib/atlas/grounding/provider';
import { ensureGroundingProviderRegistered } from '@/lib/atlas/grounding/providers/register';
import { PROVIDER_NAME } from '@/lib/atlas/grounding/providers/google-search-grounding';
import { GEMINI_MODEL_ENV_VAR, resolveGeminiModelConfig } from '@/config/gemini-models';
import { SOURCE_TIER_BY_HOST } from '@/lib/atlas/grounding/providers/source-resolution';
import { DEFAULT_CACHE_TTL_MS, DEFAULT_CALL_BUDGET, liveCallCount } from '@/lib/atlas/grounding/providers/grounding-cache';
import { ensureInterpretationProviderRegistered, interpretationProviderStatus } from '@/lib/atlas/interpretation/register';
import { INTERPRETATION_CALL_BUDGET, interpretationCallCount } from '@/lib/atlas/interpretation/engine';
import { MAX_INTERPRETATION_LENGTH } from '@/lib/atlas/interpretation/verification';

/**
 * The declared external-grounding policy (ATL-06A).
 *
 * Published for the same reason `FIELD_WEIGHTS` is published for Level 1 search: a rule that
 * decides what a reader is and is not shown must be inspectable by that reader. Every value here is
 * the value the engine actually uses — the route reads the same constants, it does not restate them.
 *
 * The response reports whether a grounding provider is configured. It never reports which key,
 * endpoint or credential would be used, and no code path in this layer can read one (ADR-049).
 */
export async function GET() {
  ensureGroundingProviderRegistered();
  ensureInterpretationProviderRegistered();
  const provider = activeGroundingProvider();
  const interpretation = interpretationProviderStatus();
  // One governed source for the model list, reported so a retired alias is visible here rather than
  // discovered as a failed round trip (ADR-067).
  const modelConfig = resolveGeminiModelConfig();
  return ok('capability-atlas-grounding-policy', {
    policy_version: GROUNDING_POLICY_VERSION,
    evidence_classes: EVIDENCE_CLASSES.map(c => ({ id: c, label: EVIDENCE_CLASS_LABEL[c] })),
    intents: GROUNDING_INTENTS,
    default_intent: 'internal-only',
    fail_safe_rule: 'A question carrying any CogniX-identity or internal-question signal has its CogniX portion answered from governed records only, whatever else it also asks. An unclassifiable question is internal-only.',
    cognix_identity_signals: COGNIX_IDENTITY_SIGNALS,
    internal_question_shapes: INTERNAL_QUESTION_SHAPES,
    source_admission: {
      trusted_hosts: TRUSTED_SOURCE_HOSTS,
      host_match_rule: 'Exact host or dot-bounded suffix. Substring matches are not admitted.',
      all_tiers: SOURCE_TIERS,
      admissible_tiers: ADMISSIBLE_SOURCE_TIERS,
      required_provenance: ['url', 'publisher', 'title', 'published_at', 'retrieved_at', 'tier', 'retrieval_method'],
      undated_sources: 'inadmissible — a publication date is never inferred',
      tier_by_host: SOURCE_TIER_BY_HOST,
      provenance_origin: 'Publisher, title and publication date are read from the source page itself after following the grounding redirect. They are never supplied by the model.'
    },
    freshness: {
      topic_max_age_days: TOPIC_MAX_AGE_DAYS,
      default_max_age_days: DEFAULT_MAX_AGE_DAYS,
      aging_threshold_ratio: AGING_THRESHOLD_RATIO
    },
    contradiction: {
      resolution: 'cognix-authoritative',
      rule: 'Where external evidence disagrees with a governed CogniX fact, the governed fact is authoritative and the disagreement is rendered as three separated evidence classes. No merged or reconciled statement is produced.',
      assertion_markers: CLAIM_ASSERTION_MARKERS
    },
    provider: {
      configured: provider !== null,
      name: provider?.name ?? null,
      adapter: PROVIDER_NAME,
      models: modelConfig.models,
      model_source: modelConfig.source,
      model_variable: GEMINI_MODEL_ENV_VAR,
      credential: 'resolved from the server environment at call time; never accepted from a request body, never written to a record, a cache entry, a notice or an error message'
    },
    research_control: {
      mode: 'user-initiated',
      default: false,
      rule: 'External research runs only when a reader asks for it on that question, and only where the intent policy already permits external evidence. Internal search and Ask CogniX never call a provider.'
    },
    cost_control: { cache_ttl_ms: DEFAULT_CACHE_TTL_MS, call_budget: DEFAULT_CALL_BUDGET, live_calls_this_process: liveCallCount() },
    claim_traceability: 'Only response segments carrying a grounding support that names a retrieved source become market claims. Ungrounded model text is discarded and counted, never shown.',
    interpretation: {
      configured: interpretation.configured,
      adapter: interpretation.name,
      premise_sources: ['From CogniX statements', 'admitted Market Context statements'],
      excluded_from_reasoning: 'Rejected claims and discarded ungrounded segments are audit material. They are not part of the premise set and are unreachable from the interpretation path.',
      verification_rules: [
        'cites at least one governed CogniX premise',
        'every cited premise id resolves',
        'asserts no CogniX capability fact',
        'reproduces no claim that failed source admission',
        'introduces no number a cited premise does not contain',
        'names no organisation a cited premise does not mention',
        'carries no markup',
        `is at most ${MAX_INTERPRETATION_LENGTH} characters`
      ],
      on_failure: 'the reading is dropped and recorded with the rule it broke; it is never hedged or shown with a caveat',
      call_budget: INTERPRETATION_CALL_BUDGET,
      calls_this_process: interpretationCallCount()
    },
    delivered_by: ['ATL-06A', 'ATL-06B'],
    not_yet_delivered: {
      // Level 2 semantic retrieval sat in ATL-06B as originally chartered. The owner's 2026-08-21
      // redefinition scoped ATL-06B to Grounded Market Intelligence, so it is undelivered and
      // currently unassigned rather than quietly dropped.
      'ATL-06B': 'Level 2 semantic retrieval over governed capability knowledge — descoped from ATL-06B on owner decision and not yet assigned to a phase',
      'ATL-06D': 'client conversation pack'
    }
  });
}
