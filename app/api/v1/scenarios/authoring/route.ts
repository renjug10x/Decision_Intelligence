/**
 * Scenario Authoring Options (BFF route, `SCI-07`)
 * ───────────────────────────────────────────────────────────────────────────────
 * What a person may author, published as data.
 *
 * This is the route `SCI-08` builds its experience from. Everything it returns is DERIVED
 * from the Scenario Draft field register, the governed situation allowlist and the product
 * master — nothing is restated here. A field added to the register appears on this route and
 * is accepted by the drafting validator in the same edit, which is what stops the UX, the
 * prompt and the validator drifting apart.
 *
 * It publishes what CogniX CANNOT model as deliberately as what it can. A chooser that
 * silently omits online fulfilment teaches a reader that the omission is an oversight;
 * naming it, with the reason, is `COGNIX_SCENARIO_INTELLIGENCE.md` §5.1 honoured rather
 * than quoted.
 */

import { NextResponse } from 'next/server';
import { platformReceiptNowIso } from '@/packages/contracts/src/scenario-clock';
import {
  CAPABILITY_READINESS_STATES,
  GENAI_AUTHORABLE_FIELD_IDS,
  GENAI_PROHIBITED_FIELD_IDS,
  SCENARIO_CAPABILITIES,
  SCENARIO_DRAFT_FIELDS,
  SCENARIO_SITUATIONS,
  SCENARIO_SITUATIONS_NOT_SUPPORTED
} from '@/packages/contracts/src/scenario-draft-model';
import {
  SCENARIO_AUTHORING_VERSION,
  isScenarioDraftingConfigured,
  listAuthorableProducts,
  openingPosturesFor
} from '@/lib/scenario-authoring';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    status: 'success',
    service: 'cognix-web-bff',
    domain: 'scenario-authoring-options',
    authoring_version: SCENARIO_AUTHORING_VERSION,
    timestamp: platformReceiptNowIso(),
    data: {
      situations: SCENARIO_SITUATIONS.map(situation => ({
        ...situation,
        opening_postures: openingPosturesFor(situation.id)
      })),
      situations_not_supported: SCENARIO_SITUATIONS_NOT_SUPPORTED,
      products: listAuthorableProducts(),
      fields: SCENARIO_DRAFT_FIELDS,
      capabilities: SCENARIO_CAPABILITIES,
      readiness_states: CAPABILITY_READINESS_STATES,
      ai_authority: {
        /*
         * Published so the boundary is inspectable rather than asserted. A client can show
         * exactly which fields AI may propose and which it may never touch, and a test can
         * compare this route's answer against the register.
         */
        genai_may_propose: GENAI_AUTHORABLE_FIELD_IDS,
        genai_may_never_author: GENAI_PROHIBITED_FIELD_IDS,
        statement:
          'AI proposes structure and words. Every quantity is stated by you or calculated by CogniX, '
          + 'and a confirmed scenario runs identically with AI switched off.'
      },
      /*
       * Whether the server can draft at all. A capability statement, not a credential: it is a
       * boolean derived from whether the SERVER holds a key, and no part of the key, its length
       * or its shape leaves this process.
       */
      genai_drafting_available: isScenarioDraftingConfigured(),
      manual_authoring_available: true
    }
  });
}
