/**
 * The Gemini interpretation adapter (ATL-06C).
 *
 * Server-side, structured output, temperature zero, **no search tool**. That last point is the
 * design: this adapter is not allowed to go and look. It reads the premises it is given and nothing
 * else, so anything it produces is either derivable from admitted evidence or refused by
 * verification. Giving it search would make its output partly retrieved and partly reasoned, with no
 * way to tell which sentence is which — the exact confusion ATL-06B exists to remove.
 *
 * The response is constrained by `responseSchema` to `{ statements: [{ text, rests_on }] }`, so the
 * citation is structural rather than a convention the model is asked to observe. Both the request
 * shape and the schema form were validated against the live `generativelanguage.googleapis.com`
 * endpoint, which accepts them and rejects only the credential.
 *
 * The prompt states the rules. It is not trusted to enforce them: every rule it states is
 * independently checked in `verification.ts`, and a statement that breaks one is dropped whatever
 * the prompt said. A guardrail a model can decline to follow is not a guardrail.
 */

import type { InterpretationProvider, InterpretationRequest, InterpretationResult } from './provider';
import { renderPremises } from './premises';
import { GEMINI_MODEL_ENV_VAR, resolveGeminiModels } from '../../../config/gemini-models';

export const GEMINI_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const GEMINI_API_KEY_HEADER = 'x-goog-api-key';
// Models come from the single governed configuration (ADR-067), resolved at call time.
export const PROVIDER_NAME = 'gemini-interpretation';

export const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    statements: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          rests_on: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: ['text', 'rests_on']
      }
    }
  },
  required: ['statements']
} as const;

export function buildInterpretationPrompt(request: InterpretationRequest): string {
  return [
    'You are writing the AI Interpretation section of a governed enterprise capability catalogue.',
    '',
    `Question asked: ${request.question}`,
    '',
    'Premises. These are the only facts in existence for this task:',
    renderPremises(request.premises),
    '',
    request.contradictionSummaries.length
      ? `Already handled — do not restate these disagreements:\n${request.contradictionSummaries.map(c => `- ${c}`).join('\n')}\n`
      : '',
    'Write at most three short statements, each saying what the premises together mean for someone',
    'deciding whether this capability fits their situation.',
    '',
    'Rules, all enforced independently of this prompt:',
    '- Every statement must cite at least one CogniX-record premise in rests_on.',
    '- Cite every premise the statement uses. Use only the given premise ids.',
    '- Never state what CogniX is, has, does, supports or provides. Name a direction, not a capability.',
    '- Never introduce a number, percentage, organisation or publisher that a cited premise does not contain.',
    '- Add nothing from your own knowledge. If the premises support no useful reading, return no statements.',
    '- Plain sentences, no markup, under 400 characters each.'
  ].filter(Boolean).join('\n');
}

export type InterpretationTransport = (
  model: string,
  apiKey: string,
  body: unknown
) => Promise<{ candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { status?: string } }>;

const defaultTransport: InterpretationTransport = async (model, apiKey, body) => {
  const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', [GEMINI_API_KEY_HEADER]: apiKey },
    body: JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) {
    // Status only. The credential travelled in a header on this call and must not reappear anywhere
    // that will be logged or surfaced.
    throw new Error(`Gemini interpretation request failed (${payload?.error?.status ?? response.status}).`);
  }
  return payload;
};

export interface GeminiInterpreterOptions {
  apiKey?: string;
  transport?: InterpretationTransport;
  models?: readonly string[];
}

export function createGeminiInterpretationProvider(options: GeminiInterpreterOptions = {}): InterpretationProvider {
  const transport = options.transport ?? defaultTransport;
  const models = options.models ?? resolveGeminiModels();
  const resolveKey = (): string => (options.apiKey ?? process.env.GEMINI_API_KEY ?? '').trim();

  return {
    name: PROVIDER_NAME,
    isConfigured: () => resolveKey().length > 0,
    async interpret(request: InterpretationRequest): Promise<InterpretationResult> {
      const apiKey = resolveKey();
      if (!apiKey) {
        throw new Error('Interpretation requires the GEMINI_API_KEY environment variable to be set on the server.');
      }
      const body = {
        contents: [{ role: 'user', parts: [{ text: buildInterpretationPrompt(request) }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA
        }
      };

      let lastError: unknown = null;
      for (const model of models) {
        try {
          const payload = await transport(model, apiKey, body);
          const raw = payload.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
          let parsed: { statements?: { text?: string; rests_on?: string[] }[] };
          try {
            parsed = JSON.parse(raw);
          } catch {
            // Malformed output is not partially usable. Salvaging prose out of broken JSON is how a
            // structured contract quietly becomes a free-text one.
            throw new Error('The interpretation provider returned output that did not parse as the requested structure.');
          }
          return {
            model,
            candidates: (parsed.statements ?? []).map(s => ({
              text: String(s.text ?? ''),
              rests_on: Array.isArray(s.rests_on) ? s.rests_on.map(String) : []
            }))
          };
        } catch (e: unknown) {
          lastError = e;
          const message = e instanceof Error ? e.message : String(e);
          if (/404|NOT_FOUND|not found|no longer available/i.test(message)) continue;
          throw e;
        }
      }
      throw lastError ?? new Error(
        `No interpretation model was available. Tried ${models.join(', ')}; set ${GEMINI_MODEL_ENV_VAR} to a current model.`
      );
    }
  };
}
