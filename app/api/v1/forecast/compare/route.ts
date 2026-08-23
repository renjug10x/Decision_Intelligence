import { NextRequest, NextResponse } from 'next/server';
import { recommendForecastModel } from '@/lib/forecast/forecast-engine';
import { buildForecastDataset } from '@/lib/forecast/series';

/** CTW-03 model comparison. Measured by rolling-origin backtest on identical folds, never asserted. */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dataset =
      body.dataset || (await buildForecastDataset({ scope: body.scope, measure: body.measure }));
    const result = recommendForecastModel(
      dataset,
      body.horizon || 14,
      body.executed_as_of || new Date().toISOString()
    );
    return NextResponse.json({
      status: 'success',
      service: 'cognix-web-bff',
      domain: 'forecast-comparison',
      data: result,
      disclosures: {
        basis: result.comparison.basis,
        override: 'A recommendation never overrides a chosen model. It is a suggestion with its evidence.'
      }
    });
  } catch (e: any) {
    return NextResponse.json(
      { status: 'error', error: 'BadRequest', message: String(e?.message || 'Comparison failed') },
      { status: 400 }
    );
  }
}
