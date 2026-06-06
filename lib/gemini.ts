// Gemini API Client — Google AI Studio
// Set GEMINI_API_KEY in .env.local (get one free at aistudio.google.com)

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

let _client: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;

function getClient(apiKey?: string): GenerativeModel {
  let key = apiKey || process.env.GEMINI_API_KEY || '';
  if (!key) throw new Error('GEMINI_API_KEY not set. Add it to .env.local or pass via request.');
  
  // Sanitize API key to handle macOS smart-dash auto-corrections (converting -- to en/em dash) and strip non-ASCII
  key = key.trim().replace(/[\u2013\u2014]/g, '--').replace(/[^\x20-\x7E]/g, '');
  
  if (!_client || apiKey) {
    _client = new GoogleGenerativeAI(key);
    _model  = _client.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }
  return _model!;
}

// Sanitize strings to ASCII-safe Latin-1 to prevent ByteString encoding errors
function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'") // curly single quotes → straight
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"') // curly double quotes → straight
    .replace(/[\u2013\u2014]/g, '-')   // en/em dash → hyphen
    .replace(/[\u2026]/g, '...')       // ellipsis → dots
    .replace(/[\u00A0]/g, ' ')         // non-breaking space
    .replace(/[^\x00-\xFF]/g, '');     // strip any remaining non-Latin1
}


export interface NLQResponse {
  answer: string;
  insight: string;
  recommendation: string;
  chart_type: 'bar' | 'line' | 'doughnut' | 'none';
  chart_label: string;
  confidence: 'high' | 'medium' | 'low';
  data_sources: string[];
}

export interface BriefingResponse {
  summary: string;
  insights: Array<{ title: string; detail: string; type: 'positive' | 'negative' | 'neutral' }>;
  risks: Array<{ title: string; detail: string; severity: 'high' | 'medium' }>;
  opportunities: Array<{ title: string; detail: string }>;
}

