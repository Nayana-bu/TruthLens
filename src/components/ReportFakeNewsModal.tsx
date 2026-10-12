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
  const [authority, setAuthority] = useState<'cybercrime' | 'cert_in' | 'pib' | 'whatsapp'>('cybercrime');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [sourceNumberOrUrl, setSourceNumberOrUrl] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const generatedTicket = `GOV-REPORT-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(generatedTicket);
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-5 sm:p-6 border border-[#e5eeff] animate-in fade-in zoom-in-95 duration-150 relative"
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
                Report Fake News & Scams
              </h3>
              <span className="text-[11px] text-[#76777d]">
                ಸುಳ್ಳು ಸುದ್ದಿ ವರದಿ ಮಾಡಿ • फर्जी खबर की रिपोर्ट करें
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
          /* Confirmation Receipt */
          <div className="py-6 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#ecfdf5] border-2 border-[#10b981] flex items-center justify-center text-[#059669]">
              <span className="material-symbols-outlined text-[32px]">task_alt</span>
            </div>
            
            <div>
              <h4 className="font-['Plus Jakarta Sans'] font-extrabold text-lg text-[#0b1c30]">
                Fake News Report Successfully Lodged!
              </h4>
              <p className="text-xs text-[#45464d] mt-1 max-w-sm">
                This viral claim and its transmission vector have been reported for investigation and takedown.
              </p>
            </div>

            <div className="bg-[#f8f9ff] p-3 rounded-xl border border-[#d3e4fe] w-full text-left space-y-1 my-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#76777d]">Incident Reference:</span>
                <span className="font-mono font-bold text-[#0b1c30]">{ticketId}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#76777d]">Claim Reported:</span>
                <span className="font-medium text-[#0b1c30] truncate max-w-[200px]">{dossier.title}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#76777d]">Target Registry:</span>
                <span className="font-semibold text-[#16a34a]">
                  {authority === 'cybercrime'
                    ? 'National Cyber Crime Reporting Portal'
                    : authority === 'cert_in'
                    ? 'CERT-In Phishing Incident Cell'
                    : authority === 'pib'
                    ? 'PIB Fact Check Dispatch Desk'
                    : 'WhatsApp Grievance Officer'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-[#4059aa] text-white font-semibold text-xs sm:text-sm hover:bg-[#334a91] transition-colors"
            >
              Done & Return
            </button>
          </div>
        ) : (
          /* Report Form */
          <form onSubmit={handleSubmit} className="space-y-4 mt-3">
            {/* Target Claim summary banner */}
            <div className="bg-[#fff1f2] p-3 rounded-xl border border-[#fecdd3]">
              <span className="text-[10px] font-bold uppercase text-[#e11d48] block mb-0.5">
                Targeted Fake Claim:
              </span>
              <p className="text-xs font-semibold text-[#0b1c30] line-clamp-2">
                "{dossier.originalClaim}"
              </p>
            </div>

            {/* Select Regulatory Agency */}
            <div>
              <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                Select Official Authority for Takedown:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'cybercrime' ? 'border-[#ba1a1a] bg-[#fff1f2]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'cybercrime'}
                    onChange={() => setAuthority('cybercrime')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold block text-[#0b1c30]">Cyber Crime Portal</span>
                    <span className="text-[10px] text-[#76777d]">cybercrime.gov.in</span>
                  </div>
                </label>

                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'cert_in' ? 'border-[#ba1a1a] bg-[#fff1f2]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'cert_in'}
                    onChange={() => setAuthority('cert_in')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold block text-[#0b1c30]">CERT-In</span>
                    <span className="text-[10px] text-[#76777d]">Phishing Domain Takedown</span>
                  </div>
                </label>

                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'pib' ? 'border-[#ba1a1a] bg-[#fff1f2]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'pib'}
                    onChange={() => setAuthority('pib')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold block text-[#0b1c30]">PIB Fact Check Desk</span>
                    <span className="text-[10px] text-[#76777d]">National Press Clarification</span>
                  </div>
                </label>

                <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 transition-all ${
                  authority === 'whatsapp' ? 'border-[#ba1a1a] bg-[#fff1f2]' : 'border-[#cbd5e1] hover:bg-[#f8f9ff]'
                }`}>
                  <input
                    type="radio"
                    name="authority"
                    checked={authority === 'whatsapp'}
                    onChange={() => setAuthority('whatsapp')}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-bold block text-[#0b1c30]">Social Media / WhatsApp</span>
                    <span className="text-[10px] text-[#76777d]">Grievance Officer Channel</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Suspect Phone Number or Malicious Link */}
            <div>
              <label className="text-xs font-bold text-[#0b1c30] block mb-1">
                Suspicious Link or Sender Phone/Group (Optional):
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
                Incident Description:
              </label>
              <textarea
                value={incidentDetails}
                onChange={(e) => setIncidentDetails(e.target.value)}
                placeholder="Where did you encounter this fake news? (e.g. WhatsApp family group, Facebook feed, SMS blast)"
                rows={2}
                className="w-full bg-[#eff4ff] p-2.5 rounded-lg border border-[#d3e4fe] text-xs text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#45464d] hover:bg-[#f1f5f9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#ba1a1a] hover:bg-[#93000a] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                <span>Submit Official Report</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
