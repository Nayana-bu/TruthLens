import React from 'react';
import { Language, UserSession } from '../types';

interface TopHeaderProps {
  currentLang: Language;
  onSelectLang: (lang: Language) => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
  currentUser?: UserSession | null;
  onToggleMobileSidebar?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  currentLang,
  onSelectLang,
  onOpenHelp,
  onOpenProfile,
  currentUser,
  onToggleMobileSidebar,
}) => {
  return (
    <div className="w-full flex items-center justify-between pb-4 pt-1 border-b border-[#e2e8f0]/80 mb-6">
      {/* Mobile sidebar toggle button */}
      <div className="flex items-center gap-2 lg:hidden">
        {onToggleMobileSidebar && (
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="w-9 h-9 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center text-[#0f172a] shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        )}
        <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-base text-[#0f172a]">
          TruthLens Verify
        </span>
      </div>

      <div className="hidden lg:block">
        {/* Empty left spacer on desktop so right actions stay aligned to top-right */}
      </div>

      {/* Top-right action cluster */}
      <div className="flex items-center gap-2.5 sm:gap-3 ml-auto">
        {/* Language selector: EN | ಕನ್ನಡ | हिंदी */}
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748b]">
          <button
            type="button"
            onClick={() => onSelectLang('en')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              currentLang === 'en'
                ? 'text-[#0f172a] font-bold underline decoration-[#2563eb] decoration-2 underline-offset-4'
                : 'hover:text-[#0f172a]'
            }`}
          >
            EN
          </button>
          <span className="text-[#cbd5e1]">|</span>
          <button
            type="button"
            onClick={() => onSelectLang('kn')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              currentLang === 'kn'
                ? 'text-[#0f172a] font-bold underline decoration-[#2563eb] decoration-2 underline-offset-4'
                : 'hover:text-[#0f172a]'
            }`}
          >
            ಕನ್ನಡ
          </button>
          <span className="text-[#cbd5e1]">|</span>
          <button
            type="button"
            onClick={() => onSelectLang('hi')}
            className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
              currentLang === 'hi'
                ? 'text-[#0f172a] font-bold underline decoration-[#2563eb] decoration-2 underline-offset-4'
                : 'hover:text-[#0f172a]'
            }`}
          >
            हिंदी
          </button>
        </div>

        {/* Help icon button (?) */}
        <button
          type="button"
          onClick={onOpenHelp}
          title="Fact-Checking Protocol & Help"
          className="w-8 h-8 rounded-full border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#64748b] hover:text-[#0f172a] flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
        >
          <span className="material-symbols-outlined text-[17px]">help_outline</span>
        </button>

        {/* Notification bell icon button */}
        <button
          type="button"
          title="Viral Claims Alerts"
          className="w-8 h-8 rounded-full border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#64748b] hover:text-[#0f172a] flex items-center justify-center transition-colors cursor-pointer relative shadow-2xs"
        >
          <span className="material-symbols-outlined text-[17px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#dc2626] ring-2 ring-white" />
        </button>

        {/* User avatar: dark circle with 'N' */}
        <button
          type="button"
          onClick={onOpenProfile}
          title="Account Profile & Settings"
          className="w-8 h-8 rounded-full bg-[#0a1628] text-white flex items-center justify-center text-xs font-bold hover:opacity-90 transition-opacity shadow-sm cursor-pointer ml-0.5"
        >
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'N'}
        </button>
      </div>
    </div>
  );
};
