// Query Engine — translates structured queries into mock data results
// In production: swap fetchFromMock() for Looker API calls

import stores from '@/data/stores.json';
import products from '@/data/products.json';
import suppliers from '@/data/suppliers.json';
import promotions from '@/data/promotions.json';

// Sales & supply chain loaded lazily (large files)
let _sales: any[] | null = null;
let _sc: any[] | null = null;

async function getSales() {
  if (!_sales) {
    const data = await import('@/data/sales_daily.json');
    _sales = data.default as any[];
  }
  return _sales;
}

async function getSupplyChain() {
  if (!_sc) {
    const data = await import('@/data/supply_chain.json');
    _sc = data.default as any[];
  }
  return _sc;
}

// ── Date helpers ─────────────────────────────────────────────────────────────
/**
 * FM-01 — the window is derived from the data, and the arithmetic is UTC-only.
 *
 * Two recorded defects lived in the three functions this replaces
 * (`COGNIX_FORECAST_MODEL_TRUTH_RECORD.md` §5):
 *
 *   `D-FM-2` — every window was anchored to a hard-coded `new Date('2026-06-04')`. The source's last
 *              day is `2026-06-03`, so every window ended on a day with no rows. That day was then
 *              summed as zero and divided into means, which is the mechanical cause of `D-FM-1`'s
 *              7.14% understatement and of the phantom zero that terminated every sparkline.
 *   `D-FM-3` — `new Date('YYYY-MM-DD')` parses as UTC midnight while `getDate()`/`getDay()` read the
 *              local calendar. West of UTC that is the previous day, which shifted the whole
 *              day-of-week pattern by one.
 *
 * The anchor is now the last day the source actually carries rows for, and no local time is read
 * anywhere on this path.
 */
function addUtcDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86400000).toISOString().slice(0, 10);
}

/** `count` consecutive days ending on `anchor` inclusive, oldest first. */
export function daysEndingAt(anchor: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addUtcDays(anchor, i - (count - 1)));
}

let _coverageAnchor: string | null = null;

/**
 * The last calendar day the demand source holds rows for. Read once from the data itself, so a new
 * dataset moves every window with it and no window can end on a day that does not exist.
 */
export async function getCoverageAnchor(): Promise<string> {
  if (_coverageAnchor === null) {
    const sales = await getSales();
    let latest = '';
    for (const row of sales) if (row.date > latest) latest = row.date;
    _coverageAnchor = latest;
  }
  return _coverageAnchor;
}

export async function getLast7Days(): Promise<string[]> {
  return daysEndingAt(await getCoverageAnchor(), 7);
}

export async function getLast14Days(): Promise<string[]> {
  return daysEndingAt(await getCoverageAnchor(), 14);
}

export async function getPrev7Days(): Promise<string[]> {
  const anchor = await getCoverageAnchor();
  return daysEndingAt(addUtcDays(anchor, -7), 7);
}

// ── KPI summary for dashboard ────────────────────────────────────────────────
export async function getKPISummary(storeId?: string, category?: string) {
  const sales = await getSales();
  const last7  = new Set(await getLast7Days());
  const prev7  = new Set(await getPrev7Days());

  const filter = (s: any, dateSet: Set<string>) =>
    dateSet.has(s.date) &&
    (!storeId || s.store_id === storeId) &&
    (!category || s.category === category);

  const curr = sales.filter(s => filter(s, last7));
  const prev = sales.filter(s => filter(s, prev7));

  const sum = (arr: any[], field: string) => arr.reduce((a, b) => a + (b[field] || 0), 0);
  const avg = (arr: any[], field: string) => arr.length ? sum(arr, field) / arr.length : 0;

  const currRev   = sum(curr, 'revenue');
  const prevRev   = sum(prev, 'revenue');
  const currUnits = sum(curr, 'units_sold');
  const prevUnits = sum(prev, 'units_sold');
  const currWaste = sum(curr, 'waste_units');
  const prevWaste = sum(prev, 'waste_units');
  const currMargin = avg(curr, 'margin_pct');
  const prevMargin = avg(prev, 'margin_pct');

  // Supply chain on-time rate
  const sc = await getSupplyChain();
  const supplierMap = Object.fromEntries(suppliers.map((s: any) => [s.supplier_id, s.category]));
  const scLast7 = sc.filter(d => 
    last7.has(d.date) && 
    (!storeId || d.store_id === storeId) &&
    (!category || supplierMap[d.supplier_id] === category || (category === 'Non-food' && ['Cleaning', 'Paper', 'Health'].includes(supplierMap[d.supplier_id])))
  );
  const onTime = scLast7.filter(d => d.status === 'on_time').length;
  const onTimePct = scLast7.length ? onTime / scLast7.length : 0.92;

  return {
    revenue:      { value: currRev,     prev: prevRev,    wow: prevRev   ? (currRev   - prevRev)   / prevRev   : 0 },
    units:        { value: currUnits,   prev: prevUnits,  wow: prevUnits ? (currUnits - prevUnits) / prevUnits : 0 },
    margin_pct:   { value: currMargin,  prev: prevMargin, wow: prevMargin? (currMargin-prevMargin) / prevMargin: 0 },
    waste_units:  { value: currWaste,   prev: prevWaste,  wow: prevWaste ? (currWaste - prevWaste) / prevWaste : 0 },
    on_time_pct:  { value: onTimePct,   prev: 0.91,       wow: onTimePct - 0.91 },
  };
}