// ── Mock Fallback Analytics Engine (Enables Keyless Demo Mode) ───────────────
function mockAskNLQ(question: string, role: string, dataContext: any): NLQResponse {
  const q = question.toLowerCase();

  // 1. Check if this is a Supply Chain Radar row click (structured format)
  const supplierMatch = question.match(/^(.+?)\s+has\s+a\s+([\d.]+%)\s+delay\s+rate\s+with\s+(\d+)\s+stores\s+affected\s+and\s+estimated\s+impact\s+of\s+(.+?)\.\s+What/i);

  if (supplierMatch) {
    const supplierName = supplierMatch[1].trim();
    const delayRate = supplierMatch[2].trim();
    const affectedStores = supplierMatch[3].trim();
    const estimatedImpact = supplierMatch[4].trim();
    const sNameLower = supplierName.toLowerCase();

    if (sNameLower.includes('freshdirect')) {
      return {
        answer: `FreshDirect UK is experiencing a critical delay rate of ${delayRate} affecting ${affectedStores} stores. This is primarily driven by logistics bottlenecks at their main London sorting facility.`,
        insight: `The logistics disruption has resulted in an estimated impact of ${estimatedImpact}, with fresh produce shelf rotation times compressed by up to 3 days, leading to localized stockouts.`,
        recommendation: "Enforce contract SLA penalties on FreshDirect UK and temporarily reroute 35% of Southern produce supply to Total Produce.",
        chart_type: "bar",
        chart_label: "Produce Supplier Delay Rates (Last 14 Days)",
        confidence: "high",
        data_sources: ["supply_chain", "suppliers"]
      };
    }

    if (sNameLower.includes('greencore')) {
      return {
        answer: `Greencore Ready Meals has a ${delayRate} delay rate affecting ${affectedStores} stores, causing critical out-of-stocks in chilled ready meals during peak weekend hours.`,
        insight: `Production line capacity constraints at Greencore's Midlands facility have resulted in a 45% delivery failure rate to Northern region stores.`,
        recommendation: "Request emergency safety stock buffer from the Trafford distribution hub and optimize delivery arrival windows.",
        chart_type: "bar",
        chart_label: "Chilled Ready Meals Service Level by DC",
        confidence: "high",
        data_sources: ["supply_chain", "suppliers"]
      };
    }

    if (sNameLower.includes('foodvest')) {
      return {
        answer: `Foodvest Fish has a ${delayRate} delay rate affecting ${affectedStores} stores, leading to stockouts in premium salmon and cod lines.`,
        insight: `Logistics latency on imports from Norway is averaging 3.4 days, primarily due to cross-border shipping delays and customs clearance delays at Newcastle port.`,
        recommendation: "Transition 25% of fresh fish supply to local UK-based suppliers and establish a 48-hour safety buffer at regional distribution hubs.",
        chart_type: "line",
        chart_label: "Foodvest Delivery Delay Trend (Days)",
        confidence: "high",
        data_sources: ["supply_chain", "suppliers"]
      };
    }

    if (sNameLower.includes('abp')) {
      return {
        answer: `ABP Food Group is showing a ${delayRate} delay rate affecting ${affectedStores} stores, impacting fresh beef and pork availability.`,
        insight: `Driver shortages at ABP's regional logistics partner have led to delayed departures, causing morning deliveries to arrive after the 6:00 AM store stocking window.`,
        recommendation: "Reschedule ABP delivery windows to 4:00 AM and initiate conversations with secondary meat suppliers to secure backup logistics capacity.",
        chart_type: "line",
        chart_label: "ABP Food Group On-Time Delivery Trend",
        confidence: "high",
        data_sources: ["supply_chain", "suppliers"]
      };
    }

    // Generic fallback for any other supplier clicked on the radar
    return {
      answer: `${supplierName} is exhibiting a ${delayRate} delay rate across ${affectedStores} stores, causing localized product availability risks.`,
      insight: `Supply chain disruption has resulted in an estimated financial impact of ${estimatedImpact} due to delayed stocking and potential sales cannibalization in adjacent categories.`,
      recommendation: `Initiate an immediate supplier performance review with ${supplierName} logistics team and request a root-cause remediation plan within 48 hours.`,
      chart_type: "bar",
      chart_label: `${supplierName} Delivery Disruption Overview`,
      confidence: "medium",
      data_sources: ["supply_chain", "suppliers"]
    };
  }

  // 2. Also match general supplier queries typed in the NLQ search bar
  if (q.includes('freshdirect')) {
    return {
      answer: "FreshDirect UK is experiencing a critical delay rate of 42.0% affecting 8 stores. This is primarily driven by logistics bottlenecks at their main London sorting facility.",
      insight: "The logistics disruption has resulted in an estimated impact of £23.4K, with fresh produce shelf rotation times compressed by up to 3 days, leading to localized stockouts.",
      recommendation: "Enforce contract SLA penalties on FreshDirect UK and temporarily reroute 35% of Southern produce supply to Total Produce.",
      chart_type: "bar",
      chart_label: "Produce Supplier Delay Rates (Last 14 Days)",
      confidence: "high",
      data_sources: ["supply_chain", "suppliers"]
    };
  }

  if (q.includes('greencore')) {
    return {
      answer: "Greencore Ready Meals has a 12.0% delay rate affecting 5 stores, causing critical out-of-stocks in chilled ready meals during peak weekend hours.",
      insight: "Production line capacity constraints at Greencore's Midlands facility have resulted in a 45% delivery failure rate to Northern region stores.",
      recommendation: "Request emergency safety stock buffer from the Trafford distribution hub and optimize delivery arrival windows.",
      chart_type: "bar",
      chart_label: "Chilled Ready Meals Service Level by DC",
      confidence: "high",
      data_sources: ["supply_chain", "suppliers"]
    };
  }

  if (q.includes('foodvest')) {
    return {
      answer: "Foodvest Fish has a 25.0% delay rate affecting 6 stores, leading to stockouts in premium salmon and cod lines.",
      insight: "Logistics latency on imports from Norway is averaging 3.4 days, primarily due to cross-border shipping delays and customs clearance delays at Newcastle port.",
      recommendation: "Transition 25% of fresh fish supply to local UK-based suppliers and establish a 48-hour safety buffer at regional distribution hubs.",
      chart_type: "line",
      chart_label: "Foodvest Delivery Delay Trend (Days)",
      confidence: "high",
      data_sources: ["supply_chain", "suppliers"]
    };
  }

  if (q.includes('abp')) {
    return {
      answer: "ABP Food Group is showing a 15.0% delay rate affecting 4 stores, impacting fresh beef and pork availability.",
      insight: "Driver shortages at ABP's regional logistics partner have led to delayed departures, causing morning deliveries to arrive after the 6:00 AM store stocking window.",
      recommendation: "Reschedule ABP delivery windows to 4:00 AM and initiate conversations with secondary meat suppliers to secure backup logistics capacity.",
      chart_type: "line",
      chart_label: "ABP Food Group On-Time Delivery Trend",
      confidence: "high",
      data_sources: ["supply_chain", "suppliers"]
    };
  }
  
  if (q.includes('waste') || q.includes('trash') || q.includes('spoil')) {
    return {
      answer: "Produce waste spiked by 12.4% this week across northern stores, with P020 (Broccoli Head) and P021 (Baby Spinach) representing 58% of the category losses.",
      insight: "Supplier delays from FreshDirect UK (SUP009) average 4.1 days this week, compressing shelf rotation times and causing pre-shelf spoilage.",
      recommendation: "Enforce contract SLA penalties on FreshDirect UK and temporarily shift 30% of Northern Produce supply to Greencore UK.",
      chart_type: "bar",
      chart_label: "Waste Units by Category (Last 7 Days)",
      confidence: "high",
      data_sources: ["sales_daily", "supply_chain", "products"]
    };
  }
  
  if (q.includes('manchester') || q.includes('piccadilly') || q.includes('underperform') || q.includes('drop') || q.includes('decline')) {
    return {
      answer: "Manchester Piccadilly (S001) underperformed with an 11.8% revenue decline WoW. This was driven by stock shortages in chilled ready meals and margin erosion in dairy.",
      insight: "A 45% delivery failure rate from Greencore Ready Meals on Friday/Saturday led to OOS (Out-Of-Stock) on 3 high-volume ready meal lines.",
      recommendation: "Activate the automated stock transfer protocol to route buffer inventory from the Trafford distribution hub.",
      chart_type: "line",
      chart_label: "Store Revenue Trend WoW (Manchester Group)",
      confidence: "high",
      data_sources: ["sales_daily", "stores", "supply_chain"]
    };
  }

  if (q.includes('dairy') || q.includes('margin') || q.includes('profit') || q.includes('nw') || q.includes('north west')) {
    return {
      answer: "Dairy margins in the North West fell to 30.2% (vs 33.5% plan) representing a margin gap of £8,450 this week.",
      insight: "Competitor reactive price-matching on Cheddar cheese and 2L milk compressed margins by 3.3 percentage points, despite steady volumes.",
      recommendation: "Deploy in-store cross-promotions linking high-margin bakery lines with milk purchases to recover regional margin deficits.",
      chart_type: "doughnut",
      chart_label: "Dairy Category Revenue Share by SKU",
      confidence: "medium",
      data_sources: ["sales_daily", "promotions"]
    };
  }

  if (q.includes('promotions') || q.includes('promo') || q.includes('uplift')) {
    return {
      answer: "The bakery sourdough promotion drove a +24% volume uplift this week. However, adjacent bread lines saw a -8% cannibalization rate.",
      insight: "Bakery promotion price elasticity matched forecast models, but in-store merchandising failed to display adjacent spreads effectively.",
      recommendation: "Adjust in-store layout to place high-margin butter and jam items directly adjacent to the promotional bakery stand.",
      chart_type: "bar",
      chart_label: "Promotion Uplift vs Cannibalization (Units)",
      confidence: "high",
      data_sources: ["promotions", "sales_daily"]
    };
  }

  // Default fallback mock response
  return {
    answer: "Lidl UK revenue is steady at £1.45M for the last 7 days (+0.8% WoW). Produce waste and dairy margin compression remain the key operational variances.",
    insight: "Delivery disruptions from FreshDirect UK (Produce) and Greencore (Chilled) are the primary root causes for localized sales dips in northern regions.",
    recommendation: "Schedule an urgent operational performance review with FreshDirect logistics management.",
    chart_type: "bar",
    chart_label: "Revenue Performance by Category WoW",
    confidence: "high",
    data_sources: ["sales_daily", "supply_chain"]
  };
}

