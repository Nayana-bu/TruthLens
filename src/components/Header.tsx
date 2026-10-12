import React from 'react';
import { Language } from '../types';
import { UI_TRANSLATIONS } from '../data/mockData';

interface HeaderProps {
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLang,
  onSelectLang,
  onOpenHelp,
  onOpenProfile,
}) => {
  const t = UI_TRANSLATIONS[currentLang];

  return (
    <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl pt-safe border-b border-[#e4e9f4] shadow-[0_1px_0_rgba(15,23,42,0.04)] lg:left-[240px] lg:w-[calc(100%-240px)]">
      <div className="h-14 px-4 lg:px-6 max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Brand — compact on mobile; sidebar carries brand on desktop */}
        <div className="flex items-center gap-2.5 min-w-0 lg:hidden">
          <img
            alt="TruthLens Logo"
            className="h-8 w-auto object-contain flex-shrink-0"
            src="https://lh3.googleusercontent.com/aida/AEtjO1Uu69U-0rHZRJ9UsAiwHXK-EZ3Zf4oxFellkglw3LYSOp2eqHI6bPQcOKdslK0tM05DYw7kpwAH_IrDQRY-yfPi6wnqcIcnXSRj3JoqTIjgSCXpwlp2bunXRe_wRLd3E2z_-6nXHu3DJt7eHFdhEvo3ZAEVoiFUk9QuzzVWlXqn-f6mPrLHiID1XnITQPpNPFC4Q6k16IF8Trzyok6fq1nKupxttrQvKvVAKrkLU-PPbyyzf1wod7hx"
          />
          <div className="flex flex-col truncate">
            <span className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30] leading-none tracking-tight">
              TruthLens
            </span>
            <span className="font-['Inter'] text-[10px] font-semibold text-[#64748b] tracking-wider uppercase truncate mt-0.5">
              {t.verifySub}
            </span>
          </div>
        </div>

        <p className="hidden lg:block font-['Plus Jakarta Sans'] text-sm font-semibold text-[#0b1c30] tracking-tight">
          {t.verifySub}
        </p>

        {/* Language Switcher, Help & Profile */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Multilingual Selector Segment */}
          <div className="flex items-center bg-[#eef2fb] rounded-full p-0.5 border border-[#e0e7f5]">
            <button
              type="button"
              onClick={() => onSelectLang('en')}
              className={`h-7 px-2.5 rounded-full text-[12px] font-semibold transition-all ${
                currentLang === 'en'
                  ? 'bg-white text-[#0b1c30] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#64748b] hover:text-[#0b1c30]'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => onSelectLang('kn')}
              className={`h-7 px-2 rounded-full text-[12px] font-semibold transition-all ${
                currentLang === 'kn'
                  ? 'bg-white text-[#0b1c30] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#64748b] hover:text-[#0b1c30]'
              }`}
            >
              ಕನ್ನ
            </button>
            <button
              type="button"
              onClick={() => onSelectLang('hi')}
              className={`h-7 px-2 rounded-full text-[12px] font-semibold transition-all ${
                currentLang === 'hi'
                  ? 'bg-white text-[#0b1c30] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                  : 'text-[#64748b] hover:text-[#0b1c30]'
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
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#64748b] hover:text-[#0b1c30] hover:bg-[#eef2fb] transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">help_outline</span>
          </button>

          {/* Profile Avatar Button */}
          <button
            type="button"
            onClick={onOpenProfile}
            aria-label="User Profile"
            className="w-8 h-8 rounded-full bg-[#0b1c30] text-white flex items-center justify-center hover:opacity-90 transition-opacity ml-0.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-white text-[18px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
