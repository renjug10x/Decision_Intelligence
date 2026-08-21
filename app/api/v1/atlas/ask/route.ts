import { NextRequest, NextResponse } from 'next/server';
import { ask } from '@/lib/atlas/ai/gateway';
import { ATLAS_LENSES, type AudienceLens } from '@/packages/contracts/src/capability-atlas-model';
import { ok } from '../_shared';

/**
 * Ask CogniX (ATL-05). Retrieval and reasoning stay strictly inside governed CogniX knowledge:
 * no web retrieval, no search grounding, no external market evidence. Where a question needs
 * current external knowledge the answer says the internal Atlas cannot substantiate it.
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
    const answer = await ask({ question, lens: lensRaw as AudienceLens | undefined });
    return ok('capability-atlas-ask', answer);
  } catch (e: any) {
    return NextResponse.json({
      status: 'error', error: 'BadRequest',
      message: `Ask CogniX failed: ${e.message}`, timestamp: new Date().toISOString()
    }, { status: 400 });
  }
}
