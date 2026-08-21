import { NextRequest, NextResponse } from 'next/server';
import { prepare } from '@/lib/atlas/preparation/engine';
import { ATLAS_LENSES, type AudienceLens } from '@/packages/contracts/src/capability-atlas-model';
import { ok } from '../_shared';

/**
 * Prepare me for a client conversation (ATL-06D).
 *
 * ── Two dimensions, and this route keeps them apart ────────────────────────
 * `lens` is the CogniX person preparing — one of the four `AudienceLens` values, validated here.
 * The CLIENT's role is not a parameter at all: it arrives inside the free-text `brief` and is read
 * back as the user's own words. Collapsing the two is the §9 failure, and the shape of this
 * contract makes it impossible to do accidentally.
 *
 * ── `research` is a request, not a grant ───────────────────────────────────
 * Identical to the Ask CogniX contract (ADR-056), and identically defaulted to `false`. With it
 * absent no provider is constructed, no topic leaves the server and the Market Context block is
 * rendered as explicitly absent with its reason. With it `true`, the ATL-06A policy still decides
 * whether external evidence is permissible for this brief at all — a preparation pack about what
 * CogniX does is answered from governed records however emphatically research was asked for (§18).
 *
 * ── A pack that fails its own rules is a 500, not a page ───────────────────
 * `validatePack` violations mean the pack breached an integrity rule — most seriously `P2`, a
 * non-implemented capability recommended with no demonstration warning. That is not a degraded
 * response to render with a caveat; it is a document that could mislead a client, so it is refused.
 * The violations are returned so the failure is diagnosable rather than mysterious.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const brief = String(body.brief ?? '').trim();
    const refinement = body.refinement ? String(body.refinement).trim() : undefined;
    const choices = Array.isArray(body.choices) ? body.choices.map((c: unknown) => String(c)) : undefined;

    if (!brief && !refinement && !(choices?.length)) {
      return NextResponse.json({
        status: 'error', error: 'BadRequest',
        message: 'Describe the conversation you are preparing for.',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const lensRaw = body.lens ? String(body.lens) : undefined;
    if (lensRaw && !(ATLAS_LENSES as readonly string[]).includes(lensRaw)) {
      return NextResponse.json({
        status: 'error', error: 'BadRequest', field: 'lens',
        message: `Unknown lens '${lensRaw}'.`, allowed: [...ATLAS_LENSES],
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const { pack, violations } = await prepare({
      brief,
      refinement,
      choices,
      lens: lensRaw as AudienceLens | undefined,
      context: body.context,
      research: body.research === true
    });

    if (violations.length > 0) {
      return NextResponse.json({
        status: 'error', error: 'PackIntegrity',
        message: 'The preparation pack failed its own integrity rules and was not returned.',
        violations,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    return ok('capability-atlas-prepare', pack);
  } catch (e: any) {
    return NextResponse.json({
      status: 'error', error: 'BadRequest',
      message: `Preparation failed: ${e.message}`, timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
