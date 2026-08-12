'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Layers, Smartphone, GitBranch, Sparkles, Database, ArrowDown as LucideArrowDown, Zap,
  Briefcase, User, Package, Truck, Code2, Users, Award, Store,
  CheckCircle2, Play, ChevronLeft, ChevronRight, X, BarChart3, Globe, Lock,
  Minimize2, Maximize2, FileText, AlertTriangle, Check, Link as LinkIcon
} from 'lucide-react';
import { useApp } from '@/lib/context';

interface SlideData {
  title: string;
  trigger: string;
  keyMessage: string;
  businessValue: string;
  technicalDetails: string;
  businessNarrative: string;
  architectureNarrative: string;
  technicalNarrative: string;
  presenterNotes: string;
  outcomeMetric: string;
  outcomeLabel: string;
  persona: string;
  personaTitle: string;
  personaIcon: any;
}

const SLIDES: SlideData[] = [
  {
    title: 'Why This Exists',
    trigger: 'Strategic Business Challenge',
    keyMessage: 'Unifying Looker, Gemini, and AppSheet to eliminate signal-to-action lag in enterprise operations.',
    businessValue: 'Bridges raw data silos and report latencies, giving decision makers automated, pre-validated actions.',
    technicalDetails: 'Integrates BigQuery analytical capacity and Looker semantic definitions with Gemini reasoning and AppSheet actions.',
    businessNarrative: 'Every day, operational anomalies occur across enterprise operations—like stockouts, produce waste spikes, or labour gaps. Traditionally, these signals take days to translate into actions due to fragmented reporting. The CogniX decision cockpit closes this gap instantly, moving from signal to action in seconds.',
    architectureNarrative: 'This platform sits as a coordination layer above the enterprise\'s existing IT stack. It binds raw data warehouses, semantic definitions, Large Language Models, and mobile applications into a unified, secure execution loop.',
    technicalNarrative: 'Leverages Next.js server actions, Looker SDK filters, and Gemini API calls to dynamically validate user access, compute KPIs through governed schemas, and trigger webhooks in AppSheet.',
    presenterNotes: 'Pitch Slide 0 by emphasizing the strategic problem: Enterprise is rich in data but slow to act. Introduce the platform as a real-time coordination loop.',
    outcomeMetric: 'Decision Latency',
    outcomeLabel: 'Hours ➔ Seconds',
    persona: 'Strategy Team',
    personaTitle: 'Enterprise Strategy',
    personaIcon: Briefcase
  },
  {
    title: 'Before vs After Decision Making',
    trigger: 'Process Transformation',
    keyMessage: 'Transitioning from spreadsheet-heavy manual lookback reviews to real-time, governed action.',
    businessValue: 'Replaces meetings, emails, and data preparation with one-click approved resolutions.',
    technicalDetails: 'Contrasts batch analytics processes against API-driven reasoning and automatic Looker write-backs.',
    businessNarrative: 'In the old way, a store manager notices waste on a spreadsheet, drafts an email, waits for an analyst, and acts days later. In the new way, the system detects the anomaly, Gemini suggests a markdown, the manager clicks approve, and it is instantly pushed to the registers.',
    architectureNarrative: 'Illustrates the architectural simplification: removing file handoffs, spreadsheet data silos, and manual checks by implementing direct API integration.',
    technicalNarrative: 'Compares the multi-hop email/Excel pipeline against a single-hop Next.js API route that connects Looker, Gemini, and AppSheet dynamically.',
    presenterNotes: 'Show the Before vs After diagram. Emphasize the reduction in human steps and manual file handoffs.',
    outcomeMetric: 'Operational Steps',
    outcomeLabel: '7 Steps ➔ 3 Steps',
    persona: 'Operations Lead',
    personaTitle: 'Director of Store Operations',
    personaIcon: Users
  },
  {
    title: 'Interactive Enterprise Blueprint',
    trigger: 'Unified Platform Map',
    keyMessage: 'The centerpiece enterprise architecture mapping roles to data and workflow layers.',
    businessValue: 'A single, secure platform powering store, category, and logistics decision cockpits.',
    technicalDetails: 'Illustrates the 7-layer architecture stack connected via governed APIs and the Model Context Protocol (MCP).',
    businessNarrative: 'This is the complete operational blueprint. It traces how executives, store managers, category leads, and citizen developers share a single decision platform, all governed by the same Looker models.',
    architectureNarrative: 'Walk through the 7 layers: Business Personas, Applications, Decision Intelligence, AI Layer, Governance Layer, Data Layer, and Action Layer.',
    technicalNarrative: 'Hovering over nodes highlights the exact path of execution. For example, hovering over a Persona reveals their active path through the API, Gemini models, LookML metrics, and BigQuery tables.',
    presenterNotes: 'Spend time here. Hover over different cards to show how paths light up and explain the 7 layers of governance.',
    outcomeMetric: 'System Agility',
    outcomeLabel: '100% Shared Services',
    persona: 'BI/Data Team',
    personaTitle: 'Enterprise Architect',
    personaIcon: Code2
  },
  {
    title: 'Store Manager Journey',
    trigger: 'Waste alert: fresh produce spike',
    keyMessage: 'Piccadilly Store Manager resolves a produce waste spike before it erodes store margins.',
    businessValue: 'Saves high-margin fresh inventory by triggering real-time markdown rules.',
    technicalDetails: 'Store Intelligence App calls the DI API, executing Looker queries and Gemini diagnostics.',
    businessNarrative: 'A fresh produce waste spike is detected at Piccadilly (S001). The Store Manager receives a warning, investigates the cause (delivery delay + hot weather), and approves a 50% markdown suggested by Gemini.',
    architectureNarrative: 'Follow the journey: Store Manager ➔ Waste Spike Detected ➔ Store Intel App ➔ Gemini Analysis ➔ Looker Validation ➔ Recommendation Generated ➔ Manager Approval ➔ Workflow Triggered ➔ Waste Reduced.',
    technicalNarrative: 'Looker SDK validates the S001 store attribute. Gemini evaluates the local weather RAG database. A webhook dispatches the updated price rule to the store register database.',
    presenterNotes: 'Describe the waste scenario. Click through the steps and highlight the outcome: waste reduced by 14% at Manchester Piccadilly.',
    outcomeMetric: 'Produce Waste',
    outcomeLabel: '-14% Reduction',
    persona: 'Store Manager',
    personaTitle: 'Piccadilly Store Lead',
    personaIcon: Store
  },
  {
    title: 'Category Manager Journey',
    trigger: 'Margin alert: underperforming promotion',
    keyMessage: 'Category Managers adjust live promotions to defend margins against competitor matching.',
    businessValue: 'Halts margin erosion by reallocating promo budget to high-yield items early.',
    technicalDetails: 'Looker Row-Level Security (RLS) dynamically scopes data. Gemini updates campaign rules via Looker SDK.',
    businessNarrative: 'A promotion on Chilled Ready Meals is underperforming due to a competitor price match. The Category Manager gets an alert, Gemini suggests reducing the discount to protect margins, and the change is approved.',
    architectureNarrative: 'Follow the journey: Category Manager ➔ Margin Erosion ➔ Trading Intel App ➔ RLS Data Scoping ➔ Gemini Analysis ➔ Looker Validation ➔ Promo Adjustment ➔ Margin Recovered.',
    technicalNarrative: 'The user session attributes restrict Looker query bounds to "Chilled". Gemini suggests a revised promotion discount, which is written back via the Looker SDK.',
    presenterNotes: 'Show how RLS keeps the Category Manager focused on Chilled. Highlight the 4.2% category margin recovery.',
    outcomeMetric: 'Category Margin',
    outcomeLabel: '+4.2% Recovery',
    persona: 'Category Manager',
    personaTitle: 'Chilled Category Lead',
    personaIcon: Package
  },
  {
    title: 'Supply Chain Journey',
    trigger: 'Logistics alert: supplier SLA breach',
    keyMessage: 'Supply Leads reroute inventory to prevent out-of-stocks during delivery delays.',
    businessValue: 'Protects shelf availability by dynamically activating pre-approved backup suppliers.',
    technicalDetails: 'Supply Radar detects logistics anomalies and evaluates backup options via MCP connector APIs.',
    businessNarrative: 'A delivery delay from FreshDirect UK creates an OOS risk. The Logistics Director receives an alert. Gemini evaluates backup supplier availability and prompts the director to approve stock rebalancing.',
    architectureNarrative: 'Follow the journey: Supply Lead ➔ SLA Delay Alert ➔ Supply Intel App ➔ MCP Supplier Check ➔ Gemini Analysis ➔ Rebalance Generation ➔ Approval ➔ Stock Rerouted.',
    technicalNarrative: 'Anomalies in supply logs trigger a Gemini diagnostic run. The MCP connector queries secondary vendor stock levels, prompting an ERP rebalance webhook call.',
    presenterNotes: 'Walk through the logistics delay. Explain how the backup supplier (Total Produce) is automatically checked and activated.',
    outcomeMetric: 'Availability Risk',
    outcomeLabel: '£24K Revenue Saved',
    persona: 'Supply Chain Lead',
    personaTitle: 'National Logistics Director',
    personaIcon: Truck
  },
  {
    title: 'Executive Journey',
    trigger: 'Weekly operating brief generation',
    keyMessage: 'Enterprise Executives receive AI-curated summaries of national operational anomalies.',
    businessValue: 'Replaces manual briefing slide decks with a verified, interactive operations dashboard.',
    technicalDetails: 'Briefing Centre queries national KPIs, active anomalies, and Looker semantic models.',
    businessNarrative: 'The CEO prepares for the weekly operations review. Rather than waiting for analysts to assemble slides, they open the Briefing Centre, read the AI-curated summary, and approve national rebalancing tasks.',
    architectureNarrative: 'Follow the journey: Executive ➔ Briefing Request ➔ Briefing Centre App ➔ Multi-Category Analytics ➔ Gemini Briefing Compiler ➔ Approved Briefing ➔ Actions Approved.',
    technicalNarrative: 'Aggregated KPI data and active anomaly lists are compiled. A Gemini prompt is sent with strict Looker-governed metrics to produce a clean narrative brief.',
    presenterNotes: 'Explain how the briefing center replaces slides. Show that the CEO can approve Trafford-to-Piccadilly ready meal transfers with one click.',
    outcomeMetric: 'Reporting Overhead',
    outcomeLabel: 'Zero Manual Decks',
    persona: 'Executive',
    personaTitle: 'Enterprise Chief Executive',
    personaIcon: Briefcase
  },
  {
    title: 'AppSheet AI Enablement Blueprint',
    trigger: 'Citizen developer strategy',
    keyMessage: 'Upgrading existing AppSheet applications into decision cockpits via the DI API.',
    businessValue: 'Empowers business users to build AI-driven tools without custom IT engineering.',
    technicalDetails: 'Details the transformation path from static data forms to AI-assisted, Looker-governed applications.',
    businessNarrative: 'Enterprises have dozens of operational apps. By connecting them to the CogniX Decision API, we inject Gemini recommendations and Looker metrics directly into these apps, turning data-entry tools into decision accelerators.',
    architectureNarrative: 'Walk through the transformation: AppSheet apps (Store, Category, Supply) connect to the Next.js API gateway, which routes requests to Looker schemas and Gemini models.',
    technicalNarrative: 'AppSheet reads and writes to Next.js API endpoints. Form submissions trigger webhooks that execute Looker write-backs, updating store databases.',
    presenterNotes: 'Explain the citizen developer story. Show how AppSheet apps go from basic forms to AI cockpits using the DI API.',
    outcomeMetric: 'App Dev Speed',
    outcomeLabel: '10x Faster Build',
    persona: 'Citizen Developer',
    personaTitle: 'AppSheet Developer',
    personaIcon: Smartphone
  },
  {
    title: 'How A Recommendation Is Generated',
    trigger: 'Query lifecycle and validation',
    keyMessage: 'Tracing the complete security and semantic query path from user question to action.',
    businessValue: 'Guarantees that all AI actions are validated against enterprise security and metrics.',
    technicalDetails: 'Step-by-step trace: User input ➔ IAM check ➔ Looker semantic query ➔ Gemini MCP reasoning ➔ Confidence ➔ Approval ➔ Action.',
    businessNarrative: 'When a user asks a question, the platform enforces their IAM role, builds a structured query against the Looker Semantic Layer, and feeds the clean metrics to Gemini. This keeps the response accurate and secure.',
    architectureNarrative: 'Detail the validation lifecycle: User Question ➔ IAM Scope ➔ Looker Semantic Model ➔ Gemini Reasoning (MCP) ➔ Confidence Score ➔ Human Validation ➔ Action.',
    technicalNarrative: 'Illustrates how the Next.js API gateway coordinates IAM filters, calls Looker SDK APIs, executes the Gemini reasoning prompt, and triggers write-backs.',
    presenterNotes: 'Detail the verification pipeline. Reassure architects that the AI does not query raw databases directly.',
    outcomeMetric: 'Query Trust',
    outcomeLabel: '98% Audit Score',
    persona: 'Decision Owner',
    personaTitle: 'Chief Compliance Officer',
    personaIcon: Award
  },
  {
    title: 'Why Gemini Cannot Hallucinate Here',
    trigger: 'AI Safety & Semantic Boundary',
    keyMessage: 'Gemini reasons over Looker-governed semantic metrics, never raw tables.',
    businessValue: 'Protects operational integrity by preventing AI hallucinations of core business KPIs.',
    technicalDetails: 'Compares direct LLM database querying (unsafe) against Looker-mediated semantic reasoning (safe).',
    businessNarrative: 'AI hallucination is a major risk in enterprise deployments. By placing Looker\'s Semantic Layer between Gemini and the data, we guarantee the model only sees governed, pre-calculated metrics. Gemini cannot hallucinate a margin rule because it does not write raw SQL.',
    architectureNarrative: 'Show the semantic boundary: Gemini queries the Looker SDK API (using predefined fields and filters), never raw BigQuery. Looker handles the SQL generation and access control.',
    technicalNarrative: 'Contrasts raw SQL generation against Looker semantic queries. Looker translates abstract dimensions and measures into validated SQL, acting as a sandbox for the LLM.',
    presenterNotes: 'This slide answers 50% of IT questions. Emphasize that the Looker semantic layer acts as a strict guardrail for the LLM.',
    outcomeMetric: 'Hallucination Rate',
    outcomeLabel: '0% Core Metrics',
    persona: 'BI/Data Team',
    personaTitle: 'Head of Data Governance',
    personaIcon: Lock
  },
  {
    title: 'Governance & Trust',
    trigger: 'Enterprise access rules',
    keyMessage: 'Enforcing strict role-based access, LookML metrics, and human-in-the-loop review.',
    businessValue: 'Ensures absolute compliance. AI proposes actions, but Looker structures data and humans decide.',
    technicalDetails: 'Highlights Row-Level Security (RLS), LookML code ownership, confidence thresholds, and write-back logs.',
    businessNarrative: 'Enterprise governance model relies on three pillars: strict IAM attributes, governed LookML definitions, and a mandatory human approval check for any operational adjustments.',
    architectureNarrative: 'Illustrates how the Governance layer wraps the AI and Data layers. RLS profiles restrict database rows, LookML defines schemas, and audit logs record every approval.',
    technicalNarrative: 'Looker User Attributes govern RLS filters. If a Store Manager attempts to modify a category-level rule, Looker blocks the transaction at the API level.',
    presenterNotes: 'Discuss RLS and human-in-the-loop approval. Explain that the user remains the ultimate decision owner.',
    outcomeMetric: 'Access Compliance',
    outcomeLabel: '100% Policy Enforced',
    persona: 'BI/Data Team',
    personaTitle: 'Director of IT Security',
    personaIcon: Lock
  },
  {
    title: 'Future-State Enterprise 2028',
    trigger: 'Day in the Life of Enterprise 2028',
    keyMessage: 'The future vision of enterprise operations running on the CogniX Decision framework.',
    businessValue: 'Optimizes store efficiency, minimizes category waste, and protects national margins.',
    technicalDetails: 'An interactive operational timeline showing how different roles collaborate throughout a day.',
    businessNarrative: 'By 2028, every level of enterprise operations—from store managers logging waste at 08:00 to category leads reviewing promotions at 09:00 and executives generating briefs at 17:00—will execute decisions through this governed cockpit.',
    architectureNarrative: 'Illustrates the timeline: 08:00 Store Manager markdown approval ➔ 09:00 Category Lead promotion adjustment ➔ 11:00 Supply Lead rebalancing ➔ 14:00 Citizen Developer AppSheet deploy ➔ 17:00 CEO operating brief approval.',
    technicalNarrative: 'Shows how a shared Next.js API, Looker Semantic layer, and Gemini backend coordinate actions asynchronously across applications all day.',
    presenterNotes: 'Conclude by painting the future picture. Emphasize that all roles use the exact same governed engine.',
    outcomeMetric: 'Est. Annual Savings',
    outcomeLabel: '£12.4M National ROI',
    persona: 'Executive',
    personaTitle: 'Enterprise Board',
    personaIcon: Briefcase
  }
];

