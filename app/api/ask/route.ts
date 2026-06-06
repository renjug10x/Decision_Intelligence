import { NextRequest, NextResponse } from 'next/server';
import { askNLQ } from '@/lib/gemini';
import { getStorePerformance, getCategoryPerformance, getKPISummary, getUnderperformingSkus, getSupplyChainAlerts } from '@/lib/query-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, role, storeId, category, apiKey } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    // Build data context based on question intent and role
    const dataContext: any = {};

    // Always include KPI summary
    dataContext.kpi_summary = await getKPISummary(role === 'store_manager' ? storeId : undefined);
    dataContext.category_performance = await getCategoryPerformance(storeId);

    // Add store-specific data if relevant
    if (storeId) {
      dataContext.store_performance = await getStorePerformance(storeId);
    }

    // Add category data if relevant
    if (category || question.toLowerCase().includes('sku') || question.toLowerCase().includes('product') || question.toLowerCase().includes('underperform')) {
      dataContext.underperforming_skus = await getUnderperformingSkus(category);
    }

    // Add supply chain if relevant
    if (question.toLowerCase().includes('supply') || question.toLowerCase().includes('deliver') || question.toLowerCase().includes('stock') || question.toLowerCase().includes('waste')) {
      dataContext.supply_alerts = await getSupplyChainAlerts();
    }

    const storeContext = storeId
      ? `Store ID: ${storeId}`
      : undefined;

    const response = await askNLQ({ question, role: role || 'exec', storeContext, dataContext, apiKey });

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('NLQ error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
