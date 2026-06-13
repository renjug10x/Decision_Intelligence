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
    keyMessage: 'Unifying Looker, Gemini, and AppSheet to eliminate signal-to-action lag in LiDL operations.',
    businessValue: 'Bridges raw data silos and report latencies, giving decision makers automated, pre-validated actions.',
    technicalDetails: 'Integrates BigQuery analytical capacity and Looker semantic definitions with Gemini reasoning and AppSheet actions.',
    businessNarrative: 'Every day, operational anomalies occur across LiDL UK—like stockouts, produce waste spikes, or labour gaps. Traditionally, these signals take days to translate into actions due to fragmented reporting. The Decision Intelligence cockpit closes this gap instantly, moving from signal to action in seconds.',
    architectureNarrative: 'This platform sits as a coordination layer above LiDL\'s existing IT stack. It binds raw data warehouses, semantic definitions, Large Language Models, and mobile applications into a unified, secure execution loop.',
    technicalNarrative: 'Leverages Next.js server actions, Looker SDK filters, and Gemini API calls to dynamically validate user access, compute KPIs through governed schemas, and trigger webhooks in AppSheet.',
    presenterNotes: 'Pitch Slide 0 by emphasizing the strategic problem: LiDL is rich in data but slow to act. Introduce the platform as a real-time coordination loop.',
    outcomeMetric: 'Decision Latency',
    outcomeLabel: 'Hours ➔ Seconds',
    persona: 'Strategy Team',
    personaTitle: 'LiDL UK Strategy',
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
    title: 'Enterprise Blueprint',
    trigger: 'Unified platform map connecting people, data, AI and action.',
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
    keyMessage: 'LiDL Executives receive AI-curated summaries of national operational anomalies.',
    businessValue: 'Replaces manual briefing slide decks with a verified, interactive operations dashboard.',
    technicalDetails: 'Briefing Centre queries national KPIs, active anomalies, and Looker semantic models.',
    businessNarrative: 'The CEO prepares for the weekly operations review. Rather than waiting for analysts to assemble slides, they open the Briefing Centre, read the AI-curated summary, and approve national rebalancing tasks.',
    architectureNarrative: 'Follow the journey: Executive ➔ Briefing Request ➔ Briefing Centre App ➔ Multi-Category Analytics ➔ Gemini Briefing Compiler ➔ Approved Briefing ➔ Actions Approved.',
    technicalNarrative: 'Aggregated KPI data and active anomaly lists are compiled. A Gemini prompt is sent with strict Looker-governed metrics to produce a clean narrative brief.',
    presenterNotes: 'Explain how the briefing center replaces slides. Show that the CEO can approve Trafford-to-Piccadilly ready meal transfers with one click.',
    outcomeMetric: 'Reporting Overhead',
    outcomeLabel: 'Zero Manual Decks',
    persona: 'Executive',
    personaTitle: 'LiDL UK Chief Executive',
    personaIcon: Briefcase
  },
  {
    title: 'The Business Value Engine',
    trigger: 'Operating Value Framework',
    keyMessage: 'Real-time decision validation directly impacts LiDL\'s bottom line across four value pillars.',
    businessValue: 'Converts tactical operational improvements into measurable corporate financial outcomes.',
    technicalDetails: 'Maps operational actions to high-level KPIs calculated continuously through the Looker semantic layer.',
    businessNarrative: 'This slide presents the core business value engine. By organizing decisions into four quadrants—Revenue, Margin, Waste, and Productivity—we ensure that every alert and action is directly tied to business value.',
    architectureNarrative: 'Illustrates the value structure. Operational actions feed into margin protection, waste reduction, sales recovery, and analyst productivity, while the central loop logs outcomes for continuous learning.',
    technicalNarrative: 'The central DI engine links operational schemas to high-level analytical dashboards, logging confidence scores and executed values into BigQuery.',
    presenterNotes: 'Show how DI drives value in four key business areas: Revenue, Margin, Waste, and Productivity. Explain that it is a repeatable value framework, not just a set of features.',
    outcomeMetric: 'Primary Pillars',
    outcomeLabel: '4 Value Quadrants',
    persona: 'Executive',
    personaTitle: 'Chief Financial Officer',
    personaIcon: Briefcase
  },
  {
    title: 'AppSheet AI Enablement Blueprint',
    trigger: 'Citizen developer strategy',
    keyMessage: 'Upgrading existing AppSheet applications into decision cockpits via the DI API.',
    businessValue: 'Empowers business users to build AI-driven tools without custom IT engineering.',
    technicalDetails: 'Details the transformation path from static data forms to AI-assisted, Looker-governed applications.',
    businessNarrative: 'LiDL has dozens of AppSheet apps. By connecting them to the Decision Intelligence API, we inject Gemini recommendations and Looker metrics directly into these apps, turning data-entry tools into decision accelerators.',
    architectureNarrative: 'Walk through the transformation: AppSheet apps (Store, Category, Supply) connect to the Next.js API gateway, which routes requests to Looker schemas and Gemini models.',
    technicalNarrative: 'AppSheet reads and writes to Next.js API endpoints. Form submissions trigger webhooks that execute Looker write-backs, updating store databases.',
    presenterNotes: 'Explain the citizen developer story. Show how AppSheet apps go from basic forms to AI cockpits using the DI API.',
    outcomeMetric: 'LiDL App Dev Speed',
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
    businessNarrative: 'LiDL\'s governance model relies on three pillars: strict IAM attributes, governed LookML definitions, and a mandatory human approval check for any operational adjustments.',
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
    title: 'Why This Matters to LiDL',
    trigger: 'Enterprise Rollout Strategy',
    keyMessage: 'Scaling the governed decision engine across all operating domains without custom IT rebuilds.',
    businessValue: 'Maximizes ROI by reusing the same security, metrics, and reasoning infrastructure for future use cases.',
    technicalDetails: 'Illustrates the hub-and-spoke expansion model where new client applications interface with the shared DI API.',
    businessNarrative: 'LiDL\'s long-term opportunity is scalability. By implementing a central, governed decision layer, we can scale this capability from waste and availability to labour, energy, promotions, and store operations.',
    architectureNarrative: 'Walk through the hub-and-spoke expansion model. The core Decision Layer serves as the hub, and different operational domains connect as spokes.',
    technicalNarrative: 'The unified API gateway (/api/data) and Looker semantic layer act as a reusable backend. New domains hook into this backend with minimal front-end app-development.',
    presenterNotes: 'Explain how this platform acts as an enterprise decision layer. As we build new AppSheet apps or Next.js front-ends, they all consume the same Looker models and Gemini APIs.',
    outcomeMetric: 'Operational Scope',
    outcomeLabel: '8 Scaled Domains',
    persona: 'BI/Data Team',
    personaTitle: 'Head of IT Architecture',
    personaIcon: Code2
  },
  {
    title: 'Day in the Life with Decision Intelligence',
    trigger: 'How thousands of daily decisions become coordinated outcomes.',
    keyMessage: 'A normal operating day becomes a coordinated flow of human judgment, governed intelligence, and timely action.',
    businessValue: 'Optimizes store efficiency, minimizes category waste, and protects national margins.',
    technicalDetails: 'A cinematic operating-day storyboard showing continuous coordination across stores, supply, trading, operations, and leadership.',
    businessNarrative: 'Across one normal day at LiDL, Decision Intelligence continuously identifies risks, recommends governed actions, and keeps people focused on the highest-value decisions rather than report interpretation.',
    architectureNarrative: 'Shows the living operating model: store readiness, supply intelligence, dynamic trading, operational optimisation, and executive command all flowing through the same governed decision layer.',
    technicalNarrative: 'A shared Next.js API, Looker semantic layer, Gemini reasoning, and workflow integrations coordinate signals and approved actions asynchronously throughout the operating day.',
    presenterNotes: 'Conclude by showing Decision Intelligence as everyday operating muscle: the same governed engine helps teams sense, decide, and act throughout the day.',
    outcomeMetric: 'Est. Annual Savings',
    outcomeLabel: '£12.4M National ROI',
    persona: 'Executive',
    personaTitle: 'LiDL UK Board',
    personaIcon: Briefcase
  }
];

