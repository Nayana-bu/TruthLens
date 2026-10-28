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
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-[#f8f9ff]/95 backdrop-blur-xl border-t border-[#d3e4fe] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-3">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#000000] text-white shadow-sm font-bold scale-[1.02]'
                  : 'text-[#45464d] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[20px] transition-transform ${
                  isActive ? 'text-[#8fa7fe]' : 'text-[#45464d]'
                }`}
              >
                {item.icon}
              </span>
              <span className="font-['Inter'] text-[11px] font-semibold mt-0.5 tracking-tight truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
