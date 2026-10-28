import React, { useState, useEffect } from 'react';
import { ClaimDossier, Language } from '../types';
import { INITIAL_DOSSIERS, UI_TRANSLATIONS } from '../data/mockData';
import { VoiceVerdictPlayer } from './VoiceVerdictPlayer';
import {
  getSourceName,
  getSourceCategory,
  getSourceStatusLabel,
  getSourceDetails,
  getEvidentiaryFindingsTitle,
  getRecordCorroborationTitle,
  getPrimarySourceActionLabel,
} from '../utils/sourceTranslator';

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
  const [activeLang, setActiveLang] = useState<Language>(currentLang);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedNote, setCopiedNote] = useState(false);

  useEffect(() => {
    setActiveLang(currentLang);
  }, [currentLang]);

  useEffect(() => {
    if (activeDossier) {
      setSelectedDossier(activeDossier);
    }
  }, [activeDossier]);

  const categories = [
    { id: 'all', label: activeLang === 'kn' ? 'ಎಲ್ಲಾ ಪ್ರಕರಣಗಳು' : activeLang === 'hi' ? 'सभी मामले' : 'All Cases' },
    { id: 'governance', label: activeLang === 'kn' ? 'ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು' : activeLang === 'hi' ? 'सरकारी योजनाएं' : 'Govt Schemes' },
    { id: 'phishing', label: activeLang === 'kn' ? 'ಸೈಬರ್ & ವಂಚನೆ' : activeLang === 'hi' ? 'साइबर व फ्रॉड' : 'Phishing & Cyber' },
    { id: 'space', label: activeLang === 'kn' ? 'ವಿಜ್ಞಾನ & ತಂತ್ರಜ್ಞಾನ' : activeLang === 'hi' ? 'विज्ञान व अंतरिक्ष' : 'Science & Space' },
  ];

  const filteredDossiers = dossiersList.filter((d) => {
    if (selectedCategory === 'all') return true;
    return d.category === selectedCategory;
  });

  const isFake =
    selectedDossier.clearVerdictStatus === 'FAKE' || selectedDossier.verdict === 'false';
  const isMisleading =
    selectedDossier.clearVerdictStatus === 'MISLEADING' || selectedDossier.verdict === 'misleading';

  const handleCopyWhatsAppNote = () => {
    const note =
      selectedDossier.whatsappDebunkNote[activeLang] ||
      selectedDossier.whatsappDebunkNote.en;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(note);
      setCopiedNote(true);
      setTimeout(() => setCopiedNote(false), 2500);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 py-4 gap-6">
      {/* 1. Header & Dedicated Dashboard Identity */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00164e] text-[#dce1ff] font-['Inter'] text-[11px] font-semibold mb-1 shadow-xs">
            <span className="material-symbols-outlined text-[14px] text-[#8fa7fe]">radar</span>
            <span>
              {activeLang === 'kn'
                ? 'ವಿಧಿವಿಜ್ಞಾನ ತನಿಖಾ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್'
                : activeLang === 'hi'
                ? 'फोरेंसिक जांच डैशबोर्ड'
                : 'Forensic Intelligence Dashboard'}
            </span>
          </div>
          <h1 className="font-['Plus Jakarta Sans'] text-2xl font-black text-[#0b1c30] tracking-tight">
            {activeLang === 'kn'
              ? 'ಅಧಿಕೃತ ದಾಖಲೆಗಳ ಪರಿಶೀಲನಾ ಕೇಂದ್ರ'
              : activeLang === 'hi'
              ? 'अभिलेख सत्यापन केंद्र'
              : 'Evidence Corroboration Center'}
          </h1>
          <p className="text-xs text-[#45464d] mt-0.5">
            {activeLang === 'kn'
              ? '48 ಅಧಿಕೃತ ಗೆಜೆಟ್‌ಗಳು ಮತ್ತು ಪಿಐಬಿ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ದಾಖಲೆಗಳ ನೇರ ಪರಿಶೀಲನೆ.'
              : activeLang === 'hi'
              ? '48 आधिकारिक राजपत्रों एवं पीआईबी रिकॉर्ड से सत्यापित जानकारी।'
              : 'Real-time cross-referencing against 48 state gazettes and verified registries.'}
          </p>
        </div>

        <button
          type="button"
          onClick={onRunNewAudit}
          className="h-9 px-3.5 rounded-xl bg-[#000000] text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-[#131b2e] transition-all flex-shrink-0 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px] text-[#8fa7fe]">add_circle</span>
          <span className="hidden sm:inline">
            {activeLang === 'kn' ? 'ಹೊಸ ತನಿಖೆ' : activeLang === 'hi' ? 'नई जांच' : 'New Audit'}
          </span>
        </button>
      </div>

      {/* 2. Forensic Intelligence KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-[#e5eeff] shadow-2xs flex flex-col">
          <span className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">
            {activeLang === 'kn' ? 'ಗೆಜೆಟ್ ದಾಖಲೆಗಳು' : activeLang === 'hi' ? 'राजपत्र स्रोत' : 'Gazettes Swept'}
          </span>
          <span className="text-lg font-black text-[#0b1c30] mt-0.5 font-mono">48+ Active</span>
          <span className="text-[10px] text-[#059669] font-semibold flex items-center gap-0.5 mt-0.5">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            PIB & Karnataka
          </span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-[#e5eeff] shadow-2xs flex flex-col">
          <span className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">
            {activeLang === 'kn' ? 'ಫೋರೆನ್ಸಿಕ್ ನಿಖರತೆ' : activeLang === 'hi' ? 'फोरेंसिक सटीकता' : 'Confidence'}
          </span>
          <span className="text-lg font-black text-[#4059aa] mt-0.5 font-mono">
            {selectedDossier.confidenceScore}%
          </span>
          <span className="text-[10px] text-[#45464d] font-semibold mt-0.5">Dual Corroborated</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-[#e5eeff] shadow-2xs flex flex-col">
          <span className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">
            {activeLang === 'kn' ? 'ಸುಳ್ಳು ಸುದ್ದಿ ತಡೆ' : activeLang === 'hi' ? 'फर्जी खबर दर' : 'Disinfo Rate'}
          </span>
          <span className="text-lg font-black text-[#e11d48] mt-0.5 font-mono">75% Refuted</span>
          <span className="text-[10px] text-[#ba1a1a] font-semibold mt-0.5">Viral Alert</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-[#e5eeff] shadow-2xs flex flex-col">
          <span className="text-[10px] font-bold text-[#76777d] uppercase tracking-wider">
            {activeLang === 'kn' ? 'ಭಾಷಾ ಧ್ವನಿ' : activeLang === 'hi' ? 'ध्वनि समर्थन' : 'Audio Engine'}
          </span>
          <span className="text-lg font-black text-[#059669] mt-0.5">Trilingual</span>
          <span className="text-[10px] text-[#059669] font-semibold mt-0.5">ಕನ್ನಡ / हिन्दी / EN</span>
        </div>
      </div>

      {/* 3. Interactive Case Docket Navigator (Pick Any Active Case To Inspect) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#0b1c30] uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-[#4059aa]">folder_managed</span>
            <span>
              {activeLang === 'kn'
                ? 'ತನಿಖಾ ಪ್ರಕರಣಗಳ ಆಯ್ಕೆ (Select Docket):'
                : activeLang === 'hi'
                ? 'जांच मामला चुनें (Select Docket):'
                : 'Select Audited Docket:'}
            </span>
          </span>
          <span className="text-[11px] text-[#76777d] font-mono">
            {filteredDossiers.length} cases
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-[#000000] text-white shadow-xs'
                  : 'bg-white text-[#45464d] border border-[#d3e4fe] hover:bg-[#eff4ff]'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Docket Switcher Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredDossiers.map((item) => {
            const isItemActive = selectedDossier.id === item.id;
            const itemIsFake = item.clearVerdictStatus === 'FAKE' || item.verdict === 'false';
            const itemIsMisleading =
              item.clearVerdictStatus === 'MISLEADING' || item.verdict === 'misleading';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedDossier(item)}
                className={`p-3 rounded-xl text-left transition-all border flex flex-col gap-1.5 relative overflow-hidden cursor-pointer ${
                  isItemActive
                    ? 'bg-[#eff4ff] border-[#4059aa] shadow-sm ring-2 ring-[#4059aa]/30'
                    : 'bg-white border-[#e5eeff] hover:border-[#8fa7fe] hover:bg-[#fbfdff]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                      itemIsFake
                        ? 'bg-[#ffe4e6] text-[#e11d48]'
                        : itemIsMisleading
                        ? 'bg-[#fef3c7] text-[#d97706]'
                        : 'bg-[#d1fae5] text-[#059669]'
                    }`}
                  >
                    {itemIsFake ? '❌ FAKE' : itemIsMisleading ? '⚠️ MISLEADING' : '✅ REAL'}
                  </span>

                  <span className="text-[10px] font-mono text-[#76777d]">
                    {item.officialRefId}
                  </span>
                </div>

                <h4 className="font-['Plus Jakarta Sans'] font-bold text-xs sm:text-sm text-[#0b1c30] line-clamp-1 leading-snug">
                  {item.title}
                </h4>

                <span className="text-[11px] text-[#45464d] truncate">
                  {item.summary[activeLang] || item.summary.en}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Active Forensic Inspection Dossier (Comprehensive Deep-Dive Panel) */}
      <div className="bg-white rounded-2xl shadow-md border-2 border-[#d3e4fe] p-4 sm:p-6 flex flex-col gap-5 relative overflow-hidden">
        {/* Ambient Top Line */}
        <div
          className={`absolute top-0 left-0 right-0 h-2 ${
            isFake ? 'bg-[#e11d48]' : isMisleading ? 'bg-[#d97706]' : 'bg-[#059669]'
          }`}
        />

        {/* Docket Meta Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e5eeff] pt-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-[#0b1c30]">
              {activeLang === 'kn'
                ? 'ಪ್ರಕರಣ ತನಿಖಾ ದಾಖಲೆ'
                : activeLang === 'hi'
                ? 'मामला जांच अभिलेख'
                : 'Case Under Forensic Inspection'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold bg-[#eff4ff] text-[#4059aa] px-2.5 py-1 rounded-md border border-[#d3e4fe]">
              {selectedDossier.officialRefId}
            </span>

            {/* Language Switcher for Evidence Findings */}
            <div className="flex items-center bg-[#e5eeff] rounded-full p-0.5 border border-[#d3e4fe]">
              <button
                type="button"
                onClick={() => setActiveLang('kn')}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                  activeLang === 'kn'
                    ? 'bg-white text-[#0b1c30] shadow-2xs'
                    : 'text-[#45464d] hover:text-[#0b1c30]'
                }`}
              >
                ಕನ್ನಡ
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('hi')}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                  activeLang === 'hi'
                    ? 'bg-white text-[#0b1c30] shadow-2xs'
                    : 'text-[#45464d] hover:text-[#0b1c30]'
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('en')}
                className={`px-2 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                  activeLang === 'en'
                    ? 'bg-white text-[#0b1c30] shadow-2xs'
                    : 'text-[#45464d] hover:text-[#0b1c30]'
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>

        {/* Claim Title & Origin */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[11px] text-[#76777d]">
            <span className="flex items-center gap-1 font-semibold text-[#4059aa]">
              <span className="material-symbols-outlined text-[14px]">cell_tower</span>
              {selectedDossier.originVector}
            </span>
            <span>•</span>
            <span>{selectedDossier.timeAgo}</span>
            <span>•</span>
            <span className="uppercase font-bold">{selectedDossier.category}</span>
          </div>

          <h2 className="font-['Plus Jakarta Sans'] text-lg sm:text-xl font-black text-[#0b1c30] leading-snug">
            {selectedDossier.title}
          </h2>

          <div className="bg-[#eff4ff] p-3 rounded-xl border border-[#d3e4fe] flex items-start gap-2 mt-1">
            <span className="material-symbols-outlined text-[18px] text-[#4059aa] flex-shrink-0 mt-0.5">
              format_quote
            </span>
            <p className="text-xs sm:text-sm font-semibold text-[#0b1c30] italic leading-snug">
              "{selectedDossier.originalClaim}"
            </p>
          </div>
        </div>

        {/* 1. Clear Verdict Stamp & Authentic Kannada/Hindi Audio Player */}
        <VoiceVerdictPlayer
          dossier={selectedDossier}
          currentLang={activeLang}
          onSelectLang={(l) => setActiveLang(l)}
        />

        {/* 4. Evidentiary Findings Section (Localized in selected language) */}
        <div className="space-y-2.5 pt-2 border-t border-[#f1f5f9]">
          <div className="flex items-center justify-between">
            <h3 className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#4059aa]">fact_check</span>
              <span>{getEvidentiaryFindingsTitle(activeLang)}</span>
            </h3>
            <span className="text-[11px] text-[#4059aa] font-bold bg-[#eff4ff] px-2 py-0.5 rounded-full border border-[#d3e4fe]">
              {activeLang === 'kn' ? 'ಕನ್ನಡ ಸಾಕ್ಷ್ಯ' : activeLang === 'hi' ? 'हिन्दी साक्ष्य' : 'English Findings'}
            </span>
          </div>

          <div className="bg-[#f8faff] p-4 rounded-xl border border-[#d3e4fe]">
            <p
              className={`text-sm text-[#0b1c30] leading-relaxed ${
                activeLang === 'kn'
                  ? "font-['Noto_Sans_Kannada'] font-medium"
                  : activeLang === 'hi'
                  ? "font-['Noto_Sans_Devanagari'] font-medium"
                  : ""
              }`}
            >
              {selectedDossier.debunkExplanation[activeLang] ||
                selectedDossier.debunkExplanation.en}
            </p>
          </div>
        </div>

        {/* 5. Official Record Corroboration & Gazette Repositories (Localized in selected language) */}
        <div className="space-y-3 pt-2 border-t border-[#f1f5f9]">
          <div className="flex items-center justify-between">
            <h3 className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#4059aa]">
                travel_explore
              </span>
              <span>{getRecordCorroborationTitle(selectedDossier.sources.length, activeLang)}</span>
            </h3>

            <span className="text-[11px] font-bold text-[#059669] bg-[#ecfdf5] px-2 py-0.5 rounded-full border border-[#a7f3d0]">
              {activeLang === 'kn'
                ? 'ದಾಖಲೆ ದೃಢೀಕೃತ'
                : activeLang === 'hi'
                ? 'अभिलेख संपुष्ट'
                : 'Corroborated'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {selectedDossier.sources.map((src, idx) => {
              const srcName = getSourceName(src, activeLang);
              const srcCategory = getSourceCategory(src, activeLang);
              const srcStatusLabel = getSourceStatusLabel(src.status, activeLang);
              const srcDetails = getSourceDetails(src, activeLang);
              const actionLabel = getPrimarySourceActionLabel(Boolean(src.url), srcName, activeLang);

              return (
                <div
                  key={idx}
                  className="bg-[#fcfdff] p-3.5 rounded-xl border border-[#e5eeff] hover:border-[#8fa7fe] transition-all flex flex-col gap-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#4059aa]" />
                      <span className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#0b1c30]">
                        {srcName}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        src.status === 'confirmed' || src.status === 'corroborated'
                          ? 'bg-[#ecfdf5] text-[#059669]'
                          : src.status === 'refuted'
                          ? 'bg-[#fff1f2] text-[#e11d48]'
                          : 'bg-[#f1f5f9] text-[#64748b]'
                      }`}
                    >
                      {srcStatusLabel}
                    </span>
                  </div>

                  <p
                    className={`text-xs text-[#45464d] leading-relaxed ${
                      activeLang === 'kn'
                        ? "font-['Noto_Sans_Kannada']"
                        : activeLang === 'hi'
                        ? "font-['Noto_Sans_Devanagari']"
                        : ""
                    }`}
                  >
                    {srcDetails}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-[#f1f5f9] text-[11px]">
                    <span className="text-[#76777d]">{srcCategory}</span>
                    <a
                      href={src.url || `https://www.google.com/search?q=${encodeURIComponent(`${selectedDossier.originalClaim} ${src.name}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#4059aa] font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>{actionLabel}</span>
                      <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. Forensic Red Flags Identified */}
        {selectedDossier.redFlags && selectedDossier.redFlags.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#f1f5f9]">
            <h4 className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px] text-[#e11d48]">flag</span>
              <span>
                {activeLang === 'kn'
                  ? 'ಗುರುತಿಸಲಾದ ವಿಧಿವಿಜ್ಞಾನ ಸಂಶಯಾಸ್ಪದ ಸೂಚನೆಗಳು'
                  : activeLang === 'hi'
                  ? 'पहचाने गए फोरेंसिक खतरे'
                  : 'Forensic Red Flags Identified'}
              </span>
            </h4>

            <div className="flex flex-wrap gap-1.5">
              {selectedDossier.redFlags.map((flag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fff1f2] text-[#ba1a1a] text-xs font-semibold border border-[#fecdd3]"
                >
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span>{flag}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 7. WhatsApp Counter-Debunk Note */}
        <div className="bg-[#f0fdf4] p-3.5 rounded-xl border border-[#bbf7d0] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#166534] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#16a34a]">chat</span>
              <span>
                {activeLang === 'kn'
                  ? 'ವಾಟ್ಸಾಪ್ ಖಂಡನಾ ಸಂದೇಶ (WhatsApp Counter-Debunk Note):'
                  : activeLang === 'hi'
                  ? 'व्हाट्सएप खंडन संदेश (WhatsApp Counter-Debunk Note):'
                  : 'WhatsApp Forward Counter-Debunk Note:'}
              </span>
            </span>

            <button
              type="button"
              onClick={handleCopyWhatsAppNote}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#16a34a] text-white hover:bg-[#15803d] transition-all flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copiedNote ? 'check' : 'content_copy'}
              </span>
              <span>{copiedNote ? 'Copied! / ನಕಲಿಸಲಾಗಿದೆ' : 'Copy / ನಕಲಿಸಿ'}</span>
            </button>
          </div>

          <p className="text-xs text-[#166534] leading-relaxed bg-white/70 p-2.5 rounded-lg border border-[#dcfce7] font-mono">
            {selectedDossier.whatsappDebunkNote[activeLang] ||
              selectedDossier.whatsappDebunkNote.en}
          </p>
        </div>

        {/* Action Button: Full Telemetry Modal View */}
        <button
          type="button"
          onClick={() => onInspectDossier(selectedDossier)}
          className="w-full py-3 rounded-xl bg-[#00164e] text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-[#0b1c30] transition-colors shadow-sm cursor-pointer active:scale-[0.99]"
        >
          <span>
            {activeLang === 'kn'
              ? 'ಸಂಪೂರ್ಣ ತನಿಖಾ ದಾಖಲೆ ವೀಕ್ಷಿಸಿ (Open Interactive Modal)'
              : activeLang === 'hi'
              ? 'पूर्ण जांच दस्तावेज खोलें (Open Interactive Modal)'
              : 'Open Full Interactive Forensic Modal'}
          </span>
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
        </button>
      </div>
    </div>
  );
};
