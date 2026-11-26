import React from 'react';
import { VERIFIED_AUTHORITIES } from '../data/mockData';
import { Language } from '../types';

interface AuthorityDirectoryModalProps {
  onClose: () => void;
  currentLang?: Language;
}

export const AuthorityDirectoryModal: React.FC<AuthorityDirectoryModalProps> = ({
  onClose,
  currentLang = 'en',
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-5 sm:p-6 border border-[#e5eeff] max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#e5eeff]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#eff4ff] text-[#4059aa] flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div>
              <h3 className="font-['Plus Jakarta Sans'] font-bold text-base sm:text-lg text-[#0b1c30]">
                {currentLang === 'kn'
                  ? 'ಅಧಿಕೃತ ಸಾಕ್ಷ್ಯ ಮೂಲಗಳು ಮತ್ತು ವರದಿ ಇಲಾಖೆಗಳು'
                  : currentLang === 'hi'
                  ? 'आधिकारिक स्रोत एवं सरकारी शिकायत पोर्टल'
                  : 'Official Evidentiary Authorities & Portals'}
              </h3>
              <p className="text-xs text-[#76777d]">
                Verified Government (.gov.in / .nic.in) & IFCN Certified Desks
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full text-[#76777d] hover:text-[#0b1c30] hover:bg-[#e5eeff] flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Informational banner */}
        <div className="my-4 p-3.5 bg-[#eff4ff] border border-[#d3e4fe] rounded-xl text-xs text-[#00164e] flex items-start gap-3">
          <span className="material-symbols-outlined text-[#4059aa] text-[20px] flex-shrink-0 mt-0.5">
            gavel
          </span>
          <div className="leading-relaxed">
            <span className="font-bold block text-sm mb-0.5">
              Strict Authority Verification Standard
            </span>
            TruthLens references exclusively genuine government gazettes, statutory cyber enforcement bureaus, and International Fact-Checking Network (IFCN) certified platforms. No private blogs, unverified social handles, or anonymous forums are used for verdicts.
          </div>
        </div>

        {/* List of Verified Authorities */}
        <div className="space-y-3">
          {VERIFIED_AUTHORITIES.map((auth) => (
            <div
              key={auth.id}
              className="p-3.5 sm:p-4 rounded-xl border border-[#e2e8f0] hover:border-[#94a3b8] bg-[#f8f9ff] hover:bg-white transition-all shadow-2xs flex flex-col gap-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-['Plus Jakarta Sans'] font-bold text-sm text-[#0b1c30]">
                    {auth.name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[10px] font-bold">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    {auth.verifiedBadge}
                  </span>
                </div>

                <a
                  href={auth.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#4059aa] hover:underline"
                >
                  <span className="truncate max-w-[200px]">{auth.officialUrl.replace('https://', '')}</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </div>

              <div className="text-xs text-[#45464d] leading-relaxed">
                <strong className="text-[#0b1c30]">{auth.agencyName}:</strong> {auth.description}
              </div>

              {/* Helplines and contact chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-[#e2e8f0] text-[#334155] font-medium">
                  Jurisdiction: {auth.jurisdiction}
                </span>

                {auth.helpline && (
                  <a
                    href={`tel:${auth.helpline.split(' ')[0]}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eff4ff] text-[#1e40af] font-semibold hover:bg-[#dbeafe]"
                  >
                    <span className="material-symbols-outlined text-[13px]">call</span>
                    <span>Helpline: {auth.helpline}</span>
                  </a>
                )}

                {auth.whatsappHelpline && (
                  <a
                    href={`https://wa.me/${auth.whatsappHelpline.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ecfdf5] text-[#047857] font-semibold hover:bg-[#d1fae5]"
                  >
                    <span className="material-symbols-outlined text-[13px]">chat</span>
                    <span>WhatsApp: {auth.whatsappHelpline}</span>
                  </a>
                )}

                {auth.emailContact && (
                  <a
                    href={`mailto:${auth.emailContact}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#f1f5f9] text-[#475569] font-medium hover:bg-[#e2e8f0]"
                  >
                    <span className="material-symbols-outlined text-[13px]">mail</span>
                    <span>{auth.emailContact}</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3.5 border-t border-[#f1f5f9] flex items-center justify-between">
          <span className="text-[11px] text-[#76777d]">
            Updated weekly in accordance with Gazette Notifications.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#000000] text-white text-xs font-semibold hover:bg-[#131b2e] cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>
    </div>
  );
};