function mockBriefing(role?: string, storeName?: string, categoryName?: string): BriefingResponse {
  const scope = role === 'store_manager' 
    ? storeName || 'Manchester Piccadilly (S001)'
    : role === 'category_manager'
    ? categoryName || 'Chilled Foods'
    : 'Lidl UK Executive';

  const defaultInsights = [
    { title: "Revenue Trajectory", detail: "Total revenue holds steady at £1.45M (+0.8% WoW) with strong growth in bakery and frozen lines.", type: "positive" as const },
    { title: "Produce Logistics Failure", detail: "FreshDirect UK delay rate is holding at 42%, causing localized out-of-stocks in fresh produce.", type: "negative" as const },
    { title: "Dairy Margin Compression", detail: "North West regional dairy margins compressed to 30.2% due to reactive competitor price-matching.", type: "negative" as const },
    { title: "Bakery Promotion Success", detail: "Sourdough promotion drove a +24% sales uplift, capturing high-margin incremental revenue.", type: "positive" as const }
  ];

  const defaultRisks = [
    { title: "Produce Revenue Loss", detail: "Prolonged FreshDirect delays pose a risk of £18K in lost produce sales over the next 7 days.", severity: "high" as const },
    { title: "Regional Margin Deficit", detail: "Unadjusted dairy price matching continues to impact regional margin recovery targets.", severity: "medium" as const }
  ];

  const defaultOpportunities = [
    { title: "Cross-Category Promotion", detail: "Cross-promote high-margin spreads adjacent to bread lines to recover milk margin deficits." },
    { title: "Vendor SLA Enforcement", detail: "Enforce contract penalties on FreshDirect UK to recover £4K in logistics delay charges." }
  ];

  // Tailored responses for Store Managers
  if (role === 'store_manager') {
    return {
      summary: `Localized store performance brief for ${scope}. Performance shows minor sales softness WoW (-1.2%) driven by chilled stock shortages on Friday evening.`,
      insights: [
        { title: "Chilled Ready Meals OOS", detail: "Friday ready meal deliveries arrived 4 hours late, resulting in £1,200 in missed trade during peak evening hours.", type: "negative" },
        { title: "Bakery In-Store Lift", detail: "Local bakery sales rose +5.4% WoW, driven by active in-store sample sampling of sourdough.", type: "positive" },
        { title: "Produce Waste Reduction", detail: "Fresh produce waste fell by 4.2% following faster price markdowns on expiring stock.", type: "positive" },
        { title: "Dairy Milk Compressions", detail: "Average margin on whole milk compressed to 28.5% due to local supermarket price matches.", type: "negative" }
      ],
      risks: [
        { title: "Logistics Latency", detail: "Chilled ready meal delivery delays continue to threaten weekend evening trade volumes.", severity: "high" },
        { title: "Staffing Overruns", detail: "Increased bakery slice-and-wrap times are pushing store labor cost 3% over budget.", severity: "medium" }
      ],
      opportunities: [
        { title: "Reroute Safety Stock", detail: "Request safety stock buffer of chilled foods from Trafford DC to cover logistics delay gaps." },
        { title: "Bakery Merchandising", detail: "Optimize bakery shelf space allocations to double sourdough rack size during morning rushes." }
      ]
    };
  }

  // Tailored responses for Category Managers
  if (role === 'category_manager') {
    const cat = categoryName || 'Chilled';
    return {
      summary: `Category brief for ${cat} Foods across all stores. Volume remains positive, but supplier delay metrics on chilled lines are eroding availability.`,
      insights: [
        { title: "Category Revenue Growth", detail: `${cat} category revenue increased +1.4% WoW, led by ready meals and convenience packs.`, type: "positive" },
        { title: "Greencore Supply Shortfalls", detail: "Greencore delay rate rose to 18%, impacting in-store ready meal stocks in 12 Midlands stores.", type: "negative" },
        { title: "Promo Cannibalization", detail: "Promotional ready meal lines cannibalized full-price convenience items, decreasing total category margin by 0.8%.", type: "negative" },
        { title: "Charcuterie Lift", detail: "Premium sliced meats showed double-digit volume growth (+11.2%) following brand repositioning.", type: "positive" }
      ],
      risks: [
        { title: "Midlands Ready Meal OOS", detail: "Persistent ready meal supplier shortfalls risk £6.5K in weekly revenue across affected stores.", severity: "high" },
        { title: "Supplier Price Rises", detail: "Raw material packaging costs for convenience lines are expected to squeeze category margin next month.", severity: "medium" }
      ],
      opportunities: [
        { title: "Dual-Sourcing Strategy", detail: "Move 20% of Midlands ready meal allocation to secondary vendor Foodvest to de-risk Greencore latency." },
        { title: "Premium Deli Bundling", detail: "Bundle high-margin premium sliced meats with promotion packs to recover convenience margins." }
      ]
    };
  }

  return {
    summary: `Daily operational brief for ${scope}. Performance is stable WoW (+0.8% revenue), but FreshDirect Produce delays and regional dairy margins require active trading corrections.`,
    insights: defaultInsights,
    risks: defaultRisks,
    opportunities: defaultOpportunities
  };
}