const SCALE_DOMAIN_SEQUENCE = [
  'waste',
  'availability',
  'margin',
  'labour',
  'energy',
  'promotions',
  'store_ops',
  'supply_chain'
];

const FINALE_SCENES = [
  {
    time: '06:00',
    title: 'Store Readiness',
    narrative: 'Risks identified before stores open.',
    icon: Store
  },
  {
    time: '09:00',
    title: 'Supply Intelligence',
    narrative: 'Supply disruption detected and alternatives recommended.',
    icon: Truck
  },
  {
    time: '12:00',
    title: 'Trading Intelligence',
    narrative: 'Demand changes trigger dynamic pricing and replenishment decisions.',
    icon: BarChart3
  },
  {
    time: '15:00',
    title: 'Operational Optimisation',
    narrative: 'Labour and operational effort automatically rebalanced.',
    icon: Users
  },
  {
    time: '18:00',
    title: 'Executive Command',
    narrative: 'Leadership receives outcomes, not reports.',
    icon: Briefcase
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
  const [transitionLabel, setTransitionLabel] = useState<string | null>(null);
  const [transitionActive, setTransitionActive] = useState(false);
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
  const [hoveredSpoke, setHoveredSpoke] = useState<string | null>(null);
  const [autoSpokeIndex, setAutoSpokeIndex] = useState(0);
  const [finaleStep, setFinaleStep] = useState(0);

  useEffect(() => {
    let label = '';
    if (activeSlide === 2) label = 'PLATFORM';
    else if (activeSlide === 8) label = 'SCALE';
    else if (activeSlide === 11) label = 'TRUST';
    else if (activeSlide === 13) label = 'IMPACT';

    if (label) {
      setTransitionLabel(label);
      setTransitionActive(true);
      const timer = setTimeout(() => {
        setTransitionActive(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setTransitionActive(false);
    }
  }, [activeSlide]);

  const slide = SLIDES[activeSlide];
  const activeSpokeKey = hoveredSpoke || SCALE_DOMAIN_SEQUENCE[autoSpokeIndex];
  const currentFinaleScene = FINALE_SCENES[Math.min(finaleStep, FINALE_SCENES.length - 1)];

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

  useEffect(() => {
    if (activeSlide !== 12) return;

    const interval = window.setInterval(() => {
      setAutoSpokeIndex((prev) => (prev + 1) % SCALE_DOMAIN_SEQUENCE.length);
    }, 2200);

    return () => window.clearInterval(interval);
  }, [activeSlide]);

  useEffect(() => {
    if (activeSlide !== 13) {
      setFinaleStep(0);
      return;
    }

    setFinaleStep(0);
    const interval = window.setInterval(() => {
      setFinaleStep((prev) => {
        if (prev >= FINALE_SCENES.length) {
          window.clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1550);

    return () => window.clearInterval(interval);
  }, [activeSlide]);

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
      title: 'Store Manager',
      subtitle: 'Piccadilly Store',
      biz: 'Sees store risks early and can act before availability, waste, or staffing issues reach customers.',
      tech: 'Receives only the Piccadilly operating view, with recommendations scoped to local decisions.'
    },
    category_mgr: {
      title: 'Category Manager',
      subtitle: 'Chilled Trading',
      biz: 'Protects margin and promotion performance while trading conditions change during the day.',
      tech: 'Receives a category-specific view so decisions stay focused on the right commercial levers.'
    },
    supply_lead: {
      title: 'Supply Chain Lead',
      subtitle: 'National Logistics',
      biz: 'Acts on supplier delays and route pressure before they become store-level availability problems.',
      tech: 'Receives a national supply view that connects delivery risk to replenishment action.'
    },
    citizen_dev: {
      title: 'Citizen Developer',
      subtitle: 'Business App Builder',
      biz: 'Turns local operating ideas into useful decision workflows without waiting for a full engineering cycle.',
      tech: 'Builds on the shared decision layer so new tools inherit the same governance pattern.'
    },
    exec: {
      title: 'Executive Leader',
      subtitle: 'National Operating View',
      biz: 'Reviews outcomes, exceptions, and decisions that matter across the operating estate.',
      tech: 'Sees aggregated intelligence without breaking the governed decision model.'
    },
    store_app: {
      title: 'Store Intelligence App',
      subtitle: 'Store Decision Cockpit',
      biz: 'Turns store signals into clear recommended actions for managers and colleagues.',
      tech: 'Connects approved decisions back into the shared operating workflow.'
    },
    trading_app: {
      title: 'Trading Intelligence App',
      subtitle: 'Commercial Cockpit',
      biz: 'Helps category teams protect margin, promotion performance, and availability.',
      tech: 'Uses governed commercial metrics before recommendations are made.'
    },
    supply_app: {
      title: 'Supply Radar App',
      subtitle: 'Supply Decision Cockpit',
      biz: 'Highlights supply risk and proposes alternatives before the store feels disruption.',
      tech: 'Connects supplier signals, inventory pressure, and approved recovery action.'
    },
    appsheet: {
      title: 'AppSheet Platform',
      subtitle: 'Business App Studio',
      biz: 'Lets business teams create lightweight tools that plug into the enterprise decision engine.',
      tech: 'Uses standard governed services rather than one-off local logic.'
    },
    di_api: {
      title: 'Decision Intelligence Layer',
      subtitle: 'Shared Decision Engine',
      biz: 'The reusable coordination layer that turns signals into governed recommendations.',
      tech: 'Orchestrates identity, metrics, reasoning, and action through one controlled path.'
    },
    gemini_ai: {
      title: 'Gemini Reasoning',
      subtitle: 'Recommendation Intelligence',
      biz: 'Evaluates the situation and proposes the next best action using governed business context.',
      tech: 'Reasons only over approved context and controlled prompts.'
    },
    looker_sl: {
      title: 'Looker Semantic Layer',
      subtitle: 'Governed Metrics',
      biz: 'Keeps every recommendation anchored to trusted definitions and consistent KPIs.',
      tech: 'Provides the approved metric boundary for AI-assisted decisions.'
    },
    bigquery: {
      title: 'BigQuery Warehouse',
      subtitle: 'Enterprise Data Foundation',
      biz: 'Stores the operational signals that reveal risk, opportunity, and performance movement.',
      tech: 'Provides governed data signals to the semantic layer.'
    },
    workflow: {
      title: 'Workflow Engine',
      subtitle: 'Approved Action',
      biz: 'Moves approved recommendations into operational execution where value is captured.',
      tech: 'Connects decisions to the systems that carry out the action.'
    },
    mcp: {
      title: 'Connector Layer',
      subtitle: 'Enterprise Context',
      biz: 'Connects additional enterprise context when a decision needs supplier, logistics, or system detail.',
      tech: 'Bridges governed reasoning with approved enterprise services.'
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
    width = 180,
    tooltipDir,
    tooltipAlign
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
    tooltipDir?: 'up' | 'down';
    tooltipAlign?: 'left' | 'right' | 'center';
  }) => {
    const isHovered = hoveredNode === id;
    const isExpanded = expandedNode === id;
    const cardRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [adjustedDir, setAdjustedDir] = useState<'up' | 'down'>(tooltipDir || 'down');
    const [adjustedAlign, setAdjustedAlign] = useState<'left' | 'right' | 'center'>(tooltipAlign || 'left');

    useEffect(() => {
      if (!isExpanded) return;

      const adjustPosition = () => {
        const cardEl = cardRef.current;
        if (!cardEl) return;
        const rect = cardEl.getBoundingClientRect();
        
        let tWidth = 270;
        let tHeight = 150;
        if (tooltipRef.current) {
          const tRect = tooltipRef.current.getBoundingClientRect();
          tWidth = tRect.width;
          tHeight = tRect.height;
        }

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let finalDir = tooltipDir || 'down';
        let finalAlign = tooltipAlign || 'left';

        // Check if tooltip overflows the bottom of the viewport
        if (finalDir === 'down') {
          if (rect.bottom + tHeight + 15 > viewportHeight && rect.top - tHeight - 15 > 0) {
            finalDir = 'up';
          }
        } else if (finalDir === 'up') {
          if (rect.top - tHeight - 15 < 0 && rect.bottom + tHeight + 15 < viewportHeight) {
            finalDir = 'down';
          }
        }

        // Check horizontal overflows
        if (finalAlign === 'left') {
          if (rect.left + tWidth + 15 > viewportWidth && rect.right - tWidth - 15 > 0) {
            finalAlign = 'right';
          }
        } else if (finalAlign === 'right') {
          if (rect.right - tWidth - 15 < 0 && rect.left + tWidth + 15 < viewportWidth) {
            finalAlign = 'left';
          }
        } else if (finalAlign === 'center') {
          const leftBound = rect.left + rect.width / 2 - tWidth / 2;
          const rightBound = rect.left + rect.width / 2 + tWidth / 2;
          if (leftBound - 15 < 0 && rightBound + 15 <= viewportWidth) {
            finalAlign = 'left';
          } else if (rightBound + 15 > viewportWidth && leftBound - 15 >= 0) {
            finalAlign = 'right';
          }
        }

        setAdjustedDir(finalDir);
        setAdjustedAlign(finalAlign);
      };

      adjustPosition();

      const rafId = requestAnimationFrame(adjustPosition);
      window.addEventListener('resize', adjustPosition);
      window.addEventListener('scroll', adjustPosition);

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', adjustPosition);
        window.removeEventListener('scroll', adjustPosition);
      };
    }, [isExpanded, tooltipDir, tooltipAlign]);

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
        className="architecture-node-shell"
        ref={cardRef}
        style={{
          position: 'relative',
          transition: 'all 0.25s ease',
          zIndex: isHovered || isExpanded ? 50 : 2,
          opacity: hoveredNode && !isRouteActive ? 0.16 : 1,
          filter: hoveredNode && !isRouteActive ? 'saturate(0.55)' : 'none'
        }}
        onMouseEnter={() => setHoveredNode(id)}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={(e) => {
          e.stopPropagation();
          setExpandedNode(isExpanded ? null : id);
        }}
      >
        <div
          className={`card ${isRouteActive ? 'glowing-node architecture-node-active' : ''}`}
          title={`${label}${subtitle ? ` - ${subtitle}` : ''}`}
          style={{
            background: bgColor,
            border: `1px solid ${isRouteActive || isExpanded ? 'var(--accent)' : borderColor}`,
            padding: '10px 13px',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            boxShadow: isRouteActive ? '0 0 24px rgba(0, 120, 255, 0.42), inset 0 0 18px rgba(0, 120, 255, 0.08)' : 'none',
            transform: isHovered ? 'translateY(-2px)' : isRouteActive ? 'translateY(-1px)' : 'none',
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
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'normal', lineHeight: 1.22 }}>
              {label}
            </div>
            {subtitle && (
              <div style={{ fontSize: '0.59rem', color: 'var(--text-secondary)', whiteSpace: 'normal', wordBreak: 'normal', overflowWrap: 'normal', lineHeight: 1.22, marginTop: 3 }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {/* Node details expanded tooltip */}
        {isExpanded && NODE_DETAILS[id] && (
          <div
            ref={tooltipRef}
            className="card"
            style={{
              position: 'absolute',
              width: 270,
              zIndex: 100,
              padding: 16,
              background: '#101624',
              border: '1px solid var(--accent)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              textAlign: 'left',
              ...(adjustedDir === 'down' ? { top: '105%' } : { bottom: '105%' }),
              ...(adjustedAlign === 'left' ? { left: 0, right: 'auto' } : adjustedAlign === 'right' ? { right: 0, left: 'auto' } : { left: '50%', transform: 'translateX(-50%)' })
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{NODE_DETAILS[id].title}</div>
                <div style={{ fontSize: '0.66rem', color: 'var(--accent)', fontWeight: 700, marginTop: 2 }}>{NODE_DETAILS[id].subtitle}</div>
              </div>
              <button onClick={() => setExpandedNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              <strong>Business impact:</strong> {NODE_DETAILS[id].biz}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong>Platform role:</strong> {NODE_DETAILS[id].tech}
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
      className="architecture-storyboard"
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
          <marker id="arrow-head-yellow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 2 L 10 5 L 0 8 z" fill="var(--warning)" />
          </marker>
          <marker id="arrow-head-purple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 2 L 10 5 L 0 8 z" fill="#8B5CF6" />
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
            padding: '28px 28px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            background: '#0d1321',
            border: '1px solid var(--border)',
            position: canvasFullscreen ? 'fixed' : 'relative',
            top: canvasFullscreen ? 16 : 'auto',
            right: canvasFullscreen ? 16 : 'auto',
            bottom: canvasFullscreen ? 16 : 'auto',
            left: canvasFullscreen ? 16 : 'auto',
            zIndex: canvasFullscreen ? 1000 : 1,
            height: canvasFullscreen ? 'calc(100vh - 32px)' : 'calc(100vh - 180px)',
            minHeight: canvasFullscreen ? 'none' : '660px',
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
            gap: 12,
            zIndex: 10
          }}>
            {/* LiDL Logo */}
            <img src="/lidl-logo.png" className="brand-lidl-logo" alt="LiDL Logo" style={{ height: 24, objectFit: 'contain', marginRight: 4 }} />

            {/* Transition Badge */}
            {transitionLabel && (
              <span style={{
                fontSize: '0.625rem',
                fontWeight: 800,
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                padding: '2px 6px',
                borderRadius: '3px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(0, 120, 255, 0.05)',
                opacity: transitionActive ? 0.75 : 0,
                transition: 'opacity 300ms ease',
                pointerEvents: 'none'
              }}>
                [ {transitionLabel} ]
              </span>
            )}

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

          {/* Premium Storyboard Header */}
          <header className="storyboard-slide-header">
            <div className="storyboard-header-rule" aria-hidden="true" />
            <div className="storyboard-header-copy">
              <span className="storyboard-slide-kicker">
                LiDL Decision Intelligence POC
              </span>
              <h2 className="storyboard-slide-title">
                {slide.title}
              </h2>
              <p className="storyboard-slide-subtitle">
                {slide.trigger}
              </p>
            </div>
          </header>

          {/* Slide Diagram Render Area (Guaranteed Centering Wrapper) */}
          <div className="storyboard-slide-stage">
            
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
              <SlideScaler designWidth={1090} designHeight={360}>
                <div style={{
                  position: 'relative',
                  width: '1090px',
                  height: '360px',
                  background: 'transparent'
                }}>
                  {/* Layer Titles */}
                  <div style={{ position: 'absolute', left: 10, top: 10, fontSize: '0.625rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase' }}>1. Business</div>
                  <div style={{ position: 'absolute', left: 165, top: 10, fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>2. Apps</div>
                  <div style={{ position: 'absolute', left: 320, top: 10, fontSize: '0.625rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>3. Decision</div>
                  <div style={{ position: 'absolute', left: 475, top: 10, fontSize: '0.625rem', fontWeight: 800, color: '#8B5CF6', textTransform: 'uppercase' }}>4. AI Layer</div>
                  <div style={{ position: 'absolute', left: 630, top: 10, fontSize: '0.625rem', fontWeight: 800, color: '#06B6D4', textTransform: 'uppercase' }}>5. Governance</div>
                  <div style={{ position: 'absolute', left: 785, top: 10, fontSize: '0.625rem', fontWeight: 800, color: '#10B981', textTransform: 'uppercase' }}>6. Data Layer</div>
                  <div style={{ position: 'absolute', left: 940, top: 10, fontSize: '0.625rem', fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase' }}>7. Action</div>

                  {/* SVG Wires Overlay */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                    {/* Store Manager Flow */}
                    <path
                      d="M 147 67 L 162 67"
                      stroke={isPathActive('store_mgr', 'store_app') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('store_mgr', 'store_app') ? 3 : 0.75}
                      markerEnd={isPathActive('store_mgr', 'store_app') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('store_mgr', 'store_app') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 302 67 Q 310 122 317 177"
                      stroke={isPathActive('store_app', 'di_api') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('store_app', 'di_api') ? 3 : 0.75}
                      markerEnd={isPathActive('store_app', 'di_api') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('store_app', 'di_api') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* Category Manager Flow */}
                    <path
                      d="M 147 177 L 162 177"
                      stroke={isPathActive('category_mgr', 'trading_app') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('category_mgr', 'trading_app') ? 3 : 0.75}
                      markerEnd={isPathActive('category_mgr', 'trading_app') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('category_mgr', 'trading_app') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 302 177 L 317 177"
                      stroke={isPathActive('trading_app', 'di_api') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('trading_app', 'di_api') ? 3 : 0.75}
                      markerEnd={isPathActive('trading_app', 'di_api') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('trading_app', 'di_api') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* Supply Chain Flow */}
                    <path
                      d="M 147 287 L 162 287"
                      stroke={isPathActive('supply_lead', 'supply_app') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('supply_lead', 'supply_app') ? 3 : 0.75}
                      markerEnd={isPathActive('supply_lead', 'supply_app') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('supply_lead', 'supply_app') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 302 287 Q 310 232 317 177"
                      stroke={isPathActive('supply_app', 'di_api') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('supply_app', 'di_api') ? 3 : 0.75}
                      markerEnd={isPathActive('supply_app', 'di_api') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('supply_app', 'di_api') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* Shared Decision API to AI Layer */}
                    <path
                      d="M 457 177 Q 465 150 472 122"
                      stroke={isPathActive('di_api', 'gemini_ai') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('di_api', 'gemini_ai') ? 3 : 0.75}
                      markerEnd={isPathActive('di_api', 'gemini_ai') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('di_api', 'gemini_ai') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 457 177 Q 465 205 472 232"
                      stroke={isPathActive('di_api', 'mcp') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('di_api', 'mcp') ? 3 : 0.75}
                      markerEnd={isPathActive('di_api', 'mcp') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('di_api', 'mcp') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* AI Layer to Governance / Workflow */}
                    <path
                      d="M 612 122 Q 620 150 627 177"
                      stroke={isPathActive('gemini_ai', 'looker_sl') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('gemini_ai', 'looker_sl') ? 3 : 0.75}
                      markerEnd={isPathActive('gemini_ai', 'looker_sl') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('gemini_ai', 'looker_sl') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 542 151 L 542 202"
                      stroke={isPathActive('gemini_ai', 'mcp') ? 'var(--accent)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('gemini_ai', 'mcp') ? 3 : 0.75}
                      markerEnd={isPathActive('gemini_ai', 'mcp') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('gemini_ai', 'mcp') ? 'pulse-line' : ''}
                      fill="none"
                    />
                    <path
                      d="M 612 232 Q 775 232 937 177"
                      stroke={isPathActive('mcp', 'workflow') ? 'var(--success)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('mcp', 'workflow') ? 3 : 0.75}
                      markerEnd={isPathActive('mcp', 'workflow') ? 'url(#arrow-head-green)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('mcp', 'workflow') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* Looker to BigQuery */}
                    <path
                      d="M 767 177 L 782 177"
                      stroke={isPathActive('looker_sl', 'bigquery') ? '#06B6D4' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('looker_sl', 'bigquery') ? 3 : 0.75}
                      markerEnd={isPathActive('looker_sl', 'bigquery') ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('looker_sl', 'bigquery') ? 'pulse-line' : ''}
                      fill="none"
                    />

                    {/* BigQuery to Workflow */}
                    <path
                      d="M 922 177 L 937 177"
                      stroke={isPathActive('bigquery', 'workflow') ? 'var(--success)' : 'rgba(255,255,255,0.035)'}
                      strokeWidth={isPathActive('bigquery', 'workflow') ? 3 : 0.75}
                      markerEnd={isPathActive('bigquery', 'workflow') ? 'url(#arrow-head-green)' : 'url(#arrow-head-inactive)'}
                      className={isPathActive('bigquery', 'workflow') ? 'pulse-line' : ''}
                      fill="none"
                    />
                  </svg>

                  {/* Column 1: Business */}
                  <div style={{ position: 'absolute', left: 10, top: 40 }}>
                    <NodeCard id="store_mgr" label="Store Manager" subtitle="Piccadilly S001" icon={Store} color="var(--accent)" width={135} />
                  </div>
                  <div style={{ position: 'absolute', left: 10, top: 150 }}>
                    <NodeCard id="category_mgr" label="Category Manager" subtitle="Chilled Category" icon={Package} color="#8B5CF6" width={135} />
                  </div>
                  <div style={{ position: 'absolute', left: 10, top: 260 }}>
                    <NodeCard id="supply_lead" label="Supply Lead" subtitle="Logistics Director" icon={Truck} color="#10B981" width={135} />
                  </div>

                  {/* Column 2: Apps */}
                  <div style={{ position: 'absolute', left: 165, top: 40 }}>
                    <NodeCard id="store_app" label="Store Intel App" subtitle="AppSheet Client" icon={Smartphone} color="var(--accent)" width={135} />
                  </div>
                  <div style={{ position: 'absolute', left: 165, top: 150 }}>
                    <NodeCard id="trading_app" label="Trading Intel App" subtitle="Next.js Client" icon={BarChart3} color="#8B5CF6" width={135} />
                  </div>
                  <div style={{ position: 'absolute', left: 165, top: 260 }}>
                    <NodeCard id="supply_app" label="Supply Radar App" subtitle="Logistics Client" icon={Globe} color="#10B981" width={135} />
                  </div>

                  {/* Column 3: Decision */}
                  <div style={{ position: 'absolute', left: 320, top: 150 }}>
                    <NodeCard id="di_api" label="Decision API" subtitle="app/api/data" icon={GitBranch} color="white" width={135} />
                  </div>

                  {/* Column 4: AI Layer */}
                  <div style={{ position: 'absolute', left: 475, top: 95 }}>
                    <NodeCard id="gemini_ai" label="Gemini Reasoning" subtitle="gemini-1.5-flash" icon={Sparkles} color="#8B5CF6" width={150} />
                  </div>
                  <div style={{ position: 'absolute', left: 475, top: 205 }}>
                    <NodeCard id="mcp" label="MCP Connector" subtitle="Vertex MCP Router" icon={LinkIcon} color="#8B5CF6" width={135} />
                  </div>

                  {/* Column 5: Governance */}
                  <div style={{ position: 'absolute', left: 630, top: 150 }}>
                    <NodeCard id="looker_sl" label="Looker Semantic" subtitle="Governed Metrics" icon={Layers} color="#06B6D4" width={135} />
                  </div>

                  {/* Column 6: Data Layer */}
                  <div style={{ position: 'absolute', left: 785, top: 150 }}>
                    <NodeCard id="bigquery" label="BigQuery Warehouse" subtitle="Mock Datastores" icon={Database} color="#10B981" width={150} />
                  </div>

                  {/* Column 7: Action */}
                  <div style={{ position: 'absolute', left: 940, top: 150 }}>
                    <NodeCard id="workflow" label="Workflow Engine" subtitle="ERP Write-Back" icon={CheckCircle2} color="var(--success)" width={150} />
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
                    <NodeCard id="gemini_ai" label="Gemini Reasoning" subtitle="Root-Cause Analysis" icon={Sparkles} color="#8B5CF6" tooltipAlign="right" />
                  </div>

                  {/* Row 2: Step 4, 5, 6 */}
                  <div style={{ position: 'absolute', left: 500, top: 120 }}>
                    <NodeCard id="looker_sl" label="Looker Validation" subtitle="Semantic Models" icon={Layers} color="#06B6D4" tooltipAlign="right" tooltipDir="up" />
                  </div>
                  <div style={{ position: 'absolute', left: 260, top: 120 }}>
                    <NodeCard id="bigquery" label="BigQuery Warehouse" subtitle="Data Lookups" icon={Database} color="#10B981" tooltipDir="up" />
                  </div>
                  <div style={{ position: 'absolute', left: 20, top: 120 }}>
                    <NodeCard id="workflow" label="Workflow Approved" subtitle="ERP Price Rule Write" icon={CheckCircle2} color="var(--success)" tooltipDir="up" />
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

{/* Slide 7: The Business Value Engine (Executive Command Wheel) */}
            {activeSlide === 7 && (
              <SlideScaler designWidth={850} designHeight={360}>
                <div style={{ position: 'relative', width: '850px', height: '360px', background: 'transparent' }}>
                  
                  {/* SVG connecting lines from Outer Domains to Center Engine */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                    {/* North (Revenue) -> Center */}
                    <line
                      x1="425"
                      y1="75"
                      x2="425"
                      y2="90"
                      stroke={hoveredDomain === 'revenue' ? 'var(--accent)' : 'rgba(255,255,255,0.08)'}
                      strokeWidth={hoveredDomain === 'revenue' ? 2.5 : 1}
                      markerEnd={hoveredDomain === 'revenue' ? 'url(#arrow-head-active)' : 'url(#arrow-head-inactive)'}
                      className={hoveredDomain === 'revenue' ? 'pulse-line' : ''}
                      style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
                    />
                    {/* East (Margin) -> Center */}
                    <line
                      x1="592.5"
                      y1="150"
                      x2="535"
                      y2="150"
                      stroke={hoveredDomain === 'margin' ? '#8B5CF6' : 'rgba(255,255,255,0.08)'}
                      strokeWidth={hoveredDomain === 'margin' ? 2.5 : 1}
                      markerEnd={hoveredDomain === 'margin' ? 'url(#arrow-head-purple)' : 'url(#arrow-head-inactive)'}
                      className={hoveredDomain === 'margin' ? 'pulse-line' : ''}
                      style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
                    />
                    {/* South (Productivity) -> Center */}
                    <line
                      x1="425"
                      y1="225"
                      x2="425"
                      y2="210"
                      stroke={hoveredDomain === 'productivity' ? 'var(--success)' : 'rgba(255,255,255,0.08)'}
                      strokeWidth={hoveredDomain === 'productivity' ? 2.5 : 1}
                      markerEnd={hoveredDomain === 'productivity' ? 'url(#arrow-head-green)' : 'url(#arrow-head-inactive)'}
                      className={hoveredDomain === 'productivity' ? 'pulse-line' : ''}
                      style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
                    />
                    {/* West (Waste) -> Center */}
                    <line
                      x1="257.5"
                      y1="150"
                      x2="315"
                      y2="150"
                      stroke={hoveredDomain === 'waste' ? 'var(--warning)' : 'rgba(255,255,255,0.08)'}
                      strokeWidth={hoveredDomain === 'waste' ? 2.5 : 1}
                      markerEnd={hoveredDomain === 'waste' ? 'url(#arrow-head-yellow)' : 'url(#arrow-head-inactive)'}
                      className={hoveredDomain === 'waste' ? 'pulse-line' : ''}
                      style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
                    />
                  </svg>

                  {/* Responsive Grid layout for Command Wheel */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 220px 1fr',
                    gridTemplateRows: '80px 140px 80px',
                    width: '100%',
                    height: '300px',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {/* Row 1: North (Revenue) */}
                    <div style={{ gridColumn: '2', gridRow: '1', display: 'flex', justifyContent: 'center' }}>
                      <div
                        className="card"
                        tabIndex={0}
                        onMouseEnter={() => setHoveredDomain('revenue')}
                        onMouseLeave={() => setHoveredDomain(null)}
                        onFocus={() => setHoveredDomain('revenue')}
                        onBlur={() => setHoveredDomain(null)}
                        style={{
                          width: 200,
                          height: 70,
                          padding: '8px 10px',
                          borderTop: '3px solid var(--accent)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          background: hoveredDomain === 'revenue' ? 'rgba(0,120,255,0.02)' : 'var(--bg-elevated)',
                          borderColor: hoveredDomain === 'revenue' ? 'var(--accent)' : 'var(--border)',
                          boxShadow: hoveredDomain === 'revenue' ? '0 0 15px rgba(0,120,255,0.25)' : 'none',
                          transform: hoveredDomain === 'revenue' ? 'translateY(-2px)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Revenue Growth
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(0,120,255,0.05)', border: '1px solid rgba(0,120,255,0.15)', borderRadius: '3px', color: 'var(--text-secondary)' }}>Availability</span>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(0,120,255,0.05)', border: '1px solid rgba(0,120,255,0.15)', borderRadius: '3px', color: 'var(--text-secondary)' }}>Basket Protection</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2, Col 1: West (Waste) */}
                    <div style={{ gridColumn: '1', gridRow: '2', display: 'flex', justifyContent: 'flex-end', paddingRight: 30 }}>
                      <div
                        className="card"
                        tabIndex={0}
                        onMouseEnter={() => setHoveredDomain('waste')}
                        onMouseLeave={() => setHoveredDomain(null)}
                        onFocus={() => setHoveredDomain('waste')}
                        onBlur={() => setHoveredDomain(null)}
                        style={{
                          width: 200,
                          height: 70,
                          padding: '8px 10px',
                          borderTop: '3px solid var(--warning)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          background: hoveredDomain === 'waste' ? 'rgba(245,158,11,0.02)' : 'var(--bg-elevated)',
                          borderColor: hoveredDomain === 'waste' ? 'var(--warning)' : 'var(--border)',
                          boxShadow: hoveredDomain === 'waste' ? '0 0 15px rgba(245,158,11,0.25)' : 'none',
                          transform: hoveredDomain === 'waste' ? 'translateY(-2px)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Waste Minimisation
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '3px', color: 'var(--text-secondary)' }}>Markdown Intel</span>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: '3px', color: 'var(--text-secondary)' }}>Replenish Optimise</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 2, Col 2: Center Engine */}
                    <div style={{ gridColumn: '2', gridRow: '2', display: 'flex', justifyContent: 'center' }}>
                      <div
                        className="card"
                        style={{
                          width: 220,
                          height: 120,
                          padding: '16px',
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          textAlign: 'center',
                          gap: 6,
                          boxShadow: hoveredDomain 
                            ? `0 0 25px ${
                                hoveredDomain === 'revenue' ? 'rgba(0,120,255,0.25)' 
                                : hoveredDomain === 'margin' ? 'rgba(139,92,246,0.25)'
                                : hoveredDomain === 'productivity' ? 'rgba(16,185,129,0.25)'
                                : 'rgba(245,158,11,0.25)'
                              }` 
                            : '0 0 20px rgba(255, 255, 255, 0.02)',
                          borderColor: hoveredDomain
                            ? hoveredDomain === 'revenue' ? 'var(--accent)'
                              : hoveredDomain === 'margin' ? '#8B5CF6'
                              : hoveredDomain === 'productivity' ? 'var(--success)'
                              : 'var(--warning)'
                            : 'var(--border)',
                          transform: hoveredDomain ? 'scale(1.03)' : 'scale(1.0)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          zIndex: 2
                        }}
                      >
                        <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          DI Engine
                        </div>
                        <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Decision Intelligence
                        </div>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', lineHeight: 1.3, marginTop: 4 }}>
                          One engine powering every operational outcome.
                        </div>
                      </div>
                    </div>

                    {/* Row 2, Col 3: East (Margin) */}
                    <div style={{ gridColumn: '3', gridRow: '2', display: 'flex', justifyContent: 'flex-start', paddingLeft: 30 }}>
                      <div
                        className="card"
                        tabIndex={0}
                        onMouseEnter={() => setHoveredDomain('margin')}
                        onMouseLeave={() => setHoveredDomain(null)}
                        onFocus={() => setHoveredDomain('margin')}
                        onBlur={() => setHoveredDomain(null)}
                        style={{
                          width: 200,
                          height: 70,
                          padding: '8px 10px',
                          borderTop: '3px solid #8B5CF6',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          background: hoveredDomain === 'margin' ? 'rgba(139,92,246,0.02)' : 'var(--bg-elevated)',
                          borderColor: hoveredDomain === 'margin' ? '#8B5CF6' : 'var(--border)',
                          boxShadow: hoveredDomain === 'margin' ? '0 0 15px rgba(139,92,246,0.25)' : 'none',
                          transform: hoveredDomain === 'margin' ? 'translateY(-2px)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ color: '#8B5CF6', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Margin Protection
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '3px', color: 'var(--text-secondary)' }}>Price Optimise</span>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '3px', color: 'var(--text-secondary)' }}>Promo Governance</span>
                        </div>
                      </div>
                    </div>

                    {/* Row 3: South (Productivity) */}
                    <div style={{ gridColumn: '2', gridRow: '3', display: 'flex', justifyContent: 'center' }}>
                      <div
                        className="card"
                        tabIndex={0}
                        onMouseEnter={() => setHoveredDomain('productivity')}
                        onMouseLeave={() => setHoveredDomain(null)}
                        onFocus={() => setHoveredDomain('productivity')}
                        onBlur={() => setHoveredDomain(null)}
                        style={{
                          width: 200,
                          height: 70,
                          padding: '8px 10px',
                          borderTop: '3px solid var(--success)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          gap: 4,
                          cursor: 'pointer',
                          background: hoveredDomain === 'productivity' ? 'rgba(16,185,129,0.02)' : 'var(--bg-elevated)',
                          borderColor: hoveredDomain === 'productivity' ? 'var(--success)' : 'var(--border)',
                          boxShadow: hoveredDomain === 'productivity' ? '0 0 15px rgba(16,185,129,0.25)' : 'none',
                          transform: hoveredDomain === 'productivity' ? 'translateY(-2px)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ color: 'var(--success)', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Productivity
                        </div>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '3px', color: 'var(--text-secondary)' }}>Decision Auto</span>
                          <span style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: '3px', color: 'var(--text-secondary)' }}>Pattern Reuse</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outcome Ribbon at the bottom */}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 20,
                    right: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 20,
                    padding: '8px 0',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.70rem',
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                    fontWeight: 600
                  }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 800 }}>Revenue Protected</span>
                    <span style={{ color: 'var(--border-strong)' }}>|</span>
                    <span style={{ color: '#8B5CF6', fontWeight: 800 }}>Margin Defended</span>
                    <span style={{ color: 'var(--border-strong)' }}>|</span>
                    <span style={{ color: 'var(--warning)', fontWeight: 800 }}>Waste Reduced</span>
                    <span style={{ color: 'var(--border-strong)' }}>|</span>
                    <span style={{ color: 'var(--success)', fontWeight: 800 }}>Analyst Hours Saved</span>
                  </div>

                </div>
              </SlideScaler>
            )}

            {/* Slide 8: AppSheet AI Enablement Blueprint */}
            {activeSlide === 8 && (
              <SlideScaler designWidth={940} designHeight={380}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 170px 1fr', gap: 20, width: '100%', alignItems: 'stretch' }}>
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

                  {/* Transformation spine */}
                  <div className="appsheet-transformation-spine">
                    <div className="appsheet-spine-step muted">Current State</div>
                    <LucideArrowDown size={16} strokeWidth={2} />
                    <div className="appsheet-spine-core">
                      <Sparkles size={18} strokeWidth={2} />
                      <span>Decision Intelligence Layer</span>
                    </div>
                    <LucideArrowDown size={16} strokeWidth={2} />
                    <div className="appsheet-spine-step">Governed Automation</div>
                    <div className="appsheet-exec-callout">
                      <span>From Data Entry</span>
                      <strong>to</strong>
                      <span>Decision Execution</span>
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

            {/* Slide 9: How A Recommendation Is Generated */}
            {activeSlide === 9 && (
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

            {/* Slide 10: Why Gemini Cannot Hallucinate Here */}
            {activeSlide === 10 && (
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

            {/* Slide 11: Governance & Trust */}
            {activeSlide === 11 && (
              <SlideScaler designWidth={760} designHeight={360}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', width: '100%' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 800 }}>Governed Security & Validation Gates</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
                    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', height: 'auto', minHeight: '96px', overflow: 'visible' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--accent)' }}>LookML Rule Locks</div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        Metrics (e.g. gross profit margins, inventory levels) are defined once in LookML code. AI cannot overwrite or modify these equations.
                      </p>
                    </div>
                    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', height: 'auto', minHeight: '96px', overflow: 'visible' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#8B5CF6' }}>Row-Level Security</div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        IAM profiles map user sessions to RLS rules. Store Managers see only their location, Category leads see their category.
                      </p>
                    </div>
                    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', height: 'auto', minHeight: '96px', overflow: 'visible' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: '#10B981' }}>Human-in-the-loop</div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        AI generates markdown and rebalancing recommendations, but no action is taken without explicit user verification and approval.
                      </p>
                    </div>
                    <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left', height: 'auto', minHeight: '96px', overflow: 'visible' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--warning)' }}>Audit & Verification Logs</div>
                      <p style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                        Every approved decision is logged back to the database, capturing user identity, time, AI confidence, and resolved metrics.
                      </p>
                    </div>
                  </div>
                </div>
              </SlideScaler>
            )}

{/* Slide 12: Why This Matters to LiDL (New Pass 3) */}
            {activeSlide === 12 && (
              <SlideScaler designWidth={850} designHeight={360}>
                <div style={{ position: 'relative', width: '850px', height: '360px', background: 'transparent' }}>
                  {/* SVG connecting lines */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                    {/* Left Column Spokes -> Hub */}
                    {[
                      { key: 'waste', y: 57.5, marker: 'url(#arrow-head-yellow)', color: 'var(--warning)' },
                      { key: 'availability', y: 137.5, marker: 'url(#arrow-head-active)', color: '#06B6D4' },
                      { key: 'margin', y: 217.5, marker: 'url(#arrow-head-purple)', color: '#8B5CF6' },
                      { key: 'labour', y: 297.5, marker: 'url(#arrow-head-green)', color: 'var(--success)' }
                    ].map((spoke, idx) => {
                      const active = activeSpokeKey === spoke.key;
                      return (
                        <line
                          key={`left-${idx}`}
                          x1="260"
                          y1={spoke.y}
                          x2="335"
                          y2="180"
                          stroke={active ? spoke.color : 'rgba(255,255,255,0.06)'}
                          strokeWidth={active ? 3 : 1}
                          strokeDasharray={active ? '6,4' : '3,3'}
                          markerEnd={active ? spoke.marker : 'url(#arrow-head-inactive)'}
                          className={active ? 'pulse-line scale-signal-line' : ''}
                          style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
                        />
                      );
                    })}

                    {/* Right Column Spokes -> Hub */}
                    {[
                      { key: 'energy', y: 57.5, marker: 'url(#arrow-head-yellow)', color: '#F59E0B' },
                      { key: 'promotions', y: 137.5, marker: 'url(#arrow-head-active)', color: '#3B82F6' },
                      { key: 'store_ops', y: 217.5, marker: 'url(#arrow-head-purple)', color: '#6366F1' },
                      { key: 'supply_chain', y: 297.5, marker: 'url(#arrow-head-green)', color: '#10B981' }
                    ].map((spoke, idx) => {
                      const active = activeSpokeKey === spoke.key;
                      return (
                        <line
                          key={`right-${idx}`}
                          x1="590"
                          y1={spoke.y}
                          x2="515"
                          y2="180"
                          stroke={active ? spoke.color : 'rgba(255,255,255,0.06)'}
                          strokeWidth={active ? 3 : 1}
                          strokeDasharray={active ? '6,4' : '3,3'}
                          markerEnd={active ? spoke.marker : 'url(#arrow-head-inactive)'}
                          className={active ? 'pulse-line scale-signal-line' : ''}
                          style={{ transition: 'stroke 0.25s, stroke-width 0.25s' }}
                        />
                      );
                    })}
                  </svg>

                  {/* Centre Core Hub */}
                  <div className="card" style={{
                    position: 'absolute',
                    left: 335,
                    top: 140,
                    width: 180,
                    height: 96,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    background: 'rgba(251, 191, 36, 0.025)',
                    boxShadow: activeSpokeKey
                      ? `0 0 25px ${
                          activeSpokeKey === 'waste' || activeSpokeKey === 'energy' ? 'rgba(245,158,11,0.32)'
                          : activeSpokeKey === 'availability' || activeSpokeKey === 'promotions' ? 'rgba(0,120,255,0.32)'
                          : activeSpokeKey === 'margin' || activeSpokeKey === 'store_ops' ? 'rgba(139,92,246,0.32)'
                          : 'rgba(16,185,129,0.25)'
                        }`
                      : '0 0 25px rgba(59, 130, 246, 0.15)',
                    borderColor: activeSpokeKey
                      ? activeSpokeKey === 'waste' ? 'var(--exec-amber)'
                        : activeSpokeKey === 'availability' ? '#06B6D4'
                        : activeSpokeKey === 'margin' ? '#8B5CF6'
                        : activeSpokeKey === 'labour' ? 'var(--success)'
                        : activeSpokeKey === 'energy' ? 'var(--exec-orange)'
                        : activeSpokeKey === 'promotions' ? '#3B82F6'
                        : activeSpokeKey === 'store_ops' ? '#6366F1'
                        : '#10B981'
                      : 'var(--accent)',
                    transform: activeSpokeKey ? 'scale(1.04)' : 'scale(1.0)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 10
                  }}>
                    <div style={{ fontSize: '0.76rem', lineHeight: 1.14, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.045em' }}>
                      One Decision Engine
                    </div>
                    <div style={{ fontSize: '0.57rem', lineHeight: 1.22, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Many Business Outcomes
                    </div>
                    <div style={{ fontSize: '0.51rem', lineHeight: 1.18, color: 'var(--exec-amber)', marginTop: 7, fontWeight: 800, letterSpacing: '0.055em', textTransform: 'uppercase' }}>
                      Build once. Reuse everywhere.
                    </div>
                  </div>

                  {/* Left Column Spokes */}
                  {[
                    { key: 'waste', label: 'Waste', desc: 'Produce markdown optimisation', color: 'var(--exec-amber)', left: 80, top: 25 },
                    { key: 'availability', label: 'Availability', desc: 'Proactive stockout prevention', color: '#06B6D4', left: 80, top: 105 },
                    { key: 'margin', label: 'Margin', desc: 'Campaign leakage defense', color: '#8B5CF6', left: 80, top: 185 },
                    { key: 'labour', label: 'Labour', desc: 'Store tasking & shift allocations', color: 'var(--success)', left: 80, top: 265 }
                  ].map((spoke, idx) => {
                    const isActive = activeSpokeKey === spoke.key;
                    return (
                      <div
                        key={idx}
                        className="card"
                        tabIndex={0}
                        onMouseEnter={() => setHoveredSpoke(spoke.key)}
                        onMouseLeave={() => setHoveredSpoke(null)}
                        onFocus={() => setHoveredSpoke(spoke.key)}
                        onBlur={() => setHoveredSpoke(null)}
                        style={{
                          position: 'absolute',
                          left: spoke.left,
                          top: spoke.top,
                          width: 180,
                          height: 68,
                          padding: '11px 13px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          borderLeft: `3px solid ${spoke.color}`,
                          textAlign: 'left',
                          background: isActive ? 'rgba(255,255,255,0.025)' : 'var(--bg-elevated)',
                          borderColor: isActive ? spoke.color : 'var(--border)',
                          boxShadow: isActive ? `0 0 16px ${spoke.color}44` : 'none',
                          transform: isActive ? 'translateX(3px)' : 'none',
                          opacity: isActive ? 1 : 0.54,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          outline: 'none',
                          zIndex: 2
                        }}
                      >
                        <div style={{ fontSize: '0.67rem', lineHeight: 1.18, fontWeight: 800, color: 'var(--text-primary)' }}>{spoke.label}</div>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', lineHeight: 1.32, marginTop: 4 }}>{spoke.desc}</div>
                      </div>
                    );
                  })}

                  {/* Right Column Spokes */}
                  {[
                    { key: 'energy', label: 'Energy', desc: 'Cold-chain IoT temperature rules', color: 'var(--exec-orange)', left: 590, top: 25 },
                    { key: 'promotions', label: 'Promotions', desc: 'Dynamic regional campaign balancing', color: '#3B82F6', left: 590, top: 105 },
                    { key: 'store_ops', label: 'Store Operations', desc: 'Self-service citizen developer apps', color: '#6366F1', left: 590, top: 185 },
                    { key: 'supply_chain', label: 'Supply Chain', desc: 'DC capacity & route adjustment', color: '#10B981', left: 590, top: 265 }
                  ].map((spoke, idx) => {
                    const isActive = activeSpokeKey === spoke.key;
                    return (
                      <div
                        key={idx}
                        className="card"
                        tabIndex={0}
                        onMouseEnter={() => setHoveredSpoke(spoke.key)}
                        onMouseLeave={() => setHoveredSpoke(null)}
                        onFocus={() => setHoveredSpoke(spoke.key)}
                        onBlur={() => setHoveredSpoke(null)}
                        style={{
                          position: 'absolute',
                          left: spoke.left,
                          top: spoke.top,
                          width: 180,
                          height: 68,
                          padding: '11px 13px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          borderLeft: `3px solid ${spoke.color}`,
                          textAlign: 'left',
                          background: isActive ? 'rgba(255,255,255,0.025)' : 'var(--bg-elevated)',
                          borderColor: isActive ? spoke.color : 'var(--border)',
                          boxShadow: isActive ? `0 0 16px ${spoke.color}44` : 'none',
                          transform: isActive ? 'translateX(-3px)' : 'none',
                          opacity: isActive ? 1 : 0.54,
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          outline: 'none',
                          zIndex: 2
                        }}
                      >
                        <div style={{ fontSize: '0.67rem', lineHeight: 1.18, fontWeight: 800, color: 'var(--text-primary)' }}>{spoke.label}</div>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', lineHeight: 1.32, marginTop: 4 }}>{spoke.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </SlideScaler>
            )}

            {/* Slide 13: Day in the Life with Decision Intelligence */}
            {activeSlide === 13 && (
              <SlideScaler designWidth={980} designHeight={360}>
                <div className="finale-story-mode">
                  <div className="finale-ambient-line" aria-hidden="true" />
                  <div className="finale-scenes">
                    {FINALE_SCENES.map((scene, idx) => {
                      const SceneIcon = scene.icon;
                      const active = finaleStep === idx;
                      const complete = finaleStep > idx;
                      const finaleVisible = finaleStep >= FINALE_SCENES.length;
                      return (
                        <div
                          className={`finale-scene ${active ? 'active' : ''} ${complete ? 'complete' : ''} ${finaleVisible ? 'finale-dimmed' : ''}`}
                          key={scene.time}
                        >
                          <span className="finale-scene-time">{scene.time}</span>
                          <span className="finale-scene-icon">
                            <SceneIcon size={15} strokeWidth={2} />
                          </span>
                          <span className="finale-scene-title">{scene.title}</span>
                        </div>
                      );
                    })}
                  </div>

                  {finaleStep < FINALE_SCENES.length ? (
                    <div className="finale-narrative" key={currentFinaleScene.title}>
                      <span>{currentFinaleScene.time}</span>
                      <h3>{currentFinaleScene.title}</h3>
                      <p>{currentFinaleScene.narrative}</p>
                    </div>
                  ) : (
                    <div className="finale-impact-panel">
                      <h3>Decision Intelligence is not another dashboard.</h3>
                      <p>It is an operational system for making better decisions.</p>
                      <div className="finale-impact-chain">
                        {['People', 'Data', 'AI', 'Governance', 'Action'].map((item, idx) => (
                          <React.Fragment key={item}>
                            <span>{item}</span>
                            {idx < 4 && <i aria-hidden="true" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </SlideScaler>
            )}

          </div>

          {/* Bottom Deck Controls */}
          <footer className="storyboard-footer">
            {/* Left side: G10X branding */}
            <div className="storyboard-footer-brand">
              <img src="/g10x-logo.png" className="brand-g10x-logo" alt="G10X Logo" />
              <div className="storyboard-footer-brand-copy">
                <span>Decision Intelligence</span>
                <span>Executive Storyboard</span>
              </div>
            </div>

            {/* Middle: Dots */}
            <div className="storyboard-footer-dots" aria-label="Slide progress">
              {SLIDES.map((_, idx) => (
                <button
                  key={idx}
                  className={`storyboard-progress-dot ${idx === activeSlide ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSlide(idx);
                    setExpandedNode(null);
                  }}
                  title={`Slide ${idx + 1}`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>

            {/* Right side: Slide number and Prev/Next buttons */}
            <div className="storyboard-footer-nav">
              <span className="slide-numbering-muted">
                Slide {activeSlide + 1} of {SLIDES.length}
              </span>
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
          </footer>

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
