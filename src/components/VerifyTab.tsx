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
  onOpenAuthorities?: () => void;
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
  onOpenAuthorities,
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
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 py-4 gap-6">
      {/* Hidden File Input for Real Screenshots */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Hero / Intro Narrative */}
      <div className="flex flex-col gap-1.5">
        <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-[#dce1ff] text-[#00164e] font-['Inter'] text-[11px] font-semibold shadow-xs">
          <span className="material-symbols-outlined text-[14px]">shield</span>
          <span>{t.multilingualBadge}</span>
        </div>
        <h1 className="font-['Plus Jakarta Sans'] text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight mt-1">
          {t.heroTitle}
        </h1>
        <p className="font-['Inter'] text-sm text-[#45464d] leading-relaxed">
          {t.heroSub}
        </p>
      </div>

      {/* Submission Mode Segmented Pill Tabs */}
      <div className="bg-[#e5eeff] rounded-full p-1 flex items-center shadow-inner border border-[#d3e4fe]">
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
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-5 flex flex-col gap-4 relative overflow-hidden border border-[#e5eeff]">
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
              rows={4}
              maxLength={2000}
              className="w-full bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#76777d] p-3.5 rounded-lg font-['Inter'] text-sm resize-none focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#4059aa]/30 border border-[#d3e4fe] transition-colors leading-relaxed shadow-inner"
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
          className="w-full h-12 rounded-xl bg-[#000000] hover:bg-[#131b2e] text-white font-['Plus Jakarta Sans'] font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.99] group disabled:opacity-75 cursor-pointer"
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

        {/* Visual Context Enrichment: Forensic Source Radar */}
        <div 
          onClick={onOpenAuthorities}
          className={`mt-1 bg-[#eff4ff] rounded-lg p-3 flex items-center justify-between border border-[#d3e4fe] ${
            onOpenAuthorities ? 'cursor-pointer hover:bg-[#e0ecff] hover:border-[#bfdbfe] transition-all' : ''
          }`}
          title="Click to view verified government authorities & portals"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#dce9ff] flex items-center justify-center text-[#4059aa]">
              <span className="material-symbols-outlined text-[18px]">travel_explore</span>
            </div>
            <div className="flex flex-col">
              <span className="font-['Inter'] text-xs font-bold text-[#0b1c30] flex items-center gap-1.5">
                <span>{t.archiveSweepTitle}</span>
                {onOpenAuthorities && (
                  <span className="text-[10px] text-[#15803d] font-bold bg-[#dcfce7] px-1.5 py-0.2 rounded">
                    View 48 Desks
                  </span>
                )}
              </span>
              <span className="font-['Inter'] text-[11px] text-[#45464d]">
                {t.archiveSweepSub}
              </span>
            </div>
          </div>
          <span className="material-symbols-outlined text-[#4059aa] text-[18px]">
            verified
          </span>
        </div>
      </div>

      {/* ACTIVE INVESTIGATION RUNNING ANIMATION */}
      {isInvestigating && (
        <div className="rounded-2xl p-5 bg-[#00164e] text-white shadow-xl border border-[#4059aa]/40 flex flex-col gap-3 animate-in fade-in">
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

      {/* 3-Step Verification Protocol Cards */}
      <div className="flex flex-col gap-3">
        <h3 className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#0b1c30] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[18px] text-[#4059aa]">verified_user</span>
          <span>
            {currentLang === 'kn'
              ? 'ಸತ್ಯ ಪರಿಶೀಲನಾ ವಿಧಾನ (Verification Protocol)'
              : currentLang === 'hi'
              ? 'सत्यापन प्रक्रिया (Verification Protocol)'
              : 'Autonomous Forensic Protocol'}
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 bg-white rounded-xl border border-[#e5eeff] shadow-2xs flex flex-col gap-1">
            <span className="w-6 h-6 rounded-md bg-[#eff4ff] text-[#4059aa] font-bold text-xs flex items-center justify-center">
              1
            </span>
            <span className="font-['Plus Jakarta Sans'] font-bold text-xs text-[#0b1c30]">
              {currentLang === 'kn' ? 'ಒಸಿಆರ್ ಮತ್ತು ಭಾಷಾ ವಿಶ್ಲೇಷಣೆ' : currentLang === 'hi' ? 'ओसीआर एवं भाषा विश्लेषण' : 'OCR & Multilingual Parser'}
            </span>
            <p className="text-[11px] text-[#76777d] leading-snug">
              {currentLang === 'kn'
                ? 'ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಅಥವಾ ವಾಟ್ಸಾಪ್ ಪಠ್ಯದಿಂದ ಮೂಲ ವಿಷಯವನ್ನು ಹೊರತೆಗೆಯಲಾಗುತ್ತದೆ.'
                : currentLang === 'hi'
                ? 'स्क्रीनशॉट या मैसेज से मुख्य टेक्स्ट व संदर्भ निकाला जाता है।'
                : 'Extracts core assertions from screenshots, links, and messages.'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#e5eeff] shadow-2xs flex flex-col gap-1">
            <span className="w-6 h-6 rounded-md bg-[#eff4ff] text-[#4059aa] font-bold text-xs flex items-center justify-center">
              2
            </span>
            <span className="font-['Plus Jakarta Sans'] font-bold text-xs text-[#0b1c30]">
              {currentLang === 'kn' ? '48 ಗೆಜೆಟ್‌ಗಳ ಪರಿಶೀಲನೆ' : currentLang === 'hi' ? '48 राजपत्रों से मिलान' : '48 Gazette Sweep'}
            </span>
            <p className="text-[11px] text-[#76777d] leading-snug">
              {currentLang === 'kn'
                ? 'ಕರ್ನಾಟಕ ಗೆಜೆಟ್, ಪಿಐಬಿ, ಆರ್‌ಬಿಐ ಅಧಿಕೃತ ಆದೇಶಗಳೊಂದಿಗೆ ತಾಳೆ ನೋಡಲಾಗುತ್ತದೆ.'
                : currentLang === 'hi'
                ? 'कर्नाटक राजपत्र, पीआईबी व आरबीआई आदेशों से क्रॉस-चेक होता है।'
                : 'Cross-checks with official state gazettes and government registries.'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-xl border border-[#eff4ff] shadow-2xs flex flex-col gap-1">
            <span className="w-6 h-6 rounded-md bg-[#eff4ff] text-[#059669] font-bold text-xs flex items-center justify-center">
              3
            </span>
            <span className="font-['Plus Jakarta Sans'] font-bold text-xs text-[#0b1c30]">
              {currentLang === 'kn' ? 'ಕನ್ನಡ ಧ್ವನಿ ವಿವರಣೆ' : currentLang === 'hi' ? 'हिन्दी ध्वनि निर्णय' : 'Spoken Voice Verdict'}
            </span>
            <p className="text-[11px] text-[#76777d] leading-snug">
              {currentLang === 'kn'
                ? 'ಕನ್ನಡ, ಹಿಂದಿ ಮತ್ತು ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ತಕ್ಷಣವೇ ಧ್ವನಿ ಸಾರಾಂಶವನ್ನು ಕೇಳಬಹುದು.'
                : currentLang === 'hi'
                ? 'कन्नड़, हिन्दी एवं अंग्रेजी में तुरंत ध्वनि सारांश उपलब्ध होता है।'
                : 'Instant spoken audio verdicts in Kannada, Hindi, and English.'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Desk Checks & Direct Link to Full Archive */}
      <div className="bg-[#eff4ff] p-4 rounded-2xl border border-[#d3e4fe] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-[#4059aa] flex items-center justify-center shadow-xs flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">newspaper</span>
          </div>
          <div className="flex flex-col">
            <span className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#0b1c30]">
              {currentLang === 'kn'
                ? 'ವೈರಲ್ ಸುದ್ದಿ ದಾಖಲೆಗಳ ಪಟ್ಟಿ (Viral Debunk Archive)'
                : currentLang === 'hi'
                ? 'वायरल फर्जी खबरों का संग्रह (Viral Debunk Archive)'
                : 'Viral Rumors & Debunk Archive'}
            </span>
            <span className="text-xs text-[#45464d]">
              {currentLang === 'kn'
                ? 'ವಾಟ್ಸಾಪ್ ಸಂದೇಶಗಳು, ಸುತ್ತೋಲೆಗಳು ಮತ್ತು ತನಿಖೆ ಮಾಡಲಾದ ಸುದ್ದಿಗಳನ್ನು ವೀಕ್ಷಿಸಿ.'
                : currentLang === 'hi'
                ? 'व्हाट्सएप पर वायरल हुए फर्जी दावों और खंडन संदेशों की पूरी सूची।'
                : 'Explore all community fact-checks and WhatsApp counter-debunk notes.'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onViewAllTrending}
          className="h-10 px-4 rounded-xl bg-[#000000] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#131b2e] transition-all flex-shrink-0 cursor-pointer active:scale-95"
        >
          <span>
            {currentLang === 'kn'
              ? 'ದಾಖಲೆಗಳ ಪಟ್ಟಿ ನೋಡಿ'
              : currentLang === 'hi'
              ? 'आर्काइव देखें'
              : 'Browse Archive'}
          </span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </button>
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
