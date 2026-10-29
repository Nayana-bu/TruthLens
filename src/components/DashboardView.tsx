import React, { useState, useRef } from 'react';
import type { ClaimDossier, Language, SubmissionMode, InvestigationStatistics } from '../types';
import { speakText, stopSpeech } from '../utils/speechEngine';
import { ReportFakeNewsModal } from './ReportFakeNewsModal';

interface DashboardViewProps {
  currentLang: Language;
  activeDossier: ClaimDossier | null;
  allDossiers: ClaimDossier[];
  statistics?: InvestigationStatistics;
  onSelectDossier: (dossier: ClaimDossier) => void;
  onStartInvestigation: (claimText: string, mode: SubmissionMode, imageBase64?: string) => void;
  onDeleteDossier?: (id: string) => void;
  onEditDossier?: (id: string, newClaim: string) => Promise<{ success: boolean; dossier?: ClaimDossier; error?: string }>;
  isInvestigating: boolean;
  investigationStatusMessage?: string;
  onOpenAuthorities: () => void;
  onViewAllTrending: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentLang,
  activeDossier,
  allDossiers,
  statistics,
  onSelectDossier,
  onStartInvestigation,
  onDeleteDossier,
  onEditDossier,
  isInvestigating,
  investigationStatusMessage,
  onOpenAuthorities,
  onViewAllTrending,
}) => {
  const [submissionMode, setSubmissionMode] = useState<SubmissionMode>('text');
  const [inputText, setInputText] = useState('');
  const [activeSpeechLang, setActiveSpeechLang] = useState<Language | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Trending cards: three-dot menu and modal states
  const [openMenuCardId, setOpenMenuCardId] = useState<string | null>(null);
  const [editingCardDossier, setEditingCardDossier] = useState<ClaimDossier | null>(null);
  const [editClaimText, setEditClaimText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [deletingCardDossier, setDeletingCardDossier] = useState<ClaimDossier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const exampleClaims = [
    'Narendra modi is not a prime minister of India',
    'Free 500GB data scheme',
    'Solar probe findings',
    'New tax waiver scheme',
    'Breaking news about bank closure',
  ];

  const handleInvestigateClick = () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      if (activeDossier?.originalClaim) {
        onStartInvestigation(activeDossier.originalClaim, submissionMode);
      }
      return;
    }
    onStartInvestigation(trimmed, submissionMode);
  };

  const handleExampleClick = (example: string) => {
    setInputText(example);
    // Find matching dossier or run investigation
    const matched = allDossiers.find(
      (d) =>
        d.title.toLowerCase().includes(example.toLowerCase()) ||
        d.originalClaim.toLowerCase().includes(example.toLowerCase())
    );
    if (matched) {
      onSelectDossier(matched);
    } else {
      onStartInvestigation(example, 'text');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSubmissionMode('ocr');
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setInputText(`[Screenshot attached: ${file.name}] Extract viral claims`);
        onStartInvestigation(`[Screenshot attached: ${file.name}]`, 'ocr', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePlayVoice = (lang: Language) => {
    if (!activeDossier) return;
    if (isSpeaking && activeSpeechLang === lang) {
      stopSpeech();
      setIsSpeaking(false);
      setActiveSpeechLang(null);
      return;
    }

    stopSpeech();
    setActiveSpeechLang(lang);
    setIsSpeaking(true);

    const scriptText =
      activeDossier.spokenAudioScript?.[lang] ||
      activeDossier.debunkExplanation?.[lang] ||
      activeDossier.debunkExplanation?.en ||
      activeDossier.summary?.en;

    speakText(scriptText, lang, () => {
      setIsSpeaking(false);
      setActiveSpeechLang(null);
    });
  };

  const handleShare = () => {
    if (!activeDossier) return;
    const textToCopy = `TruthLens Verify Fact-Check: "${activeDossier.originalClaim}"\nVerdict: ${activeDossier.verdictLabel}\nDetails: ${activeDossier.summary?.en || ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  const handleScrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  const isFake = activeDossier
    ? activeDossier.clearVerdictStatus === 'FAKE' || activeDossier.verdict === 'false'
    : false;
  const isMisleading = activeDossier
    ? activeDossier.clearVerdictStatus === 'MISLEADING' || activeDossier.verdict === 'misleading'
    : false;
  const isTrue = activeDossier
    ? activeDossier.clearVerdictStatus === 'REAL' || activeDossier.verdict === 'verified_true'
    : false;
  const isPartlyTrue = activeDossier
    ? activeDossier.clearVerdictStatus === 'PARTLY_TRUE' || activeDossier.verdict === 'partly_true'
    : false;
  const isContextMissing = activeDossier
    ? activeDossier.clearVerdictStatus === 'CONTEXT_MISSING' || activeDossier.verdict === 'context_missing'
    : false;
  const isUnverified = activeDossier
    ? activeDossier.clearVerdictStatus === 'UNVERIFIED' ||
      activeDossier.verdict === 'unverified' ||
      (!isFake && !isMisleading && !isTrue && !isPartlyTrue && !isContextMissing)
    : false;

  const getRegionalBadgeLabel = () => {
    if (!activeDossier) return '';
    if (isFake) {
      return currentLang === 'kn' ? 'ಸುಳ್ಳು ಸುದ್ದಿ' : currentLang === 'hi' ? 'फर्जी खबर' : 'Debunked False';
    }
    if (isMisleading) {
      return currentLang === 'kn' ? 'ದಾರಿತಪ್ಪಿಸುವ ಸುದ್ದಿ' : currentLang === 'hi' ? 'भ्रामक दावा' : 'Misleading Context';
    }
    if (isTrue) {
      return currentLang === 'kn' ? 'ಅಧಿಕೃತ ಸತ್ಯ' : currentLang === 'hi' ? 'सत्यापित सत्य' : 'Verified Genuine';
    }
    if (isPartlyTrue) {
      return currentLang === 'kn' ? 'ಭಾಗಶಃ ಸತ್ಯ' : currentLang === 'hi' ? 'आंशिक सत्य' : 'Partially True';
    }
    if (isContextMissing) {
      return currentLang === 'kn' ? 'ಸಂದರ್ಭದ ಕೊರತೆ' : currentLang === 'hi' ? 'संदर्भ का अभाव' : 'Missing Context';
    }
    return currentLang === 'kn' ? 'ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ' : currentLang === 'hi' ? 'अपुष्ट दावा' : 'Pending Corroboration';
  };

  return (
    <div className="w-full flex flex-col gap-6 font-['Inter']">
      {/* Hidden File Input for OCR */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Hero Title & Subtitle */}
      <div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0b1c30] tracking-tight font-['Plus_Jakarta_Sans']">
          <span className="text-[#2563eb]">
            {currentLang === 'kn' ? 'ಹಂಚಿಕೊಳ್ಳುವ ಮುನ್ನ' : currentLang === 'hi' ? 'साझा करने से पहले' : 'Verify'}
          </span>{' '}
          {currentLang === 'kn' ? 'ಪರಿಶೀಲಿಸಿ.' : currentLang === 'hi' ? 'जांचें।' : 'before you share.'}
        </h1>
        <p className="text-xs sm:text-sm text-[#64748b] mt-1 font-medium">
          {currentLang === 'kn'
            ? 'ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಗೆಜೆಟ್‌ಗಳು, ಪ್ರಾಥಮಿಕ ಮೂಲಗಳು ಮತ್ತು ಸತ್ಯಾಸತ್ಯತೆ ದಾಖಲೆಗಳೊಂದಿಗೆ ನೈಜತೆಯನ್ನು ತನಿಖೆ ನಡೆಸಿ.'
            : currentLang === 'hi'
            ? 'आधिकारिक सरकारी अभिलेखों, प्राथमिक स्रोतों एवं सत्यापित समाचार अभिलेखागारों के साथ दावों की जांच करें।'
            : 'Investigate claims with live official records, primary sources, and verified news archives.'}
        </p>
      </div>

      {/* Main 2-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* ================= LEFT / CENTER COLUMN (8 cols on lg) ================= */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* 1. CLAIM INPUT BOX */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-3.5">
            {/* Top mode tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSubmissionMode('text')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  submissionMode === 'text'
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-[#f8fafc] text-[#64748b] hover:bg-[#f1f5f9]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                <span>{currentLang === 'kn' ? 'ಪಠ್ಯ / ವಾಟ್ಸಾಪ್' : currentLang === 'hi' ? 'टेक्स्ट / व्हाट्सएप' : 'Text / WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  submissionMode === 'ocr'
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-[#f8fafc] text-[#64748b] hover:bg-[#f1f5f9]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">image</span>
                <span>{currentLang === 'kn' ? 'ಸ್ಕ್ರೀನ್‌ಶಾಟ್ / ಒಸಿಆರ್' : currentLang === 'hi' ? 'स्क्रीनशॉट / ओसीआर' : 'Screenshot / OCR'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSubmissionMode('url')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  submissionMode === 'url'
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'bg-[#f8fafc] text-[#64748b] hover:bg-[#f1f5f9]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
                <span>{currentLang === 'kn' ? 'ವೆಬ್ / ಲಿಂಕ್' : currentLang === 'hi' ? 'वेब / यूआरएल' : 'Web / URL'}</span>
              </button>
            </div>

            {/* Input Textarea & Floating Investigate Button */}
            <div className="relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={2000}
                placeholder={
                  submissionMode === 'url'
                    ? currentLang === 'kn'
                      ? 'ಸುದ್ದಿ ಲಿಂಕ್ ಅಥವಾ ಸಾಮಾಜಿಕ ಜಾಲತಾಣದ ಪೋಸ್ಟ್ URL ನಮೂದಿಸಿ...'
                      : currentLang === 'hi'
                      ? 'समाचार लिंक अथवा सोशल मीडिया पोस्ट का यूआरएल दर्ज करें...'
                      : 'Paste news article link, social media link, or viral post URL...'
                    : submissionMode === 'ocr'
                    ? currentLang === 'kn'
                      ? 'ಪರಿಶೀಲಿಸಲು ಸ್ಕ್ರೀನ್‌ಶಾಟ್ ಲಗತ್ತಿಸಿ...'
                      : currentLang === 'hi'
                      ? 'जांच के लिए स्क्रीनशॉट अपलोड करें...'
                      : 'Attach screenshot containing viral text to extract and verify...'
                    : currentLang === 'kn'
                    ? 'ಪರಿಶೀಲಿಸಲು ಯಾವುದೇ ಸುದ್ದಿ ಅಥವಾ ಸಂದೇಶವನ್ನು ಇಲ್ಲಿ ನಮೂದಿಸಿ...'
                    : currentLang === 'hi'
                    ? 'अपनी खबर, दावा या फॉरवर्ड संदेश यहां दर्ज करें...'
                    : 'Enter your news or claim text here...'
                }
                rows={3}
                className="w-full bg-[#f8fafc] focus:bg-white rounded-xl border border-[#e2e8f0] focus:border-[#2563eb] p-3 text-xs sm:text-sm text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 resize-none pr-36"
              />

              {/* Bottom Character count */}
              <div className="absolute right-40 bottom-2.5 text-[11px] font-medium text-[#94a3b8]">
                {inputText.length} / 2000
              </div>

              {/* Investigate Button positioned on right */}
              <button
                type="button"
                disabled={isInvestigating}
                onClick={handleInvestigateClick}
                className="absolute right-2.5 bottom-2.5 h-9 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 disabled:opacity-75"
              >
                {isInvestigating ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>{currentLang === 'kn' ? 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : currentLang === 'hi' ? 'जांच जारी...' : 'Checking...'}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">search</span>
                    <span>{currentLang === 'kn' ? 'ತನಿಖೆ ನಡೆಸಿ' : currentLang === 'hi' ? 'जांच करें' : 'Investigate'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Example Claims Row */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-[#64748b]">
              <span className="flex items-center gap-1 font-semibold text-[#334155]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                <span>Example claims:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {exampleClaims.map((claim, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleExampleClick(claim)}
                    className="px-2.5 py-1 rounded-lg bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1e40af] text-[11px] font-medium transition-colors cursor-pointer truncate max-w-[220px]"
                  >
                    {claim}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Investigation Banner (Shown during API inquiry) */}
          {isInvestigating && (
            <div className="bg-gradient-to-r from-[#eff6ff] to-[#e0e7ff] rounded-2xl border border-[#bfdbfe] p-4 shadow-sm flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[24px] animate-spin">sync</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#1e40af] bg-white px-2 py-0.5 rounded-md border border-[#bfdbfe]">
                    {currentLang === 'kn' ? 'ತನಿಖೆ ಪ್ರಕ್ರಿಯೆ' : currentLang === 'hi' ? 'जांच प्रक्रिया' : 'Live Investigation'}
                  </span>
                  <span className="text-[11px] text-[#475569] font-medium">
                    {investigationStatusMessage || (currentLang === 'kn' ? 'ಗೆಜೆಟ್ ಮತ್ತು ಸತ್ಯಾಸತ್ಯತೆ ಮೂಲಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : currentLang === 'hi' ? 'सरकारी गजट व तथ्य-जांच स्रोतों की पुष्टि हो रही है...' : 'Scanning gazettes, fact-checkers & primary archives...')}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#1e293b] mt-1 truncate">
                  {currentLang === 'kn' ? 'ಅಧಿಕೃತ ದಾಖಲೆಗಳೊಂದಿಗೆ ಪರಿಶೀಲನೆ ನಡೆಯುತ್ತಿದೆ' : currentLang === 'hi' ? 'आधिकारिक अभिलेखों के साथ मिलान किया जा रहा है' : 'Querying National Civic Registry, PIB Fact Check, and Google Fact Index...'}
                </p>
              </div>
            </div>
          )}

          {/* 2. INVESTIGATION RESULT CARD */}
          {!activeDossier ? (
            <div className="bg-white rounded-2xl border border-dashed border-[#cbd5e1] p-8 sm:p-12 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">search_check</span>
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-base text-[#0f172a]">
                {currentLang === 'kn' ? 'ಯಾವುದೇ ಸಕ್ರಿಯ ತನಿಖೆ ಆಯ್ಕೆಯಾಗಿಲ್ಲ' : currentLang === 'hi' ? 'कोई सक्रिय जांच चयनित नहीं है' : 'No Active Investigation Selected'}
              </h3>
              <p className="text-xs sm:text-sm text-[#64748b] max-w-md">
                {currentLang === 'kn'
                  ? 'ನೈಜ-ಸಮಯದ ಪ್ರಾಥಮಿಕ ಮೂಲಗಳು ಮತ್ತು ಅಧಿಕೃತ ಗೆಜೆಟ್‌ಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲು ಮೇಲಿನ ಇನ್‌ಪುಟ್‌ನಲ್ಲಿ ಯಾವುದೇ ಸುದ್ದಿಯ ಕ್ಲೈಮ್ ನಮೂದಿಸಿ.'
                  : currentLang === 'hi'
                  ? 'सरकारी गजट व प्राथमिक स्रोतों से जांचने के लिए ऊपर दिए गए बॉक्स में कोई खबर या दावा दर्ज करें।'
                  : 'Enter a news claim, WhatsApp message, screenshot, or URL above to run an evidence-grounded verification.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
              {/* Card header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px]">article</span>
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xs sm:text-sm text-[#0f172a]">
                    {currentLang === 'kn' ? 'ತನಿಖಾ ವರದಿ' : currentLang === 'hi' ? 'जांच परिणाम' : 'Investigation Result'}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#64748b]">
                  <span className="text-[11px]">{activeDossier.timeAgo || 'Verified recently'}</span>
                  <button
                    type="button"
                    onClick={handleShare}
                    title="Share Debunk"
                    className="hover:text-[#0f172a] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {copiedShare ? 'check' : 'share'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    title="More actions / Report"
                    className="hover:text-[#0f172a] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                  </button>
                </div>
              </div>

            {/* Verdict Badges Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {isFake ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#dc2626] text-white font-['Plus_Jakarta_Sans'] font-extrabold text-xs tracking-wider uppercase shadow-xs">
                    <span className="material-symbols-outlined text-[15px]">cancel</span>
                    <span>FAKE NEWS</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#fee2e2] text-[#b91c1c] text-xs font-bold">
                    {getRegionalBadgeLabel()}
                  </span>
                </>
              ) : isMisleading ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#d97706] text-white font-['Plus_Jakarta_Sans'] font-extrabold text-xs tracking-wider uppercase shadow-xs">
                    <span className="material-symbols-outlined text-[15px]">warning</span>
                    <span>MISLEADING</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#fef3c7] text-[#92400e] text-xs font-bold">
                    {getRegionalBadgeLabel()}
                  </span>
                </>
              ) : isPartlyTrue ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#ea580c] text-white font-['Plus_Jakarta_Sans'] font-extrabold text-xs tracking-wider uppercase shadow-xs">
                    <span className="material-symbols-outlined text-[15px]">published_with_changes</span>
                    <span>PARTLY TRUE</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#ffedd5] text-[#c2410c] text-xs font-bold">
                    {getRegionalBadgeLabel()}
                  </span>
                </>
              ) : isContextMissing ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#7c3aed] text-white font-['Plus_Jakarta_Sans'] font-extrabold text-xs tracking-wider uppercase shadow-xs">
                    <span className="material-symbols-outlined text-[15px]">info</span>
                    <span>CONTEXT MISSING</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#ede9fe] text-[#6d28d9] text-xs font-bold">
                    {getRegionalBadgeLabel()}
                  </span>
                </>
              ) : isTrue ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#16a34a] text-white font-['Plus_Jakarta_Sans'] font-extrabold text-xs tracking-wider uppercase shadow-xs">
                    <span className="material-symbols-outlined text-[15px]">check_circle</span>
                    <span>TRUE NEWS</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#dcfce7] text-[#15803d] text-xs font-bold">
                    {getRegionalBadgeLabel()}
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#475569] text-white font-['Plus_Jakarta_Sans'] font-extrabold text-xs tracking-wider uppercase shadow-xs">
                    <span className="material-symbols-outlined text-[15px]">help</span>
                    <span>UNVERIFIED</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#f1f5f9] text-[#334155] text-xs font-bold">
                    {getRegionalBadgeLabel()}
                  </span>
                </>
              )}

              {/* Evidence Strength & Score badge */}
              {activeDossier.evidenceAnalysis?.evidenceStrengthLabel && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md border bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]">
                  {activeDossier.evidenceAnalysis.evidenceStrengthLabel}
                </span>
              )}
              {activeDossier.confidenceScore && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                  isUnverified
                    ? 'bg-[#f8fafc] text-[#64748b] border-[#cbd5e1]'
                    : 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]'
                }`}>
                  {isUnverified
                    ? (currentLang === 'kn' ? 'ಸಾಕ್ಷ್ಯಾಧಾರ ಅಪೂರ್ಣ' : currentLang === 'hi' ? 'अपुष्ट साक्ष्य' : 'Insufficient Evidence')
                    : `${activeDossier.confidenceScore}% ${currentLang === 'kn' ? 'ಸಾಕ್ಷ್ಯ ಅಂಕ' : currentLang === 'hi' ? 'साक्ष्य अंक' : 'Evidence Score'}`}
                </span>
              )}

              {/* Report Fake News Button right in header if fake */}
              {isFake && (
                <button
                  type="button"
                  onClick={() => setShowReportModal(true)}
                  className="ml-auto text-[11px] font-bold text-[#dc2626] hover:bg-[#fee2e2] px-2.5 py-1 rounded-lg border border-[#fecaca] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">flag</span>
                  <span>{currentLang === 'kn' ? 'ನಕಲಿ ಸುದ್ದಿ ವರದಿ ಮಾಡಿ' : currentLang === 'hi' ? 'फर्जी खबर रिपोर्ट करें' : 'Report Fake News'}</span>
                </button>
              )}
            </div>

            {/* Main Claim Headline */}
            <h2 className="font-['Plus_Jakarta_Sans'] font-extrabold text-lg sm:text-xl text-[#0f172a] leading-snug">
              {activeDossier.originalClaim || activeDossier.title}
            </h2>

            {/* Multilingual Explanation text */}
            <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
              {activeDossier.debunkExplanation?.[currentLang] ||
                activeDossier.summary?.[currentLang] ||
                activeDossier.debunkExplanation?.en ||
                activeDossier.summary?.en ||
                'Official cross-examination confirms this claim is entirely fabricated. No gazette record, press release, or ministry order exists to corroborate this viral message.'}
            </p>

            {/* Listen to explanation controls */}
            <div className="pt-2 flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-[#334155] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#2563eb]">
                  volume_up
                </span>
                <span>Listen to explanation:</span>
              </span>

              <div className="flex items-center gap-2">
                {/* English */}
                <button
                  type="button"
                  onClick={() => handlePlayVoice('en')}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    activeSpeechLang === 'en' && isSpeaking
                      ? 'bg-[#2563eb] text-white border-[#2563eb] animate-pulse'
                      : 'bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] border-[#bfdbfe]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">volume_up</span>
                  <span>English</span>
                </button>

                {/* Kannada */}
                <button
                  type="button"
                  onClick={() => handlePlayVoice('kn')}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    activeSpeechLang === 'kn' && isSpeaking
                      ? 'bg-[#dc2626] text-white border-[#dc2626] animate-pulse'
                      : 'bg-[#fef2f2] hover:bg-[#fee2e2] text-[#dc2626] border-[#fecaca]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">volume_up</span>
                  <span>ಕನ್ನಡ</span>
                </button>

                {/* Hindi */}
                <button
                  type="button"
                  onClick={() => handlePlayVoice('hi')}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    activeSpeechLang === 'hi' && isSpeaking
                      ? 'bg-[#dc2626] text-white border-[#dc2626] animate-pulse'
                      : 'bg-[#fef2f2] hover:bg-[#fee2e2] text-[#dc2626] border-[#fecaca]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">volume_up</span>
                  <span>हिंदी</span>
                </button>
              </div>
            </div>
          </div>
        )}

          {/* 3. OFFICIAL EVIDENCES & SOURCES */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                </div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xs sm:text-sm text-[#0f172a]">
                  Official Evidences & Sources ({activeDossier?.sources?.length || 0})
                </h3>
              </div>

              <button
                type="button"
                onClick={onOpenAuthorities}
                className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View All</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>

            {/* Dynamic sources grid */}
            {activeDossier && activeDossier.sources && activeDossier.sources.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {activeDossier.sources.slice(0, 6).map((src, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] flex flex-col justify-between gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#e2e8f0] flex items-center justify-center text-[#1e293b]">
                        <span className="material-symbols-outlined text-[18px]">
                          {src.isPrimary ? 'account_balance' : 'newspaper'}
                        </span>
                      </div>
                      <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#0f172a] leading-tight line-clamp-1">
                        {src.name}
                      </h4>
                      <span className={`inline-block self-start px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        src.status === 'confirmed' || src.status === 'corroborated'
                          ? 'bg-[#dcfce7] text-[#15803d]'
                          : src.status === 'refuted' || src.status === 'contradicted'
                          ? 'bg-[#fee2e2] text-[#b91c1c]'
                          : 'bg-[#eff6ff] text-[#1e40af]'
                      }`}>
                        {src.category || 'Corroboration'}
                      </span>
                      <p className="text-[11px] text-[#64748b] leading-snug line-clamp-3">
                        {src.details}
                      </p>
                    </div>

                    {src.url ? (
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-semibold text-[#2563eb] hover:underline flex items-center gap-1"
                      >
                        <span>Visit official source</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#94a3b8] italic">Official registry reference</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#94a3b8] flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[24px] text-[#cbd5e1]">travel_explore</span>
                <span>{currentLang === 'kn' ? 'ಯಾವುದೇ ಮೂಲಗಳು ದಾಖಲಾಗಿಲ್ಲ' : currentLang === 'hi' ? 'कोई स्रोत रिकॉर्ड नहीं है' : 'No sources to display yet. Run an investigation to retrieve corroborating records.'}</span>
              </div>
            )}
          </div>

          {/* 4. TRENDING VERIFICATIONS HORIZONTAL CAROUSEL */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xs sm:text-sm text-[#0f172a]">
                  Trending Verifications
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onViewAllTrending}
                  className="text-xs font-bold text-[#2563eb] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span>View All</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Horizontal scroll container with right arrow button */}
            <div className="relative">
              {allDossiers.length > 0 ? (
                <div
                  ref={carouselRef}
                  className="flex items-stretch gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth"
                >
                  {allDossiers.slice(0, 6).map((dossier, idx) => {
                    const isItemFake =
                      dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false';
                    const isItemMisleading =
                      dossier.clearVerdictStatus === 'MISLEADING' ||
                      dossier.verdict === 'misleading';
                    const isItemTrue =
                      dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true';
                    const isItemPartly =
                      dossier.clearVerdictStatus === 'PARTLY_TRUE' || dossier.verdict === 'partly_true';
                    const isItemContext =
                      dossier.clearVerdictStatus === 'CONTEXT_MISSING' || dossier.verdict === 'context_missing';

                    const badgeClass = isItemFake
                      ? 'bg-[#fee2e2] text-[#dc2626]'
                      : isItemMisleading
                      ? 'bg-[#fef3c7] text-[#d97706]'
                      : isItemPartly
                      ? 'bg-[#ffedd5] text-[#ea580c]'
                      : isItemContext
                      ? 'bg-[#ede9fe] text-[#7c3aed]'
                      : isItemTrue
                      ? 'bg-[#dcfce7] text-[#16a34a]'
                      : 'bg-[#f1f5f9] text-[#475569]';

                    const badgeLabel = isItemFake
                      ? 'FAKE'
                      : isItemMisleading
                      ? 'MISLEADING'
                      : isItemPartly
                      ? 'PARTLY'
                      : isItemContext
                      ? 'CONTEXT'
                      : isItemTrue
                      ? 'TRUE'
                      : 'UNVERIFIED';

                    return (
                      <div
                        key={dossier.id || idx}
                        onClick={() => onSelectDossier(dossier)}
                        className={`min-w-[210px] sm:min-w-[220px] max-w-[220px] p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          activeDossier?.id === dossier.id
                            ? 'border-[#2563eb] bg-[#eff6ff]/60 shadow-xs ring-1 ring-[#2563eb]'
                            : 'border-[#e2e8f0] bg-[#f8fafc] hover:bg-white hover:border-[#cbd5e1]'
                        }`}
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between relative">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${badgeClass}`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {badgeLabel}
                            </span>

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-[#94a3b8]">{dossier.timeAgo}</span>
                              <div className="relative">
                                <button
                                  type="button"
                                  title="Investigation options"
                                  aria-label="Investigation options"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenMenuCardId(openMenuCardId === dossier.id ? null : dossier.id);
                                  }}
                                  className="w-6 h-6 rounded-md hover:bg-[#e2e8f0]/80 text-[#64748b] hover:text-[#0f172a] flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[17px]">more_vert</span>
                                </button>

                                {/* Dropdown Menu */}
                                {openMenuCardId === dossier.id && (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-7 z-30 w-44 bg-white rounded-xl shadow-lg border border-[#e2e8f0] py-1 text-xs animate-in fade-in duration-100"
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuCardId(null);
                                        setEditingCardDossier(dossier);
                                        setEditClaimText(dossier.originalClaim || dossier.title);
                                        setEditError(null);
                                      }}
                                      className="w-full px-3 py-2 text-left font-semibold text-[#334155] hover:bg-[#eff6ff] hover:text-[#2563eb] flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">edit_note</span>
                                      <span>Edit Investigation</span>
                                    </button>
                                    <div className="h-[1px] bg-[#f1f5f9] my-0.5" />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuCardId(null);
                                        setDeletingCardDossier(dossier);
                                      }}
                                      className="w-full px-3 py-2 text-left font-semibold text-[#dc2626] hover:bg-[#fef2f2] flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <span className="material-symbols-outlined text-[16px]">delete</span>
                                      <span>Delete Investigation</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#0f172a] line-clamp-2 leading-tight">
                            {dossier.title}
                          </h4>

                          <p className="text-[11px] text-[#64748b] line-clamp-2 leading-snug">
                            {dossier.summary?.en || dossier.verdictSubtitle}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#94a3b8] flex flex-col items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[24px] text-[#cbd5e1]">history_edu</span>
                  <span>{currentLang === 'kn' ? 'ಯಾವುದೇ ತನಿಖೆಗಳು ದಾಖಲಾಗಿಲ್ಲ. ಹೊಸ ತನಿಖೆಗಳು ಇಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತವೆ.' : currentLang === 'hi' ? 'कोई जांच अभी सुरक्षित नहीं है। नई जांचें यहां प्रदर्शित होंगी।' : 'No saved investigations yet. Newly verified claims will appear here.'}</span>
                </div>
              )}

              {/* Next arrow icon button on right */}
              {allDossiers.length > 2 && (
                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-md border border-[#e2e8f0] text-[#0f172a] hover:bg-[#f8fafc] flex items-center justify-center transition-all cursor-pointer z-10"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (4 cols on lg) ================= */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* 1. OVERALL STATS CARD: Real Database Statistics */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">public</span>
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl text-[#0f172a] leading-none">
                    {(statistics?.total ?? 0).toLocaleString()}
                  </h3>
                  <span className="text-[11px] font-medium text-[#64748b]">
                    {currentLang === 'kn' ? 'ಪರಿಶೀಲಿಸಿದ ಒಟ್ಟು ಕ್ಲೈಮ್‌ಗಳು' : currentLang === 'hi' ? 'कुल सत्यापित दावे' : 'Claims verified so far'}
                  </span>
                </div>
              </div>

              {/* Trend indicator */}
              <div className="flex items-center text-[#16a34a] text-xs font-bold gap-0.5">
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
              </div>
            </div>

            {/* 2x2 Breakdown grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#f1f5f9] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#dcfce7] text-[#16a34a] flex items-center justify-center text-[12px] font-bold">
                  ✓
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-[#0f172a]">{statistics?.truePercent ?? 0}%</span>
                  <span className="text-[10px] text-[#64748b]">True Claims</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#f1f5f9] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#fee2e2] text-[#dc2626] flex items-center justify-center text-[12px] font-bold">
                  ✕
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-[#0f172a]">{statistics?.fakePercent ?? 0}%</span>
                  <span className="text-[10px] text-[#64748b]">Fake Claims</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#f1f5f9] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#fef3c7] text-[#d97706] flex items-center justify-center text-[12px] font-bold">
                  !
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-[#0f172a]">{statistics?.misleadingPercent ?? 0}%</span>
                  <span className="text-[10px] text-[#64748b]">Misleading</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#f1f5f9] flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#eff6ff] text-[#2563eb] flex items-center justify-center text-[12px] font-bold">
                  ?
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-[#0f172a]">{statistics?.unverifiedPercent ?? 0}%</span>
                  <span className="text-[10px] text-[#64748b]">Unverified</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SUMMARY CARD */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-2.5">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#f1f5f9]">
              <div className="w-5 h-5 rounded bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                <span className="material-symbols-outlined text-[15px]">description</span>
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#0f172a]">
                {currentLang === 'kn' ? 'ಸಾರಾಂಶ' : currentLang === 'hi' ? 'सारांश' : 'Summary'}
              </h3>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              {activeDossier
                ? (activeDossier.summary?.[currentLang] ||
                   activeDossier.summary?.en ||
                   activeDossier.debunkExplanation?.[currentLang] ||
                   activeDossier.debunkExplanation?.en ||
                   'Evidence-backed investigation completed. Review sources below.')
                : (currentLang === 'kn'
                    ? 'ಯಾವುದೇ ಸಕ್ರಿಯ ತನಿಖೆ ಆಯ್ಕೆಯಾಗಿಲ್ಲ. ಸಾರಾಂಶಕ್ಕಾಗಿ ಕ್ಲೈಮ್ ನಮೂದಿಸಿ.'
                    : currentLang === 'hi'
                    ? 'कोई सक्रिय जांच चयनित नहीं है। सारांश हेतु दावा दर्ज करें।'
                    : 'No active claim investigated yet. Enter news or a claim above to generate an evidence-backed summary.')}
            </p>
          </div>

          {/* 3. KEY FINDINGS CARD */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-2.5">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#f1f5f9]">
              <div className="w-5 h-5 rounded bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                <span className="material-symbols-outlined text-[15px]">build</span>
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#0f172a]">
                {currentLang === 'kn' ? 'ಪ್ರಮುಖ ಸಂಶೋಧನೆಗಳು' : currentLang === 'hi' ? 'प्रमुख निष्कर्ष' : 'Key Findings'}
              </h3>
            </div>

            {activeDossier ? (
              <ul className="space-y-2 text-xs text-[#334155]">
                {(activeDossier.redFlags && activeDossier.redFlags.length > 0
                  ? activeDossier.redFlags
                  : isFake
                  ? [
                      currentLang === 'kn' ? 'ಯಾವುದೇ ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಗೆಜೆಟ್ ಅಧಿಸೂಚನೆ ಲಭ್ಯವಿಲ್ಲ' : currentLang === 'hi' ? 'कोई आधिकारिक सरकारी गजट अधिसूचना नहीं मिली' : 'No official gazette notification supports this claim',
                      currentLang === 'kn' ? 'ಸಂಬಂಧಿತ ಸಚಿವಾಲಯದಿಂದ ಯಾವುದೇ ಪತ್ರಿಕಾ ಪ್ರಕಟಣೆ ಇಲ್ಲ' : currentLang === 'hi' ? 'मंत्रालय या विभाग द्वारा कोई आधिकारिक आदेश नहीं' : 'No press release or ministry order found',
                      currentLang === 'kn' ? 'ವೈರಲ್ ಸಂದೇಶದಲ್ಲಿ ಅಸಂಗತ ಫಾಂಟ್ ಮತ್ತು ಸ್ವರೂಪ ಕಂಡುಬಂದಿದೆ' : currentLang === 'hi' ? 'गलत फॉन्ट और प्रारूप विसंगतियां पाई गईं' : 'Inconsistent font and missing government format',
                      currentLang === 'kn' ? 'ಚಿತ್ರ ಅಥವಾ ಪಠ್ಯ ಎಡಿಟ್ ಮಾಡಿರುವುದು ಪತ್ತೆಯಾಗಿದೆ' : currentLang === 'hi' ? 'वायरल संदेश/छवि में हेरफेर पाया गया' : 'Viral image or text appears to be manipulated',
                    ]
                  : [
                      currentLang === 'kn' ? 'ಅಧಿಕೃತ ಮೂಲಗಳಿಂದ ದೃಢೀಕರಿಸಲ್ಪಟ್ಟಿದೆ' : currentLang === 'hi' ? 'आधिकारिक अभिलेखों से पुष्टि की गई' : 'Corroborated by primary agency bulletins',
                      currentLang === 'kn' ? 'ನೈಜ ದಾಖಲೆಗಳು ಮತ್ತು ಪ್ರಕಟಣೆಗಳು ಪರಿಶೀಲನೆಗೊಂಡಿವೆ' : currentLang === 'hi' ? 'वास्तविक रिकॉर्ड व प्रेस नोट सत्यापित' : 'Genuine press releases and order documents verified',
                    ]
                ).map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 ${
                      isFake ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#dcfce7] text-[#16a34a]'
                    }`}>
                      {isFake ? '✕' : '✓'}
                    </span>
                    <span className="leading-snug">{finding}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#94a3b8] italic">
                {currentLang === 'kn' ? 'ತನಿಖೆಯ ನಂತರ ಸಾಕ್ಷ್ಯಾಧಾರ ಸಂಶೋಧನೆಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.' : currentLang === 'hi' ? 'जांच के बाद साक्ष्य निष्कर्ष यहां दिखाई देंगे।' : 'Key findings will appear here once an investigation is run.'}
              </p>
            )}
          </div>

          {/* 4. RELATED TOPICS CARD */}
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-4 sm:p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-2.5">
            <div className="flex items-center gap-2 pb-1.5 border-b border-[#f1f5f9]">
              <div className="w-5 h-5 rounded bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                <span className="material-symbols-outlined text-[15px]">sell</span>
              </div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-[#0f172a]">
                {currentLang === 'kn' ? 'ಸಂಬಂಧಿತ ವಿಷಯಗಳು' : currentLang === 'hi' ? 'संबंधित विषय' : 'Related Topics'}
              </h3>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              {[
                activeDossier?.sourceEntity || 'Fact Check',
                activeDossier?.category ? activeDossier.category.toUpperCase() : 'CIVIC INTEGRITY',
                'Government Verification',
                'Viral Media',
                'Official Record',
              ].map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-[#eff6ff] text-[#1e40af] text-[11px] font-medium border border-[#dbeafe]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Global backdrop for open card dropdown menus */}
      {openMenuCardId !== null && (
        <div
          className="fixed inset-0 z-20 cursor-default"
          onClick={() => setOpenMenuCardId(null)}
        />
      )}

      {/* Report Fake News Modal */}
      {showReportModal && activeDossier && (
        <ReportFakeNewsModal
          dossier={activeDossier}
          onClose={() => setShowReportModal(false)}
          currentLang={currentLang}
        />
      )}

      {/* Edit Investigation Modal */}
      {editingCardDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-lg w-full p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#f1f5f9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#eff6ff] text-[#2563eb] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">edit_note</span>
                </div>
                <div>
                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#0f172a]">
                    Edit Investigation
                  </h3>
                  <p className="text-[11px] text-[#64748b]">
                    Update the claim to re-verify against live web evidence
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => {
                  setEditingCardDossier(null);
                  setEditError(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-[#f1f5f9] text-[#64748b] flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Existing claim preview */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                Original Claim
              </span>
              <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs text-[#334155] leading-relaxed select-none">
                {editingCardDossier.originalClaim || editingCardDossier.title}
              </div>
            </div>

            {/* Editable claim input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#0f172a] uppercase tracking-wider">
                  Modified News Claim / Statement
                </label>
                <span className="text-[10px] text-[#94a3b8]">
                  {editClaimText.length} / 2000
                </span>
              </div>
              <textarea
                value={editClaimText}
                onChange={(e) => setEditClaimText(e.target.value)}
                maxLength={2000}
                rows={4}
                disabled={isSavingEdit}
                placeholder="Enter modified news claim or viral text..."
                className="w-full bg-[#f8fafc] focus:bg-white rounded-xl border border-[#cbd5e1] focus:border-[#2563eb] p-3 text-xs text-[#0f172a] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 resize-none disabled:bg-[#f1f5f9]"
              />
            </div>

            {/* Re-verification informative banner */}
            <div className="p-3 rounded-xl bg-[#eff6ff] border border-[#bfdbfe] flex items-start gap-2.5 text-xs text-[#1e40af]">
              <span className="material-symbols-outlined text-[18px] flex-shrink-0 mt-0.5 text-[#2563eb]">
                info
              </span>
              <p className="leading-snug text-[11px]">
                Modifying the claim marks previous conclusions as outdated and immediately runs a full live web search, RAG retrieval, and official evidence verification.
              </p>
            </div>

            {/* Error banner */}
            {editError && (
              <div className="p-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] flex items-center gap-2 text-xs text-[#b91c1c]">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">
                  error
                </span>
                <span className="leading-snug">{editError}</span>
              </div>
            )}

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f1f5f9]">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={() => {
                  setEditingCardDossier(null);
                  setEditError(null);
                }}
                className="px-4 py-2 rounded-xl border border-[#e2e8f0] hover:bg-[#f8fafc] text-xs font-semibold text-[#475569] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSavingEdit}
                onClick={async () => {
                  const trimmed = editClaimText.trim();
                  if (!trimmed || trimmed.length < 3) {
                    setEditError('Please enter a valid news claim of at least 3 characters.');
                    return;
                  }

                  setIsSavingEdit(true);
                  setEditError(null);

                  try {
                    if (onEditDossier) {
                      const res = await onEditDossier(editingCardDossier.id, trimmed);
                      if (res.success) {
                        setEditingCardDossier(null);
                        setToastNotification('Investigation updated and re-verified successfully.');
                        setTimeout(() => setToastNotification(null), 4000);
                      } else {
                        setEditError(res.error || 'Re-verification failed. Result needs verification.');
                      }
                    } else {
                      setEditError('Edit verification service is not connected.');
                    }
                  } catch (err: any) {
                    setEditError(err?.message || 'Re-verification failed. Result needs verification.');
                  } finally {
                    setIsSavingEdit(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-75"
              >
                {isSavingEdit ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                    <span>Re-verifying with live evidence...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">check</span>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Investigation Confirmation Modal */}
      {deletingCardDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-2xl max-w-md w-full p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-sm text-[#0f172a]">
                  Delete Investigation
                </h3>
                <p className="text-xs font-medium text-[#b91c1c] mt-0.5">
                  Are you sure you want to delete this investigation?
                </p>
              </div>
            </div>

            {/* Claim details */}
            <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col gap-1">
              <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-wider">
                Claim
              </span>
              <p className="text-xs font-semibold text-[#0f172a] line-clamp-2">
                {deletingCardDossier.title}
              </p>
            </div>

            <p className="text-[11px] text-[#64748b] leading-relaxed">
              This will permanently remove the investigation and its evidence dossier from the database, history, and trending records. This action cannot be undone.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f1f5f9]">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingCardDossier(null)}
                className="px-4 py-2 rounded-xl border border-[#e2e8f0] hover:bg-[#f8fafc] text-xs font-semibold text-[#475569] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    if (onDeleteDossier) {
                      await onDeleteDossier(deletingCardDossier.id);
                    }
                    setDeletingCardDossier(null);
                    setToastNotification('Investigation deleted successfully.');
                    setTimeout(() => setToastNotification(null), 4000);
                  } catch (err) {
                    console.error('Failed to delete investigation:', err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-75"
              >
                {isDeleting ? (
                  <>
                    <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-[#334155] animate-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-[#22c55e] text-[20px]">check_circle</span>
          <span className="text-xs font-semibold">{toastNotification}</span>
          <button
            type="button"
            onClick={() => setToastNotification(null)}
            className="text-[#94a3b8] hover:text-white transition-colors cursor-pointer ml-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
};
