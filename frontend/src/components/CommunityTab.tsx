import React, { useState } from 'react';
import { CommunitySubmission, Language } from '../types';
import { COMMUNITY_SUBMISSIONS, LEADERBOARD, UI_TRANSLATIONS } from '../data/mockData';

interface CommunityTabProps {
  currentLang: Language;
}

export const CommunityTab: React.FC<CommunityTabProps> = ({ currentLang }) => {
  const [submissions, setSubmissions] = useState<CommunitySubmission[]>(COMMUNITY_SUBMISSIONS);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newClaimText, setNewClaimText] = useState('');
  const [newPlatform, setNewPlatform] = useState<'WhatsApp' | 'Telegram' | 'X/Twitter' | 'Facebook'>('WhatsApp');
  const [newCategory, setNewCategory] = useState('Governance & Schemes');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const t = UI_TRANSLATIONS[currentLang];

  const handleVote = (subId: string, type: 'false' | 'true' | 'needsData') => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id !== subId) return sub;
        return {
          ...sub,
          upvotes: sub.upvotes + 1,
          verdictVotes: {
            ...sub.verdictVotes,
            falseVotes: type === 'false' ? sub.verdictVotes.falseVotes + 1 : sub.verdictVotes.falseVotes,
            trueVotes: type === 'true' ? sub.verdictVotes.trueVotes + 1 : sub.verdictVotes.trueVotes,
            needsDataVotes: type === 'needsData' ? sub.verdictVotes.needsDataVotes + 1 : sub.verdictVotes.needsDataVotes,
          },
        };
      })
    );
  };

  const handleCreateSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaimText.trim()) return;

    const newSub: CommunitySubmission = {
      id: `sub-${Date.now()}`,
      claimText: newClaimText.trim(),
      submittedBy: 'You (Citizen Auditor)',
      submittedAt: 'Just now',
      platform: newPlatform,
      category: newCategory,
      language: currentLang,
      upvotes: 1,
      verdictVotes: { falseVotes: 1, trueVotes: 0, needsDataVotes: 0 },
      status: 'under_investigation',
    };

    setSubmissions([newSub, ...submissions]);
    setNewClaimText('');
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setShowSubmitModal(false);
    }, 1800);
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 py-4 gap-6">
      {/* Community Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dce1ff] text-[#00164e] font-['Inter'] text-[11px] font-semibold mb-1">
            <span className="material-symbols-outlined text-[14px]">groups_2</span>
            <span>Civic Fact Network</span>
          </div>
          <h1 className="font-['Plus Jakarta Sans'] text-2xl font-bold text-[#0b1c30]">
            Community Verification Collective
          </h1>
          <p className="text-xs text-[#45464d] mt-0.5">
            Crowdsourced audit stream by journalists, researchers, and vigilant citizens.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSubmitModal(true)}
          className="h-9 px-3.5 rounded-lg bg-[#000000] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:bg-[#131b2e] transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-[16px]">add_circle</span>
          <span className="hidden sm:inline">Submit Forward</span>
        </button>
      </div>

      {/* Community Impact Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
          <span className="font-['Plus Jakarta Sans'] font-extrabold text-lg text-[#0b1c30] block">
            14,289
          </span>
          <span className="text-[10px] text-[#76777d]">Debunked Claims</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
          <span className="font-['Plus Jakarta Sans'] font-extrabold text-lg text-[#16a34a] block">
            1.2M+
          </span>
          <span className="text-[10px] text-[#76777d]">Citizens Shielded</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#e5eeff] text-center shadow-2xs">
          <span className="font-['Plus Jakarta Sans'] font-extrabold text-lg text-[#4059aa] block">
            48
          </span>
          <span className="text-[10px] text-[#76777d]">Official Repositories</span>
        </div>
      </div>

      {/* Claims Under Peer Audit */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#4059aa]">how_to_vote</span>
            Claims Under Peer Audit ({submissions.length})
          </h2>
          <span className="text-xs text-[#76777d]">Vote on consensus</span>
        </div>

        <div className="flex flex-col gap-3">
          {submissions.map((sub) => {
            const totalVotes =
              sub.verdictVotes.falseVotes +
              sub.verdictVotes.trueVotes +
              sub.verdictVotes.needsDataVotes;
            const falsePct = totalVotes > 0 ? Math.round((sub.verdictVotes.falseVotes / totalVotes) * 100) : 0;
            const truePct = totalVotes > 0 ? Math.round((sub.verdictVotes.trueVotes / totalVotes) * 100) : 0;

            return (
              <div
                key={sub.id}
                className="bg-white p-4 rounded-xl border border-[#e5eeff] shadow-sm flex flex-col gap-3 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#4059aa] font-semibold text-[10px] uppercase">
                      {sub.platform} Forward
                    </span>
                    <span className="text-[11px] text-[#76777d]">
                      by {sub.submittedBy} • {sub.submittedAt}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#16a34a] bg-[#dcfce7] px-2 py-0.5 rounded-full">
                    {sub.category}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#0b1c30] font-medium leading-relaxed bg-[#f8f9ff] p-3 rounded-lg border border-[#e5eeff]">
                  "{sub.claimText}"
                </p>

                {/* Consensus Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <span className="text-[#ba1a1a]">False / Scam: {falsePct}%</span>
                    <span className="text-[#131b2e]">Verified: {truePct}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#e5eeff] rounded-full overflow-hidden flex">
                    <div style={{ width: `${falsePct}%` }} className="bg-[#ba1a1a]" />
                    <div style={{ width: `${truePct}%` }} className="bg-[#131b2e]" />
                    <div style={{ width: `${100 - falsePct - truePct}%` }} className="bg-[#cbd5e1]" />
                  </div>
                </div>

                {/* Voting Actions */}
                <div className="flex items-center gap-2 pt-1 border-t border-[#f1f5f9] flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleVote(sub.id, 'false')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#fff1f2] hover:bg-[#ffe4e6] text-[#ba1a1a] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">thumb_down</span>
                    <span>Vote False ({sub.verdictVotes.falseVotes})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVote(sub.id, 'true')}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d3989] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                    <span>Vote True ({sub.verdictVotes.trueVotes})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVote(sub.id, 'needsData')}
                    className="py-1.5 px-2 rounded-lg bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#64748b] text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">help</span>
                    <span>Needs Data</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Fact-Checking Contributors Leaderboard */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#e5eeff] shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-[#eab308]">military_tech</span>
            Top Citizen Auditors Leaderboard
          </h2>
          <span className="text-xs text-[#76777d]">This Month</span>
        </div>

        <div className="space-y-2">
          {LEADERBOARD.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-lg border border-[#f1f5f9] hover:bg-[#f8f9ff] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0
                    ? 'bg-[#fef08a] text-[#854d0e]'
                    : idx === 1
                    ? 'bg-[#e2e8f0] text-[#475569]'
                    : idx === 2
                    ? 'bg-[#fed7aa] text-[#9a3412]'
                    : 'bg-[#f1f5f9] text-[#64748b]'
                }`}>
                  {idx + 1}
                </span>
                <div>
                  <h4 className="font-semibold text-xs text-[#0b1c30]">{item.name}</h4>
                  <span className="text-[10px] text-[#76777d]">{item.city} • {item.badge}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-[#0b1c30]">{item.debunks} debunks</span>
                <span className="block text-[10px] text-[#16a34a] font-semibold">{item.accuracy} accuracy</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Claim Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-5 border border-[#e5eeff] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
              <h3 className="font-['Plus Jakarta Sans'] font-bold text-base text-[#0b1c30]">
                Submit Suspicious Viral Forward
              </h3>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="w-7 h-7 rounded-full text-[#76777d] hover:text-[#0b1c30] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-8 text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-[42px] text-[#16a34a]">
                  check_circle
                </span>
                <p className="font-bold text-base text-[#0b1c30]">Submitted to Collective Audit!</p>
                <p className="text-xs text-[#76777d]">Forensic crawlers are cross-examining archives now.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateSubmission} className="space-y-4 mt-3">
                <div>
                  <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                    Forwarded Claim / Rumor Text
                  </label>
                  <textarea
                    required
                    value={newClaimText}
                    onChange={(e) => setNewClaimText(e.target.value)}
                    placeholder="Paste the suspicious message, rumor, or headline here..."
                    rows={4}
                    className="w-full bg-[#eff4ff] p-3 rounded-lg border border-[#d3e4fe] text-xs text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                      Origin Platform
                    </label>
                    <select
                      value={newPlatform}
                      onChange={(e) => setNewPlatform(e.target.value as any)}
                      className="w-full bg-[#eff4ff] p-2 rounded-lg border border-[#d3e4fe] text-xs text-[#0b1c30] focus:outline-none focus:bg-white"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telegram">Telegram</option>
                      <option value="X/Twitter">X / Twitter</option>
                      <option value="Facebook">Facebook</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#0b1c30] block mb-1">
                      Category
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full bg-[#eff4ff] p-2 rounded-lg border border-[#d3e4fe] text-xs text-[#0b1c30] focus:outline-none focus:bg-white"
                    >
                      <option value="Governance & Schemes">Governance & Schemes</option>
                      <option value="Cyber & Phishing">Cyber & Phishing</option>
                      <option value="Disaster & Weather">Disaster & Weather</option>
                      <option value="Health & Medicine">Health & Medicine</option>
                      <option value="Education">Education</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f1f5f9]">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#45464d] hover:bg-[#f1f5f9]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#000000] text-white text-xs font-semibold hover:bg-[#131b2e] shadow-sm"
                  >
                    Submit for Investigation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
