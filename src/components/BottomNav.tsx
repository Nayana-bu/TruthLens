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
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-[#f8f9ff]/90 backdrop-blur-xl border-t border-[#e5eeff] shadow-[0_-2px_12px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-2">
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              className={`flex flex-col items-center justify-center min-w-[64px] h-12 py-1 transition-all ${
                isActive
                  ? 'text-[#000000] font-bold scale-105'
                  : 'text-[#45464d] hover:text-[#0b1c30]'
              }`}
            >
              <span
                className={`material-symbols-outlined text-[22px] transition-transform ${
                  isActive ? 'text-[#000000]' : 'text-[#45464d]'
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
