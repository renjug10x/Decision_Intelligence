/**
 * CDI-01 Decision Context drafting assistant — request shaping and response validation.
 *
 * These are the rules the suggestion prompt states, expressed as code: length, sentence count,
 * question form, domain figures, duplication and prompt-scaffolding echo. A rule that is only
 * asked of the model is not a rule, because a steered, truncated or confused model is exactly
 * the case the check exists for.
 *
 * They live here rather than in the route module because a Next.js App Router route may only
 * export its handlers and route config — anything else exported from it is a build error. Held
 * in the route, these guarantees could only be asserted by reading the source; held here, they
 * can be exercised against real provider output shapes.
 *
 * Every function in this module is pure: no store, no environment, no clock.
 */

export type DecisionContextSuggestionType = 'CONTEXTUAL_FACTORS' | 'OPEN_QUESTIONS' | 'ASSUMPTIONS';

export interface SuggestionTypeSpec {
  min_count: number;
  max_count: number;
  noun: string;
  instruction: string;
  /** Enforced after generation, not merely asked for in the prompt. */
  requires_question_mark: boolean;
}

export const TYPE_SPECS: Record<DecisionContextSuggestionType, SuggestionTypeSpec> = {
  CONTEXTUAL_FACTORS: {
    min_count: 3,
    max_count: 5,
    noun: 'contextual factors',
    instruction:
      'Each item names one condition that could change whether this campaign is the right call — demand, supply, seasonality, operational capacity, customer behaviour or margin exposure.',
    requires_question_mark: false
  },
  OPEN_QUESTIONS: {
    min_count: 2,
    max_count: 4,
    noun: 'open questions',
    instruction:
      'Each item is a question that must be answered before this decision can be defended. End every item with a question mark.',
    requires_question_mark: true
  },
  ASSUMPTIONS: {
    min_count: 2,
    max_count: 4,
    noun: 'assumptions',
    instruction:
      'Each item states one thing currently taken as true without evidence, phrased so it can later be shown false.',
    requires_question_mark: false
  }
};

export const MAX_ITEM_CHARS = 200;
/** The prompt asks for 20 words at most; this is where that becomes a rule. */
export const MAX_ITEM_WORDS = 20;

/* ────────────────────────────────────────────────────────────────────────────
   Request shaping — every value that reaches the prompt is bounded here
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * Collapses newlines, tabs and control characters. Caller text that survives this cannot
 * occupy a line of its own in the prompt, which is what makes the fence around it meaningful.
 */
const CONTROL_AND_FORMAT_CHARS =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]+/g;

function flattenLine(value: string): string {
  return value.replace(CONTROL_AND_FORMAT_CHARS, ' ').replace(/\s+/g, ' ').trim();
}

export function boundedText(value: unknown, maxChars = 160): string {
  return typeof value === 'string' ? flattenLine(value).slice(0, maxChars).trim() : '';
}

/** Caps both list length and item length so a large canvas cannot grow an unbounded prompt. */
export function boundedList(value: unknown, maxItems = 12, maxChars = MAX_ITEM_CHARS): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const trimmed = flattenLine(entry);
    if (!trimmed) continue;
    out.push(trimmed.slice(0, maxChars).trim());
    if (out.length >= maxItems) break;
  }
  return out;
}

export function normaliseForComparison(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/* ────────────────────────────────────────────────────────────────────────────
   Response validation — anything that does not survive this is discarded, not repaired
   ──────────────────────────────────────────────────────────────────────────── */

export function parseSuggestionArray(raw: string): unknown {
  const fenced = raw
    .trim()
    .replace(/^```json?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  try {
    return JSON.parse(fenced);
  } catch {
    // Models occasionally wrap the array in a sentence. Reading the array out of the text is
    // still parsing what was returned — nothing is added to it. This is also the path an
    // echoed example takes, which is why validation rejects scaffolding text explicitly.
    const start = fenced.indexOf('[');
    const end = fenced.lastIndexOf(']');
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(fenced.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

/**
 * The prompt forbids invented statistics, percentages, currency figures and market facts.
 * These are the shapes such a claim takes. Bare small integers are allowed — "48-hour cover"
 * is a planning horizon, not a fabricated measurement — but anything reading as a measured or
 * monetary quantity is rejected, because this route has no data with which to support one.
 */
const FABRICATED_FIGURE_PATTERNS: readonly RegExp[] = [
  /%/,
  /\b(?:per\s?cent|percent|percentage\s+points?|ppts?|bps|basis\s+points)\b/i,
  /[£$€¥₹]/,
  /\b(?:gbp|usd|eur|jpy)\b/i,
  /\d[\d,]*\.\d/, // decimal quantity: 3.4, 30.2
  /\d{1,3}(?:,\d{3})+/, // thousands separated: 8,450
  /\b\d{3,}\b/, // any three-digit-or-larger figure
  /\b\d+(?:\.\d+)?\s*(?:k|m|bn|thousand|million|billion)\b/i
];

function statesAFigure(text: string): boolean {
  return FABRICATED_FIGURE_PATTERNS.some(pattern => pattern.test(text));
}

const ABBREVIATIONS = /\b(?:e\.g|i\.e|etc|vs|approx|no|dr|mr|mrs|ms)\.\s*/gi;

/** The prompt asks for one short sentence; this rejects an item that packs in more. */
function isMultiSentence(text: string): boolean {
  const body = text.replace(ABBREVIATIONS, ' ').replace(/[.?!]+\s*$/, '');
  return /[.?!]\s+\S/.test(body);
}

function wordCount(text: string): number {
  const words = text.split(/\s+/).filter(Boolean);
  return words.length;
}

export function validateSuggestions(
  parsed: unknown,
  type: DecisionContextSuggestionType,
  existing: string[],
  scaffoldingKeys: Set<string>
): string[] {
  if (!Array.isArray(parsed)) return [];

  const spec = TYPE_SPECS[type];
  const seen = new Set(existing.map(normaliseForComparison).filter(Boolean));
  const accepted: string[] = [];

  for (const entry of parsed) {
    if (typeof entry !== 'string') continue;
    const cleaned = flattenLine(entry)
      .replace(/^\s*(?:[-*•–—]|\d+[.)])\s*/, '')
      .trim();
    if (!cleaned) continue;
    if (cleaned.length > MAX_ITEM_CHARS) continue;
    if (wordCount(cleaned) > MAX_ITEM_WORDS) continue;
    if (isMultiSentence(cleaned)) continue;

    // The rules the prompt states are enforced here, not requested. A model that was steered,
    // truncated or confused is exactly the case these exist for.
    if (statesAFigure(cleaned)) continue;
    if (spec.requires_question_mark && !cleaned.endsWith('?')) continue;

    const key = normaliseForComparison(cleaned);
    if (!key || seen.has(key)) continue;
    // Route- or contract-authored prompt text echoed back is scaffolding, never a suggestion.
    if (scaffoldingKeys.has(key)) continue;

    seen.add(key);
    accepted.push(cleaned);
    if (accepted.length >= spec.max_count) break;
  }

  return accepted;
}
