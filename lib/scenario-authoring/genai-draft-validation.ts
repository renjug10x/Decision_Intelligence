/**
 * Scenario drafting — response validation (`SCI-07`, ADR-044 Amendment B, ADR-083)
 * ───────────────────────────────────────────────────────────────────────────────
 * The AI authority boundary, enforced on the RESPONSE.
 *
 * ADR-044's central finding, carried over unchanged: *"the prompt's rules are enforced on the
 * response, not merely requested in the prompt. A model that was steered, truncated or
 * confused is exactly the case validation exists for."* Everything below is that sentence as
 * code, for scenario drafting rather than for decision context.
 *
 * Two lines of defence, in this order, and the order matters
 * ---------------------------------------------------------
 *  1. **Structural.** A proposal names a FIELD. If that field is not on the GenAI allowlist —
 *     which is derived from the field register, where every `QUANTITY` is prohibited — the
 *     proposal is refused before a character of its value is examined. This is the line that
 *     makes "GenAI may not author demand totals, revenue, margin, elasticity, Decision Gap,
 *     Decision Window, Decision Regret or a forecast" true by construction rather than by
 *     inspection: there is no field on the allowlist through which any of them could arrive.
 *  2. **Content.** Every value and rationale that survives is then read for a percentage, a
 *     currency symbol, a decimal quantity or a thousands-separated figure, using the SAME
 *     detector `CDI-01` uses. This catches the model that answers an allowed qualitative field
 *     with a quantitative claim — "the category is chilled and flex is 12%".
 *
 * Neither line is sufficient alone. The first cannot see a number smuggled into a text field;
 * the second cannot see a number that is legitimately shaped but authored in the wrong place.
 *
 * Nothing is repaired. A proposal that fails is REJECTED and reported with the rule it broke,
 * because a validator that edits model output is authoring on the model's behalf.
 */

import {
  GENAI_DRAFT_PROVENANCE,
  type ProvenanceDescriptor
} from '@/packages/contracts/src/provenance-vocabulary';
import {
  GENAI_DRAFT_AUTHORITY,
  GENAI_DRAFT_SOURCE,
  SCENARIO_DRAFT_DISCLOSURE,
  isGenAiAuthorableField,
  scenarioDraftField,
  type ScenarioDraftEnvelope,
  type ScenarioDraftFieldId,
  type ScenarioDraftProposal,
  type ScenarioDraftRejection
} from '@/packages/contracts/src/scenario-draft-model';
import {
  boundedText,
  normaliseForComparison,
  statesAFigure
} from '@/lib/campaign-decision-suggestion-validation';
import { listAuthorableProducts } from './product-master';

export const MAX_PROPOSAL_VALUE_CHARS = 240;
export const MAX_RATIONALE_CHARS = 220;
export const MAX_PROPOSALS = 24;
export const MAX_MISSING_INFORMATION_ITEMS = 6;

/**
 * Caller and model text is flattened to one line and bounded before anything else looks at it.
 *
 * `boundedText` is `CDI-01`'s, reused rather than reimplemented: it already collapses newlines,
 * tabs, control characters and the invisible format characters that would otherwise let model
 * output occupy a line of its own, which is exactly what makes a prompt fence meaningful. A
 * second copy of that logic would be a second thing to keep correct.
 */
export function flattenLine(value: unknown, maxChars = 4_000): string {
  return boundedText(value, maxChars);
}

/**
 * Shapes that read as a credential.
 *
 * A person's description of their situation is their own text, and people paste more into a
 * free-text box than they mean to. Nothing puts the server's key into the prompt, so a model
 * cannot learn it — but a key the PERSON pasted could come back in a proposal and be written
 * into a draft that is later exported and shared. Refusing the shape costs nothing and closes
 * that path, which is the same reasoning ADR-044 applies to its own error text.
 */
const CREDENTIAL_SHAPED: readonly RegExp[] = [
  /AIza[0-9A-Za-z_\-]{10,}/,          // Google API key
  /\bya29\.[0-9A-Za-z_\-]{10,}/,      // Google OAuth token
  /\bsk-[0-9A-Za-z]{16,}/i,           // common provider secret-key form
  /\bBearer\s+[0-9A-Za-z._\-]{16,}/i, // a bearer token pasted whole
  /\b[0-9A-Za-z_\-]{32,}\b/          // any long opaque token; prose does not contain one
];

export function looksLikeACredential(text: string): boolean {
  return CREDENTIAL_SHAPED.some(pattern => pattern.test(text));
}

export interface RawScenarioDraftResponse {
  proposals?: { field?: unknown; value?: unknown; rationale?: unknown }[];
  missing_information?: unknown;
  readiness_explanation?: unknown;
}

export interface ValidatedProposals {
  proposals: ScenarioDraftProposal[];
  rejected: ScenarioDraftRejection[];
}

/**
 * Parse the provider's JSON.
 *
 * `responseSchema` already constrains the shape at the provider, so this is the second reader
 * rather than the only one. Malformed output is not partially salvaged: reading prose out of
 * broken JSON is how a structured contract quietly becomes a free-text one, which is the
 * position `ATL-06C`'s interpreter takes and the reason it is taken again here.
 */
