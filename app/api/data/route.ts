import { NextRequest, NextResponse } from 'next/server';
import { getKPISummary, getCategoryPerformance, getSupplyChainAlerts, getUnderperformingSkus, getRevenueTrend, getRevenueByRegion, getStorePerformance, detectAnomalies, getSupplyTimeline, getForecastProjections } from '@/lib/query-engine';

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
      case 'forecast': {
        const metric = (searchParams.get('metric') as any) || 'revenue';
        const horizon = Number(searchParams.get('horizon') || 14);
        const model = (searchParams.get('model') as any) || 'arima';
        const promoLift = Number(searchParams.get('promoLift') || 0);
        const cannibalization = Number(searchParams.get('cannibalization') || 0);
        const eventBoost = searchParams.get('eventBoost') || 'none';

        const data = await getForecastProjections({
          storeId: activeStoreId,
          category: activeCategory,
          metric,
          horizon,
          model,
          promoLift,
          cannibalization,
          eventBoost
        });
        return NextResponse.json(data);
      }
      default:
        return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
