import React, { useMemo, useState } from 'react';
import type { ClaimDossier, Language } from '../types';

interface VerificationTimelineProps {
  dossier: ClaimDossier | null;
  currentLang: Language;
}

type StepTone = 'blue' | 'cyan' | 'green' | 'red' | 'amber' | 'violet' | 'slate';

interface TimelineDetailItem {
  label: string;
  value: string;
  href?: string;
  tone?: 'neutral' | 'support' | 'contradict';
}

interface TimelineNode {
  id: string;
  stageKey: 'ingest' | 'retrieval' | 'nli' | 'verdict' | 'custom';
  timeLabel: string;
  sourceLabel: string;
  headline: string;
  icon: string;
  tone: StepTone;
  metrics: string[];
  details: TimelineDetailItem[];
  traceLines?: string[];
}

function formatTimestamp(iso?: string): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isSafeHttpUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getToneClasses(tone: StepTone): {
  node: string;
  badge: string;
  border: string;
} {
  switch (tone) {
    case 'green':
      return {
        node: 'bg-[#dcfce7] text-[#16a34a] border-[#86efac]',
        badge: 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]',
        border: 'border-[#bbf7d0]',
      };
    case 'red':
      return {
        node: 'bg-[#fee2e2] text-[#dc2626] border-[#fca5a5]',
        badge: 'bg-[#fee2e2] text-[#b91c1c] border-[#fecaca]',
        border: 'border-[#fecaca]',
      };
    case 'amber':
      return {
        node: 'bg-[#fef3c7] text-[#d97706] border-[#fcd34d]',
        badge: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
        border: 'border-[#fde68a]',
      };
    case 'violet':
      return {
        node: 'bg-[#ede9fe] text-[#7c3aed] border-[#c4b5fd]',
        badge: 'bg-[#ede9fe] text-[#6d28d9] border-[#ddd6fe]',
        border: 'border-[#ddd6fe]',
      };
    case 'cyan':
      return {
        node: 'bg-[#e0f2fe] text-[#0284c7] border-[#7dd3fc]',
        badge: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]',
        border: 'border-[#bae6fd]',
      };
    case 'slate':
      return {
        node: 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]',
        badge: 'bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]',
        border: 'border-[#e2e8f0]',
      };
    case 'blue':
    default:
      return {
        node: 'bg-[#eff6ff] text-[#2563eb] border-[#93c5fd]',
        badge: 'bg-[#eff6ff] text-[#1e40af] border-[#bfdbfe]',
        border: 'border-[#bfdbfe]',
      };
  }
}

