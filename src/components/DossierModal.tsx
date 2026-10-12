import React, { useState, useEffect } from 'react';
import { ClaimDossier, Language } from '../types';
import { UI_TRANSLATIONS } from '../data/mockData';
import { ReportFakeNewsModal } from './ReportFakeNewsModal';
import { speakText, stopSpeech } from '../utils/speechEngine';

interface DossierModalProps {
  dossier: ClaimDossier | null;
  onClose: () => void;
  currentLang: Language;
}

export const DossierModal: React.FC<DossierModalProps> = ({
  dossier,
  onClose,
  currentLang,
}) => {
  const [selectedLang, setSelectedLang] = useState<Language>(currentLang);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeSpeechLang, setActiveSpeechLang] = useState<Language | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Stop any active speech on unmount or when modal closes
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  if (!dossier) return null;

  const t = UI_TRANSLATIONS[selectedLang];

  // Text-To-Speech: Triggers ONLY when user selects English, Hindi, or Kannada
  // Switching languages immediately halts previous speech and speaks the selected language.
  const handleSelectLanguageAndSpeak = async (lang: Language) => {
    // Update the UI text language to the selected language
    setSelectedLang(lang);

    // If user clicked the currently playing language, toggle it off (Stop)
    if (isPlaying && activeSpeechLang === lang) {
      stopSpeech();
      setIsPlaying(false);
      setActiveSpeechLang(null);
      return;
    }

    // Stop any previous speech immediately
    stopSpeech();
    setActiveSpeechLang(lang);
    setIsPlaying(true);

    const textToSpeak =
      dossier.spokenAudioScript?.[lang] ||
      dossier.debunkExplanation?.[lang] ||
      dossier.summary?.[lang] ||
      dossier.summary.en;

    await speakText(
      textToSpeak,
      lang,
      () => {
        setIsPlaying(true);
        setActiveSpeechLang(lang);
      },
      () => {
        setIsPlaying(false);
        setActiveSpeechLang(null);
      },
      () => {
        setIsPlaying(false);
        setActiveSpeechLang(null);
      }
    );
  };

  const handleStopAudio = () => {
    stopSpeech();
    setIsPlaying(false);
    setActiveSpeechLang(null);
  };

  const handleClose = () => {
    stopSpeech();
    onClose();
  };

  const handleCopyWhatsApp = () => {
    const textToCopy = dossier.whatsappDebunkNote[selectedLang] || dossier.whatsappDebunkNote.en;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isFake = dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false';
  const isMisleading = dossier.clearVerdictStatus === 'MISLEADING' || dossier.verdict === 'misleading';
  const isReal = dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 overflow-y-auto">
      <div 
        className="bg-white w-full max-w-2xl max-h-[92vh] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col overflow-hidden relative animate-in fade-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top thick accent bar */}
        <div
          className={`h-2 w-full ${
            isFake ? 'bg-[#e11d48]' : isMisleading ? 'bg-[#d97706]' : 'bg-[#059669]'
          }`}
        />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#e5eeff] flex items-center justify-between bg-[#f8f9ff]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px] text-[#4059aa]">
              verified_user
            </span>
            <div>
              <h2 className="font-['Plus Jakarta Sans'] font-bold text-base sm:text-lg text-[#0b1c30] leading-snug">
                {t.dossierModalTitle}
              </h2>
              {dossier.officialRefId && (
                <span className="text-[11px] font-mono text-[#76777d]">
                  Ref: {dossier.officialRefId}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Header Language Pill */}
            <div className="flex bg-[#e5eeff] rounded-full p-0.5 border border-[#d3e4fe]">
              {(['kn', 'hi', 'en'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleSelectLanguageAndSpeak(lang)}
                  title={`Speak in ${lang === 'kn' ? 'Kannada' : lang === 'hi' ? 'Hindi' : 'English'}`}
                  className={`h-7 px-2.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1 ${
                    selectedLang === lang
                      ? 'bg-[#000000] text-white shadow-xs'
                      : 'text-[#45464d] hover:text-[#0b1c30]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isPlaying && activeSpeechLang === lang ? 'volume_up' : 'translate'}
                  </span>
                  <span>{lang === 'kn' ? 'ಕನ್ನಡ' : lang === 'hi' ? 'हिन्दी' : 'EN'}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#76777d] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* 1. FIRST SHOW CLEARLY: WHETHER IT IS FAKE OR REAL */}
          <div
            className={`rounded-2xl p-4 sm:p-5 border-2 shadow-lg relative overflow-hidden transition-all ${
              isFake
                ? 'bg-[#fff1f2] border-[#f43f5e] text-[#9f1239]'
                : isMisleading
                ? 'bg-[#fffbeb] border-[#f59e0b] text-[#92400e]'
                : 'bg-[#ecfdf5] border-[#10b981] text-[#065f46]'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3.5">
                <span
                  className={`material-symbols-outlined text-[44px] sm:text-[48px] flex-shrink-0 mt-0.5 ${
                    isFake ? 'text-[#e11d48]' : isMisleading ? 'text-[#d97706]' : 'text-[#059669]'
                  }`}
                >
                  {isFake ? 'cancel' : isMisleading ? 'warning' : 'verified'}
                </span>

                <div>
                  {/* GIANT VERDICT HEADER */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-['Plus Jakarta Sans'] font-black text-xl sm:text-2xl tracking-tight uppercase px-3.5 py-1 rounded-xl shadow-sm ${
                        isFake
                          ? 'bg-[#e11d48] text-white'
                          : isMisleading
                          ? 'bg-[#d97706] text-white'
                          : 'bg-[#059669] text-white'
                      }`}
                    >
                      {isFake
                        ? '❌ FAKE NEWS'
                        : isMisleading
                        ? '⚠️ MISLEADING'
                        : '✅ REAL & VERIFIED'}
                    </span>

                    <span className="font-['Noto_Sans_Kannada'] font-bold text-sm sm:text-base px-2.5 py-0.5 rounded-full bg-white/90 border border-current shadow-2xs">
                      {isFake
                        ? 'ಸುಳ್ಳು ಸುದ್ದಿ'
                        : isMisleading
                        ? 'ದಾರಿತಪ್ಪಿಸುವ ಸುದ್ದಿ'
                        : 'ಅಧಿಕೃತ ಸತ್ಯ'}
                    </span>

                    <span className="font-['Noto_Sans_Devanagari'] font-bold text-sm sm:text-base px-2.5 py-0.5 rounded-full bg-white/90 border border-current shadow-2xs">
                      {isFake
                        ? 'फर्जी खबर'
                        : isMisleading
                        ? 'भ्रामक दावा'
                        : 'सत्य खबर'}
                    </span>
                  </div>

                  {/* Direct Verdict Warning Summary */}
                  <p className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base mt-2 text-[#0b1c30] leading-snug">
                    {isFake
                      ? '🚨 WARNING: This claim is completely FALSE. Do NOT forward or click links.'
                      : isMisleading
                      ? '⚠️ CAUTION: Outdated or manipulated information presented without correct context.'
                      : '✅ CONFIRMED: Backed by primary official records and government gazettes.'}
                  </p>
                </div>
              </div>

              {/* Action buttons: Report Fake News (if fake or misleading) */}
              {(isFake || isMisleading) && (
                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-black/10">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="py-2 px-3.5 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">report_problem</span>
                    <span>🚨 Report Fake News</span>
                  </button>
                  <span className="text-[11px] text-[#76777d] mt-1 font-medium">
                    Cyber Cell & PIB
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 2. TEXT-TO-SPEECH FUNCTIONALITY: TRIGGERS ONLY WHEN USER SELECTS ENGLISH, HINDI, OR KANNADA */}
          <div className="bg-[#131b2e] text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-3.5 border border-[#213145]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#4059aa] flex items-center justify-center text-white flex-shrink-0">
                  <span className="material-symbols-outlined text-[20px]">record_voice_over</span>
                </div>
                <div>
                  <h4 className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base leading-tight">
                    Voice Fact-Check (ಧ್ವನಿ ವಿವರಣೆ ಕೇಳಿ / बोलकर सुनें)
                  </h4>
                  <p className="text-[11px] text-[#bec6e0]">
                    Click English, Hindi, or Kannada to speak. Only the selected language will speak.
                  </p>
                </div>
              </div>

              {isPlaying ? (
                <button
                  type="button"
                  onClick={handleStopAudio}
                  className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#e11d48] text-white text-xs font-bold hover:bg-[#be123c] transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">stop_circle</span>
                  <span>Stop Speech</span>
                </button>
              ) : (
                <span className="text-[11px] font-mono text-[#8fa7fe]">3 Languages Ready</span>
              )}
            </div>

            {/* 3 Explicit Language Selection Audio Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Button 1: Kannada (ಕನ್ನಡ) */}
              <button
                type="button"
                onClick={() => handleSelectLanguageAndSpeak('kn')}
                className={`py-3 px-3 rounded-xl font-['Noto_Sans_Kannada'] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  isPlaying && activeSpeechLang === 'kn'
                    ? 'bg-[#e11d48] text-white ring-2 ring-white scale-[1.02]'
                    : selectedLang === 'kn'
                    ? 'bg-[#dce1ff] text-[#00164e] ring-2 ring-[#4059aa]'
                    : 'bg-[#2a354d] text-white hover:bg-white hover:text-black'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isPlaying && activeSpeechLang === 'kn' ? 'stop_circle' : 'campaign'}
                </span>
                <span>
                  {isPlaying && activeSpeechLang === 'kn'
                    ? 'ನಿಲ್ಲಿಸಿ (Stop Kannada)'
                    : '🔊 ಕನ್ನಡ (Kannada)'}
                </span>
              </button>

              {/* Button 2: Hindi (हिन्दी) */}
              <button
                type="button"
                onClick={() => handleSelectLanguageAndSpeak('hi')}
                className={`py-3 px-3 rounded-xl font-['Noto_Sans_Devanagari'] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  isPlaying && activeSpeechLang === 'hi'
                    ? 'bg-[#e11d48] text-white ring-2 ring-white scale-[1.02]'
                    : selectedLang === 'hi'
                    ? 'bg-[#fed7aa] text-[#7c2d12] ring-2 ring-[#ea580c]'
                    : 'bg-[#2a354d] text-white hover:bg-white hover:text-black'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isPlaying && activeSpeechLang === 'hi' ? 'stop_circle' : 'campaign'}
                </span>
                <span>
                  {isPlaying && activeSpeechLang === 'hi'
                    ? 'रोकें (Stop Hindi)'
                    : '🔊 हिन्दी (Hindi)'}
                </span>
              </button>

              {/* Button 3: English */}
              <button
                type="button"
                onClick={() => handleSelectLanguageAndSpeak('en')}
                className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  isPlaying && activeSpeechLang === 'en'
                    ? 'bg-[#e11d48] text-white ring-2 ring-white scale-[1.02]'
                    : selectedLang === 'en'
                    ? 'bg-[#eff4ff] text-[#0b1c30] ring-2 ring-[#4059aa]'
                    : 'bg-[#2a354d] text-white hover:bg-[#565e74]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isPlaying && activeSpeechLang === 'en' ? 'stop_circle' : 'volume_up'}
                </span>
                <span>
                  {isPlaying && activeSpeechLang === 'en'
                    ? 'Stop English'
                    : '🔊 English'}
                </span>
              </button>
            </div>

            {/* Live Audio Equalizer & Spoken Content Feedback */}
            {isPlaying && (
              <div className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/10 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-4 bg-[#6bd8cb] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-6 bg-[#89f5e7] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-8 bg-[#8fa7fe] animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="w-1.5 h-5 bg-[#b6c4ff] animate-bounce" style={{ animationDelay: '450ms' }} />
                    <span className="w-1.5 h-7 bg-[#6bd8cb] animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="text-xs text-[#89f5e7] ml-2 font-mono font-semibold">
                      Speaking fact-check in{' '}
                      {activeSpeechLang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : activeSpeechLang === 'hi' ? 'Hindi (हिन्दी)' : 'English'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#bec6e0]">Click language again to stop</span>
                </div>
                <p className="text-xs text-[#dce1ff] italic bg-white/5 p-2 rounded border border-white/5 line-clamp-3">
                  "{dossier.spokenAudioScript?.[activeSpeechLang!] ||
                    dossier.debunkExplanation?.[activeSpeechLang!] ||
                    dossier.summary?.[activeSpeechLang!] ||
                    dossier.summary.en}"
                </p>
              </div>
            )}
          </div>

          {/* 3. Alleged Claim Under Audit */}
          <div className="bg-[#f8f9ff] rounded-xl p-4 border border-[#e5eeff]">
            <span className="text-[11px] font-bold text-[#76777d] uppercase tracking-wider block mb-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">chat_bubble_outline</span>
              Alleged News Claim Under Audit
            </span>
            <p className="text-sm font-medium text-[#0b1c30] italic bg-white p-3 rounded-lg border border-[#e5eeff]">
              "{dossier.originalClaim}"
            </p>
            <div className="flex items-center justify-between mt-2 text-[11px] text-[#76777d]">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">cell_tower</span>
                <span>Origin Vector: {dossier.originVector}</span>
              </span>
              <span>Category: {dossier.category}</span>
            </div>
          </div>

          {/* 4. Evidentiary Findings & Gazette Record Corroboration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#4059aa]">fact_check</span>
                Evidentiary Findings & Record Corroboration
              </h4>
              <span className="text-xs text-[#4059aa] font-semibold bg-[#eff4ff] px-2.5 py-0.5 rounded-full border border-[#d3e4fe]">
                {selectedLang === 'kn' ? 'ಕನ್ನಡ ವಿವರಣೆ' : selectedLang === 'hi' ? 'हिन्दी विवरण' : 'English Findings'}
              </span>
            </div>

            <p className="text-sm text-[#0b1c30] leading-relaxed bg-[#eff4ff] p-3.5 rounded-xl border border-[#d3e4fe]">
              {dossier.debunkExplanation[selectedLang] || dossier.debunkExplanation.en}
            </p>
          </div>

          {/* 5. Official Corroborating Repositories Grid (Evidences and Sources) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#0b1c30] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#4059aa]">travel_explore</span>
                Official Evidence Sources & Repositories ({dossier.sources.length})
              </h4>

              {/* Google Search Data Grounding Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f0f4f9] border border-[#d3e3fd] text-[#1a73e8] text-[11px] font-bold self-start sm:self-auto shadow-2xs">
                <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google Search Data Grounded</span>
              </div>
            </div>

            {/* Google Search Queries Grounding Box */}
            {dossier.groundingInfo?.queries && dossier.groundingInfo.queries.length > 0 && (
              <div className="bg-[#f8fafd] border border-[#e1e9f8] p-3 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#444746] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#1a73e8]">search</span>
                    Live Google Search Grounding Queries Executed
                  </span>
                  <span className="text-[10px] text-[#74777f]">Click query to view live Google results</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {dossier.groundingInfo.queries.map((q, idx) => (
                    <a
                      key={idx}
                      href={`https://www.google.com/search?q=${encodeURIComponent(q)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#c2e7ff] text-[11px] font-medium text-[#001d35] hover:bg-[#e8f0fe] hover:border-[#1a73e8] transition-colors group shadow-2xs"
                    >
                      <span className="truncate max-w-[240px] sm:max-w-[320px]">"{q}"</span>
                      <span className="material-symbols-outlined text-[13px] text-[#1a73e8] group-hover:translate-x-0.5 transition-transform">
                        open_in_new
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Sources List */}
            <div className="space-y-2">
              {dossier.sources.map((src, idx) => (
                <div key={idx} className="bg-white p-3.5 rounded-xl border border-[#e5eeff] flex flex-col gap-1.5 shadow-2xs hover:border-[#8fa7fe] transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-['Plus Jakarta Sans'] font-semibold text-sm text-[#0b1c30]">
                      {src.name}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      src.status === 'confirmed'
                        ? 'bg-[#ecfdf5] text-[#059669]'
                        : src.status === 'refuted'
                        ? 'bg-[#fff1f2] text-[#e11d48]'
                        : 'bg-[#f1f5f9] text-[#64748b]'
                    }`}>
                      {src.status === 'confirmed' ? 'Verified Record' : src.status === 'refuted' ? 'Official Clarification' : 'Registry Searched'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#76777d]">{src.category}</span>
                  <p className="text-xs text-[#45464d]">{src.details}</p>

                  <div className="pt-1 flex items-center justify-between border-t border-[#f1f5f9] mt-1">
                    {src.url ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1a73e8] hover:text-[#0b57d0] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">link</span>
                        <span>Open Primary Evidence Source</span>
                        <span className="material-symbols-outlined text-[13px]">launch</span>
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/search?q=${encodeURIComponent(dossier.originalClaim + ' ' + src.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1a73e8] hover:underline"
                      >
                        <span className="material-symbols-outlined text-[14px]">search</span>
                        <span>Search "{src.name}" on Google</span>
                      </a>
                    )}

                    {src.timestamp && (
                      <span className="text-[10px] text-[#94a3b8] font-mono">{src.timestamp}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Live Search Action Bar */}
            <div className="pt-1">
              <a
                href={`https://www.google.com/search?q=${encodeURIComponent(dossier.originalClaim + ' fact check')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-3 rounded-lg bg-[#f0f4f9] hover:bg-[#e1e9f8] text-[#1a73e8] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#d3e3fd] transition-colors shadow-2xs"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Cross-check full claim live on Google Search</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
          </div>

          {/* 6. Forensic Red Flag Indicators */}
          {dossier.redFlags && dossier.redFlags.length > 0 && (
            <div className="bg-[#fff1f2] rounded-xl p-4 border border-[#fecdd3] space-y-2">
              <span className="text-xs font-bold text-[#e11d48] flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">report</span>
                Forensic Red Flags Identified
              </span>
              <ul className="space-y-1.5 pl-1">
                {dossier.redFlags.map((flag, idx) => (
                  <li key={idx} className="text-xs text-[#9f1239] flex items-start gap-2">
                    <span className="material-symbols-outlined text-[14px] text-[#e11d48] mt-0.5 flex-shrink-0">
                      close
                    </span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 7. WhatsApp Counter-Debunk Forwarding Card */}
          <div className="bg-[#f0fdf4] rounded-xl p-4 border border-[#bbf7d0] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-[#16a34a]">
                  share
                </span>
                <span className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#14532d]">
                  WhatsApp Counter-Debunk Ready
                </span>
              </div>
              <span className="text-[11px] text-[#15803d] font-semibold bg-[#dcfce7] px-2 py-0.5 rounded-full">
                Stop Viral Forward
              </span>
            </div>

            <pre className="text-xs text-[#14532d] bg-white p-3 rounded-lg border border-[#bbf7d0] whitespace-pre-wrap font-sans leading-relaxed">
              {dossier.whatsappDebunkNote[selectedLang] || dossier.whatsappDebunkNote.en}
            </pre>

            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="w-full py-2.5 px-4 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Debunk Copied to Clipboard!' : 'Copy WhatsApp Counter Note'}</span>
            </button>
          </div>

          {/* 8. Forensic Disinformation Timeline */}
          {dossier.timeline && dossier.timeline.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#0b1c30] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#4059aa]">history</span>
                Forensic Timeline & Spread Trace
              </h4>
              <div className="space-y-2 border-l-2 border-[#d3e4fe] ml-2 pl-3 py-1">
                {dossier.timeline.map((step, idx) => (
                  <div key={idx} className="relative text-xs">
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-[#4059aa]" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0b1c30]">{step.time}</span>
                      <span className="text-[10px] bg-[#e5eeff] text-[#4059aa] px-1.5 py-0.2 rounded">{step.source}</span>
                    </div>
                    <p className="text-[#45464d] mt-0.5">{step.event}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-[#f8f9ff] border-t border-[#e5eeff] flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-2 rounded-lg border border-[#cbd5e1] text-[#0b1c30] hover:bg-[#e2e8f0] text-xs sm:text-sm font-semibold transition-colors"
          >
            Close Dossier
          </button>

          <div className="flex items-center gap-2">
            {(isFake || isMisleading) && (
              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="px-3 py-2 rounded-lg bg-[#fff1f2] border border-[#fecdd3] text-[#ba1a1a] hover:bg-[#ffe4e6] text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px]">report</span>
                <span>🚨 Report Fake News</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-3.5 py-2 rounded-lg bg-[#000000] hover:bg-[#131b2e] text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">share</span>
              <span>Share Debunk</span>
            </button>
          </div>
        </div>
      </div>

      {showReportModal && (
        <ReportFakeNewsModal
          dossier={dossier}
          onClose={() => setShowReportModal(false)}
          currentLang={selectedLang}
        />
      )}
    </div>
  );
};
