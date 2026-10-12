import React from 'react';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
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
            className="w-7 h-7 rounded-full text-[#76777d] hover:text-[#0b1c30] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex flex-col items-center py-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#0b1c30] text-white flex items-center justify-center shadow-md mb-2">
            <span className="material-symbols-outlined text-[32px]">person</span>
          </div>
          <h4 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30]">
            Nayana Umesh
          </h4>
          <span className="text-xs text-[#76777d]">nayanabumesh22@gmail.com</span>
          <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dcfce7] text-[#15803d] text-[11px] font-bold">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            Verified Civic Researcher
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 my-2">
          <div className="bg-[#f8f9ff] p-3 rounded-xl border border-[#e5eeff] text-center">
            <span className="font-bold text-lg text-[#0b1c30] block">27</span>
            <span className="text-[10px] text-[#76777d]">Claims Audited</span>
          </div>
          <div className="bg-[#f8f9ff] p-3 rounded-xl border border-[#e5eeff] text-center">
            <span className="font-bold text-lg text-[#16a34a] block">99.1%</span>
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

        <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-[#4059aa] text-white text-xs font-semibold hover:bg-[#334a91]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
