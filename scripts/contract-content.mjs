/** Shared contract body text for PDF generation — mirrors public HTML documents */

export const CONTRACTS = [
  {
    id: 'CTR-FD-2024-001',
    title: 'Fresh Produce Supply Agreement — Southern Region',
    ref: 'LIDL-UK/SUP/2024/FD-001',
    supplier: 'FreshDirect UK Ltd',
    supplierId: 'SUP009',
    category: 'Produce',
    value: '£4,200,000 per annum',
    effective: '1 April 2024 — 31 March 2027',
    pages: 14,
    sections: [
      { heading: '1. PARTIES AND INTERPRETATION', lines: [
        '1.1 This Agreement is between Lidl Great Britain Limited ("Buyer") and FreshDirect UK Ltd, registered in England (Company No. 08472941), whose registered office is at Unit 12, London Gateway Logistics Park, Essex ("Supplier").',
        '1.2 "Products" means fresh fruit, vegetables, salad leaves, and associated produce categories as listed in Schedule A.',
        '1.3 "Southern Region" means the stores listed in Schedule B, comprising eight (8) retail locations in South West and South East England.',
        '1.4 "Delivery Cycle" means the weekly replenishment schedule agreed in the Delivery Programme (Schedule C).',
        '1.5 "Business Day" means any day other than Saturday, Sunday, or public holiday in England.',
      ]},
      { heading: '2. TERM AND TERRITORY', lines: [
        '2.1 The Agreement commences on 1 April 2024 and continues until 31 March 2027 unless terminated earlier in accordance with Clause 9.',
        '2.2 The Supplier shall supply Products exclusively to the Southern Region stores specified in Schedule B. National or cross-regional supply requires prior written consent.',
        '2.3 The Supplier warrants that it holds all necessary licences for the handling and distribution of fresh produce within the United Kingdom.',
      ]},
      { heading: '3. COMMERCIAL TERMS', lines: [
        '3.1 Estimated annual contract value: £4,200,000 excluding VAT, based on forecast volume of 2.1 million units per annum.',
        '3.2 Pricing is fixed for the first 12 months per the Price List (Schedule D). Subsequent adjustments limited to 3% per annum or CPI (Fresh Produce), whichever is lower.',
        '3.3 Payment terms: 30 days from date of invoice, subject to receipt of compliant delivery documentation and quality certificates.',
        '3.4 The Buyer may audit pricing against market benchmarks quarterly. Disputes exceeding 2% variance shall be referred to the Category Procurement Director.',
      ]},
      { heading: '4. DELIVERY AND LOGISTICS', lines: [
        '4.1 Deliveries shall be made to each store per the Delivery Programme (Schedule C), typically Monday–Thursday for weekday shelf replenishment.',
        '4.2 The Supplier shall use temperature-controlled vehicles maintaining 2–8°C for all fresh produce throughout transit.',
        '4.3 Delivery windows are store-specific and communicated 14 days in advance. Failure to meet agreed windows without prior notice constitutes a delivery failure.',
        '4.4 The Supplier\'s primary distribution centre for Southern Region fulfilment is the London Sorting DC, Thames Gateway.',
      ]},
      { heading: '5. SERVICE LEVELS', lines: [
        '5.1 SLA — On-Time Delivery: The Supplier shall achieve an on-time delivery rate of not less than 95% across all scheduled deliveries within the Southern Region, measured over any rolling 14-day period. A delivery is considered delayed if arrival occurs more than 2 calendar days after the agreed delivery date.',
        '5.2 Quality Rejection Rate shall not exceed 2% of delivered volume per calendar month.',
        '5.3 The Buyer shall measure SLA performance using its supply chain telemetry platform and publish weekly scorecards to the Supplier.',
      ]},
      { heading: '6. QUALITY AND COMPLIANCE', lines: [
        '6.1 All Products must comply with BRC Global Standard for Food Safety (Issue 9) and UK Food Safety Act 1990.',
        '6.2 Shelf-life on arrival must be not less than 85% of total labelled shelf-life for each SKU.',
        '6.3 The Supplier shall maintain traceability records for all batches for a minimum of 24 months.',
      ]},
      { heading: '7. CONTINGENCY AND BACKUP SUPPLY', lines: [
        '7.1 The Supplier acknowledges that uninterrupted supply of fresh produce is critical to store operations and customer satisfaction.',
        '7.2 The Buyer has pre-approved Total Produce Ltd (Contract CTR-TP-2023-008) as the designated Backup Supplier for Southern Region produce categories.',
        '7.3 BACKUP VENDOR ACTIVATION: Where the Primary Supplier\'s on-time delivery rate falls below 95% or delay events exceed 30% of deliveries within any rolling 14-day period in the Southern Region, the Buyer may activate the pre-approved Backup Supplier (Total Produce, CTR-TP-2023-008) for up to 35% of contracted Southern region produce volume, for a maximum period of 90 days, subject to Executive Supply Chain approval.',
        '7.4 Upon backup activation, the Primary Supplier shall cooperate with transition logistics and provide delivery history for the preceding 90 days.',
      ]},
      { heading: '8. INSURANCE AND LIABILITY', lines: [
        '8.1 The Supplier shall maintain product liability insurance of not less than £5,000,000 per occurrence.',
        '8.2 Neither party limits liability for death or personal injury caused by negligence.',
        '8.3 Consequential loss exclusion applies except where arising from deliberate breach of SLA obligations.',
      ]},
      { heading: '9. TERMINATION', lines: [
        '9.1 Either party may terminate with 90 days written notice after the initial 24-month term.',
        '9.2 The Buyer may terminate immediately for material breach including persistent SLA failure (3 consecutive months below 90% on-time).',
        '9.3 Upon termination, the Supplier shall fulfil outstanding orders for 30 days at agreed prices.',
      ]},
      { heading: '10–13. GENERAL PROVISIONS', lines: [
        '10.1 Confidentiality: Both parties shall treat commercial terms and performance data as confidential for 3 years post-termination.',
        '11.1 Audit Rights: The Buyer may audit delivery records, quality logs, and pricing with 10 Business Days notice.',
        '12.1 Force Majeure: Standard exclusions apply; Supplier must notify within 48 hours and propose mitigation plan.',
        '13.1 Governing Law: England and Wales. Disputes referred to London courts or arbitration per Lidl standard dispute resolution procedure.',
      ]},
      { heading: '14. PENALTIES AND REMEDIES', lines: [
        '14.1 Service credits apply for quality rejection rates exceeding 2% per month (1% of monthly invoice value per excess percentage point).',
        '14.2 PENALTY — Logistics Delay: For each delivery cycle where on-time performance falls below the agreed SLA in Clause 5.1, the Supplier shall pay a fixed penalty of GBP 4,200 per affected cycle, recoverable within 30 days of invoice.',
        '14.3 Penalties are without prejudice to the Buyer\'s right to activate backup supply under Clause 7.3.',
      ]},
      { heading: 'SCHEDULE B — SOUTHERN REGION STORES', lines: [
        'S021 Bristol Cabot · S022 Bristol Bedminster · S023 Exeter City · S024 Plymouth Drake',
        'S025 Brighton North · S026 Brighton Central · S027 Southampton City · S028 Portsmouth Gunwharf',
      ]},
    ],
  },
  {
    id: 'CTR-TP-2023-008',
    title: 'Framework Agreement — Backup Fresh Produce Supply',
    ref: 'LIDL-UK/SUP/2023/TP-008',
    supplier: 'Total Produce Ltd',
    supplierId: 'SUP010',
    category: 'Produce',
    value: '£1,800,000 per annum (when activated)',
    effective: '1 September 2023 — 31 August 2026',
    pages: 8,
    sections: [
      { heading: '1. FRAMEWORK PURPOSE', lines: [
        '1.1 This Framework Agreement establishes Total Produce Ltd ("Supplier") as a pre-approved backup supplier for fresh produce categories within designated Lidl UK regions.',
        '1.2 This Framework does not constitute a standing order. Supply commences only upon formal activation notice under Clause 4.',
        '1.3 Primary supplier agreements may reference this Framework (e.g. FreshDirect UK CTR-FD-2024-001, Clause 7.3).',
      ]},
      { heading: '2. PRODUCT SCOPE', lines: [
        '2.1 Covered categories: fresh fruit, vegetables, salad, and herbs as per Lidl UK produce taxonomy.',
        '2.2 Excluded: chilled ready meals, dairy, bakery, and ambient goods.',
      ]},
      { heading: '3. BACKUP SUPPLY SCOPE — SOUTHERN PRODUCE', lines: [
        '3.1 BACKUP SCOPE: Total Produce agrees to serve as pre-approved backup supplier for fresh produce categories across the Southern Region (8 stores: Bristol, Exeter, Plymouth, Brighton, Southampton, Portsmouth, Oxford). Maximum backup volume allocation: 35% of regional produce requirements when activated under a primary supplier contingency clause.',
        '3.2 Geographic coverage includes South West and South East England distribution corridors.',
        '3.3 The Supplier maintains contingency capacity at Dublin Fresh Terminal and Bristol redistribution hub.',
      ]},
      { heading: '4. ACTIVATION PROCEDURE', lines: [
        '4.1 ACTIVATION: Backup supply is activated upon written notice from Lidl UK following trigger of a contingency clause in the primary supplier agreement. Upon activation, Total Produce shall commence fulfilment within 48 hours for the agreed volume percentage and region.',
        '4.2 Activation notice shall specify: volume percentage, store list, duration, and product SKU priorities.',
        '4.3 Deactivation requires 14 days notice unless primary supplier SLA is restored above 95% for two consecutive measurement periods.',
      ]},
      { heading: '5–7. COMMERCIAL, QUALITY, TERM', lines: [
        '5.1 Backup pricing per Framework Price Schedule; not exceeding primary supplier contracted rates by more than 5%.',
        '6.1 BRC Issue 9 compliance mandatory. Temperature-controlled logistics 2–8°C.',
        '7.1 Framework term: 1 September 2023 to 31 August 2026. Auto-renewal subject to performance review.',
      ]},
    ],
  },
  {
    id: 'CTR-GC-2023-012',
    title: 'Chilled Ready Meals Supply Agreement',
    ref: 'LIDL-UK/SUP/2023/GC-012',
    supplier: 'Greencore Ready Meals Ltd',
    supplierId: 'SUP007',
    category: 'Chilled',
    value: '£5,600,000 per annum',
    effective: '1 January 2023 — 31 December 2026',
    pages: 10,
    sections: [
      { heading: '1. PARTIES', lines: [
        '1.1 Agreement between Lidl Great Britain Limited and Greencore Ready Meals Ltd (Company No. 02904587).',
        '1.2 National supply agreement covering chilled ready meals across all Lidl UK regions.',
      ]},
      { heading: '2. PRODUCT SCOPE', lines: [
        '2.1 SCOPE: This agreement covers chilled ready meals, prepared salads (chilled), and convenience food categories only. Fresh produce, fruit, and vegetables are expressly excluded from the scope of this contract.',
        '2.2 Product innovation pipeline reviewed quarterly with Category Management.',
      ]},
      { heading: '3–6. DELIVERY, SLA, PRICING, TERM', lines: [
        '3.1 National distribution from Northampton and Warrington chilled DCs.',
        '4.1 On-time delivery target: 94% rolling 14-day window.',
        '5.1 Annual value approximately £5,600,000. CPI-linked pricing cap 2.5% per annum.',
        '6.1 Term: 4 years from 1 January 2023. 90-day termination notice after initial 24 months.',
      ]},
    ],
  },
  {
    id: 'CTR-DF-2024-003',
    title: 'National Dairy Supply Agreement',
    ref: 'LIDL-UK/SUP/2024/DF-003',
    supplier: 'DairyFirst UK Ltd',
    supplierId: 'SUP001',
    category: 'Dairy',
    value: '£8,900,000 per annum',
    effective: '1 January 2024 — 31 December 2027',
    pages: 10,
    sections: [
      { heading: '1. PARTIES', lines: [
        '1.1 Agreement between Lidl Great Britain Limited and DairyFirst UK Ltd (Company No. 05123456).',
        '1.2 National dairy supply covering all Lidl UK retail formats.',
      ]},
      { heading: '2. PRODUCT SCOPE', lines: [
        '2.1 SCOPE: This agreement covers milk, cheese, yoghurt, and dairy-based products nationally. Fresh produce and fruit categories are expressly excluded.',
        '2.2 Organic and standard lines as per Schedule A SKU list (142 active SKUs).',
      ]},
      { heading: '3–6. LOGISTICS, SLA, COMMERCIAL, TERM', lines: [
        '3.1 Primary distribution from Cheshire and Somerset processing facilities.',
        '4.1 On-time delivery target: 96% — highest tier in Lidl supplier scorecard.',
        '5.1 Annual contract value £8,900,000. Volume rebates apply above 105% forecast.',
        '6.1 Four-year term with mutual 120-day exit after year 2.',
      ]},
    ],
  },
];