// ── Revenue by day (last 14) for sparklines ──────────────────────────────────
export async function getRevenueTrend(storeId?: string, category?: string) {
  const sales = await getSales();
  const dates = await getLast14Days();
  return dates.map(date => {
    const daySales = sales.filter(s =>
      s.date === date && 
      (!storeId || s.store_id === storeId) &&
      (!category || s.category === category)
    );
    return {
      date,
      revenue: daySales.reduce((a, b) => a + b.revenue, 0),
      units:   daySales.reduce((a, b) => a + b.units_sold, 0),
    };
  });
}

// ── Revenue by region ────────────────────────────────────────────────────────
export async function getRevenueByRegion(category?: string) {
  const sales = await getSales();
  const last7 = new Set(await getLast7Days());
  const storeMap = Object.fromEntries(stores.map((s: any) => [s.store_id, s.region]));
  const byRegion: Record<string, number> = {};
  sales.filter(s => last7.has(s.date) && (!category || s.category === category)).forEach(s => {
    const region = storeMap[s.store_id] || 'Unknown';
    byRegion[region] = (byRegion[region] || 0) + s.revenue;
  });
  return Object.entries(byRegion)
    .map(([region, revenue]) => ({ region, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ── Category performance (last 7 days vs prev 7) ─────────────────────────────
export async function getCategoryPerformance(storeId?: string, category?: string) {
  const sales = await getSales();
  const last7 = new Set(await getLast7Days());
  const prev7 = new Set(await getPrev7Days());

  const aggregate = (dateSet: Set<string>) => {
    const map: Record<string, { revenue: number; units: number; margin: number[]; waste: number }> = {};
    sales.filter(s => 
      dateSet.has(s.date) && 
      (!storeId || s.store_id === storeId) &&
      (!category || s.category === category)
    ).forEach(s => {
      // If category is set, we group by subcategory, otherwise by category
      const key = category ? s.subcategory : s.category;
      if (!map[key]) map[key] = { revenue: 0, units: 0, margin: [], waste: 0 };
      map[key].revenue += s.revenue;
      map[key].units   += s.units_sold;
      map[key].margin.push(s.margin_pct);
      map[key].waste   += s.waste_units;
    });
    return map;
  };

  const curr = aggregate(last7);
  const prev = aggregate(prev7);

  return Object.keys(curr).map(cat => ({
    category:    cat,
    revenue:     curr[cat].revenue,
    units:       curr[cat].units,
    margin_pct:  curr[cat].margin.reduce((a,b)=>a+b,0)/curr[cat].margin.length,
    waste_units: curr[cat].waste,
    revenue_wow: prev[cat] ? (curr[cat].revenue - prev[cat].revenue) / prev[cat].revenue : 0,
  })).sort((a, b) => b.revenue - a.revenue);
}
// ── Underperforming SKUs ─────────────────────────────────────────────────────
export async function getUnderperformingSkus(category?: string, storeId?: string) {
  const sales = await getSales();
  const last7 = new Set(await getLast7Days());
  const prev7 = new Set(await getPrev7Days());
  const prodMap = Object.fromEntries(products.map((p: any) => [p.sku_id, p]));

  const agg = (dateSet: Set<string>) => {
    const map: Record<string, { revenue: number; units: number; margin: number[] }> = {};
    sales.filter(s => 
      dateSet.has(s.date) && 
      (!category || s.category === category) &&
      (!storeId || s.store_id === storeId)
    ).forEach(s => {
      if (!map[s.sku_id]) map[s.sku_id] = { revenue: 0, units: 0, margin: [] };
      map[s.sku_id].revenue += s.revenue;
      map[s.sku_id].units   += s.units_sold;
      map[s.sku_id].margin.push(s.margin_pct);
    });
    return map;
  };

  const curr = agg(last7);
  const prev = agg(prev7);

  return Object.entries(curr)
    .map(([sku_id, c]) => {
      const p = prev[sku_id];
      const margin = c.margin.reduce((a,b)=>a+b,0)/c.margin.length;
      const wow = p ? (c.revenue - p.revenue) / p.revenue : 0;
      return {
        sku_id,
        name:        prodMap[sku_id]?.name || sku_id,
        category:    prodMap[sku_id]?.category || '',
        revenue:     c.revenue,
        units:       c.units,
        margin_pct:  margin,
        revenue_wow: wow,
      };
    })
    .filter(s => s.revenue_wow < -0.05)
    .sort((a, b) => a.revenue_wow - b.revenue_wow)
    .slice(0, 15);
}

// ── Supply chain disruptions ─────────────────────────────────────────────────
export async function getSupplyChainAlerts(storeId?: string, category?: string) {
  const sc = await getSupplyChain();
  const last14 = new Set(await getLast14Days());
  const supplierMap = Object.fromEntries(suppliers.map((s: any) => [s.supplier_id, s.category]));
  
  const recent = sc.filter(d => 
    last14.has(d.date) &&
    (!storeId || d.store_id === storeId) &&
    (!category || supplierMap[d.supplier_id] === category || (category === 'Non-food' && ['Cleaning', 'Paper', 'Health'].includes(supplierMap[d.supplier_id])))
  );

  const bySupplier: Record<string, any> = {};
  recent.forEach(d => {
    const key = d.supplier_id;
    if (!bySupplier[key]) bySupplier[key] = {
      supplier_id: d.supplier_id, supplier_name: d.supplier_name,
      total: 0, delayed: 0, cancelled: 0, total_delay_days: 0,
      affected_stores: new Set<string>(), estimated_impact: 0,
    };
    bySupplier[key].total++;
    if (d.status === 'delayed')   { bySupplier[key].delayed++;   bySupplier[key].total_delay_days += d.delay_days; bySupplier[key].affected_stores.add(d.store_id); bySupplier[key].estimated_impact += (d.expected_qty - d.actual_qty) * 4.5; }
    if (d.status === 'cancelled') { bySupplier[key].cancelled++;  bySupplier[key].affected_stores.add(d.store_id); bySupplier[key].estimated_impact += d.expected_qty * 4.5; }
  });

  return Object.values(bySupplier)
    .map((s: any) => ({
      supplier_id:      s.supplier_id,
      supplier_name:    s.supplier_name,
      delay_rate:       s.total ? (s.delayed + s.cancelled) / s.total : 0,
      delayed_count:    s.delayed,
      cancelled_count:  s.cancelled,
      avg_delay_days:   s.delayed ? s.total_delay_days / s.delayed : 0,
      affected_stores:  s.affected_stores.size,
      estimated_impact: Math.round(s.estimated_impact),
    }))
    .filter(s => s.delay_rate > 0.1)
    .sort((a, b) => b.estimated_impact - a.estimated_impact);
}

// ── Supply chain timeline (last 14 days) ────────────────────────────────────
export async function getSupplyTimeline() {
  const sc = await getSupplyChain();
  const dates = await getLast14Days();
  return dates.map(date => {
    const day = sc.filter(d => d.status && d.date === date);
    const onTime = day.filter(d => d.status === 'on_time').length;
    const delayed = day.filter(d => d.status === 'delayed').length;
    const cancelled = day.filter(d => d.status === 'cancelled').length;
    return { date, on_time: onTime, delayed, cancelled };
  });
}

// ── Anomaly detection ────────────────────────────────────────────────────────
export async function detectAnomalies(
  storeId?: string,
  category?: string,
  wowDeclineThreshold: number = 10,
  wasteSpikeThreshold: number = 15,
  role?: string
) {
  const sales = await getSales();
  const sc    = await getSupplyChain();
  const last7  = new Set(await getLast7Days());
  const prev7  = new Set(await getPrev7Days());
  const last14 = new Set(await getLast14Days());

  const alerts = [];

  // 1. Manchester store drop
  const manchStores = ['S001','S002','S003'];
  if (!storeId || manchStores.includes(storeId)) {
    if (!category || ['Chilled', 'Dairy', 'Produce'].includes(category)) {
      const filterSales = (arr: any[]) => arr.filter(s => 
        manchStores.includes(s.store_id) && 
        (!storeId || s.store_id === storeId) &&
        (!category || s.category === category)
      );
      const manchCurr = filterSales(sales.filter(s => last7.has(s.date))).reduce((a,b)=>a+b.revenue,0);
      const manchPrev = filterSales(sales.filter(s => prev7.has(s.date))).reduce((a,b)=>a+b.revenue,0);
      const decline = manchPrev > 0 ? (manchCurr - manchPrev) / manchPrev : 0;
      
      // Compare with the configurable threshold (which is positive, e.g. 10 for 10% decline)
      if (manchPrev > 0 && decline < -(wowDeclineThreshold / 100)) {
        alerts.push({ 
          id:'A001', 
          severity:'high', 
          type:'sales', 
          title: storeId ? 'Store revenue decline' : 'Manchester stores underperforming', 
          description:`Revenue down ${Math.abs(Math.round(decline*100))}% vs prior week ${storeId ? 'in this store' : 'across 3 Manchester stores'}${category ? ` for ${category}` : ''}`, 
          impact_value: Math.round(manchPrev - manchCurr), 
          impact_label:'Revenue Gap £', 
          stores: storeId ? [storeId] : manchStores,
          confidence: 78 // AI Anomaly detection confidence score
        });
      }
    }
  }

  // 2. FreshDirect supply disruption
  if (!category || category === 'Produce') {
    const fd = sc.filter(d => last14.has(d.date) && d.supplier_id === 'SUP009' && (!storeId || d.store_id === storeId));
    if (fd.length > 0) {
      const fdDelayed = fd.filter(d => d.status !== 'on_time').length;
      const fdRate = fd.length ? fdDelayed / fd.length : 0;
      if (fdRate > 0.3) {
        const impact = fd.filter(d=>d.status!=='on_time').reduce((a,b)=>a+(b.expected_qty-b.actual_qty)*4.5,0);
        alerts.push({ 
          id:'A002', 
          severity:'high', 
          type:'supply', 
          title:'FreshDirect UK delivery failures', 
          description:`${Math.round(fdRate*100)}% of Produce deliveries delayed or cancelled in last 14 days — ${fd.filter(d=>d.status!=='on_time').length} events`, 
          impact_value: Math.round(impact), 
          impact_label:'Est. Impact £', 
          stores: storeId ? [storeId] : [],
          confidence: 85 // AI Anomaly detection confidence score
        });
      }
    }
  }

  // 3. Dairy margin compression
  const nwStores = ['S001','S002','S003','S004','S005'];
  if (!storeId || nwStores.includes(storeId)) {
    if (!category || category === 'Dairy') {
      const dairyCurr = sales.filter(s => last7.has(s.date) && s.category === 'Dairy' && nwStores.includes(s.store_id) && (!storeId || s.store_id === storeId));
      const avgDairyM = dairyCurr.reduce((a,b)=>a+b.margin_pct,0) / (dairyCurr.length||1);
      if (avgDairyM < 0.31) {
        alerts.push({ 
          id:'A003', 
          severity:'medium', 
          type:'margin', 
          title: storeId ? 'Dairy margin compression' : 'Dairy margin compression — North West', 
          description:`Average margin ${(avgDairyM*100).toFixed(1)}% vs 33.5% forecast — ${(0.335-avgDairyM)*100 > 0 ? '-' : '+'}${Math.abs((0.335-avgDairyM)*100).toFixed(1)}pp gap`, 
          impact_value: Math.round(dairyCurr.reduce((a,b)=>a+b.revenue,0)*(0.335-avgDairyM)), 
          impact_label:'Margin Gap £', 
          stores: storeId ? [storeId] : nwStores,
          confidence: 58 // AI Anomaly detection confidence score
        });
      }
    }
  }

  // 4. Produce waste spike
  if (!category || category === 'Produce') {
    const produceCurr = sales.filter(s => last7.has(s.date) && s.category === 'Produce' && (!storeId || s.store_id === storeId)).reduce((a,b)=>a+b.waste_units,0);
    const producePrev = sales.filter(s => prev7.has(s.date) && s.category === 'Produce' && (!storeId || s.store_id === storeId)).reduce((a,b)=>a+b.waste_units,0);
    const spike = producePrev > 0 ? (produceCurr - producePrev) / producePrev : 0;
    
    // Compare with the configurable threshold (positive, e.g. 15 for 15% spike)
    if (producePrev > 0 && spike > (wasteSpikeThreshold / 100)) {
      alerts.push({ 
        id:'A004', 
        severity:'medium', 
        type:'waste', 
        title: storeId ? 'Produce waste spike' : 'Produce waste spike — all regions', 
        description:`Waste up ${Math.round(spike*100)}% vs prior week. Linked to FreshDirect delivery delays.`, 
        impact_value: Math.round(produceCurr * 1.2), 
        impact_label:'Waste Units', 
        stores: storeId ? [storeId] : [],
        confidence: 72 // AI Anomaly detection confidence score
      });
    }
  }

  // 5. Labour optimisation
  if (role === 'store_manager' && storeId) {
    alerts.push({
      id: 'A005',
      severity: 'medium',
      type: 'labour',
      title: 'Checkout Queue Build-up Risk',
      description: 'Projected footfall spike between 17:00-19:00. Current scheduled till staff is 2 below optimal.',
      impact_value: 450,
      impact_label: 'Est. Lost Sales £',
      stores: [storeId],
      confidence: 82
    });
  }

  return alerts;
}

// ── Store performance for copilot ────────────────────────────────────────────
export async function getStorePerformance(storeId: string) {
  const sales = await getSales();
  const last7 = new Set(await getLast7Days());
  const prev7 = new Set(await getPrev7Days());

  const curr = sales.filter(s => last7.has(s.date) && s.store_id === storeId);
  const prev = sales.filter(s => prev7.has(s.date) && s.store_id === storeId);

  const sum  = (arr: any[], f: string) => arr.reduce((a,b)=>a+(b[f]||0),0);
  const avg  = (arr: any[], f: string) => arr.length ? sum(arr,f)/arr.length : 0;

  // Revenue by day
  const trend = (await getLast7Days()).map(date => ({
    date,
    revenue: sales.filter(s=>s.date===date&&s.store_id===storeId).reduce((a,b)=>a+b.revenue,0),
  }));

  // Category breakdown
  const catMap: Record<string,{rev:number,units:number}> = {};
  curr.forEach(s => {
    if (!catMap[s.category]) catMap[s.category]={rev:0,units:0};
    catMap[s.category].rev   += s.revenue;
    catMap[s.category].units += s.units_sold;
  });

  return {
    store: stores.find((s:any) => s.store_id === storeId),
    kpi: {
      revenue:     { value: sum(curr,'revenue'),    wow: prev.length?(sum(curr,'revenue')-sum(prev,'revenue'))/sum(prev,'revenue'):0 },
      units:       { value: sum(curr,'units_sold'), wow: prev.length?(sum(curr,'units_sold')-sum(prev,'units_sold'))/sum(prev,'units_sold'):0 },
      margin_pct:  { value: avg(curr,'margin_pct'), wow: prev.length?(avg(curr,'margin_pct')-avg(prev,'margin_pct'))/avg(prev,'margin_pct'):0 },
      waste_units: { value: sum(curr,'waste_units'),wow: prev.length?(sum(curr,'waste_units')-sum(prev,'waste_units'))/sum(prev,'waste_units'):0 },
    },
    trend,
    categories: Object.entries(catMap).map(([cat,v])=>({category:cat,revenue:v.rev,units:v.units})).sort((a,b)=>b.revenue-a.revenue),
  };
}

/**
 * `getForecastProjections` and `getFutureDays` were removed by `FM-01`.
 *
 * They were the last forecasting path in CogniX that fitted nothing. A `model` parameter chose among
 * three closed-form curves over a loop index — `arima`, `baseline` and any unrecognised string all
 * reached the same branch and returned identical totals — over a fourteen-day mean whose denominator
 * included a day with no rows. Demand & Forecast now consumes the same governed boundary as the
 * Continuous Live Decision Twin: `lib/demand-forecast.ts` → `lib/forecast/forecast-engine.ts`, via
 * `POST /api/v1/demand/forecast`.
 *
 * Nothing translates the old wire values. `arima`, `prophet` and `genai` are refused at the boundary
 * exactly as any other unregistered name is, which is the whole point of the registry.
 */

export { stores, products, suppliers, promotions };
