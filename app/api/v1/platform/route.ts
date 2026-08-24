import { NextRequest } from 'next/server';
import { resolvePlatformMetadata } from '@/config/platform-metadata';
import { ok } from '../atlas/_shared';

/**
 * Platform identification for the About surface (ATL-04R).
 *
 * Resolved server-side because build and environment identity are properties of the deployment, not
 * assertions a browser should be able to make about itself. Fields the deployment does not supply
 * are `null` and the surface says they are not recorded; `certifications` is empty because the
 * estate holds no certification record, and an empty list is the honest answer.
 */
export async function GET(_request: NextRequest) {
  return ok('platform-metadata', resolvePlatformMetadata());
}
