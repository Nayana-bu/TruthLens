import React, { useState } from 'react';
import { ClaimDossier, Language } from '../types';

interface ReportFakeNewsModalProps {
  dossier: ClaimDossier;
  onClose: () => void;
  currentLang: Language;
}

export const ReportFakeNewsModal: React.FC<ReportFakeNewsModalProps> = ({
  dossier,
  onClose,
  currentLang,
}) => {
  const [authority, setAuthority] = useState<
    'cybercrime' | 'cert_in' | 'pib' | 'karnataka_factcheck' | 'rbi_sachet' | 'whatsapp'
  >('cybercrime');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [sourceNumberOrUrl, setSourceNumberOrUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claimId: dossier.id,
          claimTitle: dossier.title,
          originalClaim: dossier.originalClaim,
          authority,
          sourceNumberOrUrl: sourceNumberOrUrl.trim() || undefined,
          incidentDetails: incidentDetails.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.ticketId) {
        setTicketId(data.ticketId);
        setIsSubmitted(true);
      } else {
        throw new Error(data.error || 'Failed to file report');
      }
    } catch (err: any) {
      console.error('Report submission failed:', err);
      setErrorMessage(
        currentLang === 'kn'
          ? 'ವರದಿ ಕಳುಹಿಸುವಾಗ ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಪುನಃ ಪ್ರಯತ್ನಿಸಿ.'
          : currentLang === 'hi'
          ? 'रिपोर्ट दर्ज करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
          : 'Unable to submit report. Please check your connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 border border-[#e5eeff] animate-in fade-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[24px] text-[#ba1a1a]">
              report_problem
            </span>
            <div>
              <h3 className="font-['Plus Jakarta Sans'] font-bold text-base sm:text-lg text-[#0b1c30]">
                {currentLang === 'kn'
                  ? 'ಸುಳ್ಳು ಸುದ್ದಿ ವರದಿ ಮಾಡಿ'
                  : currentLang === 'hi'
                  ? 'फर्जी खबर की रिपोर्ट करें'
                  : 'Report Fake News to Authorities'}
              </h3>
              <span className="text-[11px] text-[#76777d]">
                National Cyber Crime & Fact-Check Portal Dispatch
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-[#76777d] hover:text-[#0b1c30] hover:bg-[#e5eeff] flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {isSubmitted ? (
          /* Real Backend-Confirmed Receipt */
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#ecfdf5] border-2 border-[#10b981] flex items-center justify-center text-[#059669]">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            
            <div>
              <h4 className="font-['Plus Jakarta Sans'] font-extrabold text-lg text-[#0b1c30]">
                {currentLang === 'kn'
                  ? 'ಸುಳ್ಳು ಸುದ್ದಿ ವರದಿ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ!'
                  : currentLang === 'hi'
                  ? 'फर्जी खबर की रिपोर्ट सफलतापूर्वक दर्ज हुई!'
                  : 'Fake News Report Confirmed!'}
              </h4>
              <p className="text-xs text-[#45464d] mt-1 max-w-sm">
                {currentLang === 'kn'
                  ? 'ಈ ನಕಲಿ ಸಂದೇಶ ಮತ್ತು ವರದಿ ವಿವರಗಳನ್ನು ಪರಿಶೀಲನೆಗಾಗಿ ರವಾನಿಸಲಾಗಿದೆ.'
                  : currentLang === 'hi'
                  ? 'इस फर्जी दावे और विवरण को जांच व कार्रवाई हेतु प्रेषित कर दिया गया है।'
                  : 'The claim payload and source vectors have been recorded in the central audit registry for takedown review.'}
              </p>
            </div>

            <div className="bg-[#f8f9ff] p-3 rounded-xl border border-[#d3e4fe] w-full text-left space-y-1.5 my-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#76777d]">Official Case ID:</span>
                <span className="font-mono font-bold text-[#0b1c30] bg-[#e5eeff] px-2 py-0.5 rounded">{ticketId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#76777d]">Claim Reported:</span>
                <span className="font-medium text-[#0b1c30] truncate max-w-[220px]">{dossier.originalClaim || dossier.title}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#76777d]">Target Agency:</span>
                <span className="font-semibold text-[#16a34a]">
                  {authority === 'cybercrime'
                    ? 'National Cyber Crime Reporting Portal (cybercrime.gov.in • 1930)'
                    : authority === 'cert_in'
                    ? 'CERT-In Phishing Incident Cell (cert-in.org.in)'
                    : authority === 'pib'
                    ? 'PIB Fact Check Desk (factcheck.pib.gov.in)'
                    : authority === 'karnataka_factcheck'
                    ? 'Karnataka State Fact Check Unit (factcheck.karnataka.gov.in • 112)'
                    : authority === 'rbi_sachet'
                    ? 'RBI Sachet Financial Fraud Desk (sachet.rbi.org.in • 14440)'
                    : 'WhatsApp Grievance Officer & Meta Fact-Checking Desk'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-[#000000] text-white font-semibold text-xs sm:text-sm hover:bg-[#131b2e] transition-colors cursor-pointer"
            >
              {currentLang === 'kn' ? 'ಮುಕ್ತಾಯಗೊಳಿಸಿ' : currentLang === 'hi' ? 'संपन्न' : 'Done & Return'}
            </button>
          </div>
        ) : (
          /* Report Form */
          <form onSubmit={handleSubmit} className="space-y-4 mt-3">
            {/* Target Claim summary banner */}
            <div className="bg-[#fff1f2] p-3 rounded-xl border border-[#fecdd3]">
              <span className="text-[10px] font-bold uppercase text-[#e11d48] block mb-0.5">
                {currentLang === 'kn' ? 'ವರದಿ ಮಾಡಲಾಗುತ್ತಿರುವ ಸುಳ್ಳು ಸುದ್ದಿ:' : currentLang === 'hi' ? 'रिपोर्ट किया जा रहा फर्जी दावा:' : 'Targeted Fake Claim:'}
              </span>
              <p className="text-xs font-semibold text-[#0b1c30] line-clamp-2">
                "{dossier.originalClaim || dossier.title}"
              </p>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-[#fff1f2] border border-[#fecdd3] text-[#ba1a1a] rounded-lg text-xs font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Select Regulatory Agency */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#0b1c30]">
                  {currentLang === 'kn'
                    ? 'ವರದಿ ಸ್ವೀಕರಿಸಬೇಕಾದ ಅಧಿಕೃತ ಇಲಾಖೆ ಆಯ್ಕೆಮಾಡಿ:'
                    : currentLang === 'hi'
                    ? 'कार्रवाई हेतु आधिकारिक प्राधिकरण चुनें:'
                    : 'Select Official Statutory Authority for Takedown:'}
                </label>
                <span className="text-[10px] text-[#15803d] font-bold flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">verified</span>
                  Verified Government Authorities
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* 1. Cybercrime */}
                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'cybercrime' ? 'border-[#ba1a1a] bg-[#fff1f2] ring-1 ring-[#ba1a1a]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'cybercrime'}
                    onChange={() => setAuthority('cybercrime')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0b1c30]">Cyber Crime Portal</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#dcfce7] text-[#15803d] font-bold rounded">.gov.in</span>
                    </div>
                    <span className="text-[10px] text-[#45464d] block">cybercrime.gov.in • Toll-Free 1930</span>
                  </div>
                </label>

                {/* 2. PIB */}
                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'pib' ? 'border-[#ba1a1a] bg-[#fff1f2] ring-1 ring-[#ba1a1a]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'pib'}
                    onChange={() => setAuthority('pib')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0b1c30]">PIB Fact Check Unit</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#dcfce7] text-[#15803d] font-bold rounded">.gov.in</span>
                    </div>
                    <span className="text-[10px] text-[#45464d] block">factcheck.pib.gov.in • +91 87997 11259</span>
                  </div>
                </label>

                {/* 3. Karnataka State Fact Check */}
                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'karnataka_factcheck' ? 'border-[#ba1a1a] bg-[#fff1f2] ring-1 ring-[#ba1a1a]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'karnataka_factcheck'}
                    onChange={() => setAuthority('karnataka_factcheck')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0b1c30]">Karnataka Fact Check</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#dcfce7] text-[#15803d] font-bold rounded">DIPR .gov.in</span>
                    </div>
                    <span className="text-[10px] text-[#45464d] block">factcheck.karnataka.gov.in • Helpline 112</span>
                  </div>
                </label>

                {/* 4. CERT-In */}
                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'cert_in' ? 'border-[#ba1a1a] bg-[#fff1f2] ring-1 ring-[#ba1a1a]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'cert_in'}
                    onChange={() => setAuthority('cert_in')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0b1c30]">CERT-In</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#eff4ff] text-[#1d4ed8] font-bold rounded">.org.in</span>
                    </div>
                    <span className="text-[10px] text-[#45464d] block">Phishing Takedown • cert-in.org.in</span>
                  </div>
                </label>

                {/* 5. RBI Sachet */}
                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'rbi_sachet' ? 'border-[#ba1a1a] bg-[#fff1f2] ring-1 ring-[#ba1a1a]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'rbi_sachet'}
                    onChange={() => setAuthority('rbi_sachet')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0b1c30]">RBI Sachet Portal</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#eff4ff] text-[#1d4ed8] font-bold rounded">RBI</span>
                    </div>
                    <span className="text-[10px] text-[#45464d] block">sachet.rbi.org.in • Financial Fraud 14440</span>
                  </div>
                </label>

                {/* 6. WhatsApp Grievance */}
                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'whatsapp' ? 'border-[#ba1a1a] bg-[#fff1f2] ring-1 ring-[#ba1a1a]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'whatsapp'}
                    onChange={() => setAuthority('whatsapp')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[#0b1c30]">WhatsApp Grievance</span>
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#e2e8f0] text-[#334155] font-bold rounded">Meta Cell</span>
                    </div>
                    <span className="text-[10px] text-[#45464d] block">Intermediary Disinformation Grievance Desk</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Suspect Phone Number or Malicious Link */}
            <div>
              <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                {currentLang === 'kn'
                  ? 'ಸಂಶಯಾಸ್ಪದ ಲಿಂಕ್ ಅಥವಾ ಕಳುಹಿಸಿದವರ ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ):'
                  : currentLang === 'hi'
                  ? 'संदिग्ध लिंक या भेजने वाले का नंबर (वैकल्पिक):'
                  : 'Suspicious Link or Sender Phone / Group (Optional):'}
              </label>
              <input
                type="text"
                value={sourceNumberOrUrl}
                onChange={(e) => setSourceNumberOrUrl(e.target.value)}
                placeholder="e.g. pmyojana-free-5g.xyz or +91 98XXX XXXXX"
                className="w-full bg-[#eff4ff] p-2.5 rounded-lg border border-[#d3e4fe] text-xs text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:bg-white"
              />
            </div>

            {/* Additional details */}
            <div>
              <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                {currentLang === 'kn'
                  ? 'ಘಟನೆಯ ವಿವರಗಳು (ಐಚ್ಛಿಕ):'
                  : currentLang === 'hi'
                  ? 'घटना का विवरण (वैकल्पिक):'
                  : 'Incident Details (Optional):'}
              </label>
              <textarea
                value={incidentDetails}
                onChange={(e) => setIncidentDetails(e.target.value)}
                placeholder={
                  currentLang === 'kn'
                    ? 'ಈ ನಕಲಿ ಸಂದೇಶವನ್ನು ನೀವು ಎಲ್ಲಿ ಕಂಡಿದ್ದೀರಿ? (ಉದಾ: ವಾಟ್ಸಾಪ್ ಗ್ರೂಪ್, ಫೇಸ್‌ಬುಕ್)'
                    : currentLang === 'hi'
                    ? 'आपने यह खबर कहां देखी? (जैसे व्हाट्सएप ग्रुप, फेसबुक पोस्ट)'
                    : 'Where did you encounter this fake news? (e.g. WhatsApp family group, Facebook feed, SMS blast)'
                }
                rows={2}
                className="w-full bg-[#eff4ff] p-2.5 rounded-lg border border-[#d3e4fe] text-xs text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#45464d] hover:bg-[#f1f5f9] cursor-pointer"
              >
                {currentLang === 'kn' ? 'ರದ್ದುಮಾಡಿ' : currentLang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    <span>
                      {currentLang === 'kn'
                        ? 'ಅಧಿಕೃತ ವರದಿ ಸಲ್ಲಿಸಿ'
                        : currentLang === 'hi'
                        ? 'आधिकारिक रिपोर्ट भेजें'
                        : 'Submit Official Report'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