interface SlideScalerProps {
  designWidth: number;
  designHeight: number;
  children: React.ReactNode;
}

function SlideScaler({ designWidth, designHeight, children }: SlideScalerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const scaleX = width / designWidth;
        const scaleY = height / designHeight;
        // Keep a small margin around slide content
        let newScale = Math.min(scaleX, scaleY) * 0.95;
        // Bound the scale range to avoid excessive shrinking/stretching
        newScale = Math.max(0.4, Math.min(newScale, 4.0));
        setScale(newScale);
      }
    });

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [designWidth, designHeight]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      <div
        style={{
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative'
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default function ArchitectureExplorer() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [presentationMode, setPresentationMode] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [narrativeTab, setNarrativeTab] = useState<'business' | 'architecture' | 'technical'>('business');

  const slide = SLIDES[activeSlide];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        if (canvasFullscreen) setCanvasFullscreen(false);
        if (presentationMode) setPresentationMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSlide, presentationMode, canvasFullscreen]);

  // Handle Presentation Mode body class overrides
  useEffect(() => {
    if (presentationMode) {
      document.body.classList.add('presentation-active-explorer');
    } else {
      document.body.classList.remove('presentation-active-explorer');
    }
    return () => {
      document.body.classList.remove('presentation-active-explorer');
    };
  }, [presentationMode]);

  const handleNext = () => {
    setActiveSlide((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1));
    setExpandedNode(null);
  };

  const handlePrev = () => {
    setActiveSlide((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
    setExpandedNode(null);
  };

  // Reusable node detail data on click
  const NODE_DETAILS: Record<string, { title: string; subtitle: string; biz: string; tech: string }> = {
    store_mgr: {
      title: 'Store Manager (Piccadilly S001)',
      subtitle: 'Operational Persona',
      biz: 'Piccadilly Store Lead Alex handles real-time store disruptions: produce spoilage, ready meal stockouts, or staff scheduling shifts.',
      tech: 'Governed by Looker User Attribute override: StoreID = "S001". Enforces store-level metrics and data access.'
    },
    category_mgr: {
      title: 'Category Manager (Chilled Lead)',
      subtitle: 'Trading Persona',
      biz: 'Monitors category margin performance, promotion execution, and cannibalization metrics. Adjusts live promotion rates.',
      tech: 'Enforces Category = "Chilled" RLS via LookML. Restricted from accessing supply chain logs or other category lines.'
    },
    supply_lead: {
      title: 'Supply Chain Lead (Logistics Director)',
      subtitle: 'Supply Chain Persona',
      biz: 'Resolves distribution delays, manages warehouse SLAs, and coordinates backup suppliers when SLA violations threaten store stock.',
      tech: 'Monitors supplier SLA metrics and inventory levels across regional DCs via BigQuery distribution tables.'
    },
    citizen_dev: {
      title: 'Citizen Developer (Business User)',
      subtitle: 'AppSheet Creator',
      biz: 'Builds operational dashboards and pricing forms using AppSheet to configure daily store workflows.',
      tech: 'Consumes standard REST JSON schemas from the Decision Intelligence API gateway.'
    },
    exec: {
      title: 'Enterprise Strategy Lead',
      subtitle: 'Executive Persona',
      biz: 'Reviews national operational health briefings and approves regional inventory balancing budgets.',
      tech: 'Accesses aggregated Looker Dashboards and receives Gemini briefs scoped to all sites.'
    },
    store_app: {
      title: 'Store Intelligence Application',
      subtitle: 'AppSheet Front-End',
      biz: 'Mobile-first tool for store workers. Translates anomaly alerts into clear markdown suggestions.',
      tech: 'Pushes approval webhooks to `/api/data` containing store rebalance parameters.'
    },
    trading_app: {
      title: 'Trading Intelligence Application',
      subtitle: 'Next.js Trading Cockpit',
      biz: 'Used by category trading teams to monitor margins and model promotional simulations.',
      tech: 'Sends Looker SDK queries to compile real-time campaign performance logs.'
    },
    supply_app: {
      title: 'Supply Radar Application',
      subtitle: 'Next.js Supply Screen',
      biz: 'National supply dashboard visualizing cargo truck delays and supplier SLA margins.',
      tech: 'Queries BQ delivery schedules and calculates real-time ETA latency scores.'
    },
    appsheet: {
      title: 'AppSheet Platform',
      subtitle: 'Google Workspace App Builder',
      biz: 'Empowers local leads to build custom interfaces that interface directly with the DI gateway API.',
      tech: 'Triggers write-back requests using Looker semantic endpoints for inventory state changes.'
    },
    di_api: {
      title: 'Decision Intelligence API',
      subtitle: 'Next.js API Routes Gateway',
      biz: 'Core communication gateway. Authenticates requests, compiles user parameters, and orchestrates Looker & Gemini.',
      tech: 'API Gateway located in `/app/api/data`. Validates JSON requests and queries Looker Semantic models.'
    },
    gemini_ai: {
      title: 'Gemini Reasoning Engine',
      subtitle: 'gemini-1.5-flash LLM',
      biz: 'Consumes pre-aggregated governed data and external factors (weather, events) to propose optimal adjustments.',
      tech: 'AI logic in `lib/gemini.ts`. Calls models with strict prompts to prevent hallucination.'
    },
    looker_sl: {
      title: 'Looker Semantic Layer',
      subtitle: 'Governed Semantic Metrics',
      biz: 'The single source of metric truth. Forces Gemini to reason over verified definitions rather than direct raw SQL.',
      tech: 'Looker Semantic Layer in `lib/semantic-layer.ts`. Translates query filters into strict LookML dimensions.'
    },
    bigquery: {
      title: 'BigQuery Data Warehouse',
      subtitle: 'Enterprise Data Warehouse',
      biz: 'Enterprise data storage. Houses transaction tables, inventory balances, delivery schedules, and historical records.',
      tech: 'Mocked locally in `data/*.json` files representing BigQuery schemas.'
    },
    workflow: {
      title: 'Workflow Action Engine',
      subtitle: 'AppSheet / ERP Write-Back API',
      biz: 'Executes the approved decision (adjusting prices, rerouting trucks, reallocating shifts) in transactional systems.',
      tech: 'Pushes HTTP POST write-back queries updating regional registers and scheduling systems.'
    },
    mcp: {
      title: 'Model Context Protocol (MCP) Layer',
      subtitle: 'AI Schema Bridging',
      biz: 'Connects the Gemini reasoning engine directly with external systems like SAP, Ariba, and Looker definitions.',
      tech: 'Vertex AI / MCP protocol. Bridges LLM reasoning loops with live database actions.'
    }
  };

  // Reusable inline SVG Arrow components
  const ArrowRight = ({ active = false }: { active?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 20 }}>
      <svg style={{ width: '100%', height: 16 }} className={active ? "pulse-line" : ""}>
        <line
          x1="0"
          y1="8"
          x2="100%"
          y2="8"
          stroke={active ? "var(--accent)" : "rgba(255,255,255,0.08)"}
          strokeWidth={active ? "2" : "1"}
          markerEnd={active ? "url(#arrow-head-active)" : "url(#arrow-head-inactive)"}
          style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
        />
      </svg>
    </div>
  );

  const ArrowLeft = ({ active = false }: { active?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minWidth: 20 }}>
      <svg style={{ width: '100%', height: 16 }} className={active ? "pulse-line" : ""}>
        <line
          x1="100%"
          y1="8"
          x2="0"
          y2="8"
          stroke={active ? "var(--accent)" : "rgba(255,255,255,0.08)"}
          strokeWidth={active ? "2" : "1"}
          markerEnd={active ? "url(#arrow-head-active)" : "url(#arrow-head-inactive)"}
          style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
        />
      </svg>
    </div>
  );

  const ArrowDown = ({ active = false }: { active?: boolean }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 30 }}>
      <svg style={{ width: 16, height: 30 }} className={active ? "pulse-line" : ""}>
        <line
          x1="8"
          y1="0"
          x2="8"
          y2="100%"
          stroke={active ? "var(--accent)" : "rgba(255,255,255,0.08)"}
          strokeWidth={active ? "2" : "1"}
          markerEnd={active ? "url(#arrow-head-active)" : "url(#arrow-head-inactive)"}
          style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
        />
      </svg>
    </div>
  );

  const ArrowRightRed = () => (
    <svg style={{ width: 32, height: 12 }}>
      <line x1="0" y1="6" x2="100%" y2="6" stroke="var(--danger)" strokeWidth="1.5" strokeDasharray="3,3" markerEnd="url(#arrow-head-red)" />
    </svg>
  );

  const ArrowRightGreen = () => (
    <svg style={{ width: 32, height: 12 }} className="pulse-line">
      <line x1="0" y1="6" x2="100%" y2="6" stroke="var(--success)" strokeWidth="2" markerEnd="url(#arrow-head-green)" />
    </svg>
  );

  const NodeCard = ({
    id,
    label,
    subtitle,
    icon: IconComponent,
    color = 'var(--text-muted)',
    borderColor = 'var(--border)',
    bgColor = 'var(--bg-elevated)',
    activeRoute = false,
    width = 180
  }: {
    id: string;
    label: string;
    subtitle?: string;
    icon: any;
    color?: string;
    borderColor?: string;
    bgColor?: string;
    activeRoute?: boolean;
    width?: number | string;
  }) => {
    const isHovered = hoveredNode === id;
    const isExpanded = expandedNode === id;
    const isRouteActive = activeRoute || (hoveredNode && NODE_DETAILS[hoveredNode] && (
      (hoveredNode === 'store_mgr' && ['store_mgr', 'store_app', 'di_api', 'gemini_ai', 'looker_sl', 'bigquery', 'workflow'].includes(id)) ||
      (hoveredNode === 'category_mgr' && ['category_mgr', 'trading_app', 'di_api', 'gemini_ai', 'looker_sl', 'bigquery', 'workflow'].includes(id)) ||
      (hoveredNode === 'supply_lead' && ['supply_lead', 'supply_app', 'di_api', 'gemini_ai', 'mcp', 'bigquery', 'workflow'].includes(id)) ||
      (hoveredNode === 'citizen_dev' && ['citizen_dev', 'appsheet', 'di_api', 'gemini_ai', 'looker_sl', 'bigquery', 'workflow'].includes(id)) ||
      (hoveredNode === 'di_api' && ['di_api', 'gemini_ai', 'looker_sl', 'workflow'].includes(id)) ||
      (hoveredNode === 'gemini_ai' && ['di_api', 'gemini_ai', 'looker_sl', 'mcp'].includes(id)) ||
      (hoveredNode === 'looker_sl' && ['di_api', 'looker_sl', 'bigquery'].includes(id))
    ));

    return (
      <div
        style={{
          position: 'relative',
          transition: 'all 0.25s ease',
          zIndex: isHovered || isExpanded ? 50 : 2,
          opacity: hoveredNode && !isRouteActive ? 0.35 : 1
        }}
        onMouseEnter={() => setHoveredNode(id)}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={(e) => {
          e.stopPropagation();
          setExpandedNode(isExpanded ? null : id);
        }}
      >
        <div
          className={`card ${isRouteActive ? 'glowing-node' : ''}`}
          title={`${label}${subtitle ? ` - ${subtitle}` : ''}`}
          style={{
            background: bgColor,
            border: `1px solid ${isRouteActive || isExpanded ? 'var(--accent)' : borderColor}`,
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: isRouteActive ? '0 0 15px rgba(0, 120, 255, 0.25)' : 'none',
            transform: isHovered ? 'translateY(-2px)' : 'none',
            width: width,
            transition: 'all 0.2s ease'
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `rgba(${color.startsWith('var(--accent)') ? '0,120,255' : color === '#8B5CF6' ? '139,92,246' : color === '#10B981' ? '16,185,129' : color === '#06B6D4' ? '6,182,212' : '74,90,122'}, 0.08)`,
              border: `1px solid rgba(${color.startsWith('var(--accent)') ? '0,120,255' : color === '#8B5CF6' ? '139,92,246' : color === '#10B981' ? '16,185,129' : color === '#06B6D4' ? '6,182,212' : '74,90,122'}, 0.2)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <IconComponent size={15} color={color} strokeWidth={2} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.70rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.15 }}>
              {label}
            </div>
            {subtitle && (
              <div style={{ fontSize: '0.60rem', color: 'var(--text-secondary)', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.15, marginTop: 2 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Node details expanded tooltip */}
        {isExpanded && NODE_DETAILS[id] && (
          <div
            className="card"
            style={{
              position: 'absolute',
              top: '105%',
              left: 0,
              width: 270,
              zIndex: 100,
              padding: 16,
              background: '#101624',
              border: '1px solid var(--accent)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: 'left'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              <div style={{ fontWeight: 800, fontSize: '0.78rem', color: 'var(--accent)' }}>{NODE_DETAILS[id].title}</div>
              <button onClick={() => setExpandedNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              <strong>Business:</strong> {NODE_DETAILS[id].biz}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong>Technical:</strong> <code style={{ color: '#0078FF', background: 'var(--bg-elevated)', padding: '1px 3px', borderRadius: 2 }}>{NODE_DETAILS[id].tech}</code>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Check if a centerpiece connector is active
  const isCenterpieceConnectorActive = (rowIndex: number) => {
    if (!hoveredNode) return false;
    if (hoveredNode === 'store_mgr' || hoveredNode === 'store_app') return rowIndex === 0;
    if (hoveredNode === 'category_mgr' || hoveredNode === 'trading_app') return rowIndex === 1;
    if (hoveredNode === 'supply_lead' || hoveredNode === 'supply_app') return rowIndex === 2;
    if (hoveredNode === 'citizen_dev' || hoveredNode === 'appsheet') return rowIndex === 3;
    if (['di_api', 'gemini_ai', 'looker_sl'].includes(hoveredNode)) return true;
    return false;
  };

  const isPathActive = (from: string, to: string) => {
    if (!hoveredNode) return false;
    
    // Store Manager active path
    if (hoveredNode === 'store_mgr' || hoveredNode === 'store_app') {
      if (from === 'store_mgr' && to === 'store_app') return true;
      if (from === 'store_app' && to === 'di_api') return true;
      if (from === 'di_api' && to === 'gemini_ai') return true;
      if (from === 'gemini_ai' && to === 'looker_sl') return true;
      if (from === 'looker_sl' && to === 'bigquery') return true;
      if (from === 'bigquery' && to === 'workflow') return true;
    }
    
    // Category Manager active path
    if (hoveredNode === 'category_mgr' || hoveredNode === 'trading_app') {
      if (from === 'category_mgr' && to === 'trading_app') return true;
      if (from === 'trading_app' && to === 'di_api') return true;
      if (from === 'di_api' && to === 'gemini_ai') return true;
      if (from === 'gemini_ai' && to === 'looker_sl') return true;
      if (from === 'looker_sl' && to === 'bigquery') return true;
      if (from === 'bigquery' && to === 'workflow') return true;
    }

    // Supply Lead active path
    if (hoveredNode === 'supply_lead' || hoveredNode === 'supply_app') {
      if (from === 'supply_lead' && to === 'supply_app') return true;
      if (from === 'supply_app' && to === 'di_api') return true;
      if (from === 'di_api' && to === 'gemini_ai') return true;
      if (from === 'gemini_ai' && to === 'mcp') return true;
      if (from === 'mcp' && to === 'workflow') return true;
    }

    // Highlight paths when specific backend nodes are hovered
    if (hoveredNode === 'di_api') {
      if (from === 'store_app' && to === 'di_api') return true;
      if (from === 'trading_app' && to === 'di_api') return true;
      if (from === 'supply_app' && to === 'di_api') return true;
      if (from === 'di_api' && to === 'gemini_ai') return true;
    }
    if (hoveredNode === 'gemini_ai') {
      if (from === 'di_api' && to === 'gemini_ai') return true;
      if (from === 'gemini_ai' && to === 'looker_sl') return true;
      if (from === 'gemini_ai' && to === 'mcp') return true;
    }
    if (hoveredNode === 'looker_sl') {
      if (from === 'gemini_ai' && to === 'looker_sl') return true;
      if (from === 'looker_sl' && to === 'bigquery') return true;
    }
    if (hoveredNode === 'bigquery') {
      if (from === 'looker_sl' && to === 'bigquery') return true;
      if (from === 'bigquery' && to === 'workflow') return true;
    }
    if (hoveredNode === 'workflow') {
      if (from === 'bigquery' && to === 'workflow') return true;
      if (from === 'mcp' && to === 'workflow') return true;
    }
    if (hoveredNode === 'mcp') {
      if (from === 'gemini_ai' && to === 'mcp') return true;
      if (from === 'mcp' && to === 'workflow') return true;
    }

    return false;
  };

  return (
    <div
      style={{
        background: '#080B12',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        color: 'var(--text-primary)',
        position: 'relative'
      }}
      onClick={() => setExpandedNode(null)}
    >
      {/* Styles for dynamic pulse lines and node glow */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 5px rgba(0, 120, 255, 0.15);
          }
          50% {
            box-shadow: 0 0 20px rgba(0, 120, 255, 0.45);
            border-color: rgba(0, 120, 255, 0.8);
          }
          100% {
            box-shadow: 0 0 5px rgba(0, 120, 255, 0.15);
          }
        }
        .pulse-line {
          stroke-dasharray: 6, 4;
          animation: pulse-dash 0.8s linear infinite;
        }
        .glowing-node {
          animation: pulse-glow 2s infinite ease-in-out;
        }
      `}} />

      {/* Global Arrowheads definition defs */}
      <svg style={{ height: 0, width: 0, position: 'absolute' }}>
        <defs>
          <marker id="arrow-head-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="var(--accent)" />
          </marker>
          <marker id="arrow-head-inactive" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="rgba(255,255,255,0.15)" />
          </marker>
          <marker id="arrow-head-red" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--danger)" />
          </marker>
          <marker id="arrow-head-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--success)" />
          </marker>
        </defs>
      </svg>

      {/* Main Diagram Display & Presenter split-screen */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: canvasFullscreen ? '1fr' : '1fr 340px',
          gap: 16,
          alignItems: 'stretch',
          position: 'relative'
        }}
      >
        {/* Left Side: Diagram Canvas Container */}
        <div
          className="card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 24,
            background: '#0d1321',
            border: '1px solid var(--border)',
            position: canvasFullscreen ? 'fixed' : 'relative',
            top: canvasFullscreen ? 16 : 'auto',
            right: canvasFullscreen ? 16 : 'auto',
            bottom: canvasFullscreen ? 16 : 'auto',
            left: canvasFullscreen ? 16 : 'auto',
            zIndex: canvasFullscreen ? 1000 : 1,
            height: canvasFullscreen ? 'calc(100vh - 32px)' : 'calc(100vh - 240px)',
            minHeight: canvasFullscreen ? 'none' : '550px',
            overflowY: 'auto'
          }}
        >
          {/* Floating Canvas-only controls inside diagram frame */}
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            zIndex: 10
          }}>
            <button
              className={`btn btn-sm ${presentationMode ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setPresentationMode(!presentationMode)}
              style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Play size={11} />
              {presentationMode ? 'Exit Presentation' : 'Presenter View'}
            </button>
            <button
              className={`btn btn-sm ${canvasFullscreen ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCanvasFullscreen(!canvasFullscreen)}
              style={{ padding: '6px' }}
              title="Expand Canvas Mode"
            >
              {canvasFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>

          {/* Slide Diagram Render Area (Guaranteed Centering Wrapper) */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 380,
            width: '100%',
            height: '100%',
            position: 'relative'
          }}>
            
            {/* Page 0: Why This Exists */}
            {activeSlide === 0 && (
              <SlideScaler designWidth={800} designHeight={360}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', textAlign: 'center', width: '100%' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent)' }}>Closing the Operational Decision Loop</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Traditional retail infrastructures isolate raw databases from store staff. Analytical dashboards are lookup-only, creating massive latency between signal identification and execution. 
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                    <div className="card" style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.02)', border: '1px dashed var(--border-danger)', fontSize: '0.75rem', color: 'var(--text-secondary)', width: 200 }}>
                      <AlertTriangle size={14} color="var(--danger)" style={{ marginBottom: 4 }} />
                      <strong>Traditional reports</strong><br />Lookback spreadsheets and delayed emails.
                    </div>
                    <div style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>➔</div>
                    <div className="card" style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid var(--border-success)', fontSize: '0.75rem', color: 'var(--text-primary)', width: 200 }}>
                      <Sparkles size={14} color="var(--success)" style={{ marginBottom: 4 }} />
                      <strong>Decision Intelligence</strong><br />AI-governed action loop executing in seconds.
                    </div>
                  </div>
                </div>
              </SlideScaler>
            )}

            {/* Slide 1: Before vs After Process Flow Comparison */}
            {activeSlide === 1 && (
              <SlideScaler designWidth={980} designHeight={360}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
                  {/* Current State Flow */}
                  <div className="card" style={{ border: '1px dashed var(--border-danger)', background: 'rgba(239, 68, 68, 0.01)', padding: 14 }}>
                    <div style={{ color: 'var(--danger)', fontWeight: 800, fontSize: '0.8125rem', marginBottom: 10 }}>
                      🚫 Current Manual Handoff Process (Time: Days)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', flexShrink: 0 }}>Store Incident</div>
                      <ArrowRightRed />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', flexShrink: 0 }}>Excel Spreadsheet</div>
                      <ArrowRightRed />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', flexShrink: 0 }}>Email Handoff</div>
                      <ArrowRightRed />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', flexShrink: 0 }}>BI Analyst Queue</div>
                      <ArrowRightRed />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', flexShrink: 0 }}>Static PDF Report</div>
                      <ArrowRightRed />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', flexShrink: 0 }}>Weekly Review</div>
                      <ArrowRightRed />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', background: 'rgba(239,68,68,0.08)', flexShrink: 0 }}>Delayed Decision</div>
                    </div>
                  </div>

                  {/* Future State Flow */}
                  <div className="card" style={{ border: '1px solid var(--border-success)', background: 'rgba(16, 185, 129, 0.03)', padding: 14 }}>
                    <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: '0.8125rem', marginBottom: 10 }}>
                      ⚡ Decision Intelligence Automation (Time: Seconds)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4 }}>
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', flexShrink: 0 }}>Store Incident</div>
                      <ArrowRightGreen />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', border: '1px solid var(--accent)', flexShrink: 0 }}>Decision Engine</div>
                      <ArrowRightGreen />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', border: '1px solid #8B5CF6', flexShrink: 0 }}>AI Recommendation</div>
                      <ArrowRightGreen />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', border: '1px solid #06B6D4', flexShrink: 0 }}>Looker Validation</div>
                      <ArrowRightGreen />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', background: 'rgba(16,185,129,0.08)', border: '1px solid var(--success)', flexShrink: 0 }}>Instant Approval</div>
                      <ArrowRightGreen />
                      <div className="card" style={{ padding: '4px 8px', fontSize: '0.70rem', background: 'var(--success-light)', border: '1px solid var(--success)', flexShrink: 0 }}>Resolved Action</div>
                    </div>
                  </div>
                </div>
              </SlideScaler>
            )}

            {/* Slide 2: Centerpiece Enterprise Architecture Blueprint */}
            {activeSlide === 2 && (
              <SlideScaler designWidth={980} designHeight={360}>
                <div style={{
                  position: 'relative',
                  width: '980px',
                  height: '360px',
                  background: 'transparent'
                }}>
                  {/* Layer Titles */}
                  <div style={{ position: 'absolute', left: 10, top: 10, fontSize: '0.625rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>1. Business</div>
                  <div style={{ position: 'absolute', left: 150, top: 10, fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>2. Apps</div>
                  <div style={{ position: 'absolute', left: 290, top: 10, fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>3. Decision</div>
                  <div style={{ position: 'absolute', left: 430, top: 10, fontSize: '0.625rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase' }}>4. AI Layer</div>
                  <div style={{ position: 'absolute', left: 570, top: 10, fontSize: '0.625rem', fontWeight: 800, color: '#06B6D4', textTransform: 'uppercase' }}>5. Governance</div>
                  <div style={{ position: 'absolute', left: 710, top: 10, fontSize: '0.625rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>6. Data Layer</div>
                  <div style={{ position: 'absolute', left: 850, top: 10, fontSize: '0.625rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>7. Action</div>

                  {/* SVG Wires Overlay */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                    {/* Store Manager Flow */}
                    <path
                      d="M 132 67 L 147 67"
                      stroke={isPathActive('store_mgr', 'store_app') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('store_mgr', 'store_app') ? 2 : 1}
                      markerEnd={isPathActive('store_mgr', 'store_app') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('store_mgr', 'store_app') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 272 67 Q 280 122 287 177"
                      stroke={isPathActive('store_app', 'di_api') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('store_app', 'di_api') ? 2 : 1}
                      markerEnd={isPathActive('store_app', 'di_api') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('store_app', 'di_api') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* Category Manager Flow */}
                    <path
                      d="M 132 177 L 147 177"
                      stroke={isPathActive('category_mgr', 'trading_app') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('category_mgr', 'trading_app') ? 2 : 1}
                      markerEnd={isPathActive('category_mgr', 'trading_app') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('category_mgr', 'trading_app') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 272 177 L 287 177"
                      stroke={isPathActive('trading_app', 'di_api') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('trading_app', 'di_api') ? 2 : 1}
                      markerEnd={isPathActive('trading_app', 'di_api') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('trading_app', 'di_api') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* Supply Chain Flow */}
                    <path
                      d="M 132 287 L 147 287"
                      stroke={isPathActive('supply_lead', 'supply_app') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('supply_lead', 'supply_app') ? 2 : 1}
                      markerEnd={isPathActive('supply_lead', 'supply_app') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('supply_lead', 'supply_app') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 272 287 Q 280 232 287 177"
                      stroke={isPathActive('supply_app', 'di_api') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('supply_app', 'di_api') ? 2 : 1}
                      markerEnd={isPathActive('supply_app', 'di_api') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('supply_app', 'di_api') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* Shared Decision API to AI Layer */}
                    <path
                      d="M 412 177 Q 420 150 427 122"
                      stroke={isPathActive('di_api', 'gemini_ai') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('di_api', 'gemini_ai') ? 2 : 1}
                      markerEnd={isPathActive('di_api', 'gemini_ai') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('di_api', 'gemini_ai') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 412 177 Q 420 205 427 232"
                      stroke={isPathActive('di_api', 'mcp') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('di_api', 'mcp') ? 2 : 1}
                      markerEnd={isPathActive('di_api', 'mcp') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('di_api', 'mcp') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* AI Layer to Governance / Workflow */}
                    <path
                      d="M 552 122 Q 560 150 567 177"
                      stroke={isPathActive('gemini_ai', 'looker_sl') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('gemini_ai', 'looker_sl') ? 2 : 1}
                      markerEnd={isPathActive('gemini_ai', 'looker_sl') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('gemini_ai', 'looker_sl') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 490 151 L 490 202"
                      stroke={isPathActive('gemini_ai', 'mcp') ? 'var(--accent)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('gemini_ai', 'mcp') ? 2 : 1}
                      markerEnd={isPathActive('gemini_ai', 'mcp') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('gemini_ai', 'mcp') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 552 232 Q 700 232 847 177"
                      stroke={isPathActive('mcp', 'workflow') ? 'var(--success)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('mcp', 'workflow') ? 2 : 1}
                      markerEnd={isPathActive('mcp', 'workflow') ? 'url(#arrow-head-green)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('mcp', 'workflow') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* Looker to BigQuery */}
                    <path
                      d="M 692 177 L 707 177"
                      stroke={isPathActive('looker_sl', 'bigquery') ? '#06B6D4' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('looker_sl', 'bigquery') ? 2 : 1}
                      markerEnd={isPathActive('looker_sl', 'bigquery') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('looker_sl', 'bigquery') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* BigQuery to Workflow */}
                    <path
                      d="M 832 177 L 847 177"
                      stroke={isPathActive('bigquery', 'workflow') ? 'var(--success)' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={isPathActive('bigquery', 'workflow') ? 2 : 1}
                      markerEnd={isPathActive('bigquery', 'workflow') ? 'url(#arrow-head-green)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('bigquery', 'workflow') ? 'pulse-line' : ''}
                      fill="none"
                    />
                  </svg>

                  {/* Column 1: Business */}
                  <div style={{ position: 'absolute', left: 10, top: 40 }}>
                    <NodeCard id="store_mgr" label="Store Manager" subtitle="Piccadilly S001" icon={Store} color="var(--accent)" width={120} />
                  </div>
                  <div style={{ position: 'absolute', left: 10, top: 150 }}>
                    <NodeCard id="category_mgr" label="Category Manager" subtitle="Chilled Category" icon={Package} color="#8B5CF6" width={120} />
                  </div>
                  <div style={{ position: 'absolute', left: 10, top: 260 }}>
                    <NodeCard id="supply_lead" label="Supply Lead" subtitle="Logistics Director" icon={Truck} color="#10B981" width={120} />
                  </div>

                  {/* Column 2: Apps */}
                  <div style={{ position: 'absolute', left: 150, top: 40 }}>
                    <NodeCard id="store_app" label="Store Intel App" subtitle="AppSheet Client" icon={Smartphone} color="var(--accent)" width={120} />
                  </div>
                  <div style={{ position: 'absolute', left: 150, top: 150 }}>
                    <NodeCard id="trading_app" label="Trading Intel App" subtitle="Next.js Client" icon={BarChart3} color="#8B5CF6" width={120} />
                  </div>
                  <div style={{ position: 'absolute', left: 150, top: 260 }}>
                    <NodeCard id="supply_app" label="Supply Radar App" subtitle="Logistics Client" icon={Globe} color="#10B981" width={120} />
                  </div>

                  {/* Column 3: Decision */}
                  <div style={{ position: 'absolute', left: 290, top: 150 }}>
                    <NodeCard id="di_api" label="Decision API" subtitle="app/api/data" icon={GitBranch} color="white" width={120} />
                  </div>

                  {/* Column 4: AI Layer */}
                  <div style={{ position: 'absolute', left: 430, top: 95 }}>
                    <NodeCard id="gemini_ai" label="Gemini Reasoning" subtitle="gemini-1.5-flash" icon={Sparkles} color="#8B5CF6" width={120} />
                  </div>
                  <div style={{ position: 'absolute', left: 430, top: 205 }}>
                    <NodeCard id="mcp" label="MCP Connector" subtitle="Vertex MCP Router" icon={LinkIcon} color="#8B5CF6" width={120} />
                  </div>

                  {/* Column 5: Governance */}
                  <div style={{ position: 'absolute', left: 570, top: 150 }}>
                    <NodeCard id="looker_sl" label="Looker Semantic" subtitle="Governed Metrics" icon={Layers} color="#06B6D4" width={120} />
                  </div>

                  {/* Column 6: Data Layer */}
                  <div style={{ position: 'absolute', left: 710, top: 150 }}>
                    <NodeCard id="bigquery" label="BigQuery Warehouse" subtitle="Mock Datastores" icon={Database} color="#10B981" width={120} />
                  </div>

                  {/* Column 7: Action */}
                  <div style={{ position: 'absolute', left: 850, top: 150 }}>
                    <NodeCard id="workflow" label="Workflow Engine" subtitle="ERP Write-Back" icon={CheckCircle2} color="var(--success)" width={120} />
                  </div>
                </div>
              </SlideScaler>
            )}

            {/* Slides 3–6: Stepped visual flowchart journeys */}
            {activeSlide >= 3 && activeSlide <= 6 && (
              <SlideScaler designWidth={700} designHeight={320}>
                <div style={{
                  position: 'relative',
                  width: '700px',
                  height: '320px',
                  background: 'transparent'
                }}>
                  {/* SVG Wires Overlay */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                    {/* Persona (Col 1, Row 1) -> Decision API (Col 2, Row 1) */}
                    <path
                      d="M 205 48 L 255 48"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      markerEnd="url(#arrow-head-active)"
                      className="pulse-line"
                      fill="none"
                    />
                    {/* Decision API (Col 2, Row 1) -> Gemini (Col 3, Row 1) */}
                    <path
                      d="M 445 48 L 495 48"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      markerEnd="url(#arrow-head-active)"
                      className="pulse-line"
                      fill="none"
                    />
                    {/* Gemini (Col 3, Row 1) -> Looker (Col 3, Row 2) */}
                    <path
                      d="M 590 81 L 590 115"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      markerEnd="url(#arrow-head-active)"
                      className="pulse-line"
                      fill="none"
                    />
                    {/* Looker (Col 3, Row 2) -> BigQuery (Col 2, Row 2) */}
                    <path
                      d="M 495 148 L 445 148"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      markerEnd="url(#arrow-head-active)"
                      className="pulse-line"
                      fill="none"
                    />
                    {/* BigQuery (Col 2, Row 2) -> Workflow (Col 1, Row 2) */}
                    <path
                      d="M 255 148 L 205 148"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      markerEnd="url(#arrow-head-active)"
                      className="pulse-line"
                      fill="none"
                    />
                    {/* Workflow (Col 1, Row 2) -> Outcome Panel (Col 2, Row 3) */}
                    <path
                      d="M 110 181 Q 110 248 255 248"
                      stroke="var(--success)"
                      strokeWidth="2.5"
                      markerEnd="url(#arrow-head-green)"
                      className="pulse-line"
                      fill="none"
                    />
                  </svg>

                  {/* Row 1: Step 1, 2, 3 */}
                  <div style={{ position: 'absolute', left: 20, top: 20 }}>
                    <NodeCard id={activeSlide === 3 ? 'store_mgr' : activeSlide === 4 ? 'category_mgr' : activeSlide === 5 ? 'supply_lead' : 'store_mgr'} label={slide.personaTitle} subtitle={slide.persona} icon={slide.personaIcon} color="var(--accent)" />
                  </div>
                  <div style={{ position: 'absolute', left: 260, top: 20 }}>
                    <NodeCard id="di_api" label="Decision Intel API" subtitle="API Gateway" icon={GitBranch} color="white" />
                  </div>
                  <div style={{ position: 'absolute', left: 500, top: 20 }}>
                    <NodeCard id="gemini_ai" label="Gemini Reasoning" subtitle="Root-Cause Analysis" icon={Sparkles} color="#8B5CF6" />
                  </div>

                  {/* Row 2: Step 4, 5, 6 */}
                  <div style={{ position: 'absolute', left: 500, top: 120 }}>
                    <NodeCard id="looker_sl" label="Looker Validation" subtitle="Semantic Models" icon={Layers} color="#06B6D4" />
                  </div>
                  <div style={{ position: 'absolute', left: 260, top: 120 }}>
                    <NodeCard id="bigquery" label="BigQuery Warehouse" subtitle="Data Lookups" icon={Database} color="#10B981" />
                  </div>
                  <div style={{ position: 'absolute', left: 20, top: 120 }}>
                    <NodeCard id="workflow" label="Workflow Approved" subtitle="ERP Price Rule Write" icon={CheckCircle2} color="var(--success)" />
                  </div>

                  {/* Row 3: Outcome Panel */}
                  <div style={{
                    position: 'absolute',
                    left: 260,
                    top: 220,
                    background: 'rgba(16, 185, 129, 0.05)',
                    border: '2px solid var(--success)',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.35)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    width: 220,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    zIndex: 2
                  }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckCircle2 size={16} color="var(--success)" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.625rem', color: 'var(--success)', fontWeight: 800, textTransform: 'uppercase' }}>Outcome</div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-primary)' }}>{slide.outcomeLabel}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{slide.outcomeMetric}</div>
                    </div>
                  </div>
                </div>
              </SlideScaler>
            )}

            {/* Slide 7: AppSheet AI Enablement Blueprint */}
            {activeSlide === 7 && (
              <SlideScaler designWidth={850} designHeight={380}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, width: '100%' }}>
                  {/* Current state */}
                  <div className="card" style={{ border: '1px dashed var(--border-danger)', background: 'rgba(239, 68, 68, 0.01)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <h4 style={{ color: 'var(--danger)', fontSize: '0.8125rem', fontWeight: 800 }}>AppSheet Current (Static Data Entry)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <div className="card" style={{ width: 200, padding: 8, fontSize: '0.72rem', textAlign: 'center' }}>Store Form Input</div>
                      <LucideArrowDown size={14} color="var(--danger)" strokeWidth={2} />
                      <div className="card" style={{ width: 200, padding: 8, fontSize: '0.72rem', textAlign: 'center' }}>Flat Database Write</div>
                      <LucideArrowDown size={14} color="var(--danger)" strokeWidth={2} />
                      <div className="card" style={{ width: 200, padding: 8, fontSize: '0.72rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)' }}>Delayed lookup manual reports</div>
                    </div>
                  </div>

                  {/* Future state */}
                  <div className="card" style={{ border: '1px solid var(--border-success)', background: 'rgba(16, 185, 129, 0.03)', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <h4 style={{ color: 'var(--success)', fontSize: '0.8125rem', fontWeight: 800 }}>AppSheet Future (AI-Enabled & Governed)</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <div className="card" style={{ width: 210, padding: '6px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Smartphone size={12} color="var(--accent)" /> AppSheet Client View
                      </div>
                      <LucideArrowDown size={12} color="var(--success)" className="pulse-line" />
                      <div className="card" style={{ width: 210, padding: '6px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--accent)' }}>
                        <Globe size={12} color="white" /> Decision API Gateway
                      </div>
                      <LucideArrowDown size={12} color="var(--success)" className="pulse-line" />
                      <div className="card" style={{ width: 210, padding: '6px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #8B5CF6' }}>
                        <Sparkles size={12} color="#8B5CF6" /> Gemini AI Reasoning
                      </div>
                      <LucideArrowDown size={12} color="var(--success)" className="pulse-line" />
                      <div className="card" style={{ width: 210, padding: '6px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #06B6D4' }}>
                        <Layers size={12} color="#06B6D4" /> Looker Semantic Verification
                      </div>
                      <LucideArrowDown size={12} color="var(--success)" className="pulse-line" />
                      <div className="card" style={{ width: 210, padding: '6px 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(16,185,129,0.05)', border: '1px solid var(--success)' }}>
                        <CheckCircle2 size={12} color="var(--success)" /> Automated price write-back
                      </div>
                    </div>
                  </div>
                </div>
              </SlideScaler>
            )}

            {/* Slide 8: How A Recommendation Is Generated */}
            {activeSlide === 8 && (
              <SlideScaler designWidth={720} designHeight={360}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                  {[
                    { step: '1. Question', desc: 'Store Manager asks: "Why is waste increasing today?"', icon: User, color: 'var(--accent)' },
                    { step: '2. IAM Validation', desc: 'Gateway verifies credentials and limits visibility scope.', icon: Lock, color: 'var(--text-secondary)' },
                    { step: '3. Looker Metric Compile', desc: 'Platform constructs a query targeting semantic models.', icon: Layers, color: '#06B6D4' },
                    { step: '4. Gemini Contextualization', desc: 'Gemini evaluates metrics and weather/delay data via MCP.', icon: Sparkles, color: '#8B5CF6' },
                    { step: '5. Recommendation Issued', desc: 'Proposes 30% markdown early, dispatches writeback.', icon: CheckCircle2, color: 'var(--success)' },
                  ].map((life, idx) => (
                    <div key={idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-elevated)' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800, flexShrink: 0 }}>
                        {idx + 1}
                      </div>
                      <life.icon size={13} color={life.color} style={{ flexShrink: 0 }} />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--text-primary)', width: 140 }}>{life.step}</div>
                        <div style={{ fontSize: '0.7125rem', color: 'var(--text-secondary)' }}>{life.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </SlideScaler>
            )}

            {/* Slide 9: Why Gemini Cannot Hallucinate Here */}
            {activeSlide === 9 && (
              <SlideScaler designWidth={800} designHeight={360}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', textAlign: 'center', width: '100%' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06B6D4' }}>Governed Semantic Boundaries</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Direct raw data queries by LLMs are highly prone to hallucinating metrics, table names, and access rules. The Decision Intelligence cockpit routes all requests through Looker's semantic metric layer.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 440, background: 'rgba(6, 182, 212, 0.02)', border: '1px solid rgba(6, 182, 212, 0.2)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#06B6D4', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <Lock size={14} /> The Semantic Guardrail
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.7125rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                      <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
                        🚫 <strong>Gemini never</strong> writes direct SQL query filters.
                      </div>
                      <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
                        🚫 <strong>Gemini never</strong> accesses database connection strings.
                      </div>
                      <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
                        ✅ <strong>Looker translates</strong> metrics and dimensions into validated SQL.
                      </div>
                      <div style={{ padding: '6px 10px', background: 'var(--bg-elevated)', borderRadius: 4 }}>
                        ✅ <strong>Looker RLS</strong> blocks unauthorized rows at the API boundary.
                      </div>
                    </div>
                  </div>
                </div>
              </SlideScaler>
            )}

            {/* Slide 10: Governance & Trust */}
            {activeSlide === 10 && (
              <SlideScaler designWidth={760} designHeight={360}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', width: '100%' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Governed Security & Validation Gates</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
                    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--accent)' }}>LookML Rule Locks</div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        Metrics (e.g. gross profit margins, inventory levels) are defined once in LookML code. AI cannot overwrite or modify these equations.
                      </p>
                    </div>
                    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#8B5CF6' }}>Row-Level Security</div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        IAM profiles map user sessions to RLS rules. Store Managers see only their location, Category leads see their category.
                      </p>
                    </div>
                    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#10B981' }}>Human-in-the-loop</div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        AI generates markdown and rebalancing recommendations, but no action is taken without explicit user verification and approval.
                      </p>
                    </div>
                    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--warning)' }}>Audit & Verification Logs</div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        Every approved decision is logged back to the database, capturing user identity, time, AI confidence, and resolved metrics.
                      </p>
                    </div>
                  </div>
                </div>
              </SlideScaler>
            )}

            {/* Slide 11: Future-State Enterprise 2028 */}
            {activeSlide === 11 && (
              <SlideScaler designWidth={720} designHeight={360}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', paddingLeft: 20, borderLeft: '2px solid var(--border)', width: '100%', textAlign: 'left' }}>
                  {[
                    { time: '08:00', role: 'Store Manager', desc: 'Piccadilly lead Alex reviews fresh produce waste alerts and triggers early markdown rules.', icon: Store, color: 'var(--accent)' },
                    { time: '09:00', role: 'Category Manager', desc: 'Chilled buyer monitors campaign margins and adjusts ready meal promotion levels.', icon: Package, color: '#8B5CF6' },
                    { time: '11:00', role: 'Supply Chain Lead', desc: 'National team detects logistics delays and triggers backup vendor stock rebalancing.', icon: Truck, color: '#10B981' },
                    { time: '17:00', role: 'Enterprise Executive', desc: 'CEO reviews automatically compiled national weekly briefs and confidence matrices.', icon: Briefcase, color: 'white' }
                  ].map((t, idx) => (
                    <div key={idx} style={{ position: 'relative', display: 'flex', gap: 12, alignItems: 'center', padding: '4px 0' }}>
                      <div style={{ position: 'absolute', left: -26, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid #0d1321' }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', width: 45, flexShrink: 0 }}>{t.time}</div>
                      <t.icon size={13} color={t.color} style={{ flexShrink: 0 }} />
                      <div className="card" style={{ flex: 1, padding: '4px 10px', background: 'var(--bg-elevated)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{t.role}</span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{t.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SlideScaler>
            )}

          </div>

          {/* Bottom Deck Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {/* Dots */}
            <div style={{ display: 'flex', gap: 6 }}>
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setActiveSlide(idx);
                    setExpandedNode(null);
                  }}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: idx === activeSlide ? 'var(--accent)' : 'var(--border)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'background 0.2s ease'
                  }}
                  title={`Slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Prev/Next buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handlePrev}
                style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleNext}
                style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          </div>

        </div>

        {/* Right Side: Presenter notes and collapsible explanation panel */}
        {!canvasFullscreen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
            {/* Slide Info Meta */}
            <div
              className="card"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                background: '#101624',
                border: '1px solid var(--border)',
                maxHeight: '340px',
                overflowY: 'auto'
              }}
            >
              <div>
                <span style={{ fontSize: '0.625rem', padding: '2px 6px', background: 'var(--accent-light)', border: '1px solid var(--border-accent)', borderRadius: 4, color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase' }}>
                  {slide.persona} Scoped
                </span>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, marginTop: 6 }}>{slide.title}</h3>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>
                  Question/Trigger
                </span>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--warning)', marginTop: 2 }}>
                  "{slide.trigger}"
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>
                  Key Message
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-primary)', lineHeight: 1.4, margin: '2px 0 0' }}>
                  {slide.keyMessage}
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'block', fontWeight: 700 }}>
                  Business Value
                </span>
                <p style={{ fontSize: '0.75rem', color: 'var(--success)', lineHeight: 1.4, margin: '2px 0 0', fontWeight: 600 }}>
                  {slide.businessValue}
                </p>
              </div>
            </div>

            {/* Presenter Narrative Console */}
            <div
              className="card"
              style={{
                padding: '16px',
                background: 'rgba(0,120,255,0.01)',
                border: '1px dashed var(--border-accent)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                flex: 1,
                overflowY: 'auto'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} /> Presenter Notes
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[
                    { id: 'business', label: 'Biz' },
                    { id: 'architecture', label: 'Arch' },
                    { id: 'technical', label: 'Tech' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setNarrativeTab(tab.id as any)}
                      style={{
                        padding: '1px 5px',
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        border: '1px solid var(--border)',
                        background: narrativeTab === tab.id ? 'var(--accent)' : 'none',
                        color: narrativeTab === tab.id ? 'white' : 'var(--text-secondary)',
                        borderRadius: 3,
                        cursor: 'pointer'
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {narrativeTab === 'business' ? slide.businessNarrative :
                 narrativeTab === 'architecture' ? slide.architectureNarrative :
                 slide.technicalNarrative}
              </p>

              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 6, fontStyle: 'italic' }}>
                Presenter Script: {slide.presenterNotes}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
