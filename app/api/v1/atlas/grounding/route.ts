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
  const provider = activeGroundingProvider();
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
      undated_sources: 'inadmissible — a publication date is never inferred'
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
    provider: { configured: provider !== null, name: provider?.name ?? null },
    delivered_by: 'ATL-06A',
    not_yet_delivered: {
      'ATL-06B': 'external grounding provider and semantic retrieval',
      'ATL-06C': 'market intelligence corpus',
      'ATL-06D': 'client conversation pack'
    }
  });
}
