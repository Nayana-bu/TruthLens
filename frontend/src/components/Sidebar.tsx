import React from 'react';
import { TabType, Language } from '../types';

interface SidebarProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  currentLang: Language;
  onOpenAuthorities: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  currentLang,
  onOpenAuthorities,
  onOpenSettings,
}) => {
  const navItems = [
    {
      id: 'verify' as TabType,
      label: 'Home',
      icon: 'home',
    },
    {
      id: 'verify' as TabType,
      subKey: 'verify-claim',
      label: 'Verify a Claim',
      icon: 'check_circle',
    },
    {
      id: 'investigation' as TabType,
      label: 'My Investigations',
      icon: 'description',
    },
    {
      id: 'explore-feed' as TabType,
      label: 'Trending Verifications',
      icon: 'trending_up',
    },
    {
      id: 'authorities' as any,
      label: 'Official Sources',
      icon: 'verified',
      action: onOpenAuthorities,
    },
    {
      id: 'community' as TabType,
      label: 'Community',
      icon: 'groups',
    },
    {
      id: 'settings' as any,
      label: 'Settings',
      icon: 'settings',
      action: onOpenSettings,
    },
  ];

  return (
    <aside className="w-60 xl:w-64 bg-[#0a1628] text-white flex-shrink-0 flex flex-col justify-between p-4 border-r border-[#1a2b47] select-none h-screen sticky top-0">
      <div className="flex flex-col gap-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1d4ed8] to-[#3b82f6] flex items-center justify-center shadow-md shadow-blue-500/20">
            <span className="material-symbols-outlined text-white text-[22px]">
              verified_user
            </span>
          </div>
          <div className="flex flex-col">
            <span className="font-['Plus_Jakarta_Sans'] font-extrabold text-lg text-white leading-none tracking-tight">
              TruthLens
            </span>
            <span className="text-[10px] font-bold text-[#60a5fa] tracking-widest uppercase mt-0.5">
              VERIFY
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item, idx) => {
            const isItemActive =
              item.id === 'authorities'
                ? false
                : item.id === 'settings'
                ? false
                : item.subKey === 'verify-claim'
                ? false
                : activeTab === item.id;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else {
                    onChangeTab(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                  isItemActive
                    ? 'bg-[#1b2f4e] text-white shadow-xs font-bold border-l-2 border-[#3b82f6]'
                    : 'text-[#94a3b8] hover:text-white hover:bg-[#13233d]'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-[19px] ${
                    isItemActive ? 'text-[#60a5fa]' : 'text-[#94a3b8]'
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Callout Card: "Be a responsible sharer" */}
      <div className="mt-auto pt-4">
        <div className="bg-[#12223a] border border-[#1e3456] rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-lg">
          <div className="w-10 h-10 rounded-full bg-[#1e3456] flex items-center justify-center text-[#60a5fa]">
            <span className="material-symbols-outlined text-[22px]">fact_check</span>
          </div>
          <div>
            <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-xs text-white">
              Be a responsible sharer
            </h4>
            <p className="text-[11px] text-[#94a3b8] leading-relaxed mt-0.5">
              Verify before you share. Small checks create a more informed society.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
