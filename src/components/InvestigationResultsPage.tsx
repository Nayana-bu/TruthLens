import React, { useState } from 'react';
import { ClaimDossier, Language } from '../types';
import { VoiceVerdictPlayer } from './VoiceVerdictPlayer';
import { ReportFakeNewsModal } from './ReportFakeNewsModal';
import {
  getSourceName,
  getSourceCategory,
  getSourceStatusLabel,
  getSourceDetails,
} from '../utils/sourceTranslator';

interface InvestigationResultsPageProps {
  dossier: ClaimDossier;
  currentLang: Language;
  onBackToDashboard: () => void;
  onSelectLang?: (lang: Language) => void;
}

export const InvestigationResultsPage: React.FC<InvestigationResultsPageProps> = ({
  dossier,
  currentLang,
  onBackToDashboard,
  onSelectLang,
}) => {
  const [activeLang, setActiveLang] = useState<Language>(currentLang);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // Keep internal language in sync when parent language changes
  React.useEffect(() => {
    setActiveLang(currentLang);
  }, [currentLang]);

  const handleLangSwitch = (lang: Language) => {
    setActiveLang(lang);
    onSelectLang?.(lang);
  };

  const isFake =
    dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false';
  const isMisleading =
    dossier.clearVerdictStatus === 'MISLEADING' || dossier.verdict === 'misleading';
  const isReal =
    dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true';
  const isPartly =
    dossier.clearVerdictStatus === 'PARTLY_TRUE' || dossier.verdict === 'partly_true';
  const isContext =
    dossier.clearVerdictStatus === 'CONTEXT_MISSING' || dossier.verdict === 'context_missing';
  const isUnverified =
    dossier.clearVerdictStatus === 'UNVERIFIED' ||
    dossier.verdict === 'unverified' ||
    (!isFake && !isMisleading && !isReal && !isPartly && !isContext);

  const getVerdictBadgeLabel = () => {
    if (isFake) {
      return activeLang === 'kn' ? '❌ FAKE NEWS (ಸುಳ್ಳು ಸುದ್ದಿ)' : activeLang === 'hi' ? '❌ FAKE NEWS (फर्जी खबर)' : '❌ FAKE NEWS';
    }
    if (isMisleading) {
      return activeLang === 'kn' ? '⚠️ MISLEADING (ದಾರಿತಪ್ಪಿಸುವ ಸುದ್ದಿ)' : activeLang === 'hi' ? '⚠️ MISLEADING (भ्रामक दावा)' : '⚠️ MISLEADING';
    }
    if (isPartly) {
      return activeLang === 'kn' ? '⚖️ PARTLY TRUE (ಭಾಗಶಃ ಸತ್ಯ)' : activeLang === 'hi' ? '⚖️ PARTLY TRUE (आंशिक सत्य)' : '⚖️ PARTLY TRUE';
    }
    if (isContext) {
      return activeLang === 'kn' ? 'ℹ️ CONTEXT MISSING (ಸಂದರ್ಭದ ಕೊರತೆ)' : activeLang === 'hi' ? 'ℹ️ CONTEXT MISSING (संदर्भ का अभाव)' : 'ℹ️ CONTEXT MISSING';
    }
    if (isReal) {
      return activeLang === 'kn' ? '✅ TRUE NEWS (ಅಧಿಕೃತ ಸತ್ಯ)' : activeLang === 'hi' ? '✅ TRUE NEWS (सत्य खबर)' : '✅ TRUE NEWS';
    }
    return activeLang === 'kn' ? '🔍 UNVERIFIED (ಅಪೂರ್ಣ ಮಾಹಿತಿ)' : activeLang === 'hi' ? '🔍 UNVERIFIED (अपुष्ट)' : '🔍 UNVERIFIED';
  };

  const getVerdictTheme = () => {
    if (isFake) {
      return {
        bg: 'bg-[#fff1f2]',
        border: 'border-[#f43f5e]',
        badgeBg: 'bg-[#e11d48] text-white',
        accentBar: 'bg-[#e11d48]',
        icon: 'cancel',
        iconColor: 'text-[#e11d48]',
        textColor: 'text-[#9f1239]',
      };
    }
    if (isMisleading) {
      return {
        bg: 'bg-[#fffbeb]',
        border: 'border-[#f59e0b]',
        badgeBg: 'bg-[#d97706] text-white',
        accentBar: 'bg-[#d97706]',
        icon: 'warning',
        iconColor: 'text-[#d97706]',
        textColor: 'text-[#92400e]',
      };
    }
    if (isPartly) {
      return {
        bg: 'bg-[#fff7ed]',
        border: 'border-[#ea580c]',
        badgeBg: 'bg-[#ea580c] text-white',
        accentBar: 'bg-[#ea580c]',
        icon: 'published_with_changes',
        iconColor: 'text-[#ea580c]',
        textColor: 'text-[#9a3412]',
      };
    }
    if (isContext) {
      return {
        bg: 'bg-[#f5f3ff]',
        border: 'border-[#8b5cf6]',
        badgeBg: 'bg-[#7c3aed] text-white',
        accentBar: 'bg-[#7c3aed]',
        icon: 'info',
        iconColor: 'text-[#7c3aed]',
        textColor: 'text-[#5b21b6]',
      };
    }
    if (isReal) {
      return {
        bg: 'bg-[#ecfdf5]',
        border: 'border-[#10b981]',
        badgeBg: 'bg-[#059669] text-white',
        accentBar: 'bg-[#059669]',
        icon: 'verified',
        iconColor: 'text-[#059669]',
        textColor: 'text-[#065f46]',
      };
    }
    return {
      bg: 'bg-[#f1f5f9]',
      border: 'border-[#94a3b8]',
      badgeBg: 'bg-[#475569] text-white',
      accentBar: 'bg-[#475569]',
      icon: 'help',
      iconColor: 'text-[#475569]',
      textColor: 'text-[#1e293b]',
    };
  };

  const theme = getVerdictTheme();

  // Simple-English explanation and translated explanations
  const simpleExplanation =
    activeLang === 'kn'
      ? dossier.debunkExplanation?.kn || dossier.summary?.kn || dossier.summary.en
      : activeLang === 'hi'
      ? dossier.debunkExplanation?.hi || dossier.summary?.hi || dossier.summary.en
      : dossier.debunkExplanation?.en || dossier.summary?.en;

  const investigationSummary =
    activeLang === 'kn'
      ? dossier.summary?.kn || dossier.summary.en
      : activeLang === 'hi'
      ? dossier.summary?.hi || dossier.summary.en
      : dossier.summary?.en;

  const handleCopyWhatsAppNote = () => {
    const note =
      dossier.whatsappDebunkNote?.[activeLang] ||
      dossier.whatsappDebunkNote?.en ||
      `TruthLens Fact Check: ${dossier.title} - ${isFake ? 'FAKE' : isReal ? 'TRUE' : 'MISLEADING'}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(note);
      setCopiedWhatsApp(true);
      setTimeout(() => setCopiedWhatsApp(false), 2200);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-4 py-4 gap-5">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#e5eeff] shadow-xs">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="h-9 px-3.5 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] flex items-center gap-1.5 font-['Inter'] text-xs font-bold transition-all active:scale-95 border border-[#d3e4fe] cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px] text-[#4059aa]">
            arrow_back
          </span>
          <span>
            {activeLang === 'kn'
              ? 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ'
              : activeLang === 'hi'
              ? 'डैशबोर्ड पर वापस जाएं'
              : 'Back to Dashboard'}
          </span>
        </button>

        {/* In-page Language Selector (Does NOT navigate elsewhere) */}
        <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-xl border border-[#d3e4fe]">
          <span className="text-[10px] font-bold text-[#76777d] px-1.5 hidden sm:inline uppercase">
            Language:
          </span>
          <button
            type="button"
            onClick={() => handleLangSwitch('en')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeLang === 'en'
                ? 'bg-white text-[#0b1c30] shadow-xs'
                : 'text-[#45464d] hover:text-[#0b1c30]'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => handleLangSwitch('kn')}
            className={`px-2.5 py-1 rounded-lg font-['Noto_Sans_Kannada'] text-xs font-bold transition-all cursor-pointer ${
              activeLang === 'kn'
                ? 'bg-white text-[#0b1c30] shadow-xs'
                : 'text-[#45464d] hover:text-[#0b1c30]'
            }`}
          >
            ಕನ್ನಡ
          </button>
          <button
            type="button"
            onClick={() => handleLangSwitch('hi')}
            className={`px-2.5 py-1 rounded-lg font-['Noto_Sans_Devanagari'] text-xs font-bold transition-all cursor-pointer ${
              activeLang === 'hi'
                ? 'bg-white text-[#0b1c30] shadow-xs'
                : 'text-[#45464d] hover:text-[#0b1c30]'
            }`}
          >
            हिन्दी
          </button>
        </div>
      </div>

      {/* 2A. VERDICT CARD */}
      <div
        className={`rounded-2xl p-5 sm:p-6 border-2 shadow-md relative overflow-hidden transition-all ${theme.bg} ${theme.border}`}
      >
        <div className={`absolute top-0 left-0 right-0 h-2 ${theme.accentBar}`} />

        <div className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-[44px] ${theme.iconColor}`}>
                {theme.icon}
              </span>
              <div>
                <span
                  className={`font-['Plus Jakarta Sans'] font-black text-lg sm:text-xl tracking-tight uppercase px-3 py-1 rounded-lg shadow-xs inline-block ${theme.badgeBg}`}
                >
                  {getVerdictBadgeLabel()}
                </span>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {/* Qualitative Evidence Strength Indicator */}
                  {dossier.evidenceAnalysis?.evidenceStrengthLabel && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b1c30] bg-white/95 px-2.5 py-0.5 rounded border border-black/10 shadow-2xs">
                      <span className="material-symbols-outlined text-[13px] text-[#4059aa]">
                        verified_user
                      </span>
                      <span>Evidence Strength: {dossier.evidenceAnalysis.evidenceStrengthLabel}</span>
                    </span>
                  )}
                  {/* Calibrated Criteria Score only when genuinely available */}
                  {typeof dossier.confidenceScore === 'number' && dossier.confidenceScore > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b1c30] bg-white/90 px-2 py-0.5 rounded border border-black/10">
                      <span className="material-symbols-outlined text-[13px] text-[#4059aa]">
                        analytics
                      </span>
                      <span>Evidence Score: {dossier.confidenceScore.toFixed(1)}%</span>
                    </span>
                  )}
                  {/* Genuine Verification Timestamp */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#575960] bg-white/70 px-2 py-0.5 rounded border border-black/10">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    <span>Verified: {dossier.timeAgo || 'Just verified'}</span>
                  </span>
                  {dossier.officialRefId && (
                    <span className="text-[11px] font-mono text-[#575960] bg-white/70 px-2 py-0.5 rounded border border-black/10">
                      Ref: {dossier.officialRefId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Prominent Report Fake News Button when verdict is FAKE NEWS */}
            {(isFake || isMisleading) && (
              <div className="flex items-center sm:self-center">
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="w-full sm:w-auto h-11 px-4 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[19px]">report_problem</span>
                  <span>
                    {activeLang === 'kn'
                      ? 'ಸುಳ್ಳು ಸುದ್ದಿ ವರದಿ ಮಾಡಿ'
                      : activeLang === 'hi'
                      ? 'फर्जी खबर रिपोर्ट करें'
                      : 'Report Fake News'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Submitted Claim Display */}
          <div className="bg-white/85 p-3.5 rounded-xl border border-black/10 mt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#76777d] block mb-1">
              {activeLang === 'kn'
                ? 'ಪರಿಶೀಲಿಸಲಾದ ಸುದ್ದಿ (Submitted Claim):'
                : activeLang === 'hi'
                ? 'जांच हेतु प्रस्तुत दावा (Submitted Claim):'
                : 'Submitted News Claim:'}
            </span>
            <p className="text-sm sm:text-base font-bold text-[#0b1c30] leading-snug">
              "{dossier.originalClaim || dossier.title}"
            </p>

            {/* Extracted Sub-Claims & Factual Entities from RAG Pipeline */}
            {dossier.extractedClaims && dossier.extractedClaims.length > 0 && (
              <div className="mt-3 pt-3 border-t border-black/5 flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4059aa] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">psychology</span>
                  <span>
                    {activeLang === 'kn'
                      ? `ಗುರುತಿಸಲಾದ ಉಪ-ಹೇಳಿಕೆಗಳು (${dossier.extractedClaims.length})`
                      : activeLang === 'hi'
                      ? `पहचाने गए मुख्य तथ्य एवं उप-दावे (${dossier.extractedClaims.length})`
                      : `Extracted Factual Sub-Claims (${dossier.extractedClaims.length})`}
                  </span>
                </span>
                <div className="flex flex-col gap-1.5">
                  {dossier.extractedClaims.map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      className="bg-white p-2.5 rounded-lg border border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-start gap-1.5 flex-1">
                        <span className="font-bold text-[#4059aa] shrink-0">#{idx + 1}</span>
                        <span className="font-medium text-[#1e293b] leading-tight">{sub.claim}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {sub.organizations && sub.organizations.length > 0 && (
                          <span className="bg-[#f1f5f9] text-[#475569] text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {sub.organizations[0]}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                            sub.clearVerdictStatus === 'REAL'
                              ? 'bg-[#ecfdf5] text-[#059669]'
                              : sub.clearVerdictStatus === 'FAKE'
                              ? 'bg-[#fff1f2] text-[#e11d48]'
                              : 'bg-[#f1f5f9] text-[#64748b]'
                          }`}
                        >
                          {sub.statusLabel || sub.clearVerdictStatus || 'Analyzed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Simple Explanation */}
          <div className="mt-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#45464d] block mb-1">
              {activeLang === 'kn'
                ? 'ವಿವರಣೆ (Explanation):'
                : activeLang === 'hi'
                ? 'स्पष्टीकरण (Explanation):'
                : 'Verdict Explanation:'}
            </span>
            <p className="text-sm font-medium text-[#0b1c30] leading-relaxed">
              {simpleExplanation}
            </p>
          </div>
        </div>
      </div>

      {/* 2C. SPEAKING FEATURE DIRECTLY INSIDE THE RESULTS PAGE */}
      <div className="w-full">
        <VoiceVerdictPlayer
          dossier={dossier}
          currentLang={activeLang}
          onSelectLang={(lang) => setActiveLang(lang)}
          compactMode={true}
          onOpenReport={() => setShowReportModal(true)}
        />
      </div>

      {/* 2B. INVESTIGATION DETAILS & EVIDENCE */}
      <div className="bg-white rounded-2xl p-5 border border-[#e5eeff] shadow-sm flex flex-col gap-5">
        {/* Section: Investigation Summary & Key Findings */}
        <div className="flex flex-col gap-2 pb-4 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#4059aa]">
              fact_check
            </span>
            <h3 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30]">
              {activeLang === 'kn'
                ? 'ತನಿಖಾ ಸಾರಾಂಶ ಮತ್ತು ಪ್ರಮುಖ ಅಂಶಗಳು'
                : activeLang === 'hi'
                ? 'जांच सारांश एवं मुख्य बिंदु'
                : 'Investigation Summary & Key Findings'}
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-[#45464d] leading-relaxed">
            {investigationSummary}
          </p>
        </div>

        {/* Section: Supporting Evidence vs Contradicting Evidence (RAG Dual-Analysis) */}
        {dossier.evidenceAnalysis &&
          (dossier.evidenceAnalysis.supportingEvidence.length > 0 ||
            dossier.evidenceAnalysis.contradictingEvidence.length > 0) && (
            <div className="pb-4 border-b border-[#f1f5f9] flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#4059aa]">
                  compare_arrows
                </span>
                <h3 className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base text-[#0b1c30]">
                  {activeLang === 'kn'
                    ? 'ಸಾಕ್ಷ್ಯಾಧಾರಗಳ ವಿಶ್ಲೇಷಣೆ: ಬೆಂಬಲಿಸುವ vs ವಿರೋಧಿಸುವ ಸಾಕ್ಷ್ಯಗಳು'
                    : activeLang === 'hi'
                    ? 'साक्ष्य विश्लेषण: समर्थक बनाम विरोधी साक्ष्य'
                    : 'Evidence Comparison: Supporting vs Contradicting Evidence'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Supporting Evidence Card */}
                <div className="p-3.5 rounded-xl bg-[#ecfdf5]/50 border border-[#a7f3d0] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#065f46] flex items-center gap-1.5 uppercase">
                      <span className="material-symbols-outlined text-[16px] text-[#059669]">
                        check_circle
                      </span>
                      {activeLang === 'kn'
                        ? `ಬೆಂಬಲಿಸುವ ಸಾಕ್ಷ್ಯಗಳು (${dossier.evidenceAnalysis.supportingEvidence.length})`
                        : activeLang === 'hi'
                        ? `समर्थक साक्ष्य (${dossier.evidenceAnalysis.supportingEvidence.length})`
                        : `Supporting Evidence (${dossier.evidenceAnalysis.supportingEvidence.length})`}
                    </span>
                  </div>
                  {dossier.evidenceAnalysis.supportingEvidence.length === 0 ? (
                    <p className="text-xs text-[#065f46]/80 italic">
                      {activeLang === 'kn'
                        ? 'ಯಾವುದೇ ದೃಢೀಕರಿಸಿದ ಸಾಕ್ಷ್ಯ ಈ ಹೇಳಿಕೆಯನ್ನು ಬೆಂಬಲಿಸಿಲ್ಲ.'
                        : activeLang === 'hi'
                        ? 'कोई आधिकारिक साक्ष्य इस दावे का समर्थन नहीं करता।'
                        : 'No verified corroboration found supporting this claim.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dossier.evidenceAnalysis.supportingEvidence.map((ev, i) => (
                        <div key={i} className="bg-white p-2.5 rounded-lg border border-[#a7f3d0]/60 text-xs">
                          <p className="font-medium text-[#065f46] leading-tight mb-1">{ev.point}</p>
                          <div className="flex items-center justify-between text-[10px] text-[#059669] pt-1 border-t border-[#a7f3d0]/40 flex-wrap gap-1">
                            <span className="font-bold">{ev.sourceName}</span>
                            {ev.date && <span>Date: {ev.date}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Contradicting Evidence Card */}
                <div className="p-3.5 rounded-xl bg-[#fff1f2]/50 border border-[#fecdd3] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#9f1239] flex items-center gap-1.5 uppercase">
                      <span className="material-symbols-outlined text-[16px] text-[#e11d48]">
                        cancel
                      </span>
                      {activeLang === 'kn'
                        ? `ವಿರೋಧಿಸುವ ಸಾಕ್ಷ್ಯಗಳು (${dossier.evidenceAnalysis.contradictingEvidence.length})`
                        : activeLang === 'hi'
                        ? `विरोधी साक्ष्य (${dossier.evidenceAnalysis.contradictingEvidence.length})`
                        : `Contradicting Evidence (${dossier.evidenceAnalysis.contradictingEvidence.length})`}
                    </span>
                  </div>
                  {dossier.evidenceAnalysis.contradictingEvidence.length === 0 ? (
                    <p className="text-xs text-[#9f1239]/80 italic">
                      {activeLang === 'kn'
                        ? 'ಯಾವುದೇ ಅಧಿಕೃತ ಇಲಾಖೆಯೂ ಈ ಹೇಳಿಕೆಯನ್ನು ವಿರೋಧಿಸಿಲ್ಲ.'
                        : activeLang === 'hi'
                        ? 'कोई आधिकारिक रिकॉर्ड इस दावे का खंडन नहीं करता।'
                        : 'No direct official contradiction or debunk documented on record.'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dossier.evidenceAnalysis.contradictingEvidence.map((ev, i) => (
                        <div key={i} className="bg-white p-2.5 rounded-lg border border-[#fecdd3]/60 text-xs">
                          <p className="font-medium text-[#9f1239] leading-tight mb-1">{ev.point}</p>
                          <div className="flex items-center justify-between text-[10px] text-[#e11d48] pt-1 border-t border-[#fecdd3]/40 flex-wrap gap-1">
                            <span className="font-bold">{ev.sourceName}</span>
                            {ev.date && <span>Date: {ev.date}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Section: Limitations and Unresolved Questions */}
        {dossier.evidenceAnalysis?.limitationsAndUnresolved &&
          dossier.evidenceAnalysis.limitationsAndUnresolved.length > 0 && (
            <div className="p-3.5 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1.5">
              <span className="text-xs font-bold text-[#4059aa] flex items-center gap-1.5 uppercase">
                <span className="material-symbols-outlined text-[16px]">help_outline</span>
                {activeLang === 'kn'
                  ? 'ಮಿತಿಗಳು ಮತ್ತು ಪರಿಹರಿಸಲಾಗದ ಪ್ರಶ್ನೆಗಳು (Investigation Limitations):'
                  : activeLang === 'hi'
                  ? 'जांच की सीमाएं एवं अनुत्तरित प्रश्न (Limitations):'
                  : 'Investigation Limitations & Unresolved Questions:'}
              </span>
              <ul className="space-y-1 text-xs text-[#45464d]">
                {dossier.evidenceAnalysis.limitationsAndUnresolved.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-[#4059aa] mt-0.5 shrink-0">
                      arrow_right
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        {/* Section: Reasons Supporting the Verdict */}
        <div className="flex flex-col gap-2 pb-4 border-b border-[#f1f5f9]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#4059aa]">
              balance
            </span>
            <h3 className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base text-[#0b1c30]">
              {activeLang === 'kn'
                ? 'ತೀರ್ಪನ್ನು ಬೆಂಬಲಿಸುವ ಪ್ರಮುಖ ಕಾರಣಗಳು'
                : activeLang === 'hi'
                ? 'निष्कर्ष का समर्थन करने वाले कारण'
                : 'Reasons Supporting the Verdict'}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
            <div className="p-3 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#4059aa] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">assured_workload</span>
                {activeLang === 'kn' ? 'ಗೆಜೆಟ್ ಮತ್ತು ಇಲಾಖಾ ಆದೇಶಗಳು' : activeLang === 'hi' ? 'राजपत्र व विभागीय रिकॉर्ड' : 'Official Gazette & Circular Check'}
              </span>
              <p className="text-xs text-[#45464d]">
                {isFake
                  ? activeLang === 'kn'
                    ? 'ಕೇಂದ್ರ ಅಥವಾ ರಾಜ್ಯ ಸರ್ಕಾರದ ಯಾವುದೇ ಇಲಾಖೆಯಲ್ಲೂ ಇಂತಹ ಆದೇಶ ಅಥವಾ ಸುತ್ತೋಲೆ ದಾಖಲಾಗಿಲ್ಲ.'
                    : activeLang === 'hi'
                    ? 'केंद्र अथवा राज्य सरकार के किसी भी विभाग में ऐसा कोई आदेश या परिपत्र दर्ज नहीं है।'
                    : 'Zero official gazettes, cabinet releases, or ministry circulars match this circulating claim.'
                  : activeLang === 'kn'
                  ? 'ಸಂಬಂಧಿತ ಸಚಿವಾಲಯ ಹಾಗೂ ಇಲಾಖಾ ಗೆಜೆಟ್‌ಗಳಲ್ಲಿ ಈ ಆದೇಶ ದಾಖಲಾಗಿರುವುದು ದೃಢಪಟ್ಟಿದೆ.'
                  : activeLang === 'hi'
                  ? 'संबंधित मंत्रालय एवं राजपत्र में यह आदेश प्रामाणिक रूप से दर्ज पाया गया है।'
                  : 'Official gazette circulars and agency briefings confirm authentic sanctioned status.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#f8f9ff] border border-[#e5eeff] flex flex-col gap-1">
              <span className="text-[11px] font-bold text-[#4059aa] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">radar</span>
                {activeLang === 'kn' ? 'ಸಾಮಾಜಿಕ ಜಾಲತಾಣ ಮೂಲ ತಪಾಸಣೆ' : activeLang === 'hi' ? 'सोशल मीडिया ट्रांसमिशन विश्लेषण' : 'Disinformation Pattern Analysis'}
              </span>
              <p className="text-xs text-[#45464d]">
                {isFake
                  ? activeLang === 'kn'
                    ? 'ಇದು ನಕಲಿ ಲಿಂಕ್‌ಗಳೊಂದಿಗೆ ವಾಟ್ಸಾಪ್ ಗುಂಪುಗಳಲ್ಲಿ ಹರಡುತ್ತಿರುವ ಸಾಂಪ್ರದಾಯಿಕ ವಂಚನೆಯ ಸಂದೇಶವಾಗಿದೆ.'
                    : activeLang === 'hi'
                    ? 'यह फर्जी लिंक एवं व्हाट्सएप फॉरवर्ड्स के माध्यम से प्रसारित होने वाली भ्रामक अफवाह है।'
                    : 'Matches classic viral chain forward mechanics lacking authentic issuing authority.'
                  : activeLang === 'kn'
                  ? 'ಅಧಿಕೃತ ಮಾಧ್ಯಮಗಳು ಮತ್ತು ಪತ್ರಿಕಾ ಪ್ರಕಟಣೆಗಳ ಮೂಲಕ ನೇರವಾಗಿ ಪ್ರಕಟವಾದ ಮಾಹಿತಿ.'
                  : activeLang === 'hi'
                  ? 'आधिकारिक प्रेस ब्रीफिंग एवं सत्यापित माध्यमों द्वारा सीधे जारी की गई सूचना।'
                  : 'Originated from verified institutional press releases and accredited news desks.'}
              </p>
            </div>
          </div>
        </div>

        {/* Section: Forensic Red Flags if present */}
        {dossier.redFlags && dossier.redFlags.length > 0 && (
          <div className="bg-[#fff1f2] p-3.5 rounded-xl border border-[#fecdd3] flex flex-col gap-2">
            <span className="text-xs font-bold text-[#e11d48] uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[17px]">flag</span>
              {activeLang === 'kn'
                ? 'ಗುರುತಿಸಲಾದ ನಕಲಿ ಸೂಚಕಗಳು (Red Flags):'
                : activeLang === 'hi'
                ? 'पहचाने गए संदिग्ध संकेत (Red Flags):'
                : 'Identified Forensic Red Flags:'}
            </span>
            <ul className="space-y-1.5 text-xs text-[#9f1239]">
              {dossier.redFlags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-[#e11d48] mt-0.5">
                    cancel
                  </span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Section: Official Evidence & Source Links */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#4059aa]">
                verified
              </span>
              <h3 className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base text-[#0b1c30]">
                {activeLang === 'kn'
                  ? `ಅಧಿಕೃತ ಸಾಕ್ಷ್ಯಗಳು ಮತ್ತು ಮೂಲ ದಾಖಲೆಗಳು (${dossier.sources.length})`
                  : activeLang === 'hi'
                  ? `आधिकारिक साक्ष्य एवं स्रोत रिकॉर्ड्स (${dossier.sources.length})`
                  : `Official Evidence & Source Repositories (${dossier.sources.length})`}
              </h3>
            </div>
            {dossier.sourceEntity && (
              <span className="text-[11px] font-medium text-[#575960] bg-[#f1f5f9] px-2 py-0.5 rounded">
                Entity: {dossier.sourceEntity}
              </span>
            )}
          </div>

          <div className="space-y-2 mt-1">
            {dossier.sources.map((src, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-[#e5eeff] bg-[#f8f9ff] flex flex-col gap-1.5 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-['Plus Jakarta Sans'] font-bold text-xs sm:text-sm text-[#0b1c30]">
                    {getSourceName(src, activeLang)}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      src.status === 'confirmed'
                        ? 'bg-[#ecfdf5] text-[#059669]'
                        : src.status === 'refuted'
                        ? 'bg-[#fff1f2] text-[#e11d48]'
                        : 'bg-[#f1f5f9] text-[#64748b]'
                    }`}
                  >
                    {getSourceStatusLabel(src, activeLang)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-[#76777d] font-medium">
                    {getSourceCategory(src, activeLang)}
                  </span>
                  {(src.publicationDate || src.timestamp) && (
                    <span className="text-[10px] text-[#575960] bg-white px-2 py-0.5 rounded border border-black/5 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px] text-[#76777d]">calendar_today</span>
                      <span>{src.publicationDate || src.timestamp}</span>
                    </span>
                  )}
                  {src.isPrimary && (
                    <span className="text-[10px] text-[#1d4ed8] bg-[#eff6ff] px-2 py-0.5 rounded border border-[#bfdbfe] font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px] text-[#1d4ed8]">verified</span>
                      <span>Primary Authority</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#45464d] leading-relaxed">
                  {getSourceDetails(src, activeLang)}
                </p>

                {src.url && (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#4059aa] font-semibold hover:underline flex items-center gap-1 mt-0.5 self-start"
                  >
                    <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                    <span>
                      {activeLang === 'kn'
                        ? 'ಅಧಿಕೃತ ಮೂಲ ಅಥವಾ ದಾಖಲೆ ವೀಕ್ಷಿಸಿ'
                        : activeLang === 'hi'
                        ? 'आधिकारिक स्रोत पोर्टल पर जाएं'
                        : 'Inspect official primary source portal'}
                    </span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section: Related Topics and Verification Details */}
        <div className="pt-2 border-t border-[#f1f5f9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#4059aa]">
              category
            </span>
            <div className="text-xs">
              <span className="text-[#76777d]">Category: </span>
              <span className="font-bold text-[#0b1c30] capitalize">{dossier.category}</span>
              <span className="text-[#76777d] ml-3">Origin Vector: </span>
              <span className="font-medium text-[#0b1c30]">{dossier.originVector || 'Direct citizen inquiry'}</span>
            </div>
          </div>

          {/* Quick Counter-Debunk Copy for WhatsApp */}
          <button
            type="button"
            onClick={handleCopyWhatsAppNote}
            className="h-9 px-3.5 rounded-xl bg-[#25D366]/10 text-[#075e54] hover:bg-[#25D366]/20 font-['Inter'] text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {copiedWhatsApp ? 'check' : 'content_copy'}
            </span>
            <span>
              {copiedWhatsApp
                ? activeLang === 'kn'
                  ? 'ಕಾಪಿ ಮಾಡಲಾಗಿದೆ!'
                  : activeLang === 'hi'
                  ? 'कॉपी हो गया!'
                  : 'Copied!'
                : activeLang === 'kn'
                ? 'ವಾಟ್ಸಾಪ್ ಸಂದೇಶ ಕಾಪಿ ಮಾಡಿ'
                : activeLang === 'hi'
                ? 'व्हाट्सएप खंडन कॉपी करें'
                : 'Copy Counter-Debunk Note'}
            </span>
          </button>
        </div>
      </div>

      {/* 2D. REPORT FAKE NEWS MODAL */}
      {showReportModal && (
        <ReportFakeNewsModal
          dossier={dossier}
          onClose={() => setShowReportModal(false)}
          currentLang={activeLang}
        />
      )}
    </div>
  );
};