function getVerdictTone(dossier: ClaimDossier): StepTone {
  if (dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false') return 'red';
  if (dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true') return 'green';
  if (
    dossier.clearVerdictStatus === 'MISLEADING' ||
    dossier.verdict === 'misleading' ||
    dossier.clearVerdictStatus === 'PARTLY_TRUE' ||
    dossier.verdict === 'partly_true'
  ) {
    return 'amber';
  }
  if (dossier.clearVerdictStatus === 'CONTEXT_MISSING' || dossier.verdict === 'context_missing') {
    return 'violet';
  }
  return 'slate';
}

function getVerdictIcon(dossier: ClaimDossier): string {
  if (dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false') return 'cancel';
  if (dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true') return 'verified';
  if (
    dossier.clearVerdictStatus === 'MISLEADING' ||
    dossier.verdict === 'misleading' ||
    dossier.clearVerdictStatus === 'PARTLY_TRUE' ||
    dossier.verdict === 'partly_true'
  ) {
    return 'warning';
  }
  if (dossier.clearVerdictStatus === 'CONTEXT_MISSING' || dossier.verdict === 'context_missing') return 'info';
  return 'help';
}

function buildIngestDetails(dossier: ClaimDossier): {
  metrics: string[];
  details: TimelineDetailItem[];
} {
  const metrics: string[] = [];
  const details: TimelineDetailItem[] = [];

  if (dossier.submissionMode) {
    metrics.push(`Mode: ${dossier.submissionMode.toUpperCase()}`);
  }
  if (dossier.originVector) {
    details.push({ label: 'Origin Vector', value: dossier.originVector });
  }
  if (dossier.extractedClaims && dossier.extractedClaims.length > 0) {
    metrics.push(`${dossier.extractedClaims.length} sub-claim${dossier.extractedClaims.length > 1 ? 's' : ''}`);
    dossier.extractedClaims.slice(0, 3).forEach((sc, idx) => {
      details.push({
        label: `Claim ${idx + 1}`,
        value: sc.claim,
      });
    });
  }

  const ents = dossier.extractedEntities;
  if (ents) {
    const entityGroups: [string, string[] | undefined][] = [
      ['People', ents.people],
      ['Organizations', ents.organizations],
      ['Locations', ents.locations],
      ['Dates', ents.dates],
      ['Amounts', ents.amounts],
    ];
    let entityCount = 0;
    for (const [label, list] of entityGroups) {
      if (list && list.length > 0) {
        entityCount += list.length;
        details.push({ label, value: list.slice(0, 5).join(', ') });
      }
    }
    if (entityCount > 0) {
      metrics.push(`${entityCount} entities`);
    }
  }

  if (dossier.semanticFrame) {
    const sf = dossier.semanticFrame;
    const frameParts = [
      sf.eventType ? sf.eventType.replace(/_/g, ' ') : '',
      sf.modality ? sf.modality.replace(/_/g, ' ') : '',
      sf.polarity,
      sf.tense !== 'unknown' ? sf.tense : '',
    ].filter(Boolean);
    if (frameParts.length > 0) {
      details.push({ label: 'Semantic Frame', value: frameParts.join(' · ') });
    }
  }

  return { metrics, details };
}

function buildRetrievalDetails(dossier: ClaimDossier): {
  metrics: string[];
  details: TimelineDetailItem[];
  traceLines: string[];
} {
  const metrics: string[] = [];
  const details: TimelineDetailItem[] = [];
  const analysis = dossier.evidenceAnalysis;

  if (analysis?.searchQueryCount) {
    metrics.push(`${analysis.searchQueryCount} queries`);
  }
  if (analysis?.cragIterations) {
    metrics.push(`${analysis.cragIterations} CRAG pass${analysis.cragIterations > 1 ? 'es' : ''}`);
  }
  if (typeof analysis?.deduplicatedCount === 'number' && analysis.deduplicatedCount > 0) {
    metrics.push(`${analysis.deduplicatedCount} deduplicated`);
  }
  if (analysis?.searchProviderStatus) {
    details.push({
      label: 'Search Status',
      value:
        analysis.searchProviderStatus === 'operational'
          ? 'Operational (live web + archive)'
          : analysis.searchProviderStatus === 'fallback_archive'
          ? 'Archive fallback mode'
          : 'Temporary search provider disruption',
    });
  }
  if (typeof analysis?.irrelevantFilteredCount === 'number' && analysis.irrelevantFilteredCount > 0) {
    details.push({
      label: 'Noise Filtered',
      value: `${analysis.irrelevantFilteredCount} off-topic excerpt(s) excluded before evaluation`,
    });
  }
  if (dossier.groundingInfo?.queries && dossier.groundingInfo.queries.length > 0) {
    details.push({
      label: 'Grounded Queries',
      value: dossier.groundingInfo.queries.slice(0, 4).join(' | '),
    });
  }

  const traceLines = analysis?.cragTrace ? [...analysis.cragTrace] : [];
  return { metrics, details, traceLines };
}

function buildNliCrossCheckStep(dossier: ClaimDossier): TimelineNode | null {
  const sources = dossier.sources || [];
  const analysis = dossier.evidenceAnalysis;

  if (sources.length === 0 && !analysis) return null;

  const supportCount =
    analysis?.supportingEvidence?.length ??
    sources.filter((s) => s.status === 'confirmed' || s.status === 'corroborated' || s.nliLabel === 'ENTAILMENT').length;
  const contradictCount =
    analysis?.contradictingEvidence?.length ??
    sources.filter((s) => s.status === 'refuted' || s.status === 'contradicted' || s.nliLabel === 'CONTRADICTION').length;
  const neutralCount =
    analysis?.neutralEvidence?.length ??
    Math.max(0, sources.length - supportCount - contradictCount);

  const metrics: string[] = [];
  if (supportCount > 0) metrics.push(`${supportCount} supporting`);
  if (contradictCount > 0) metrics.push(`${contradictCount} contradicting`);
  if (neutralCount > 0) metrics.push(`${neutralCount} neutral`);
  if (metrics.length === 0 && sources.length > 0) {
    metrics.push(`${sources.length} source${sources.length > 1 ? 's' : ''} checked`);
  }

  let tone: StepTone = 'slate';
  if (contradictCount > 0 && supportCount === 0) tone = 'red';
  else if (supportCount > 0 && contradictCount === 0) tone = 'green';
  else if (supportCount > 0 && contradictCount > 0) tone = 'amber';
  else if (sources.length > 0) tone = 'cyan';

  const details: TimelineDetailItem[] = [];
  sources.slice(0, 5).forEach((src) => {
    const tag =
      src.nliLabel ||
      (src.status === 'confirmed' || src.status === 'corroborated'
        ? 'SUPPORTS'
        : src.status === 'refuted' || src.status === 'contradicted'
        ? 'CONTRADICTS'
        : 'NEUTRAL');
    const datePart = src.publicationDate || formatTimestamp(src.retrievedAt);
    details.push({
      label: src.name,
      value: `${tag}${datePart ? ` · ${datePart}` : ''}${src.nliReason ? ` — ${src.nliReason}` : ''}`,
      href: src.url,
      tone:
        tag === 'ENTAILMENT' || tag === 'SUPPORTS'
          ? 'support'
          : tag === 'CONTRADICTION' || tag === 'CONTRADICTS'
          ? 'contradict'
          : 'neutral',
    });
  });

  const firstRetrieved = sources.find((s) => s.retrievedAt)?.retrievedAt;
  const timeLabel = firstRetrieved ? formatTimestamp(firstRetrieved) : 'Cross-Check';

  return {
    id: `${dossier.id}-nli-crosscheck`,
    stageKey: 'nli',
    timeLabel,
    sourceLabel: 'Semantic NLI & Evidence Cross-Check',
    headline: `Cross-checked ${sources.length} source${sources.length === 1 ? '' : 's'} for logical entailment, contradiction, and temporal consistency`,
    icon: 'balance',
    tone,
    metrics,
    details,
  };
}

function buildVerdictDetails(dossier: ClaimDossier): {
  metrics: string[];
  details: TimelineDetailItem[];
} {
  const metrics: string[] = [dossier.clearVerdictStatus];
  if (dossier.confidenceScore) {
    metrics.push(`${dossier.confidenceScore}% score`);
  }
  const details: TimelineDetailItem[] = [];
  if (dossier.evidenceAnalysis?.evidenceStrengthLabel) {
    details.push({
      label: 'Evidence Strength',
      value: dossier.evidenceAnalysis.evidenceStrengthLabel,
    });
  }
  if (dossier.verifiedAt) {
    details.push({
      label: 'Completed At',
      value: formatTimestamp(dossier.verifiedAt),
    });
  }
  if (dossier.officialRefId) {
    details.push({
      label: 'Reference ID',
      value: dossier.officialRefId,
    });
  }
  if (dossier.evidenceAnalysis?.insufficiencyReason) {
    details.push({
      label: 'Verification Note',
      value: dossier.evidenceAnalysis.insufficiencyReason,
    });
  }
  return { metrics, details };
}

function buildTimelineNodes(dossier: ClaimDossier): TimelineNode[] {
  const rawSteps = Array.isArray(dossier.timeline) ? dossier.timeline : [];
  const ingestMeta = buildIngestDetails(dossier);
  const retrievalMeta = buildRetrievalDetails(dossier);
  const verdictMeta = buildVerdictDetails(dossier);
  const nliStep = buildNliCrossCheckStep(dossier);
  const verdictTone = getVerdictTone(dossier);
  const verdictIcon = getVerdictIcon(dossier);

  if (rawSteps.length === 0) {
    const fallbackNodes: TimelineNode[] = [
      {
        id: `${dossier.id}-ingest`,
        stageKey: 'ingest',
        timeLabel: dossier.timeAgo || 'Submitted',
        sourceLabel: 'Query Preprocessor',
        headline: 'Claim ingested and normalized for entity and semantic frame analysis',
        icon: 'manage_search',
        tone: 'blue',
        metrics: ingestMeta.metrics,
        details: ingestMeta.details,
      },
      {
        id: `${dossier.id}-retrieval`,
        stageKey: 'retrieval',
        timeLabel: dossier.evidenceAnalysis?.cragIterations
          ? `${dossier.evidenceAnalysis.cragIterations} CRAG Pass(es)`
          : 'Live Search',
        sourceLabel: 'RAG Evidence Retriever',
        headline: `Retrieved and filtered ${dossier.sources?.length || 0} evidence record(s)`,
        icon: 'travel_explore',
        tone: 'cyan',
        metrics: retrievalMeta.metrics,
        details: retrievalMeta.details,
        traceLines: retrievalMeta.traceLines,
      },
    ];
    if (nliStep) fallbackNodes.push(nliStep);
    fallbackNodes.push({
      id: `${dossier.id}-verdict`,
      stageKey: 'verdict',
      timeLabel: dossier.verifiedAt ? formatTimestamp(dossier.verifiedAt) : dossier.timeAgo || 'Completed',
      sourceLabel: 'Verification Engine',
      headline: `Final assessment: ${dossier.verdictLabel || dossier.clearVerdictStatus}`,
      icon: verdictIcon,
      tone: verdictTone,
      metrics: verdictMeta.metrics,
      details: verdictMeta.details,
    });
    return fallbackNodes;
  }

  const nodes: TimelineNode[] = [];
  let insertedNli = false;

  rawSteps.forEach((step, idx) => {
    const srcLower = (step.source || '').toLowerCase();
    const evtLower = (step.event || '').toLowerCase();

    const isIngest =
      srcLower.includes('preprocessor') ||
      evtLower.includes('ingested') ||
      evtLower.includes('normalized') ||
      idx === 0;
    const isRetrieval =
      srcLower.includes('rag') ||
      srcLower.includes('retriever') ||
      srcLower.includes('search') ||
      evtLower.includes('retrieved') ||
      evtLower.includes('crag');
    const isVerdict =
      srcLower.includes('verification engine') ||
      evtLower.includes('verdict') ||
      evtLower.includes('assessment') ||
      idx === rawSteps.length - 1;

    if (isVerdict && nliStep && !insertedNli) {
      nodes.push(nliStep);
      insertedNli = true;
    }

    if (isVerdict) {
      nodes.push({
        id: `${dossier.id}-step-${idx}`,
        stageKey: 'verdict',
        timeLabel:
          step.time === 'Just now' && dossier.verifiedAt
            ? formatTimestamp(dossier.verifiedAt)
            : step.time,
        sourceLabel: step.source || 'Verification Engine',
        headline: step.event,
        icon: verdictIcon,
        tone: verdictTone,
        metrics: verdictMeta.metrics,
        details: verdictMeta.details,
      });
    } else if (isRetrieval) {
      nodes.push({
        id: `${dossier.id}-step-${idx}`,
        stageKey: 'retrieval',
        timeLabel: step.time,
        sourceLabel: step.source || 'RAG Evidence Retriever',
        headline: step.event,
        icon: 'travel_explore',
        tone: 'cyan',
        metrics: retrievalMeta.metrics,
        details: retrievalMeta.details,
        traceLines: retrievalMeta.traceLines,
      });
    } else if (isIngest) {
      nodes.push({
        id: `${dossier.id}-step-${idx}`,
        stageKey: 'ingest',
        timeLabel: step.time,
        sourceLabel: step.source || 'Query Preprocessor',
        headline: step.event,
        icon: 'manage_search',
        tone: 'blue',
        metrics: ingestMeta.metrics,
        details: ingestMeta.details,
      });
    } else {
      nodes.push({
        id: `${dossier.id}-step-${idx}`,
        stageKey: 'custom',
        timeLabel: step.time,
        sourceLabel: step.source || 'Audit Checkpoint',
        headline: step.event,
        icon: 'timeline',
        tone: 'blue',
        metrics: [],
        details: [],
      });
    }
  });

  if (!insertedNli && nliStep) {
    nodes.splice(Math.max(0, nodes.length - 1), 0, nliStep);
  }

  return nodes;
}

export const VerificationTimeline: React.FC<VerificationTimelineProps> = ({
  dossier,
  currentLang,
}) => {
  const [expandedStepIds, setExpandedStepIds] = useState<Record<string, boolean>>({});

  const nodes = useMemo(() => {
    if (!dossier) return [];
    return buildTimelineNodes(dossier);
  }, [dossier]);

  const allExpanded =
    nodes.length > 0 &&
    nodes.every((n) => (n.details.length === 0 && !n.traceLines?.length) || expandedStepIds[n.id]);

  const toggleStep = (id: string) => {
    setExpandedStepIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedStepIds({});
    } else {
      const next: Record<string, boolean> = {};
      nodes.forEach((n) => {
        next[n.id] = true;
      });
      setExpandedStepIds(next);
    }
  };

  const titleText =
    currentLang === 'kn'
      ? 'ಪರಿಶೀಲನಾ ಟೈಮ್‌ಲೈನ್'
      : currentLang === 'hi'
      ? 'सत्यापन समयरेखा'
      : 'Verification Timeline';

  const subtitleText =
    currentLang === 'kn'
      ? 'ಈ ಕ್ಲೈಮ್ ಪರಿಶೀಲಿಸಲು ಅನುಸರಿಸಿದ ಹಂತಗಳು'
      : currentLang === 'hi'
      ? 'इस दावे के सत्यापन में उठाए गए चरणों का विवरण'
      : 'Historical audit trail of verification steps for this claim';

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#f1f5f9] flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#eff6ff] text-[#2563eb] flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">timeline</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xs sm:text-sm text-[#0f172a]">
                {titleText}
              </h3>
              {dossier && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#f8fafc] border border-[#e2e8f0] text-[#475569]">
                  {nodes.length} {currentLang === 'kn' ? 'ಹಂತಗಳು' : currentLang === 'hi' ? 'चरण' : 'Steps'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#64748b] mt-0.5">{subtitleText}</p>
          </div>
        </div>

        {dossier && (
          <div className="flex items-center gap-2">
            {dossier.officialRefId && (
              <span className="hidden sm:inline-block text-[10px] font-mono text-[#64748b] bg-[#f8fafc] px-2 py-1 rounded-md border border-[#e2e8f0]">
                {dossier.officialRefId}
              </span>
            )}
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs font-bold text-[#2563eb] hover:bg-[#eff6ff] px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">
                {allExpanded ? 'unfold_less' : 'unfold_more'}
              </span>
              <span>
                {allExpanded
                  ? currentLang === 'kn'
                    ? 'ಕುಗ್ಗಿಸಿ'
                    : currentLang === 'hi'
                    ? 'समेकें'
                    : 'Collapse'
                  : currentLang === 'kn'
                  ? 'ವಿವರ ನೋಡಿ'
                  : currentLang === 'hi'
                  ? 'विवरण देखें'
                  : 'Inspect All'}
              </span>
            </button>
          </div>
        )}
      </div>

      {!dossier ? (
        <div className="py-7 text-center text-xs text-[#94a3b8] flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[24px] text-[#cbd5e1]">history</span>
          <span>
            {currentLang === 'kn'
              ? 'ತನಿಖೆ ನಡೆಸಿದ ನಂತರ ಹಂತ-ಹಂತದ ಪರಿಶೀಲನಾ ಟೈಮ್‌ಲೈನ್ ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.'
              : currentLang === 'hi'
              ? 'जांच चलने के बाद सत्यापन चरणों की समयरेखा यहां दिखाई देगी।'
              : 'Select or run an investigation to inspect its step-by-step verification timeline.'}
          </span>
        </div>
      ) : (
        <>
          {/* Compact Stage Milestone Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {nodes.slice(0, 4).map((node, idx) => {
              const cls = getToneClasses(node.tone);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => toggleStep(node.id)}
                  className="text-left p-2.5 rounded-xl bg-[#f8fafc] hover:bg-[#f1f5f9]/70 border border-[#e2e8f0] transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <span
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 ${cls.node}`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{node.icon}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider truncate">
                      Step {idx + 1} · {node.timeLabel}
                    </div>
                    <div className="text-[11px] font-semibold text-[#0f172a] truncate">
                      {node.sourceLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Vertical Forensic Stepper */}
          <div className="relative pl-1">
            {nodes.map((node, idx) => {
              const isLast = idx === nodes.length - 1;
              const cls = getToneClasses(node.tone);
              const hasDetails = node.details.length > 0 || (node.traceLines && node.traceLines.length > 0);
              const isExpanded = Boolean(expandedStepIds[node.id]);

              return (
                <div key={node.id} className="relative flex gap-3.5 pb-4 last:pb-0">
                  {/* Connector line & node icon */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className={`w-7 h-7 rounded-full border flex items-center justify-center z-10 shadow-2xs ${cls.node}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">{node.icon}</span>
                    </div>
                    {!isLast && <div className="w-[2px] flex-1 bg-[#e2e8f0] my-1" />}
                  </div>

                  {/* Step content card */}
                  <div
                    className={`flex-1 min-w-0 rounded-xl border bg-[#f8fafc]/70 transition-colors ${
                      isExpanded ? `${cls.border} bg-white` : 'border-[#e2e8f0]'
                    }`}
                  >
                    <button
                      type="button"
                      disabled={!hasDetails}
                      onClick={() => hasDetails && toggleStep(node.id)}
                      className={`w-full text-left p-3 flex items-start justify-between gap-2.5 ${
                        hasDetails ? 'cursor-pointer hover:bg-[#f8fafc]' : 'cursor-default'
                      } rounded-xl`}
                    >
                      <div className="min-w-0 flex-1 flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono font-bold text-[#0f172a]">
                            {node.timeLabel}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${cls.badge}`}
                          >
                            {node.sourceLabel}
                          </span>
                          {node.metrics.map((m, mIdx) => (
                            <span
                              key={mIdx}
                              className="text-[10px] font-semibold text-[#475569] bg-white px-1.5 py-0.5 rounded border border-[#e2e8f0]"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs font-medium text-[#334155] leading-snug">
                          {node.headline}
                        </p>
                      </div>

                      {hasDetails && (
                        <span className="material-symbols-outlined text-[18px] text-[#64748b] flex-shrink-0 mt-0.5">
                          {isExpanded ? 'expand_less' : 'expand_more'}
                        </span>
                      )}
                    </button>

                    {/* Expanded step forensic details */}
                    {isExpanded && hasDetails && (
                      <div className="px-3 pb-3 pt-2 border-t border-[#f1f5f9] flex flex-col gap-2">
                        {node.traceLines && node.traceLines.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#475569]">
                              CRAG Retrieval Log
                            </span>
                            {node.traceLines.map((line, tIdx) => (
                              <p key={tIdx} className="text-[11px] text-[#334155] leading-snug">
                                {line}
                              </p>
                            ))}
                          </div>
                        )}

                        {node.details.length > 0 && (
                          <div className="grid grid-cols-1 gap-1.5">
                            {node.details.map((detail, dIdx) => (
                              <div
                                key={dIdx}
                                className="flex items-start justify-between gap-2 text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-[#f1f5f9]"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="font-bold text-[#0f172a]">{detail.label}: </span>
                                  <span
                                    className={
                                      detail.tone === 'support'
                                        ? 'text-[#15803d]'
                                        : detail.tone === 'contradict'
                                        ? 'text-[#b91c1c]'
                                        : 'text-[#475569]'
                                    }
                                  >
                                    {detail.value}
                                  </span>
                                </div>
                                {detail.href && isSafeHttpUrl(detail.href) && (
                                  <a
                                    href={detail.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#2563eb] hover:underline font-semibold flex-shrink-0 inline-flex items-center gap-0.5"
                                  >
                                    <span>Link</span>
                                    <span className="material-symbols-outlined text-[12px]">
                                      open_in_new
                                    </span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