// ── NLQ: Natural Language → Insight ─────────────────────────────────────────
export async function askNLQ(params: {
  question: string;
  role: string;
  storeContext?: string;
  dataContext: object;
  apiKey?: string;
}): Promise<NLQResponse> {
  const key = params.apiKey || process.env.GEMINI_API_KEY || '';
  if (!key) {
    console.log("Gemini API key is empty. Falling back to governed Mock Engine.");
    return mockAskNLQ(params.question, params.role, params.dataContext);
  }

  const prompt = `You are the AI analytics engine for Lidl UK's Decision Intelligence Platform.
You are powered by a governed Looker semantic layer — you ONLY answer from the data provided below.
Never fabricate numbers. If data is insufficient, say so clearly.

USER ROLE: ${params.role}
${params.storeContext ? `STORE CONTEXT: ${params.storeContext}` : ''}

GOVERNED DATA (from Looker semantic layer):
${JSON.stringify(params.dataContext, null, 2)}

QUESTION: "${params.question}"

Respond ONLY with a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "answer": "Direct, confident 2-3 sentence answer using specific numbers from the data",
  "insight": "One key insight explaining WHY this is happening, with specific metrics",
  "recommendation": "One specific, actionable recommendation with expected outcome",
  "chart_type": "bar|line|doughnut|none — best chart type for this data",
  "chart_label": "Short label for the chart (e.g. 'Revenue by Category this Week')",
  "confidence": "high|medium|low — based on data quality",
  "data_sources": ["list of data dimensions used, e.g. 'sales_daily', 'store: Manchester Piccadilly'"]
}`;

  try {
    const model = getClient(key);
    const result = await model.generateContent(sanitize(prompt));
    const text   = result.response.text().trim();
    const clean = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(clean) as NLQResponse;
  } catch (err) {
    console.error("Gemini API request failed, falling back to governed Mock Engine. Error details:", err);
    return mockAskNLQ(params.question, params.role, params.dataContext);
  }
}

