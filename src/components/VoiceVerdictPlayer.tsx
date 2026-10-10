import React, { useState, useEffect } from 'react';
import { ClaimDossier, Language } from '../types';
import { speakText, stopSpeech } from '../utils/speechEngine';
import { ReportFakeNewsModal } from './ReportFakeNewsModal';

interface VoiceVerdictPlayerProps {
  dossier: ClaimDossier;
  currentLang?: Language;
  onOpenFullDossier?: () => void;
}

export const VoiceVerdictPlayer: React.FC<VoiceVerdictPlayerProps> = ({
  dossier,
  currentLang = 'en',
  onOpenFullDossier,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSpeechLang, setActiveSpeechLang] = useState<'kn' | 'hi' | 'en' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Strict Single-Language Playback: Clicking one language stops any other language immediately
  const handleSingleLanguageSpeak = async (lang: 'kn' | 'hi' | 'en') => {
    // If user clicked the currently playing language, toggle it off
    if (isPlaying && activeSpeechLang === lang) {
      stopSpeech();
      setIsPlaying(false);
      setActiveSpeechLang(null);
      return;
    }

    // Stop any previously playing audio immediately
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

  const isFake = dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false';
  const isMisleading = dossier.clearVerdictStatus === 'MISLEADING' || dossier.verdict === 'misleading';
  const isReal = dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true';

  return (
    <div className="flex flex-col gap-3.5 w-full">
      {/* 1. CRYSTAL-CLEAR STATUS: FIRST SHOW CLEARLY WHETHER IT IS FAKE OR REAL */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border-2 shadow-lg relative overflow-hidden transition-all ${
          isFake
            ? 'bg-[#fff1f2] border-[#f43f5e] text-[#9f1239]'
            : isMisleading
            ? 'bg-[#fffbeb] border-[#f59e0b] text-[#92400e]'
            : 'bg-[#ecfdf5] border-[#10b981] text-[#065f46]'
        }`}
      >
        {/* Top thick accent bar */}
        <div
          className={`absolute top-0 left-0 right-0 h-2 ${
            isFake ? 'bg-[#e11d48]' : isMisleading ? 'bg-[#d97706]' : 'bg-[#059669]'
          }`}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-start gap-3.5">
            <span
              className={`material-symbols-outlined text-[42px] sm:text-[48px] flex-shrink-0 mt-0.5 ${
                isFake ? 'text-[#e11d48]' : isMisleading ? 'text-[#d97706]' : 'text-[#059669]'
              }`}
            >
              {isFake ? 'cancel' : isMisleading ? 'warning' : 'verified'}
            </span>

            <div>
              {/* GIANT VERDICT HEADER */}
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-['Plus Jakarta Sans'] font-black text-xl sm:text-2xl tracking-tight uppercase px-3 py-1 rounded-lg shadow-sm ${
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
                    ? '⚠️ MISLEADING CLAIM'
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

              {/* Direct Verdict Summary */}
              <p className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base mt-2 text-[#0b1c30] leading-snug">
                {isFake
                  ? '🚨 WARNING: This claim is completely FALSE. Do NOT forward or click links.'
                  : isMisleading
                  ? '⚠️ CAUTION: Outdated or manipulated information presented without correct context.'
                  : '✅ CONFIRMED: Backed by primary official records and government gazettes.'}
              </p>

              {/* Google Search Grounding & Reference Badge */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/80 border border-black/10 text-[11px] font-semibold text-[#1f1f1f] shadow-2xs">
                  <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google Search Grounded</span>
                </span>
                {dossier.officialRefId && (
                  <span className="text-[11px] font-mono text-[#575960]">
                    Ref: {dossier.officialRefId}
                  </span>
                )}
              </div>
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
                To Cyber Cell & PIB
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. DEDICATED INDIVIDUAL LANGUAGE VOICE PLAYER (TALK ONLY WHEN CLICKED) */}
      <div className="bg-[#131b2e] text-white rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col gap-3.5 border border-[#213145]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#4059aa] flex items-center justify-center text-white flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">volume_up</span>
            </div>
            <div>
              <h4 className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base leading-tight">
                Listen to Spoken Verdict (ಧ್ವನಿ ವಿವರಣೆ ಕೇಳಿ / बोलकर सुनें)
              </h4>
              <p className="text-[11px] text-[#bec6e0]">
                Click one language to speak. Only one language will talk at a time.
              </p>
            </div>
          </div>

          {isPlaying && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#059669] text-white text-[11px] font-bold animate-pulse">
              <span className="material-symbols-outlined text-[14px]">graphic_eq</span>
              <span>
                Playing in {activeSpeechLang === 'kn' ? 'ಕನ್ನಡ' : activeSpeechLang === 'hi' ? 'हिन्दी' : 'English'}
              </span>
            </div>
          )}
        </div>

        {/* 3 Explicit Language Audio Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Button 1: Kannada (ಕನ್ನಡ) */}
          <button
            type="button"
            onClick={() => handleSingleLanguageSpeak('kn')}
            className={`py-3 px-3 rounded-xl font-['Noto_Sans_Kannada'] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              isPlaying && activeSpeechLang === 'kn'
                ? 'bg-[#e11d48] text-white ring-2 ring-white scale-[1.02]'
                : 'bg-[#dce1ff] text-[#00164e] hover:bg-white hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPlaying && activeSpeechLang === 'kn' ? 'stop_circle' : 'campaign'}
            </span>
            <span>
              {isPlaying && activeSpeechLang === 'kn' ? 'ನಿಲ್ಲಿಸಿ (Stop Kannada)' : '🔊 ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ'}
            </span>
          </button>

          {/* Button 2: Hindi (हिन्दी) */}
          <button
            type="button"
            onClick={() => handleSingleLanguageSpeak('hi')}
            className={`py-3 px-3 rounded-xl font-['Noto_Sans_Devanagari'] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              isPlaying && activeSpeechLang === 'hi'
                ? 'bg-[#e11d48] text-white ring-2 ring-white scale-[1.02]'
                : 'bg-[#fed7aa] text-[#7c2d12] hover:bg-white hover:text-black'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPlaying && activeSpeechLang === 'hi' ? 'stop_circle' : 'campaign'}
            </span>
            <span>
              {isPlaying && activeSpeechLang === 'hi' ? 'रोकें (Stop Hindi)' : '🔊 हिन्दी में सुनें'}
            </span>
          </button>

          {/* Button 3: English */}
          <button
            type="button"
            onClick={() => handleSingleLanguageSpeak('en')}
            className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
              isPlaying && activeSpeechLang === 'en'
                ? 'bg-[#e11d48] text-white ring-2 ring-white scale-[1.02]'
                : 'bg-[#3f465c] text-white hover:bg-[#565e74]'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isPlaying && activeSpeechLang === 'en' ? 'stop_circle' : 'volume_up'}
            </span>
            <span>
              {isPlaying && activeSpeechLang === 'en' ? 'Stop English' : '🔊 Listen English'}
            </span>
          </button>
        </div>

        {/* Live Equalizer Wave Animation */}
        {isPlaying && (
          <div className="flex items-center justify-center gap-1.5 py-2.5 bg-black/40 rounded-xl border border-white/10">
            <span className="w-1.5 h-4 bg-[#6bd8cb] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-6 bg-[#89f5e7] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-8 bg-[#8fa7fe] animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="w-1.5 h-5 bg-[#b6c4ff] animate-bounce" style={{ animationDelay: '450ms' }} />
            <span className="w-1.5 h-7 bg-[#6bd8cb] animate-bounce" style={{ animationDelay: '200ms' }} />
            <span className="w-1.5 h-4 bg-[#8fa7fe] animate-bounce" style={{ animationDelay: '100ms' }} />
            <span className="text-xs text-[#89f5e7] ml-2 font-mono font-semibold">
              Speaking in {activeSpeechLang === 'kn' ? 'Kannada (ಕನ್ನಡ)' : activeSpeechLang === 'hi' ? 'Hindi (हिन्दी)' : 'English'}
            </span>
          </div>
        )}

        {/* Read-Along Transcript Box */}
        <div className="bg-[#0b1c30] p-3 rounded-xl border border-[#213145] text-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#bec6e0] font-semibold border-b border-white/10 pb-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">subtitles</span>
              Transcript of Spoken Debunk:
            </span>
            <span>Tap any button above to play</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className={`p-2 rounded-lg transition-colors ${activeSpeechLang === 'kn' ? 'bg-[#4059aa]/40 ring-1 ring-[#8fa7fe]' : 'bg-white/5'}`}>
              <span className="text-[10px] text-[#8fa7fe] font-bold block mb-0.5">
                ಕನ್ನಡ ಧ್ವನಿ ವಿವರಣೆ:
              </span>
              <p className="font-['Noto_Sans_Kannada'] text-[#eaf1ff] leading-relaxed">
                {dossier.spokenAudioScript?.kn || dossier.debunkExplanation.kn}
              </p>
            </div>

            <div className={`p-2 rounded-lg transition-colors ${activeSpeechLang === 'hi' ? 'bg-[#4059aa]/40 ring-1 ring-[#fed7aa]' : 'bg-white/5'}`}>
              <span className="text-[10px] text-[#fed7aa] font-bold block mb-0.5">
                हिन्दी ऑडियो स्पष्टीकरण:
              </span>
              <p className="font-['Noto_Sans_Devanagari'] text-[#eaf1ff] leading-relaxed">
                {dossier.spokenAudioScript?.hi || dossier.debunkExplanation.hi}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. VERIFIED EVIDENCES AND PRIMARY SOURCES */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e5eeff] shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-[#4059aa]">
              verified
            </span>
            <h4 className="font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base text-[#0b1c30]">
              Official Evidences & Sources ({dossier.sources.length})
            </h4>
          </div>
          {dossier.officialRefId && (
            <span className="text-[11px] font-mono text-[#76777d] bg-[#f1f5f9] px-2 py-0.5 rounded">
              Ref: {dossier.officialRefId}
            </span>
          )}
        </div>

        {/* List of Evidence Sources */}
        <div className="space-y-2">
          {dossier.sources.map((src, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl border border-[#e5eeff] bg-[#f8f9ff] flex flex-col gap-1 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-['Plus Jakarta Sans'] font-bold text-xs sm:text-sm text-[#0b1c30]">
                  {src.name}
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
                  {src.status === 'confirmed'
                    ? 'Verified Official Record'
                    : src.status === 'refuted'
                    ? 'Government Clarification'
                    : 'Searched Registry'}
                </span>
              </div>

              <span className="text-[11px] text-[#76777d] font-medium">{src.category}</span>
              <p className="text-xs text-[#45464d] mt-0.5">{src.details}</p>

              {src.url && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-[#4059aa] font-semibold hover:underline flex items-center gap-1 mt-1"
                >
                  <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                  <span>Visit official source portal ({src.url})</span>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Red Flags / Forensics if Fake */}
        {dossier.redFlags && dossier.redFlags.length > 0 && (
          <div className="bg-[#fff1f2] p-3 rounded-xl border border-[#fecdd3] mt-2">
            <span className="text-[11px] font-bold text-[#e11d48] uppercase tracking-wider flex items-center gap-1 mb-1.5">
              <span className="material-symbols-outlined text-[15px]">flag</span>
              Forensic Red Flags Identified:
            </span>
            <ul className="space-y-1 text-xs text-[#9f1239]">
              {dossier.redFlags.map((flag, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-[13px] text-[#e11d48] mt-0.5">close</span>
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Report Fake News Modal Popup */}
      {showReportModal && (
        <ReportFakeNewsModal
          dossier={dossier}
          onClose={() => setShowReportModal(false)}
          currentLang={currentLang}
        />
      )}
    </div>
  );
};
