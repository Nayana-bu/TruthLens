import React from 'react';
import { UserSession } from '../types';

interface ProfileModalProps {
  onClose: () => void;
  currentUser?: UserSession | null;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  onClose,
  currentUser,
  onLogout,
}) => {
  const name = currentUser?.name || 'Nayana Umesh';
  const email = currentUser?.email || 'nayanabumesh22@gmail.com';
  const username = currentUser?.username || 'nayanabumesh22';
  const role = currentUser?.role || 'Verified Civic Researcher';
  const authProvider = currentUser?.authProvider || 'google';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-5 border border-[#e5eeff] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
          <h3 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30]">
            Citizen Auditor Profile
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full text-[#76777d] hover:text-[#0b1c30] flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col items-center py-4 text-center">
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt={name}
              className="w-16 h-16 rounded-full object-cover border-2 border-[#4059aa] shadow-md mb-2"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#000000] text-white flex items-center justify-center shadow-md mb-2">
              <span className="material-symbols-outlined text-[32px]">person</span>
            </div>
          )}

          <h4 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30]">
            {name}
          </h4>
          <span className="text-xs text-[#76777d]">
            @{username} • {email}
          </span>

          <div className="flex items-center gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11px] font-bold">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              {role}
            </span>
            {authProvider === 'google' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#1d4ed8] text-[10px] font-bold">
                Google SSO
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 my-2">
          <div className="bg-[#f8f9ff] p-3 rounded-xl border border-[#e5eeff] text-center">
            <span className="font-bold text-lg text-[#0b1c30] block">27</span>
            <span className="text-[10px] text-[#76777d]">Claims Audited</span>
          </div>
          <div className="bg-[#f8f9ff] p-3 rounded-xl border border-[#e5eeff] text-center">
            <span className="font-bold text-lg text-[#16a34a] block">99.4%</span>
            <span className="text-[10px] text-[#76777d]">Consensus Accuracy</span>
          </div>
        </div>

        <div className="space-y-2 mt-3 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#eff4ff] text-[#4059aa]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[16px]">bookmark</span>
              Saved Investigation Dossiers
            </span>
            <span className="font-bold">4</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded-lg bg-[#eff4ff] text-[#4059aa]">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[16px]">notifications</span>
              Viral Scheme Alerts
            </span>
            <span className="font-bold">Active</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex flex-col gap-2">
          {onLogout && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full py-2 rounded-lg border border-[#fecdd3] text-[#ba1a1a] hover:bg-[#fff1f2] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out / Switch Account</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-[#000000] text-white text-xs font-semibold hover:bg-[#131b2e] cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
