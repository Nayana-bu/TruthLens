import React, { useState, useEffect } from 'react';
import { ClaimDossier, Language } from '../types';
import { INITIAL_DOSSIERS, UI_TRANSLATIONS } from '../data/mockData';
import { VoiceVerdictPlayer } from './VoiceVerdictPlayer';

interface InvestigationTabProps {
  currentLang: Language;
  activeDossier: ClaimDossier | null;
  allDossiers?: ClaimDossier[];
  onInspectDossier: (dossier: ClaimDossier) => void;
  onRunNewAudit: () => void;
}

export const InvestigationTab: React.FC<InvestigationTabProps> = ({
  currentLang,
  activeDossier,
  allDossiers,
  onInspectDossier,
  onRunNewAudit,
}) => {
  const dossiersList = allDossiers && allDossiers.length > 0 ? allDossiers : INITIAL_DOSSIERS;
  const [selectedDossier, setSelectedDossier] = useState<ClaimDossier>(
    activeDossier || dossiersList[0]
  );
  const [searchQuery, setSearchQuery] = useState('');

  const t = UI_TRANSLATIONS[currentLang];

  useEffect(() => {
    if (activeDossier) {
      setSelectedDossier(activeDossier);
    }
  }, [activeDossier]);

  const filtered = dossiersList.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.originalClaim.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.sourceEntity.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-5 gap-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dce1ff] text-[#00164e] font-['Inter'] text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[14px]">radar</span>
            <span>Forensic Investigation Room</span>
          </div>
          <h1 className="font-['Plus Jakarta Sans'] text-xl sm:text-2xl font-bold text-[#0b1c30]">
            Autonomous Evidence Radar
          </h1>
          <p className="text-xs text-[#64748b] mt-0.5">
            Cross-examining real-time claims against official gazettes & regulatory advisories.
          </p>
        </div>

        <button
          type="button"
          onClick={onRunNewAudit}
          className="h-9 px-3.5 rounded-lg bg-[#4059aa] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-[#334a91] transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          <span className="hidden sm:inline">New Audit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Featured Active Dossier Card with Clear Verdict and Speech */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-[#e4e9f4] p-4 flex flex-col gap-3 relative overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
            <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider">
              Active Dossier Under Inspection
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#76777d]">
            {selectedDossier.officialRefId}
          </span>
        </div>

        {/* 1. Clear Verdict & Kannada / Hindi Audio */}
        <VoiceVerdictPlayer dossier={selectedDossier} />

        <div className="bg-[#f7f9fd] p-3 rounded-lg border border-[#e4e9f4] flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[#4059aa] text-[18px] flex-shrink-0 mt-0.5">
            chat_bubble
          </span>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4059aa]">
              Submitted claim
            </span>
            <p className="text-sm font-medium text-[#0b1c30] leading-snug mt-0.5">
              "{selectedDossier.originalClaim}"
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-['Plus Jakarta Sans'] text-base sm:text-lg font-bold text-[#0b1c30]">
            {selectedDossier.title}
          </h2>

          <p className="text-xs sm:text-sm text-[#45464d] leading-relaxed bg-[#f7f9fd] p-3 rounded-lg border border-[#e4e9f4]">
            {selectedDossier.debunkExplanation[currentLang] || selectedDossier.debunkExplanation.en}
          </p>
        </div>

        {/* Repositories Cross-Checked */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-bold text-[#64748b] uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">travel_explore</span>
            Official Repositories Cross-Referenced
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {selectedDossier.sources.map((src, i) => (
              <div key={i} className="p-2.5 rounded-lg border border-[#e4e9f4] bg-[#f7f9fd] text-xs">
                <div className="flex items-center justify-between font-semibold text-[#0b1c30]">
                  <span>{src.name}</span>
                  <span className="text-[10px] text-[#4059aa] font-bold uppercase">{src.status}</span>
                </div>
                <p className="text-[11px] text-[#76777d] mt-1">{src.details}</p>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onInspectDossier(selectedDossier)}
          className="w-full py-2.5 rounded-lg bg-[#eef2fb] text-[#4059aa] font-semibold text-xs sm:text-sm flex items-center justify-center gap-1 hover:bg-[#e5eeff] transition-colors border border-[#e0e7f5]"
        >
          <span>Open Full Forensic Telemetry Record</span>
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        </button>
      </div>

      {/* Repository Archive List */}
      <div className="lg:col-span-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#4059aa]">folder_open</span>
            All Verified Investigative Dossiers
          </h3>
          <span className="text-xs text-[#76777d]">{dossiersList.length} records</span>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#76777d] text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchClaims}
            className="w-full pl-9 pr-3 py-2 bg-white rounded-lg border border-[#e4e9f4] text-xs sm:text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#4059aa]"
          />
        </div>

        {/* List of Dossiers */}
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setSelectedDossier(item);
                onInspectDossier(item);
              }}
              className="bg-white p-3 rounded-xl border border-[#e4e9f4] hover:border-[#8fa7fe] transition-all cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    item.verdict === 'false'
                      ? 'bg-[#ba1a1a]'
                      : item.verdict === 'misleading'
                      ? 'bg-[#d97706]'
                      : 'bg-[#131b2e]'
                  }`}
                />
                <div className="min-w-0 flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-[#76777d]">
                      {item.sourceEntity}
                    </span>
                    <span className="text-[10px] text-[#94a3b8]">• {item.timeAgo}</span>
                  </div>
                  <h4 className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#0b1c30] group-hover:text-[#4059aa] transition-colors truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#76777d] truncate mt-0.5">
                    {item.summary[currentLang] || item.summary.en}
                  </p>
                </div>
              </div>

              <span className="material-symbols-outlined text-[18px] text-[#76777d] group-hover:text-[#4059aa] group-hover:translate-x-1 transition-all flex-shrink-0">
                chevron_right
              </span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
};