export function parseScenarioDraftResponse(raw: string): RawScenarioDraftResponse | null {
  const fenced = raw.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
  try {
    const parsed = JSON.parse(fenced);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Which values are acceptable for a field, where the field has a closed set.
 *
 * `sku_id` is closed too, against the product master, which is what makes ADR-083 part 4's
 * *"every proposed field mapping is validated against a closed allowlist … and anything
 * outside it is rejected rather than coerced"* true for the product dimension.
 */
function allowedValuesFor(field: ScenarioDraftFieldId): readonly string[] | undefined {
  if (field === 'sku_id') return listAuthorableProducts().map(p => p.sku_id);
  return scenarioDraftField(field as string)?.allowed_values;
}

/**
 * Validate the model's proposals.
 *
 * `scaffoldingKeys` carries every line this route wrote into the prompt, so route-authored
 * text echoed back is recognised as scaffolding rather than returned to a person as a
 * proposal — the same defence `CDI-01` installs, for the same reason.
 */
export function validateScenarioDraftProposals(
  parsed: RawScenarioDraftResponse | null,
  scaffoldingKeys: ReadonlySet<string>
): ValidatedProposals {
  const proposals: ScenarioDraftProposal[] = [];
  const rejected: ScenarioDraftRejection[] = [];
  const seenFields = new Set<string>();

  if (!parsed || !Array.isArray(parsed.proposals)) return { proposals, rejected };

  for (const entry of parsed.proposals.slice(0, MAX_PROPOSALS)) {
    const field = flattenLine(entry?.field);
    const value = flattenLine(entry?.value);
    const rationale = flattenLine(entry?.rationale);

    const reject = (reason: ScenarioDraftRejection['reason'], detail: string): void => {
      rejected.push({ field: field || '(unnamed)', value, reason, detail });
    };

    const spec = scenarioDraftField(field);
    if (!spec) {
      reject('UNKNOWN_FIELD', `"${field}" is not an authorable scenario field.`);
      continue;
    }
    // LINE 1 — structural. Nothing about the value has been read yet.
    if (!isGenAiAuthorableField(field)) {
      reject(
        'FIELD_NOT_AUTHORABLE_BY_GENAI',
        `"${spec.label}" is a quantity CogniX calculates or a person states. AI may not propose it.`
      );
      continue;
    }
    if (seenFields.has(field)) {
      reject('DUPLICATE_FIELD', `"${spec.label}" was proposed more than once.`);
      continue;
    }
    if (!value) {
      reject('EMPTY_VALUE', `"${spec.label}" was proposed with no value.`);
      continue;
    }
    if (value.length > MAX_PROPOSAL_VALUE_CHARS) {
      reject('TOO_LONG', `"${spec.label}" was proposed with more than ${MAX_PROPOSAL_VALUE_CHARS} characters.`);
      continue;
    }

    const allowed = allowedValuesFor(spec.id);
    if (allowed && !allowed.includes(value)) {
      reject(
        'VALUE_NOT_IN_ALLOWLIST',
        `"${value}" is not one of the values CogniX accepts for ${spec.label}.`
      );
      continue;
    }

    // LINE 2 — content. Only reached by a field the model is allowed to author.
    if (!allowed && statesAFigure(value)) {
      reject(
        'QUANTITATIVE_CLAIM',
        `"${spec.label}" was proposed with a measured or monetary figure. Every quantity in a CogniX `
        + 'scenario is stated by a person or calculated by CogniX.'
      );
      continue;
    }
    if (looksLikeACredential(value) || (rationale && looksLikeACredential(rationale))) {
      reject(
        'CREDENTIAL_SHAPED_VALUE',
        `The proposal for ${spec.label} contains something shaped like a credential or token, so it `
        + 'was discarded rather than written into a scenario.'
      );
      continue;
    }
    if (rationale && statesAFigure(rationale)) {
      reject(
        'QUANTITATIVE_CLAIM',
        `The explanation offered for ${spec.label} states a measured or monetary figure.`
      );
      continue;
    }
    if (scaffoldingKeys.has(normaliseForComparison(value))) {
      reject('PROMPT_SCAFFOLDING_ECHO', 'The proposal echoes the instructions CogniX sent, not a proposal.');
      continue;
    }

    seenFields.add(field);
    proposals.push({
      field: spec.id,
      value,
      rationale: rationale.slice(0, MAX_RATIONALE_CHARS)
    });
  }

  return { proposals, rejected };
}

/** Free text the model returns about what it could not determine. Figure-checked like everything else. */
export function validateNarrativeItems(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const line = flattenLine(entry);
    if (!line || line.length > MAX_RATIONALE_CHARS) continue;
    if (statesAFigure(line) || looksLikeACredential(line)) continue;
    out.push(line);
    if (out.length >= limit) break;
  }
  return out;
}

export function validateNarrativeLine(value: unknown): string {
  const line = flattenLine(value).slice(0, MAX_RATIONALE_CHARS);
  return line && !statesAFigure(line) && !looksLikeACredential(line) ? line : '';
}

/** Assemble the stamped envelope. The stamp is applied here, once, and validated on read. */
export function buildScenarioDraftEnvelope(args: {
  model: string;
  generated_at: string;
  proposals: ScenarioDraftProposal[];
  rejected: ScenarioDraftRejection[];
  missing_information: string[];
  readiness_explanation: string;
}): ScenarioDraftEnvelope {
  const provenance: ProvenanceDescriptor = GENAI_DRAFT_PROVENANCE;
  return {
    source: GENAI_DRAFT_SOURCE,
    authority: GENAI_DRAFT_AUTHORITY,
    provider: 'google_generative_ai',
    model_family: 'gemini',
    model: args.model,
    generated_at: args.generated_at,
    proposals: args.proposals,
    rejected: args.rejected,
    missing_information: args.missing_information,
    readiness_explanation: args.readiness_explanation,
    disclosure: SCENARIO_DRAFT_DISCLOSURE,
    provenance
  };
}
