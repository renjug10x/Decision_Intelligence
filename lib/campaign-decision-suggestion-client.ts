/**
 * Client helper for CDI-01 Decision Context draft suggestions.
 *
 * Unlike the other campaign clients this one does not collapse failure to null. A planner who
 * asked for help needs to know the difference between "nothing came back" and "the assistant
 * is not available here", and the surface must never fill that gap with content of its own.
 * The failure message is deliberately short and provider-agnostic.
 *
 * The route stamps every draft with provenance — source, authority, provider, model family and
 * generation time. That stamp is the only thing that keeps an accepted draft from reading as
 * planner-authored evidence once it is in the decision record, so it is carried through here
 * rather than discarded. A response that arrives without a usable stamp is treated as a
 * failure: a draft that cannot be marked as a draft must not reach the acceptance decision.
 */

const DEFAULT_TENANT = 'tenant_uk_retail_01';
const DEFAULT_SESSION = 'sess_001';

export type DecisionContextSuggestionType = 'CONTEXTUAL_FACTORS' | 'OPEN_QUESTIONS' | 'ASSUMPTIONS';

export interface DecisionContextSuggestionContext {
  category?: string;
  sku_scope?: string[];
  objective_type?: string;
  intervention_posture?: string;
  customer_segment?: string;
  channel?: string;
  activation_channels?: string[];
  region?: string;
  timing_mode?: string;
  primary_metric?: string;
  existing_contextual_factors?: string[];
  existing_open_questions?: string[];
  existing_assumptions?: string[];
  evidence_posture?: string;
  synthetic_demo?: boolean;
}

/**
 * Provenance as issued by the route. `source` and `authority` are required — they are what a
 * canvas attaches to an accepted item so the record shows where the text came from.
 */
export interface DecisionContextSuggestionProvenance {
  source: string;
  authority: string;
  provider: string;
  model_family: string;
  generated_at: string;
}

export interface DecisionContextSuggestionResult {
  suggestions: string[];
  provenance: DecisionContextSuggestionProvenance;
  disclosure: string;
}

export type DecisionContextSuggestionOutcome =
  | { ok: true; result: DecisionContextSuggestionResult }
  | { ok: false; message: string };

const UNAVAILABLE_MESSAGE = 'AI suggestions are unavailable right now.';
const NOT_CONFIGURED_MESSAGE = 'AI suggestions are not configured on this environment.';
const RATE_LIMITED_MESSAGE = 'Too many suggestion requests just now. Try again in a moment.';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Returns null when the stamp is missing the two fields that make a draft identifiable. */
function readProvenance(raw: unknown): DecisionContextSuggestionProvenance | null {
  if (!raw || typeof raw !== 'object') return null;
  const block = raw as Record<string, unknown>;
  const source = readString(block.source);
  const authority = readString(block.authority);
  if (!source || !authority) return null;

  return {
    source,
    authority,
    provider: readString(block.provider),
    model_family: readString(block.model_family),
    generated_at: readString(block.generated_at)
  };
}

export async function suggestDecisionContextClient(args: {
  suggestion_type: DecisionContextSuggestionType;
  context: DecisionContextSuggestionContext;
  tenant_id?: string;
  session_id?: string;
}): Promise<DecisionContextSuggestionOutcome> {
  try {
    const res = await fetch('/api/v1/campaigns/decision-context/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: args.tenant_id || DEFAULT_TENANT,
        session_id: args.session_id || DEFAULT_SESSION,
        suggestion_type: args.suggestion_type,
        context: args.context
      })
    });

    if (!res.ok) {
      // 503 and 429 are the two failures a planner can act on — one says the environment lacks
      // the assistant, the other says to wait. Everything else is just "not now".
      if (res.status === 503) return { ok: false, message: NOT_CONFIGURED_MESSAGE };
      if (res.status === 429) return { ok: false, message: RATE_LIMITED_MESSAGE };
      return { ok: false, message: UNAVAILABLE_MESSAGE };
    }

    const json = await res.json();
    const raw: unknown = json?.data?.suggestions;
    const suggestions = Array.isArray(raw)
      ? raw.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      : [];
    if (suggestions.length === 0) {
      return { ok: false, message: UNAVAILABLE_MESSAGE };
    }

    const provenance = readProvenance(json?.data?.provenance);
    if (!provenance) {
      // Unmarked drafts are indistinguishable from planner-authored context once accepted.
      return { ok: false, message: UNAVAILABLE_MESSAGE };
    }

    return {
      ok: true,
      result: {
        suggestions,
        provenance,
        disclosure: typeof json?.data?.disclosure === 'string' ? json.data.disclosure : ''
      }
    };
  } catch {
    return { ok: false, message: UNAVAILABLE_MESSAGE };
  }
}
