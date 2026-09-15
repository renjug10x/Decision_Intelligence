/**
 * GET /api/v1/fx — the platform's own rate endpoint.
 *
 * The browser reads rates from here and never from a third-party host: one cached fetch per
 * process instead of one per client, no external host sees demonstration traffic, and no
 * provider credential could ever reach a bundle (the chosen provider needs none, and this
 * boundary keeps it that way for any provider that replaces it).
 *
 * Always 200 with a usable rate set. A provider outage is reported in the payload's provenance,
 * not as a status code, because a currency control that fails closed takes the whole surface
 * with it.
 */
import { NextResponse } from 'next/server';
import { getFxRates } from '@/lib/currency/fx-service';
import { CANONICAL_BASE_CURRENCY } from '@/packages/contracts/src/currency-model';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rates = await getFxRates(CANONICAL_BASE_CURRENCY);
  return NextResponse.json(rates, {
    headers: { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600' }
  });
}
