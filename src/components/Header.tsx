import React from 'react';
import { Language, UserSession } from '../types';
import { UI_TRANSLATIONS } from '../data/mockData';

interface HeaderProps {
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
  onOpenAuthorities?: () => void;
  currentUser?: UserSession | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onSelectLang,
  onOpenHelp,
  onOpenProfile,
  onOpenAuthorities,
  currentUser,
}) => {
  const t = UI_TRANSLATIONS[currentLang];

  return (
    <header className="fixed top-0 w-full z-50 bg-[#f8f9ff]/90 backdrop-blur-xl pt-safe shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e5eeff]">
      <div className="h-16 px-4 max-w-3xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            alt="TruthLens Logo"
            className="h-8 w-auto object-contain flex-shrink-0"
            src="https://lh3.googleusercontent.com/aida/AEtjO1Uu69U-0rHZRJ9UsAiwHXK-EZ3Zf4oxFellkglw3LYSOp2eqHI6bPQcOKdslK0tM05DYw7kpwAH_IrDQRY-yfPi6wnqcIcnXSRj3JoqTIjgSCXpwlp2bunXRe_wRLd3E2z_-6nXHu3DJt7eHFdhEvo3ZAEVoiFUk9QuzzVWlXqn-f6mPrLHiID1XnITQPpNPFC4Q6k16IF8Trzyok6fq1nKupxttrQvKvVAKrkLU-PPbyyzf1wod7hx"
          />
          <div className="flex flex-col truncate">
            <span className="font-['Plus Jakarta Sans'] font-extrabold text-lg text-[#0b1c30] leading-none tracking-tight">
              TruthLens
            </span>
            <span className="font-['Inter'] text-[11px] font-semibold text-[#45464d] tracking-wider uppercase truncate mt-0.5">
              {t.verifySub} • Constitutional Fact-Check
            </span>
          </div>
        </div>

        {/* Right Action Cluster: Authorities, Lang Switcher, Help, Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Official Authorities Directory Quick Button */}
          {onOpenAuthorities && (
            <button
              type="button"
              onClick={onOpenAuthorities}
              title="Verified Authorities & Portals Directory"
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00164e] border border-[#d3e4fe] text-xs font-semibold transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px] text-[#15803d]">verified</span>
              <span>Authorities</span>
            </button>
          )}

          {/* Multilingual Selector Segment */}
          <div className="flex items-center bg-[#e5eeff] rounded-full p-0.5 shadow-inner border border-[#d3e4fe]">
            <button
              type="button"
              onClick={() => onSelectLang('en')}
              className={`h-7 px-2 sm:px-2.5 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                currentLang === 'en'
                  ? 'bg-white text-[#0b1c30] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#45464d] hover:text-[#0b1c30]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onSelectLang('kn')}
              className={`h-7 px-2 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                currentLang === 'kn'
                  ? 'bg-white text-[#0b1c30] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#45464d] hover:text-[#0b1c30]'
              }`}
            >
              ಕನ್ನ
            </button>
            <button
              type="button"
              onClick={() => onSelectLang('hi')}
              className={`h-7 px-2 rounded-full text-[12px] font-semibold transition-all cursor-pointer ${
                currentLang === 'hi'
                  ? 'bg-white text-[#0b1c30] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#45464d] hover:text-[#0b1c30]'
              }`}
            >
              हिन्दी
            </button>
          </div>

          {/* Help Button */}
          <button
            type="button"
            onClick={onOpenHelp}
            aria-label="Platform Guidelines & Help"
            className="w-8 sm:w-9 h-8 sm:h-9 flex items-center justify-center rounded-full text-[#45464d] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
          </button>

          {/* Profile Avatar Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="User Profile"
            className="w-8 h-8 rounded-full bg-[#000000] text-white flex items-center justify-center hover:opacity-90 transition-opacity ml-0.5 shadow-sm overflow-hidden cursor-pointer"
          >
            {currentUser?.avatar ? (
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-white text-[18px]">person</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
