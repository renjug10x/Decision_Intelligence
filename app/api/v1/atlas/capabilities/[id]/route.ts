import { NextRequest } from 'next/server';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { ok, notFound, filterError, FilterError } from '../../_shared';
import { ATLAS_LENSES, type AudienceLens } from '@/packages/contracts/src/capability-atlas-model';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const includeKnowledge = request.nextUrl.searchParams.get('knowledge') !== 'false';
  const lensRaw = request.nextUrl.searchParams.get('lens');
  if (lensRaw !== null && !(ATLAS_LENSES as readonly string[]).includes(lensRaw)) {
    return filterError(new FilterError('lens', lensRaw, [...ATLAS_LENSES]));
  }
  const lens = (lensRaw ?? undefined) as AudienceLens | undefined;

  const resolved = await capabilityRepository.resolve(id, { includeKnowledge, lens });
  if (!resolved) return notFound(`No capability with id '${id}'.`);
  return ok('capability-atlas', resolved);
}