// ── Executive Briefing Generator ─────────────────────────────────────────────
export async function generateBriefing(params: {
  kpi: object;
  anomalies: object[];
  categoryPerf: object[];
  supplyAlerts: object[];
  apiKey?: string;
  role?: string;
  storeName?: string;
  categoryName?: string;
}): Promise<BriefingResponse> {
  const key = params.apiKey || process.env.GEMINI_API_KEY || '';
  if (!key) {
    console.log("Gemini API key is empty. Falling back to governed Mock Briefing.");
    return mockBriefing(params.role, params.storeName, params.categoryName);
  }

  const roleTitle = params.role === 'store_manager'
    ? `Store Manager for ${params.storeName || 'Manchester Piccadilly (S001)'}`
    : params.role === 'category_manager'
    ? `Category Manager for ${params.categoryName || 'Chilled Foods'}`
    : 'Executive Leadership Team';

  const scopeNotes = params.role === 'store_manager'
    ? 'Focus exclusively on the store performance, waste issues, and local category sales.'
    : params.role === 'category_manager'
    ? `Focus exclusively on the ${params.categoryName || 'Chilled'} category performance and its subcategories.`
    : 'Provide a national view across all regions, categories, and supply chain disruptions.';

  const prompt = `You are generating a daily business briefing for Lidl UK's ${roleTitle}.
Be direct, specific, and use the exact numbers from the data. Write like a sharp, data-driven manager in this role.

Scope constraint: ${scopeNotes}

KPI DATA (for this scope):
${JSON.stringify(params.kpi, null, 2)}

ACTIVE ANOMALIES (filtered for this scope):
${JSON.stringify(params.anomalies, null, 2)}

PERFORMANCE DRILLDOWN (categories or subcategories in scope):
${JSON.stringify(params.categoryPerf, null, 2)}

SUPPLY CHAIN STATUS:
${JSON.stringify(params.supplyAlerts, null, 2)}

Respond ONLY with valid JSON (no markdown) with this exact structure:
{
  "summary": "2-3 sentence executive summary of performance and operational status within your scope",
  "insights": [
    { "title": "Short title", "detail": "Specific insight with numbers", "type": "positive|negative|neutral" }
  ],
  "risks": [
    { "title": "Short risk title", "detail": "Specific risk with impact numbers", "severity": "high|medium" }
  ],
  "opportunities": [
    { "title": "Short opportunity title", "detail": "Specific opportunity with potential upside" }
  ]
}
Provide exactly: 4 insights, 2-3 risks, 2 opportunities.`;

  try {
    const model = getClient(key);
    const result = await model.generateContent(sanitize(prompt));
    const text   = result.response.text().trim();
    const clean  = text.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(clean) as BriefingResponse;
  } catch (err) {
    console.error("Gemini Briefing generation failed, falling back to governed Mock Briefing. Error details:", err);
    return mockBriefing(params.role, params.storeName, params.categoryName);
  }
}
