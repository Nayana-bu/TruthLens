import React, { useState, useMemo } from 'react';
import type { ClaimDossier, Language, InvestigationStatistics, VerdictType } from '../types';
import { VoiceVerdictPlayer } from './VoiceVerdictPlayer';

interface InvestigationTabProps {
  currentLang: Language;
  activeDossier: ClaimDossier | null;
  allDossiers?: ClaimDossier[];
  statistics?: InvestigationStatistics;
  onInspectDossier: (dossier: ClaimDossier) => void;
  onDeleteInvestigation?: (id: string) => Promise<boolean>;
  onRunNewAudit: () => void;
}

export const InvestigationTab: React.FC<InvestigationTabProps> = ({
  currentLang,
  activeDossier,
  allDossiers = [],
  statistics,
  onInspectDossier,
  onDeleteInvestigation,
  onRunNewAudit,
}) => {
  const [activeLang, setActiveLang] = useState<Language>(currentLang);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVerdictFilter, setSelectedVerdictFilter] = useState<string>('all');
  const [selectedForDetails, setSelectedForDetails] = useState<ClaimDossier | null>(
    activeDossier || (allDossiers.length > 0 ? allDossiers[0] : null)
  );

  // Deletion modal confirmation state
  const [itemToDelete, setItemToDelete] = useState<ClaimDossier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync selected details when allDossiers or activeDossier changes
  React.useEffect(() => {
    if (activeDossier) {
      setSelectedForDetails(activeDossier);
    } else if (allDossiers.length > 0 && !selectedForDetails) {
      setSelectedForDetails(allDossiers[0]);
    }
  }, [activeDossier, allDossiers]);

  // Filter investigations by search query and verdict
  const filteredInvestigations = useMemo(() => {
    return allDossiers.filter((item) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          item.originalClaim.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (item.summary?.en && item.summary.en.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      // 2. Verdict filter
      if (selectedVerdictFilter !== 'all') {
        const v = selectedVerdictFilter.toLowerCase();
        if (v === 'true' && item.verdict !== 'verified_true' && item.clearVerdictStatus !== 'REAL') {
          return false;
        }
        if (v === 'fake' && item.verdict !== 'false' && item.clearVerdictStatus !== 'FAKE') {
          return false;
        }
        if (v === 'misleading' && item.verdict !== 'misleading' && item.clearVerdictStatus !== 'MISLEADING') {
          return false;
        }
        if (v === 'partly' && item.verdict !== 'partly_true' && item.clearVerdictStatus !== 'PARTLY_TRUE') {
          return false;
        }
        if (v === 'context' && item.verdict !== 'context_missing' && item.clearVerdictStatus !== 'CONTEXT_MISSING') {
          return false;
        }
        if (v === 'unverified' && item.verdict !== 'unverified' && item.clearVerdictStatus !== 'UNVERIFIED') {
          return false;
        }
      }

      return true;
    });
  }, [allDossiers, searchQuery, selectedVerdictFilter]);

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onDeleteInvestigation) return;
    setIsDeleting(true);
    try {
      const success = await onDeleteInvestigation(itemToDelete.id);
      if (success) {
        if (selectedForDetails?.id === itemToDelete.id) {
          const remaining = allDossiers.filter((d) => d.id !== itemToDelete.id);
          setSelectedForDetails(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  const getVerdictBadge = (dossier: ClaimDossier) => {
    const isFake = dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false';
    const isMisleading = dossier.clearVerdictStatus === 'MISLEADING' || dossier.verdict === 'misleading';
    const isTrue = dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true';
    const isPartly = dossier.clearVerdictStatus === 'PARTLY_TRUE' || dossier.verdict === 'partly_true';
    const isContext = dossier.clearVerdictStatus === 'CONTEXT_MISSING' || dossier.verdict === 'context_missing';

    if (isFake) {
      return {
        label: 'FAKE',
        bg: 'bg-[#fee2e2]',
        text: 'text-[#dc2626]',
        icon: 'cancel',
      };
    }
    if (isMisleading) {
      return {
        label: 'MISLEADING',
        bg: 'bg-[#fef3c7]',
        text: 'text-[#d97706]',
        icon: 'warning',
      };
    }
    if (isPartly) {
      return {
        label: 'PARTLY TRUE',
        bg: 'bg-[#ffedd5]',
        text: 'text-[#ea580c]',
        icon: 'published_with_changes',
      };
    }
    if (isContext) {
      return {
        label: 'CONTEXT MISSING',
        bg: 'bg-[#ede9fe]',
        text: 'text-[#7c3aed]',
        icon: 'info',
      };
    }
    if (isTrue) {
      return {
        label: 'VERIFIED TRUE',
        bg: 'bg-[#dcfce7]',
        text: 'text-[#16a34a]',
        icon: 'check_circle',
      };
    }
    return {
      label: 'UNVERIFIED',
      bg: 'bg-[#f1f5f9]',
      text: 'text-[#475569]',
      icon: 'help',
    };
  };

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto px-4 py-4 gap-6 font-['Inter']">
      {/* 1. Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00164e] text-[#dce1ff] text-[11px] font-semibold mb-1 shadow-xs">
            <span className="material-symbols-outlined text-[14px] text-[#8fa7fe]">folder_managed</span>
            <span>
              {activeLang === 'kn'
                ? 'ನೈಜ ತನಿಖಾ ದಾಖಲೆಗಳು'
                : activeLang === 'hi'
                ? 'वास्तविक जांच अभिलेख'
                : 'Real Investigation History'}
            </span>
          </div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-2xl font-black text-[#0b1c30] tracking-tight">
            {activeLang === 'kn'
              ? 'ಪರಿಶೀಲಿಸಿದ ವರದಿಗಳ ಇತಿಹಾಸ'
              : activeLang === 'hi'
              ? 'सत्यापित रिपोर्ट इतिहास'
              : 'Investigation History & Registry'}
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            {activeLang === 'kn'
              ? 'ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಉಳಿಸಲಾದ ಎಲ್ಲಾ ನೈಜ ತನಿಖೆಗಳು ಮತ್ತು ಸತ್ಯಾಸತ್ಯತೆ ದಾಖಲೆಗಳು.'
              : activeLang === 'hi'
              ? 'डेटाबेस में स्थायी रूप से संग्रहीत सभी वास्तविक जांचें एवं साक्ष्य।'
              : 'Persistent evidentiary records stored in the verification database.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onRunNewAudit}
          className="h-9 px-4 rounded-xl bg-[#2563eb] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:bg-[#1d4ed8] transition-all flex-shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">add_circle</span>
          <span>{activeLang === 'kn' ? 'ಹೊಸ ತನಿಖೆ' : activeLang === 'hi' ? 'नई जांच' : 'New Investigation'}</span>
        </button>
      </div>

      {/* 2. Genuine Statistics Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] shadow-xs flex flex-col">
          <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
            {activeLang === 'kn' ? 'ಒಟ್ಟು ಪರಿಶೀಲನೆ' : activeLang === 'hi' ? 'कुल सत्यापन' : 'Total Saved'}
          </span>
          <span className="text-xl font-extrabold text-[#0f172a] mt-0.5 font-['Plus_Jakarta_Sans']">
            {(statistics?.total ?? allDossiers.length).toLocaleString()}
          </span>
          <span className="text-[10px] text-[#64748b] font-medium mt-0.5">Database records</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] shadow-xs flex flex-col">
          <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
            {activeLang === 'kn' ? 'ಸತ್ಯಾಸತ್ಯತೆ ದರ' : activeLang === 'hi' ? 'सत्य दर' : 'True Rate'}
          </span>
          <span className="text-xl font-extrabold text-[#16a34a] mt-0.5 font-['Plus_Jakarta_Sans']">
            {statistics?.truePercent ?? 0}%
          </span>
          <span className="text-[10px] text-[#16a34a] font-medium mt-0.5">
            {statistics?.trueCount ?? 0} confirmed
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] shadow-xs flex flex-col">
          <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
            {activeLang === 'kn' ? 'ಸುಳ್ಳು ಸುದ್ದಿ ದರ' : activeLang === 'hi' ? 'फर्जी दर' : 'Fake Rate'}
          </span>
          <span className="text-xl font-extrabold text-[#dc2626] mt-0.5 font-['Plus_Jakarta_Sans']">
            {statistics?.fakePercent ?? 0}%
          </span>
          <span className="text-[10px] text-[#dc2626] font-medium mt-0.5">
            {statistics?.fakeCount ?? 0} refuted
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#e2e8f0] shadow-xs flex flex-col">
          <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
            {activeLang === 'kn' ? 'ದಾರಿತಪ್ಪಿಸುವ / ಅಪುಷ್ಟ' : activeLang === 'hi' ? 'भ्रामक / अपुष्ट' : 'Misleading / Unverified'}
          </span>
          <span className="text-xl font-extrabold text-[#d97706] mt-0.5 font-['Plus_Jakarta_Sans']">
            {((statistics?.misleadingPercent ?? 0) + (statistics?.unverifiedPercent ?? 0)).toFixed(1)}%
          </span>
          <span className="text-[10px] text-[#d97706] font-medium mt-0.5">
            {(statistics?.misleadingCount ?? 0) + (statistics?.unverifiedCount ?? 0)} cases
          </span>
        </div>
      </div>

      {/* 3. Search Bar & Verdict Filters */}
      <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-xs flex flex-col gap-3">
        {/* Search input */}
        <div className="relative">
          <span className="material-symbols-outlined text-[18px] text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeLang === 'kn'
                ? 'ಕ್ಲೈಮ್ ಅಥವಾ ವಿಷಯವನ್ನು ಹುಡುಕಿ...'
                : activeLang === 'hi'
                ? 'दावे या कीवर्ड से खोजें...'
                : 'Search investigations by claim or keywords...'
            }
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs sm:text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:bg-white focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0f172a]"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Verdict Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All Records' },
            { id: 'true', label: 'Verified True' },
            { id: 'fake', label: 'Fake' },
            { id: 'misleading', label: 'Misleading' },
            { id: 'partly', label: 'Partly True' },
            { id: 'context', label: 'Context Missing' },
            { id: 'unverified', label: 'Unverified' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedVerdictFilter(pill.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedVerdictFilter === pill.id
                  ? 'bg-[#2563eb] text-white shadow-xs'
                  : 'bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0] hover:bg-[#f1f5f9]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Investigation Records List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs font-bold text-[#64748b] px-1">
          <span>{filteredInvestigations.length} investigations found</span>
          <span>Click card to inspect full dossier</span>
        </div>

        {filteredInvestigations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-[#cbd5e1] p-10 flex flex-col items-center justify-center text-center gap-2.5">
            <span className="material-symbols-outlined text-[32px] text-[#cbd5e1]">inventory_2</span>
            <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm sm:text-base text-[#0f172a]">
              {allDossiers.length === 0
                ? 'No investigations saved yet'
                : 'No investigations matched your filter'}
            </h3>
            <p className="text-xs text-[#64748b] max-w-sm">
              {allDossiers.length === 0
                ? 'Enter a news claim, WhatsApp message, or screenshot in the Verify tab to generate a persistent investigation.'
                : 'Try adjusting your search terms or clearing the verdict filter.'}
            </p>
            {allDossiers.length === 0 && (
              <button
                type="button"
                onClick={onRunNewAudit}
                className="mt-2 px-4 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-bold shadow-xs hover:bg-[#1d4ed8] cursor-pointer"
              >
                Start First Investigation
              </button>
            )}
          </div>
        ) : (
          filteredInvestigations.map((item) => {
            const badge = getVerdictBadge(item);
            const isSelected = selectedForDetails?.id === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col gap-3 ${
                  isSelected
                    ? 'border-[#2563eb] ring-2 ring-[#2563eb]/20'
                    : 'border-[#e2e8f0] hover:border-[#cbd5e1]'
                }`}
              >
                {/* Top row: Verdict badge, Input type, Timestamp & Delete button */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
                      <span>{badge.label}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f1f5f9] text-[#475569] text-[10px] font-semibold">
                      <span className="material-symbols-outlined text-[12px]">
                        {item.submissionMode === 'ocr' ? 'image' : item.submissionMode === 'url' ? 'link' : 'chat'}
                      </span>
                      <span>
                        {item.submissionMode === 'ocr' ? 'Screenshot / OCR' : item.submissionMode === 'url' ? 'Web / URL' : 'Text / WhatsApp'}
                      </span>
                    </span>

                    <span className="text-[11px] font-mono text-[#94a3b8]">
                      {item.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#94a3b8] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">schedule</span>
                      <span>{item.timeAgo || 'Saved record'}</span>
                    </span>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setItemToDelete(item);
                      }}
                      title="Delete this investigation"
                      className="w-7 h-7 rounded-lg text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fee2e2] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Claim Title */}
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm sm:text-base text-[#0f172a] leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#64748b] mt-1 line-clamp-2 leading-relaxed">
                    "{item.originalClaim}"
                  </p>
                </div>

                {/* Summary / Explanation snippet */}
                <p className="text-xs text-[#475569] bg-[#f8fafc] p-2.5 rounded-xl border border-[#f1f5f9] leading-relaxed">
                  {item.summary?.[activeLang] || item.summary?.en || item.debunkExplanation?.[activeLang] || item.debunkExplanation?.en}
                </p>

                {/* Bottom actions: Inspect, confidence score, source count */}
                <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-3 text-[#64748b] text-[11px]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#2563eb]">verified</span>
                      <span>{item.sources?.length || 0} Sources</span>
                    </span>
                    <span>•</span>
                    <span>Confidence: {item.confidenceScore}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onInspectDossier(item)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                    >
                      <span>Open Full Result</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal for Individual Deletion */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#e2e8f0] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-base text-[#0f172a]">
                  Delete Investigation?
                </h3>
                <p className="text-xs text-[#64748b]">
                  This action will permanently remove this record from the database.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-xs text-[#334155]">
              <span className="font-bold text-[#0f172a] block truncate mb-0.5">
                {itemToDelete.title}
              </span>
              <span className="text-[#64748b] line-clamp-2">
                "{itemToDelete.originalClaim}"
              </span>
            </div>

            <p className="text-[11px] text-[#dc2626] font-medium">
              Statistics and history will update immediately after deletion.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#64748b] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#dc2626] hover:bg-[#b91c1c] text-white transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-75"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
