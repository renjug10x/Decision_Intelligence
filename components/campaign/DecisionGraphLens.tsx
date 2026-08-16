'use client';

import React, { useState } from 'react';
import {
  Layers,
  ArrowRight,
  Info,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  GitCommit
} from 'lucide-react';
import { CampaignArchetype } from '@/lib/campaign-archetypes';

interface DecisionGraphLensProps {
  archetype: CampaignArchetype;
}

export default function DecisionGraphLens({ archetype }: DecisionGraphLensProps) {
  const graph = archetype.decision_graph;
  const [selectedNode, setSelectedNode] = useState(graph.nodes[0] || null);

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'SIGNAL':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'EVIDENCE':
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
      case 'HYPOTHESIS':
        return { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' };
      case 'DEMAND':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
      case 'ECONOMICS':
        return { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' };
      case 'DECISION':
        return { bg: '#0F172A', text: '#FFFFFF', border: '#0F172A' };
      case 'INTERVENTION':
        return { bg: '#2563EB', text: '#FFFFFF', border: '#2563EB' };
      default:
        return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '20px 24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <h3
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#0F172A',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}
        >
          <GitCommit size={18} color="#2563EB" />
          Evidence Network & Decision Reasoning Graph
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
          Trace how seeded signals, evidence, hypotheses, demand models, and economics connect to reach the final recommendation.
          Shown as a simplified linear reading — each node&apos;s actual graph relationships are listed in its inspector below.
        </p>
      </div>

      {/* Decision Flow Pipeline Map */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 16,
          marginBottom: 16
        }}
      >
        {graph.nodes.map((node, idx) => {
          const isSelected = selectedNode?.id === node.id;
          const colors = getCategoryColor(node.category);

          return (
            <React.Fragment key={node.id}>
              <div
                onClick={() => setSelectedNode(node)}
                style={{
                  minWidth: 160,
                  flex: '0 0 auto',
                  background: isSelected ? '#EFF6FF' : '#FFFFFF',
                  border: isSelected ? '2px solid #2563EB' : `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: colors.text,
                      background: colors.bg,
                      padding: '2px 5px',
                      borderRadius: 4
                    }}
                  >
                    {node.category}
                  </span>

                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      color: '#64748B',
                      background: '#F1F5F9',
                      padding: '1px 4px',
                      borderRadius: 3
                    }}
                    title="Seeded demonstration classification — not production evidence"
                  >
                    {node.provenance.replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                  {node.label}
                </div>

                <div style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: 1.3 }}>
                  {node.summary}
                </div>
              </div>

              {idx < graph.nodes.length - 1 && (
                <ArrowRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progressive Disclosure Node Inspector */}
      {selectedNode && (
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase' }}>
                {selectedNode.category} Node Detail
              </span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>·</span>
              <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                Provenance: <strong>{selectedNode.provenance.replace(/_/g, ' ')}</strong> (seeded demo model)
              </span>
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
              {selectedNode.label}: {selectedNode.summary}
            </div>

            <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.45 }}>
              {selectedNode.detail}
            </div>

            {/* Declared graph relationships for this node — sourced from decision_graph.links,
                so the linear strip above cannot imply edges the data does not assert. */}
            {(() => {
              const inbound = graph.links.filter(l => l.to === selectedNode.id);
              const outbound = graph.links.filter(l => l.from === selectedNode.id);
              const nameOf = (id: string) => graph.nodes.find(n => n.id === id)?.label || id;
              if (inbound.length === 0 && outbound.length === 0) return null;
              return (
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {inbound.length > 0 && (
                    <span>Derived from: {inbound.map(l => nameOf(l.from)).join(', ')}</span>
                  )}
                  {outbound.length > 0 && (
                    <span>Feeds into: {outbound.map(l => nameOf(l.to)).join(', ')}</span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
