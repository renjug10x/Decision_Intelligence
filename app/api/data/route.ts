import { NextRequest, NextResponse } from 'next/server';
import { getKPISummary, getCategoryPerformance, getSupplyChainAlerts, getUnderperformingSkus, getRevenueTrend, getRevenueByRegion, getStorePerformance, detectAnomalies, getSupplyTimeline } from '@/lib/query-engine';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type    = searchParams.get('type') || 'dashboard';
  const storeId = searchParams.get('store') || undefined;
  const category = searchParams.get('category') || undefined;
  const role    = searchParams.get('role') || undefined;

  // Threshold adjustments from Control Centre
  const wowDeclineThreshold = Number(searchParams.get('wowDeclineThreshold') || '10');
  const wasteSpikeThreshold = Number(searchParams.get('wasteSpikeThreshold') || '15');

  // Looker sandbox RLS attribute overrides
  const attributeStoreScope = searchParams.get('attributeStoreScope') || 'All';
  const attributeCategoryScope = searchParams.get('attributeCategoryScope') || 'All';

  let activeStoreId = role === 'store_manager' ? storeId : undefined;
  if (attributeStoreScope !== 'All') {
    activeStoreId = attributeStoreScope;
  }

  let activeCategory = role === 'category_manager' ? category : undefined;
  if (attributeCategoryScope !== 'All') {
    activeCategory = attributeCategoryScope;
  }

  try {
    switch (type) {
      case 'dashboard': {
        const [kpi, trend, regionRevenue, categoryPerf, alerts, anomalies] = await Promise.all([
          getKPISummary(activeStoreId, activeCategory),
          getRevenueTrend(activeStoreId, activeCategory),
          getRevenueByRegion(activeCategory),
          getCategoryPerformance(activeStoreId, activeCategory),
          getSupplyChainAlerts(activeStoreId, activeCategory),
          detectAnomalies(activeStoreId, activeCategory, wowDeclineThreshold, wasteSpikeThreshold, role),
        ]);
        return NextResponse.json({ kpi, trend, regionRevenue, categoryPerf, alerts, anomalies });
      }
      case 'store': {
        if (!storeId) return NextResponse.json({ error: 'store param required' }, { status: 400 });
        const data = await getStorePerformance(storeId);
        return NextResponse.json(data);
      }
      case 'category': {
        const [skus, categoryPerf] = await Promise.all([
          getUnderperformingSkus(category, activeStoreId),
          getCategoryPerformance(activeStoreId, category),
        ]);
        return NextResponse.json({ skus, categoryPerf });
      }
      case 'supply': {
        const [alerts, timeline] = await Promise.all([
          getSupplyChainAlerts(activeStoreId, activeCategory),
          getSupplyTimeline(),
        ]);
        return NextResponse.json({ alerts, timeline });
      }
      /**
       * FM-01 — `type=forecast` was retired here, not relocated.
       *
       * It carried a `model` parameter whose three values named no implementation, and whose default
       * silently served the same branch as an unrecognised string — the evidence is in
       * `docs/governance/COGNIX_FORECAST_MODEL_TRUTH_RECORD.md` §1 and §3. Demand & Forecast now
       * posts to the governed boundary, which refuses a model it cannot execute. This case answers
       * rather than 404s, so a stale client is told what happened instead of handed an empty body.
       */
      case 'forecast':
        return NextResponse.json(
          {
            error: 'FORECAST_PATH_RETIRED',
            message:
              'The legacy projection path was retired by FM-01. Demand projections come from the ' +
              'governed forecast boundary at POST /api/v1/demand/forecast, where the model named on ' +
              'the result is the implementation that produced it.',
            replacement: 'POST /api/v1/demand/forecast'
          },
          { status: 410 }
        );
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
