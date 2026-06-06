import { NextRequest, NextResponse } from 'next/server';
import { generateBriefing } from '@/lib/gemini';
import { getKPISummary, getCategoryPerformance, getSupplyChainAlerts, detectAnomalies, stores } from '@/lib/query-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { apiKey, role, storeId, category } = body;

    const activeStoreId = role === 'store_manager' ? storeId : undefined;
    const activeCategory = role === 'category_manager' ? category : undefined;

    const [kpi, categoryPerf, supplyAlerts, anomalies] = await Promise.all([
      getKPISummary(activeStoreId, activeCategory),
      getCategoryPerformance(activeStoreId, activeCategory),
      getSupplyChainAlerts(activeStoreId, activeCategory),
      detectAnomalies(activeStoreId, activeCategory),
    ]);
    const storeObj = activeStoreId ? stores.find((s: any) => s.store_id === activeStoreId) : undefined;
    const storeName = storeObj ? storeObj.name : undefined;

    const briefing = await generateBriefing({
      kpi,
      anomalies,
      categoryPerf,
      supplyAlerts,
      apiKey,
      role,
      storeName,
      categoryName: activeCategory
    });
    return NextResponse.json(briefing);
  } catch (err: any) {
    console.error('Briefing error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || undefined;
    const storeId = searchParams.get('store') || undefined;
    const category = searchParams.get('category') || undefined;

    const activeStoreId = role === 'store_manager' ? storeId : undefined;
    const activeCategory = role === 'category_manager' ? category : undefined;

    const [kpi, categoryPerf, supplyAlerts, anomalies] = await Promise.all([
      getKPISummary(activeStoreId, activeCategory),
      getCategoryPerformance(activeStoreId, activeCategory),
      getSupplyChainAlerts(activeStoreId, activeCategory),
      detectAnomalies(activeStoreId, activeCategory),
    ]);

    // Return raw data without Gemini (for dashboard load)
    return NextResponse.json({ kpi, categoryPerf, supplyAlerts, anomalies });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
