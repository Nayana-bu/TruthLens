import React, { useState, useRef } from 'react';
import { ClaimDossier, Language, SubmissionMode } from '../types';
import { INITIAL_DOSSIERS, UI_TRANSLATIONS } from '../data/mockData';
import { VoiceVerdictPlayer } from './VoiceVerdictPlayer';
import { ReportFakeNewsModal } from './ReportFakeNewsModal';
import { speakText, stopSpeech } from '../utils/speechEngine';

interface VerifyTabProps {
  currentLang: Language;
  onInspectDossier: (dossier: ClaimDossier) => void;
  onViewAllTrending: () => void;
  onStartInvestigation: (claimText: string, mode: SubmissionMode, imageBase64?: string) => void;
  isInvestigating: boolean;
  investigationStatusMessage?: string;
  latestDossier?: ClaimDossier | null;
  allDossiers?: ClaimDossier[];
}

export const VerifyTab: React.FC<VerifyTabProps> = ({
  currentLang,
  onInspectDossier,
  onViewAllTrending,
  onStartInvestigation,
  isInvestigating,
  investigationStatusMessage,
  latestDossier,
  allDossiers,
}) => {
  const t = UI_TRANSLATIONS[currentLang];
  const dossiersList = allDossiers && allDossiers.length > 0 ? allDossiers : INITIAL_DOSSIERS;

  const [activeTab, setActiveTab] = useState<SubmissionMode>('text');
  const [claimText, setClaimText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const sampleClaims = [
    'Govt announces free 500GB 5G recharge for all citizens under PM Digital Yojana',
    'Karnataka orders 3-day emergency monsoon holiday for all schools and PU colleges',
    'ISRO confirms successful Halo Orbit Insertion of Aditya-L1 solar probe',
    'Reserve Bank of India demonetizes banknotes with Star (*) mark in serial number',
    'Government giving free laptops to all college students in Karnataka',
    'Breaking: Petrol price hiked by 20 rupees per liter starting midnight',
  ];

  const handleExecuteInvestigation = () => {
    const text = claimText.trim();
    if (!text && !selectedImage) {
      setValidationError(
        currentLang === 'kn'
          ? 'ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಲು ಸುದ್ದಿಯ ಪಠ್ಯವನ್ನು ಬರೆಯಿರಿ ಅಥವಾ ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಲಗತ್ತಿಸಿ.'
          : currentLang === 'hi'
          ? 'कृपया जांच के लिए समाचार टेक्स्ट टाइप करें या स्क्रीनशॉट अपलोड करें।'
          : 'Please enter your news claim or attach a screenshot to investigate.'
      );
      return;
    }
    setValidationError(null);
    onStartInvestigation(text, activeTab, selectedImage || undefined);
  };

  const handleSelectSample = (sample: string) => {
    setClaimText(sample);
    setValidationError(null);
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setClaimText(text);
          return;
        }
      }
      setClaimText(sampleClaims[0]);
    } catch {
      setClaimText(sampleClaims[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageName(file.name);
      setActiveTab('ocr');
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedImage(result);
        if (!claimText) {
          setClaimText(`[Screenshot: ${file.name}] Automated extraction of viral circular/headline`);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getStatusText = () => {
    const len = claimText.trim().length;
    if (len === 0 && !selectedImage) {
      return {
        text: currentLang === 'kn' ? 'ಯಾವುದೇ ಸುದ್ದಿ ಅಥವಾ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ' : currentLang === 'hi' ? 'कोई भी खबर या संदेश टाइप करें' : 'Type or paste any news to verify',
        pulseClass: 'bg-[#4059aa]',
      };
    }
    if (len < 10 && !selectedImage) {
      return { text: t.tooShort, pulseClass: 'bg-[#76777d]' };
    }
    return {
      text: currentLang === 'kn' ? 'ನಿಮ್ಮ ಸುದ್ದಿಯನ್ನು ತನಿಖೆ ಮಾಡಲು ಸಿದ್ಧವಾಗಿದೆ' : currentLang === 'hi' ? 'आपकी खबर की जांच के लिए तैयार' : 'Ready to investigate your news',
      pulseClass: 'bg-[#000000] animate-pulse',
    };
  };

  const statusInfo = getStatusText();

  const getPlaceholder = () => {
    if (activeTab === 'ocr') {
      return currentLang === 'kn'
        ? 'ಚಿತ್ರದಲ್ಲಿರುವ ಪಠ್ಯವನ್ನು ಒಸಿಆರ್ ಮೂಲಕ ಪರಿಶೀಲಿಸಲಾಗುವುದು (ಕನ್ನಡ / English / हिन्दी)...'
        : currentLang === 'hi'
        ? 'स्क्रीनशॉट से ओसीआर द्वारा टेक्स्ट निकाला जाएगा (हिन्दी / English / ಕನ್ನಡ)...'
        : 'Screenshot attached will be processed via OCR engine (English / ಕನ್ನಡ / हिन्दी)...';
    }
    if (activeTab === 'url') {
      return currentLang === 'kn'
        ? 'Twitter/X, YouTube, Telegram ಅಥವಾ ಸುದ್ದಿ ಲಿಂಕ್ ಅನ್ನು ಇಲ್ಲಿ ಪೇಸ್ಟ್ ಮಾಡಿ...'
        : currentLang === 'hi'
        ? 'ट्विटर/एक्स, यूट्यूब, टेलीग्राम या समाचार लिंक यहां पेस्ट करें...'
        : 'Paste Twitter/X, YouTube, Telegram, or news article URL to unpack lineage...';
    }
    return currentLang === 'kn'
      ? 'ನಿಮಗೆ ಬಂದ ಯಾವುದೇ ವಾಟ್ಸಾಪ್ ಸಂದೇಶ, ನಕಲಿ ಸುದ್ದಿ, ಸರ್ಕಾರಿ ಸುತ್ತೋಲೆ, ಅಥವಾ ವದಂತಿಯನ್ನು ಇಲ್ಲಿ ಬರೆಯಿರಿ...'
      : currentLang === 'hi'
      ? 'कोई भी व्हाट्सएप मैसेज, संदिग्ध खबर, सरकारी आदेश या अफवाह यहां टाइप या पेस्ट करें...'
      : 'Type or paste any suspicious news claim, forwarded message, or rumor to verify...';
  };

  const [playingAudio, setPlayingAudio] = useState<{ id: string; lang: 'kn' | 'hi' | 'en' } | null>(null);
  const [reportingItem, setReportingItem] = useState<ClaimDossier | null>(null);

  const handleQuickPlayAudio = (e: React.MouseEvent, item: ClaimDossier, lang: 'kn' | 'hi' | 'en') => {
    e.stopPropagation();
    if (playingAudio?.id === item.id && playingAudio.lang === lang) {
      stopSpeech();
      setPlayingAudio(null);
      return;
    }

    stopSpeech();
    const script = item.spokenAudioScript?.[lang] || item.summary[lang] || item.summary.en;
    setPlayingAudio({ id: item.id, lang });
    speakText(
      script,
      lang,
      () => setPlayingAudio({ id: item.id, lang }),
      () => setPlayingAudio(null),
      () => setPlayingAudio(null)
    );
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-5 gap-4">
      {/* Hidden File Input for Real Screenshots */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Hero / Intro Narrative */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-[#dce1ff] text-[#00164e] font-['Inter'] text-[11px] font-semibold">
            <span className="material-symbols-outlined text-[14px]">shield</span>
            <span>{t.multilingualBadge}</span>
          </div>
          <h1 className="font-['Plus Jakarta Sans'] text-xl sm:text-2xl font-extrabold text-[#0b1c30] tracking-tight">
            {t.heroTitle}
          </h1>
          <p className="font-['Inter'] text-xs sm:text-sm text-[#64748b] leading-relaxed max-w-2xl">
            {t.heroSub}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <div className="lg:col-span-7 flex flex-col gap-3">
      {/* Submission Mode Segmented Pill Tabs */}
      <div className="bg-[#eef2fb] rounded-full p-1 flex items-center border border-[#e0e7f5]">
        <button
          type="button"
          onClick={() => setActiveTab('text')}
          className={`flex-1 py-2 px-2.5 rounded-full font-['Inter'] text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'text'
              ? 'bg-white text-[#0b1c30] shadow-sm'
              : 'text-[#45464d] hover:text-[#0b1c30]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">chat</span>
          <span className="truncate">{t.tabText}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('ocr');
            fileInputRef.current?.click();
          }}
          className={`flex-1 py-2 px-2.5 rounded-full font-['Inter'] text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ocr'
              ? 'bg-white text-[#0b1c30] shadow-sm'
              : 'text-[#45464d] hover:text-[#0b1c30]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">document_scanner</span>
          <span className="truncate">{t.tabOcr}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex-1 py-2 px-2.5 rounded-full font-['Inter'] text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'url'
              ? 'bg-white text-[#0b1c30] shadow-sm'
              : 'text-[#45464d] hover:text-[#0b1c30]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">link</span>
          <span className="truncate">{t.tabUrl}</span>
        </button>
      </div>

      {/* Active Input Workspace Card */}
      <div className="bg-white rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden border border-[#e4e9f4] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {/* Ambient Card Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4059aa] via-[#8fa7fe] to-[#dce1ff]" />

        {/* Selected Image Thumbnail preview if attached */}
        {selectedImage && (
          <div className="relative rounded-lg overflow-hidden border border-[#d3e4fe] bg-[#eff4ff] p-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={selectedImage}
                alt="Uploaded evidence"
                className="w-12 h-12 object-cover rounded border border-[#cbd5e1]"
              />
              <div className="flex flex-col truncate">
                <span className="text-xs font-semibold text-[#0b1c30] truncate">
                  {imageName || 'Attached Screenshot'}
                </span>
                <span className="text-[11px] text-[#16a34a] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                  OCR Ready for Sweep
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedImage(null);
                setImageName(null);
                if (claimText.startsWith('[Screenshot:')) {
                  setClaimText('');
                }
              }}
              className="w-7 h-7 rounded-full bg-white text-[#76777d] hover:text-[#ba1a1a] flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Main Textarea Area */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#4059aa]">edit_note</span>
              {currentLang === 'kn'
                ? 'ನಿಮ್ಮ ಸುದ್ದಿ ಅಥವಾ ಸಂದೇಶವನ್ನು ಇಲ್ಲಿ ನಮೂದಿಸಿ:'
                : currentLang === 'hi'
                ? 'अपनी खबर या दावा यहां दर्ज करें:'
                : 'Enter Your News or Claim Text:'}
            </span>
            {claimText.length > 0 && (
              <button
                type="button"
                onClick={() => setClaimText('')}
                className="text-[11px] font-semibold text-[#ba1a1a] hover:underline flex items-center gap-0.5"
              >
                <span>Clear / ತೆರವುಗೊಳಿಸಿ</span>
              </button>
            )}
          </div>

          <div className="relative">
            <textarea
              id="claim-input"
              value={claimText}
              onChange={(e) => {
                setClaimText(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder={getPlaceholder()}
              rows={3}
              maxLength={2000}
              className="w-full bg-[#f7f9fd] text-[#0b1c30] placeholder:text-[#94a3b8] p-3 rounded-lg font-['Inter'] text-sm resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4059aa]/25 border border-[#e0e7f5] transition-colors leading-relaxed"
            />
          </div>

          {/* Claim Extraction Status Meter */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${statusInfo.pulseClass}`} />
              <span className="font-['Inter'] text-[11px] font-medium text-[#45464d]">
                {statusInfo.text}
              </span>
            </div>
            <span className="font-['Inter'] text-[11px] text-[#76777d] font-mono">
              {claimText.length} / 2000
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            type="button"
            onClick={handlePasteClipboard}
            className="h-9 px-3.5 rounded-full bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] flex items-center gap-1.5 font-['Inter'] text-xs font-semibold transition-all active:scale-95 shadow-xs border border-[#d3e4fe]"
          >
            <span className="material-symbols-outlined text-[17px] text-[#4059aa]">
              content_paste
            </span>
            <span>{t.pasteBtn}</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3.5 rounded-full bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] flex items-center gap-1.5 font-['Inter'] text-xs font-semibold transition-all active:scale-95 shadow-xs border border-[#d3e4fe]"
          >
            <span className="material-symbols-outlined text-[17px] text-[#4059aa]">
              add_photo_alternate
            </span>
            <span>{t.attachBtn}</span>
          </button>
        </div>

        {/* Sample claims chips for fast testing */}
        <div className="flex flex-col gap-1.5 pt-2 border-t border-[#f1f5f9]">
          <span className="text-[11px] font-bold text-[#76777d] uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[#4059aa]">auto_awesome</span>
            {currentLang === 'kn'
              ? 'ಉದಾಹರಣೆ ಸುದ್ದಿ ಆಯ್ಕೆಮಾಡಿ (ಅಥವಾ ನಿಮ್ಮದೇ ಸುದ್ದಿ ಟೈಪ್ ಮಾಡಿ):'
              : currentLang === 'hi'
              ? 'उदाहरण दावा चुनें (या अपनी खबर टाइप करें):'
              : 'Or try an example claim (or enter your own):'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleClaims.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSample(sample)}
                className="text-[11px] py-1 px-2.5 rounded-md bg-[#eff4ff] hover:bg-[#dce1ff] text-[#00164e] border border-[#d3e4fe] transition-colors text-left truncate max-w-full"
              >
                {sample.slice(0, 48)}...
              </button>
            ))}
          </div>
        </div>

        {/* Validation Alert if user clicked investigate with empty input */}
        {validationError && (
          <div className="p-3 bg-[#fff1f2] border border-[#fecdd3] text-[#ba1a1a] rounded-lg text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* Primary Unmissable Investigate Button Right Inside The Input Card */}
        <button
          type="button"
          disabled={isInvestigating}
          onClick={handleExecuteInvestigation}
          className="w-full h-11 rounded-xl bg-[#4059aa] hover:bg-[#334a91] text-white font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(64,89,170,0.28)] transition-all active:scale-[0.99] group disabled:opacity-75 cursor-pointer"
        >
          {isInvestigating ? (
            <>
              <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
              <span>
                {currentLang === 'kn'
                  ? 'ದಾಖಲೆಗಳ ಪರಿಶೀಲನೆ ನಡೆಯುತ್ತಿದೆ...'
                  : currentLang === 'hi'
                  ? 'रिकॉर्ड की जांच हो रही है...'
                  : 'Sweeping Official Repositories...'}
              </span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[20px] text-[#8fa7fe] group-hover:scale-110 transition-transform">
                search_check
              </span>
              <span>
                {claimText.trim()
                  ? currentLang === 'kn'
                    ? 'ಈ ಸುದ್ದಿಯನ್ನು ತನಿಖೆ ನಡೆಸಿ (Investigate This News)'
                    : currentLang === 'hi'
                    ? 'इस खबर की जांच करें (Investigate This News)'
                    : 'Investigate This News Now'
                  : currentLang === 'kn'
                  ? 'ಸುದ್ದಿಯನ್ನು ಪರಿಶೀಲಿಸಿ (Investigate Claim)'
                  : currentLang === 'hi'
                  ? 'खबर की जांच शुरू करें (Investigate Claim)'
                  : 'Investigate News Claim'}
              </span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </>
          )}
        </button>

      </div>
      </div>

      <div className="lg:col-span-5 flex flex-col gap-3">
        {/* Community Audit Proof Counter */}
        <div className="rounded-xl bg-white p-3.5 flex items-center justify-between gap-3 border border-[#e4e9f4] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#eef2fb] flex items-center justify-center text-[#4059aa] flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">policy</span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Plus Jakarta Sans'] font-extrabold text-base text-[#0b1c30]">
                {t.claimsRefutedCount}
              </span>
              <span className="font-['Inter'] text-xs text-[#64748b]">
                {t.claimsRefutedDesc}
              </span>
            </div>
          </div>
          <div className="flex items-center text-[#4059aa]">
            <span className="material-symbols-outlined text-[22px]">analytics</span>
          </div>
        </div>

        {/* Visual Context Enrichment: Forensic Source Radar */}
        <div className="bg-white rounded-xl p-3.5 flex items-center justify-between border border-[#e4e9f4] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#eef2fb] flex items-center justify-center text-[#4059aa]">
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Inter'] text-xs font-bold text-[#0b1c30]">
                {t.archiveSweepTitle}
              </span>
              <span className="font-['Inter'] text-[11px] text-[#64748b]">
                {t.archiveSweepSub}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#4059aa] text-[18px]">
            verified
          </span>
        </div>

      {/* ACTIVE INVESTIGATION RUNNING ANIMATION */}
      {isInvestigating && (
        <div className="rounded-xl p-4 bg-[#0b1c30] text-white border border-[#4059aa]/40 flex flex-col gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-[#8fa7fe] animate-spin">
              sync
            </span>
            <div>
              <h3 className="font-['Plus Jakarta Sans'] font-bold text-base">
                {currentLang === 'kn'
                  ? 'ನಿಮ್ಮ ಸುದ್ದಿಯ ತನಿಖೆ ನಡೆಯುತ್ತಿದೆ...'
                  : currentLang === 'hi'
                  ? 'आपकी खबर की जांच चल रही है...'
                  : 'Investigating Your Submitted News...'}
              </h3>
              <p className="text-xs text-[#dce1ff]">
                {investigationStatusMessage || 'Sweeping 48 official gazettes, PIB Fact Check, and regulatory portals...'}
              </p>
            </div>
          </div>
          <div className="w-full bg-[#1b2b5a] rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#8fa7fe] h-full w-2/3 animate-pulse rounded-full" />
          </div>
        </div>
      )}
      </div>
      </div>

      {/* LATEST VERIFIED CLAIM LIVE RESULT (CLEAR FAKE/REAL & VOICE IN KANNADA/HINDI) */}
      {latestDossier && !isInvestigating && (
        <div className="flex flex-col gap-3 p-4 bg-white rounded-xl border border-[#c5d0f5] shadow-[0_1px_2px_rgba(15,23,42,0.04)] animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping" />
              <span className="text-xs font-black uppercase tracking-wider text-[#4059aa] flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                {currentLang === 'kn'
                  ? 'ನಿಮ್ಮ ಸುದ್ದಿಯ ತನಿಖಾ ಫಲಿತಾಂಶ'
                  : currentLang === 'hi'
                  ? 'आपकी खबर की जांच का परिणाम'
                  : 'Investigation Result For Your News'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onInspectDossier(latestDossier)}
              className="text-xs font-bold text-[#4059aa] hover:underline flex items-center gap-0.5"
            >
              <span>Full Dossier</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>

          {/* User's Original Claim Callout */}
          <div className="bg-[#eff4ff] p-3 rounded-xl border border-[#d3e4fe] flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#4059aa] text-[20px] flex-shrink-0 mt-0.5">
              chat_bubble
            </span>
            <div className="flex flex-col text-xs">
              <span className="font-bold text-[#0b1c30] uppercase text-[10px] tracking-wider text-[#4059aa]">
                {currentLang === 'kn' ? 'ನೀವು ಸಲ್ಲಿಸಿದ ಸುದ್ದಿ:' : currentLang === 'hi' ? 'आपका दर्ज किया गया समाचार:' : 'Your Submitted News:'}
              </span>
              <p className="text-sm font-semibold text-[#0b1c30] mt-0.5 leading-snug">
                "{latestDossier.originalClaim}"
              </p>
            </div>
          </div>

          {/* Voice and Clear Verdict Player */}
          <VoiceVerdictPlayer dossier={latestDossier} currentLang={currentLang} />
        </div>
      )}

      {/* Disinformation Intelligence Stream: Trending / All Verifications */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[20px] text-[#4059aa]">
              local_fire_department
            </span>
            <h2 className="font-['Plus Jakarta Sans'] text-base sm:text-lg font-bold text-[#0b1c30]">
              {t.trendingTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onViewAllTrending}
            className="font-['Inter'] text-xs font-semibold text-[#4059aa] hover:text-[#1d3989] flex items-center gap-0.5"
          >
            <span>{t.viewAll}</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        {/* Cards Stack */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dossiersList.slice(0, 4).map((item) => {
            const isFalse = item.verdict === 'false' || item.clearVerdictStatus === 'FAKE';
            const isMisleading = item.verdict === 'misleading' || item.clearVerdictStatus === 'MISLEADING';
            const isUserItem = item.id.startsWith('user-dossier');

            return (
              <div
                key={item.id}
                onClick={() => onInspectDossier(item)}
                className={`bg-white rounded-xl p-3.5 hover:border-[#c5d0f5] transition-all flex flex-col gap-2 relative overflow-hidden border cursor-pointer group active:scale-[0.99] shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                  isUserItem ? 'border-[#8fa7fe] bg-[#f8faff]' : 'border-[#e4e9f4]'
                }`}
              >
                {/* Left accent strip */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isFalse
                      ? 'bg-[#ba1a1a]'
                      : isMisleading
                      ? 'bg-[#d97706]'
                      : 'bg-[#059669]'
                  }`}
                />

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* CLEAR VERDICT STAMP */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg font-['Plus Jakarta Sans'] text-xs font-extrabold uppercase shadow-xs ${
                        isFalse
                          ? 'bg-[#ba1a1a] text-white'
                          : isMisleading
                          ? 'bg-[#d97706] text-white'
                          : 'bg-[#059669] text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {isFalse ? 'cancel' : isMisleading ? 'warning' : 'check_circle'}
                      </span>
                      {isFalse ? '❌ FAKE' : isMisleading ? '⚠️ MISLEADING' : '✅ REAL'}
                    </span>

                    {isUserItem && (
                      <span className="text-[10px] font-extrabold bg-[#dce1ff] text-[#00164e] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">person</span>
                        Your News
                      </span>
                    )}
                  </div>

                  <span className="font-['Inter'] text-[11px] text-[#76777d] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {item.timeAgo}
                  </span>
                </div>

                <h3 className="font-['Plus Jakarta Sans'] text-sm font-bold text-[#0b1c30] leading-snug group-hover:text-[#4059aa] transition-colors">
                  {item.title}
                </h3>

                <p className="font-['Inter'] text-xs sm:text-sm text-[#45464d] line-clamp-2 leading-relaxed">
                  {item.summary[currentLang] || item.summary.en}
                </p>

                {/* Direct One-Tap Voice Player in Kannada and Hindi */}
                <div className="bg-[#eff4ff] p-2 rounded-lg border border-[#d3e4fe] flex items-center justify-between gap-2 mt-1">
                  <span className="text-[10px] font-bold text-[#4059aa] uppercase tracking-wider flex items-center gap-1 flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px]">volume_up</span>
                    ಧ್ವನಿ / आवाज:
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Kannada Speak Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickPlayAudio(e, item, 'kn')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        playingAudio?.id === item.id && playingAudio.lang === 'kn'
                          ? 'bg-[#ba1a1a] text-white ring-2 ring-red-300'
                          : 'bg-white text-[#0b1c30] hover:bg-[#dce9ff] border border-[#d3e4fe]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {playingAudio?.id === item.id && playingAudio.lang === 'kn' ? 'stop' : 'volume_up'}
                      </span>
                      <span>ಕನ್ನಡ</span>
                    </button>

                    {/* Hindi Speak Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickPlayAudio(e, item, 'hi')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all ${
                        playingAudio?.id === item.id && playingAudio.lang === 'hi'
                          ? 'bg-[#ba1a1a] text-white ring-2 ring-red-300'
                          : 'bg-white text-[#0b1c30] hover:bg-[#dce9ff] border border-[#d3e4fe]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {playingAudio?.id === item.id && playingAudio.lang === 'hi' ? 'stop' : 'volume_up'}
                      </span>
                      <span>हिन्दी</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#f1f5f9] text-[11px] text-[#76777d]">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-[#4059aa]">
                      verified_user
                    </span>
                    {item.sourceEntity}
                  </span>

                  <span className="font-['Inter'] text-xs text-[#4059aa] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    {t.inspectDossier}{' '}
                    <span className="material-symbols-outlined text-[14px]">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Investigation Launch Footer Bar */}
      <div className="sticky bottom-16 pb-2 pt-2 bg-gradient-to-t from-[#f4f6fb] via-[#f4f6fb] to-transparent z-30 lg:hidden">
        <div className="bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-xl border border-[#d3e4fe] flex flex-col gap-2">
          <button
            type="button"
            disabled={isInvestigating}
            onClick={handleExecuteInvestigation}
            className="w-full h-11 rounded-lg bg-[#4059aa] hover:bg-[#334a91] text-white font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(64,89,170,0.28)] transition-all active:scale-[0.99] group disabled:opacity-80 cursor-pointer"
          >
            {isInvestigating ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">
                  sync
                </span>
                <span>
                  {currentLang === 'kn'
                    ? 'ದಾಖಲೆಗಳ ಪರಿಶೀಲನೆ ನಡೆಯುತ್ತಿದೆ...'
                    : currentLang === 'hi'
                    ? 'रिकॉर्ड की जांच हो रही है...'
                    : 'Sweeping Official Repositories...'}
                </span>
              </>
            ) : (
              <>
                <span>
                  {claimText.trim()
                    ? currentLang === 'kn'
                      ? 'ಈ ಸುದ್ದಿಯನ್ನು ತನಿಖೆ ನಡೆಸಿ (Investigate)'
                      : currentLang === 'hi'
                      ? 'इस खबर की जांच करें (Investigate)'
                      : 'Investigate This News'
                    : t.ctaInvestigate}
                </span>
                <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[#45464d]">
            <span className="material-symbols-outlined text-[15px] text-[#4059aa]">
              gavel
            </span>
            <span className="font-['Inter'] text-[11px] font-medium text-center">
              {t.ctaSubtext}
            </span>
          </div>
        </div>
      </div>

      {/* Report Fake News Modal for card-level reporting */}
      {reportingItem && (
        <ReportFakeNewsModal
          dossier={reportingItem}
          onClose={() => setReportingItem(null)}
          currentLang={currentLang}
        />
      )}
    </div>
  );
};
