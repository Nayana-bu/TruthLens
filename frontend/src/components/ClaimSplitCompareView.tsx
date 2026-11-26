import React, { useMemo, useState, useEffect } from 'react';
import type { ClaimDossier, Language } from '../types';
import {
  compareNewClaimWithArchive,
  rankSimilarArchivedClaims,
  type HighlightedToken,
} from '../utils/claimComparator';

interface ClaimSplitCompareViewProps {
  activeLang: Language;
  allDossiers: ClaimDossier[];
  activeDossier: ClaimDossier | null;
  initialArchiveId?: string | null;
  onInspectDossier: (dossier: ClaimDossier) => void;
  onRunNewAudit: () => void;
}

function getArchiveVerdictMeta(dossier: ClaimDossier) {
  const isFake = dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false';
  const isMisleading = dossier.clearVerdictStatus === 'MISLEADING' || dossier.verdict === 'misleading';
  const isTrue = dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true';
  const isPartly = dossier.clearVerdictStatus === 'PARTLY_TRUE' || dossier.verdict === 'partly_true';
  const isContext = dossier.clearVerdictStatus === 'CONTEXT_MISSING' || dossier.verdict === 'context_missing';

  if (isFake) return { label: 'FALSE NEWS', textClass: 'text-[#dc2626]' };
  if (isMisleading) return { label: 'MISLEADING', textClass: 'text-[#d97706]' };
  if (isPartly) return { label: 'PARTLY TRUE', textClass: 'text-[#ea580c]' };
  if (isContext) return { label: 'CONTEXT MISSING', textClass: 'text-[#7c3aed]' };
  if (isTrue) return { label: 'TRUE NEWS', textClass: 'text-[#16a34a]' };
  return { label: 'VERIFICATION PENDING', textClass: 'text-[#475569]' };
}

function renderHighlightedTokens(tokens: HighlightedToken[], isConsistent: boolean) {
  return tokens.map((tok, idx) => {
    if (tok.kind === 'space') {
      return <React.Fragment key={idx}>{tok.text}</React.Fragment>;
    }
    if (tok.kind === 'conflict') {
      return (
        <mark
          key={idx}
          className="bg-[#fee2e2] text-[#991b1b] font-semibold px-1 py-0.5 rounded-xs underline decoration-[#dc2626]/60 decoration-2 underline-offset-2"
        >
          {tok.text}
        </mark>
      );
    }
    if (tok.kind === 'shared') {
      return (
        <mark
          key={idx}
          className={
            isConsistent
              ? 'bg-[#dcfce7]/80 text-[#14532d] font-medium px-0.5 rounded-xs'
              : 'bg-[#dbeafe]/75 text-[#1e3a8a] font-medium px-0.5 rounded-xs'
          }
        >
          {tok.text}
        </mark>
      );
    }
    return (
      <mark key={idx} className="bg-[#fef3c7]/80 text-[#92400e] px-0.5 rounded-xs">
        {tok.text}
      </mark>
    );
  });
}

