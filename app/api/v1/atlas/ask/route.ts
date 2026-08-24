import { NextRequest, NextResponse } from 'next/server';
import { ask } from '@/lib/atlas/ai/gateway';
import { ATLAS_LENSES, type AudienceLens } from '@/packages/contracts/src/capability-atlas-model';
import { ok } from '../_shared';

/**
 * Ask CogniX (ATL-05, extended by ATL-06A/ATL-06B).
 *
 * The governed answer is unchanged: retrieval and reasoning stay strictly inside CogniX knowledge.
 * ATL-06B adds external market research as an EXPLICIT, PER-REQUEST OPT-IN — `research: true`, absent
 * or false by default. Without it nothing is looked up, no provider is called and no topic leaves
 * the server, and the answer is exactly the ATL-05 answer with the market section shown as
 * explicitly absent (ADR-056).
 *
 * `research: true` is a request, not a grant. The ATL-06A policy still decides whether external
 * evidence is permissible for the question at all, and a question about what CogniX does is
 * answered from governed records however emphatically research was asked for.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const question = String(body.question ?? '').trim();
    if (!question) {
      return NextResponse.json({
        status: 'error', error: 'BadRequest', message: 'A question is required.',
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
    const research = body.research === true;
    const answer = await ask({ question, lens: lensRaw as AudienceLens | undefined, research });
    return ok('capability-atlas-ask', answer);
  } catch (e: any) {
    return NextResponse.json({
      status: 'error', error: 'BadRequest',
      message: `Ask CogniX failed: ${e.message}`, timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
