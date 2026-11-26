import React from 'react';

interface GuidelinesModalProps {
  onClose: () => void;
}

export const GuidelinesModal: React.FC<GuidelinesModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-5 border border-[#e5eeff] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#4059aa]">
              verified_user
            </span>
            <h3 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30]">
              TruthLens Fact-Checking Protocol
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full text-[#76777d] hover:text-[#0b1c30] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-4 mt-4 text-xs text-[#45464d] leading-relaxed">
          <div className="p-3 bg-[#eff4ff] rounded-xl border border-[#d3e4fe]">
            <h4 className="font-bold text-[#0b1c30] text-sm mb-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#4059aa]">shield</span>
              The Constitutional Verification Standard
            </h4>
            <p>
              TruthLens operates on clinical evidentiary consensus. Claims are never marked true or false based on conjecture, but strictly grounded against live state gazettes, primary scientific releases, and regulatory dispatches.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#131b2e] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-[#0b1c30] block">Official Archive Sweep</strong>
                Every incoming claim is checked against 48 statutory portals including PIB Fact Check, Karnataka State Gazette, Telecom Cyber Cell, and RBI notifications.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#131b2e] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-[#0b1c30] block">Forensic URL & Media Inspection</strong>
                Links are evaluated for phishing domain signatures (.xyz, .site, lookalike punycode), while images are scanned for font mismatches and recycled historical signatures.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#131b2e] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-[#0b1c30] block">Multilingual Debunk Generation</strong>
                To protect non-English speaking communities, debunks are synchronized simultaneously in English, Kannada (ಕನ್ನಡ), and Hindi (हिन्दी).
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#131b2e] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                4
              </span>
              <div>
                <strong className="text-[#0b1c30] block">1-Click WhatsApp Viral Neutralizer</strong>
                Instantly copy a pre-formatted counter-debunk message designed to be posted directly into family and neighborhood WhatsApp groups.
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#f1f5f9] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#000000] text-white text-xs font-semibold hover:bg-[#131b2e]"
            >
              Understood
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