export const ClaimSplitCompareView: React.FC<ClaimSplitCompareViewProps> = ({
  activeLang,
  allDossiers,
  activeDossier,
  initialArchiveId,
  onInspectDossier,
  onRunNewAudit,
}) => {
  const [newClaimText, setNewClaimText] = useState('');
  const [manualArchiveId, setManualArchiveId] = useState<string | null>(initialArchiveId || null);
  const [lockManualSelection, setLockManualSelection] = useState<boolean>(Boolean(initialArchiveId));

  useEffect(() => {
    if (initialArchiveId) {
      setManualArchiveId(initialArchiveId);
      setLockManualSelection(true);
    }
  }, [initialArchiveId]);

  const rankedMatches = useMemo(() => {
    if (!newClaimText.trim() || allDossiers.length === 0) return [];
    return rankSimilarArchivedClaims(newClaimText, allDossiers);
  }, [newClaimText, allDossiers]);

  const selectedArchivedDossier = useMemo(() => {
    if (allDossiers.length === 0) return null;
    if (lockManualSelection && manualArchiveId) {
      const exact = allDossiers.find((d) => d.id === manualArchiveId);
      if (exact) return exact;
    }
    if (rankedMatches.length > 0) {
      return rankedMatches[0].dossier;
    }
    if (manualArchiveId) {
      const exact = allDossiers.find((d) => d.id === manualArchiveId);
      if (exact) return exact;
    }
    return activeDossier || allDossiers[0];
  }, [allDossiers, lockManualSelection, manualArchiveId, rankedMatches, activeDossier]);

  const comparison = useMemo(() => {
    if (!newClaimText.trim() || !selectedArchivedDossier) return null;
    return compareNewClaimWithArchive(newClaimText, selectedArchivedDossier, activeLang);
  }, [newClaimText, selectedArchivedDossier, activeLang]);

  const bestAutoMatch = rankedMatches.length > 0 ? rankedMatches[0] : null;
  const isShowingNonTopMatch =
    Boolean(bestAutoMatch && selectedArchivedDossier && bestAutoMatch.dossier.id !== selectedArchivedDossier.id);

  if (allDossiers.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-[#cbd5e1] p-10 flex flex-col items-center justify-center text-center gap-3">
        <span className="material-symbols-outlined text-[34px] text-[#94a3b8]">compare_arrows</span>
        <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#0f172a]">
          {activeLang === 'kn'
            ? 'ಹೋಲಿಕೆಗೆ ಯಾವುದೇ ಹಳೆಯ ದಾಖಲೆಗಳಿಲ್ಲ'
            : activeLang === 'hi'
            ? 'तुलना के लिए अभी कोई अभिलेख उपलब्ध नहीं है'
            : 'No archived claims available for comparison'}
        </h3>
        <p className="text-xs text-[#64748b] max-w-md leading-relaxed">
          {activeLang === 'kn'
            ? 'ಹೊಸ ಸುದ್ದಿಯನ್ನು ನಿಮ್ಮ ತನಿಖಾ ಇತಿಹಾಸದೊಂದಿಗೆ ಹೋಲಿಸಲು, ಮೊದಲು ಕನಿಷ್ಠ ಒಂದು ಸುದ್ದಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.'
            : activeLang === 'hi'
            ? 'नए दावे की तुलना अपने अभिलेखों से करने के लिए पहले कम से कम एक जांच चलाएं।'
            : 'Run at least one investigation first so TruthLens has verified archive records to compare new claims against.'}
        </p>
        <button
          type="button"
          onClick={onRunNewAudit}
          className="mt-1 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {activeLang === 'kn' ? 'ಮೊದಲ ತನಿಖೆ ಪ್ರಾರಂಭಿಸಿ' : activeLang === 'hi' ? 'पहली जांच शुरू करें' : 'Start First Investigation'}
        </button>
      </div>
    );
  }

  const archivedVerdict = selectedArchivedDossier ? getArchiveVerdictMeta(selectedArchivedDossier) : null;

  const statusStyles = (() => {
    if (!comparison) return null;
    const isArchivedFalseConsistent =
      comparison.overallStatus === 'consistent' &&
      selectedArchivedDossier &&
      (selectedArchivedDossier.clearVerdictStatus === 'FAKE' || selectedArchivedDossier.verdict === 'false');

    if (isArchivedFalseConsistent) {
      return {
        container: 'bg-[#fffbeb] border-[#fde68a]',
        titleColor: 'text-[#92400e]',
        iconColor: 'text-[#d97706]',
        icon: 'warning',
        label: 'CONSISTENT WITH DEBUNKED CLAIM',
      };
    }
    if (comparison.overallStatus === 'consistent') {
      return {
        container: 'bg-[#f0fdf4] border-[#bbf7d0]',
        titleColor: 'text-[#14532d]',
        iconColor: 'text-[#16a34a]',
        icon: 'check_circle',
        label: 'CONSISTENT / CORROBORATED',
      };
    }
    if (comparison.overallStatus === 'contradictory') {
      return {
        container: 'bg-[#fef2f2] border-[#fecaca]',
        titleColor: 'text-[#7f1d1d]',
        iconColor: 'text-[#dc2626]',
        icon: 'cancel',
        label: 'CONTRADICTION DETECTED',
      };
    }
    return {
      container: 'bg-[#f8fafc] border-[#cbd5e1]',
      titleColor: 'text-[#0f172a]',
      iconColor: 'text-[#475569]',
      icon: 'difference',
      label: 'DISTINCT CONTEXT / INCONCLUSIVE',
    };
  })();

  const candidateList = rankedMatches.length > 0
    ? rankedMatches.slice(0, 4)
    : allDossiers.slice(0, 4).map((dossier) => ({
        dossier,
        similarityScore: null as number | null,
        comparisonPreviewStatus: null as 'consistent' | 'contradictory' | 'inconclusive' | null,
      }));

  return (
    <div className="flex flex-col gap-5">
      {/* 1. New Claim Input + Archive Match Selector */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-['Plus_Jakarta_Sans'] font-bold text-sm sm:text-base text-[#0f172a]">
              {activeLang === 'kn'
                ? 'ಹೊಸ ಕ್ಲೈಮ್ ಅನ್ನು ಆರ್ಕೈವ್‌ನೊಂದಿಗೆ ಹೋಲಿಸಿ'
                : activeLang === 'hi'
                ? 'नए दावे की अभिलेख से तुलना करें'
                : 'Compare a New Claim Against the Archive'}
            </h2>
            <p className="text-xs text-[#64748b] mt-0.5">
              {activeLang === 'kn'
                ? 'ಕೆಳಗೆ ಹೊಸ ಸುದ್ದಿಯನ್ನು ನಮೂದಿಸಿ. ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಅತ್ಯಂತ ಹತ್ತಿರದ ಹಳೆಯ ದಾಖಲೆಯನ್ನು ಹುಡುಕಿ ವಿರೋಧಾಭಾಸಗಳನ್ನು ತೋರಿಸುತ್ತದೆ.'
                : activeLang === 'hi'
                ? 'नीचे नया दावा दर्ज करें; सिस्टम स्वचालित रूप से सबसे मिलते-जुलते अभिलेख से संगति या विरोधाभास की जांच करेगा।'
                : 'Enter a claim below to rank matching archived records and inspect factual consistency or contradictions side-by-side.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedArchivedDossier && (
              <button
                type="button"
                onClick={() => setNewClaimText(selectedArchivedDossier.originalClaim)}
                className="px-3 py-1.5 rounded-lg border border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#f1f5f9] text-xs font-semibold text-[#334155] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Load Selected Claim &amp; Edit
              </button>
            )}
            {newClaimText && (
              <button
                type="button"
                onClick={() => setNewClaimText('')}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <textarea
          rows={3}
          value={newClaimText}
          onChange={(e) => setNewClaimText(e.target.value)}
          placeholder={
            activeLang === 'kn'
              ? 'ಉದಾ: ಹಿಂದೆ ಪರಿಶೀಲಿಸಿದ ಸುದ್ದಿಯ ಬದಲಾದ ಆವೃತ್ತಿ ಅಥವಾ ಹೊಸ ವದಂತಿಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...'
              : activeLang === 'hi'
              ? 'उदाहरण: किसी वायरल समाचार या पहले सत्यापित दावे का बदला हुआ रूप यहाँ लिखें...'
              : 'Paste or type a new claim, forwarded headline, or modified statement to compare against your archive...'
          }
          className="w-full rounded-xl bg-[#f8fafc] border border-[#e2e8f0] px-3.5 py-2.5 text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:bg-white focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 resize-y leading-relaxed"
        />

        {/* Similar Archived Candidates + Archive Dropdown */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-[#f1f5f9]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
              {rankedMatches.length > 0
                ? 'Most Similar Archived Claims'
                : 'Select Archived Baseline'}
            </span>

            <div className="flex items-center gap-2">
              {isShowingNonTopMatch && bestAutoMatch && (
                <button
                  type="button"
                  onClick={() => {
                    setManualArchiveId(bestAutoMatch.dossier.id);
                    setLockManualSelection(false);
                  }}
                  className="text-[11px] font-semibold text-[#2563eb] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Switch to closest match ({bestAutoMatch.similarityScore}%)
                </button>
              )}

              <select
                aria-label="Choose archived claim baseline"
                value={selectedArchivedDossier?.id || ''}
                onChange={(e) => {
                  setManualArchiveId(e.target.value);
                  setLockManualSelection(true);
                }}
                className="text-xs bg-[#f8fafc] border border-[#e2e8f0] rounded-lg px-2.5 py-1.5 text-[#0f172a] max-w-[260px] focus:border-[#2563eb] focus:outline-none cursor-pointer"
              >
                {allDossiers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title.length > 52 ? `${d.title.slice(0, 52)}...` : d.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {candidateList.map((cand) => {
              const isSelected = selectedArchivedDossier?.id === cand.dossier.id;
              const verdictMeta = getArchiveVerdictMeta(cand.dossier);
              const previewText =
                cand.comparisonPreviewStatus === 'consistent'
                  ? 'Consistent'
                  : cand.comparisonPreviewStatus === 'contradictory'
                  ? 'Contradiction'
                  : cand.comparisonPreviewStatus === 'inconclusive'
                  ? 'Distinct'
                  : null;
              const previewColor =
                cand.comparisonPreviewStatus === 'consistent'
                  ? 'text-[#16a34a]'
                  : cand.comparisonPreviewStatus === 'contradictory'
                  ? 'text-[#dc2626]'
                  : 'text-[#64748b]';

              return (
                <button
                  key={cand.dossier.id}
                  type="button"
                  onClick={() => {
                    setManualArchiveId(cand.dossier.id);
                    setLockManualSelection(true);
                  }}
                  className={`text-left p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#eff6ff]/60 border-[#2563eb] ring-1 ring-[#2563eb]/20'
                      : 'bg-[#f8fafc] border-[#e2e8f0] hover:bg-white hover:border-[#cbd5e1]'
                  }`}
                >
                  <span className="text-xs font-semibold text-[#0f172a] line-clamp-2 leading-snug">
                    {cand.dossier.title}
                  </span>
                  <div className="flex items-center justify-between gap-1.5 text-[11px] font-medium tabular-nums">
                    <span className={verdictMeta.textClass}>{verdictMeta.label}</span>
                    {cand.similarityScore !== null && (
                      <span className="text-[#475569] font-mono">
                        {cand.similarityScore}%{previewText ? ` · ` : ''}
                        {previewText && <span className={previewColor}>{previewText}</span>}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Consistency / Contradiction Outcome Banner */}
      {comparison && statusStyles && (
        <div className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-2.5 ${statusStyles.container}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined text-[20px] ${statusStyles.iconColor}`}>
                {statusStyles.icon}
              </span>
              <h3 className={`font-['Plus_Jakarta_Sans'] font-extrabold text-sm sm:text-base ${statusStyles.titleColor}`}>
                {comparison.headline}
              </h3>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#334155] tabular-nums shrink-0">
              <span className="font-bold">{statusStyles.label}</span>
              <span>·</span>
              <span>NLI {comparison.nliResult.label} ({Math.round(comparison.nliResult.confidence * 100)}%)</span>
              <span>·</span>
              <span>Similarity {comparison.similarityScore}%</span>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#1e293b] leading-relaxed">
            {comparison.explanation}
          </p>

          {comparison.archiveVerdictWarning && (
            <div className="text-xs font-medium text-[#0f172a] bg-white/80 border border-[#e2e8f0] rounded-xl px-3 py-2">
              {comparison.archiveVerdictWarning}
            </div>
          )}
        </div>
      )}

      {/* 3. Side-by-Side Split View Panes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* LEFT PANE: New Claim */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#f1f5f9]">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563eb]">
                New Claim Input
              </span>
              {comparison ? (
                <span className="text-[11px] text-[#64748b] font-mono tabular-nums">
                  {comparison.newFrame.modality.replace(/_/g, ' ')} · {comparison.newFrame.polarity} · {comparison.newFrame.tense}
                </span>
              ) : (
                <span className="text-[11px] text-[#94a3b8]">Awaiting input</span>
              )}
            </div>

            {comparison ? (
              <div className="text-sm sm:text-[15px] text-[#0f172a] leading-relaxed font-medium">
                "{renderHighlightedTokens(comparison.newTokens, comparison.overallStatus === 'consistent')}"
              </div>
            ) : (
              <div className="py-6 text-xs text-[#64748b] leading-relaxed">
                Type or paste a claim in the box above (or click <span className="font-semibold text-[#0f172a]">Load Selected Claim &amp; Edit</span>) to highlight consistent concepts, date shifts, quantity clashes, and polarity contradictions against the archived record.
              </div>
            )}
          </div>

          {comparison && (
            <div className="pt-3 border-t border-[#f1f5f9] grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block">Subject</span>
                <span className="font-semibold text-[#0f172a]">{comparison.newFrame.actor || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block">Quantity</span>
                <span className="font-semibold text-[#0f172a] tabular-nums">
                  {comparison.newFrame.cardinality !== undefined
                    ? `${comparison.newFrame.cardinality}${comparison.newFrame.isExclusiveCardinality ? ' (exclusive)' : ''}`
                    : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block">Timeframe</span>
                <span className="font-semibold text-[#0f172a] tabular-nums">{comparison.newFrame.timeframe || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b] block">Location / Target</span>
                <span className="font-semibold text-[#0f172a]">
                  {comparison.newFrame.location || comparison.newFrame.target || '—'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Archived Baseline Claim */}
        {selectedArchivedDossier && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#f1f5f9] flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#475569]">
                  Archived Record
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
                  {archivedVerdict && (
                    <span className={`font-extrabold ${archivedVerdict.textClass}`}>{archivedVerdict.label}</span>
                  )}
                  <span className="text-[#94a3b8]">·</span>
                  <span className="text-[#475569]">{selectedArchivedDossier.confidenceScore}% conf</span>
                  <span className="text-[#94a3b8]">·</span>
                  <span className="text-[#94a3b8]">{selectedArchivedDossier.id}</span>
                </div>
              </div>

              <div>
                <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#0f172a] leading-snug mb-1.5">
                  {selectedArchivedDossier.title}
                </h4>
                <div className="text-sm sm:text-[15px] text-[#0f172a] leading-relaxed">
                  "
                  {comparison
                    ? renderHighlightedTokens(comparison.archivedTokens, comparison.overallStatus === 'consistent')
                    : selectedArchivedDossier.originalClaim}
                  "
                </div>
              </div>

              {/* Archived Verified Summary & Finding Alignment */}
              <div className="bg-[#f8fafc] rounded-xl border border-[#f1f5f9] p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                    Archived Investigation Finding
                  </span>
                  {comparison?.findingAlignment && (
                    <span className="text-[10px] font-mono font-semibold text-[#334155] tabular-nums">
                      vs Finding: {comparison.findingAlignment.label} ({comparison.findingAlignment.confidence}%)
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#334155] leading-relaxed">
                  {selectedArchivedDossier.summary?.[activeLang] ||
                    selectedArchivedDossier.summary?.en ||
                    selectedArchivedDossier.debunkExplanation?.[activeLang] ||
                    selectedArchivedDossier.debunkExplanation?.en}
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#f1f5f9] flex items-center justify-between gap-2 text-xs">
              <span className="text-[#64748b] tabular-nums">
                {selectedArchivedDossier.sources?.length || 0} official/news sources · {selectedArchivedDossier.timeAgo || 'Archived'}
              </span>
              <button
                type="button"
                onClick={() => onInspectDossier(selectedArchivedDossier)}
                className="px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Open Full Result</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline Highlight Legend */}
      {comparison && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-[#64748b]">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-xs border ${
                  comparison.overallStatus === 'consistent'
                    ? 'bg-[#dcfce7] border-[#86efac]'
                    : 'bg-[#dbeafe] border-[#93c5fd]'
                }`}
              />
              <span>Shared concepts ({comparison.sharedTerms.length})</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#fee2e2] border border-[#fca5a5]" />
              <span>Conflicting / negation / quantity / year markers</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#fef3c7] border border-[#fcd34d]" />
              <span>Unique context terms</span>
            </span>
          </div>
        </div>
      )}

      {/* 4. Semantic Dimension Comparison Table */}
      {comparison && (
        <div className="bg-white rounded-2xl border border-[#e2e8f0] overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-[#e2e8f0] flex items-center justify-between gap-2 bg-[#f8fafc]">
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xs sm:text-sm text-[#0f172a]">
              Semantic Frame Comparison Matrix
            </h3>
            <span className="text-[11px] text-[#64748b] tabular-nums">
              {comparison.dimensions.filter((d) => d.status === 'conflict').length} conflicts ·{' '}
              {comparison.dimensions.filter((d) => d.status === 'match').length} aligned
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f0] text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
                  <th className="py-2.5 px-4 sm:px-5 w-[170px]">Dimension</th>
                  <th className="py-2.5 px-4">New Claim</th>
                  <th className="py-2.5 px-4">Archived Claim</th>
                  <th className="py-2.5 px-4 sm:px-5 text-right w-[130px]">Alignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f1f5f9]">
                {comparison.dimensions.map((row) => {
                  const statusLabel =
                    row.status === 'match'
                      ? 'Aligned'
                      : row.status === 'conflict'
                      ? 'Conflict'
                      : row.status === 'partial'
                      ? 'Differs'
                      : 'Unspecified';

                  const statusClass =
                    row.status === 'match'
                      ? 'text-[#16a34a] font-bold'
                      : row.status === 'conflict'
                      ? 'text-[#dc2626] font-extrabold'
                      : row.status === 'partial'
                      ? 'text-[#d97706] font-semibold'
                      : 'text-[#94a3b8]';

                  return (
                    <tr key={row.key} className="hover:bg-[#f8fafc]/70">
                      <td className="py-2.5 px-4 sm:px-5 font-semibold text-[#334155] whitespace-nowrap">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-4 text-[#0f172a] tabular-nums">{row.newValue}</td>
                      <td className="py-2.5 px-4 text-[#0f172a] tabular-nums">{row.archivedValue}</td>
                      <td className={`py-2.5 px-4 sm:px-5 text-right whitespace-nowrap ${statusClass}`}>
                        <span>{statusLabel}</span>
                        {row.note && (
                          <span className="block text-[10px] font-normal text-[#64748b]">{row.note}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
