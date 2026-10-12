import React from 'react';
import { TabType, Language } from '../types';
import { UI_TRANSLATIONS } from '../data/mockData';

interface BottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentLang: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  currentLang,
}) => {
  const t = UI_TRANSLATIONS[currentLang];

  const items: { id: TabType; label: string; icon: string }[] = [
    { id: 'verify', label: t.navVerify, icon: 'fact_check' },
    { id: 'investigation', label: t.navInvestigation, icon: 'radar' },
    { id: 'explore-feed', label: t.navExplore, icon: 'newspaper' },
    { id: 'community', label: t.navCommunity, icon: 'groups_2' },
  ];

  return (
    <nav className="fixed z-40 bottom-0 w-full pb-safe bg-white/90 backdrop-blur-xl border-t border-[#e4e9f4] shadow-[0_-2px_12px_rgba(0,0,0,0.05)] lg:top-0 lg:bottom-auto lg:h-screen lg:w-[240px] lg:pb-0 lg:border-t-0 lg:border-r lg:border-[#1a2d4d] lg:bg-[#0b1c30] lg:backdrop-blur-none lg:shadow-none">
      <div className="hidden lg:flex items-center gap-2.5 px-5 h-14 border-b border-white/10">
        <img
          alt="TruthLens Logo"
          className="h-8 w-auto object-contain flex-shrink-0 brightness-0 invert"
          src="https://lh3.googleusercontent.com/aida/AEtjO1Uu69U-0rHZRJ9UsAiwHXK-EZ3Zf4oxFellkglw3LYSOp2eqHI6bPQcOKdslK0tM05DYw7kpwAH_IrDQRY-yfPi6wnqcIcnXSRj3JoqTIjgSCXpwlp2bunXRe_wRLd3E2z_-6nXHu3DJt7eHFdhEvo3ZAEVoiFUk9QuzzVWlXqn-f6mPrLHiID1XnITQPpNPFC4Q6k16IF8Trzyok6fq1nKupxttrQvKvVAKrkLU-PPbyyzf1wod7hx"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-['Plus Jakarta Sans'] font-bold text-[15px] text-white leading-none tracking-tight">
            TruthLens
          </span>
          <span className="font-['Inter'] text-[10px] font-medium text-[#9db0d4] tracking-wider uppercase truncate mt-0.5">
            {t.verifySub}
          </span>
        </div>
      </div>

      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-2 lg:flex-col lg:h-auto lg:max-w-none lg:mx-0 lg:px-3 lg:py-4 lg:gap-1 lg:items-stretch">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[64px] h-12 py-1 transition-all lg:flex-row lg:justify-start lg:gap-3 lg:min-w-0 lg:h-11 lg:px-3 lg:rounded-lg lg:py-0 ${
                isActive
                  ? 'text-[#0b1c30] font-bold lg:bg-white/10 lg:text-white'
                  : 'text-[#64748b] hover:text-[#0b1c30] lg:text-[#9db0d4] lg:hover:text-white lg:hover:bg-white/5'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-transform ${
                  isActive ? 'text-[#4059aa] lg:text-[#b6c4ff]' : 'text-[#64748b] lg:text-[#9db0d4]'
                }`}
              >
                {item.icon}
              </span>
              <span className="font-['Inter'] text-[11px] font-semibold mt-0.5 tracking-tight truncate lg:mt-0 lg:text-[13px]">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
