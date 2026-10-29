import React, { useState } from 'react';
import type { ClaimDossier, Language, VerdictType } from '../types';
import { UI_TRANSLATIONS } from '../data/mockData';

interface ExploreFeedTabProps {
  currentLang: Language;
  allDossiers?: ClaimDossier[];
  onInspectDossier: (dossier: ClaimDossier) => void;
}

export const ExploreFeedTab: React.FC<ExploreFeedTabProps> = ({
  currentLang,
  allDossiers = [],
  onInspectDossier,
}) => {
  const dossiersList = allDossiers;
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVerdict, setSelectedVerdict] = useState<string>('all');

  const t = UI_TRANSLATIONS[currentLang];

  const categories = [
    { id: 'all', label: 'All Feeds' },
    { id: 'phishing', label: 'Cyber & Phishing' },
    { id: 'governance', label: 'Govt & Schemes' },
    { id: 'space', label: 'Science & ISRO' },
  ];

  const verdicts = [
    { id: 'all', label: 'All Verdicts' },
    { id: 'verified_true', label: 'Verified True' },
    { id: 'false', label: 'False Claims' },
    { id: 'misleading', label: 'Misleading' },
    { id: 'partly_true', label: 'Partly True' },
    { id: 'unverified', label: 'Unverified' },
    { id: 'context_missing', label: 'Context Missing' },
  ];

  const filtered = dossiersList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.originalClaim.toLowerCase().includes(search.toLowerCase()) ||
      item.summary.en.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesVerdict = selectedVerdict === 'all' || item.verdict === selectedVerdict;

    return matchesSearch && matchesCategory && matchesVerdict;
  });

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 py-4 gap-5">
      {/* Feed Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#dce1ff] text-[#00164e] font-['Inter'] text-[11px] font-semibold mb-1">
          <span className="material-symbols-outlined text-[14px]">newspaper</span>
          <span>Live Verification Feed</span>
        </div>
        <h1 className="font-['Plus Jakarta Sans'] text-2xl font-bold text-[#0b1c30]">
          Debunked Viral Claims Archive
        </h1>
        <p className="text-xs text-[#45464d] mt-0.5">
          Continuously updated repository of fact-checked WhatsApp forwards, circulars, and rumors.
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#76777d] text-[20px]">
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.searchClaims}
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-[#cbd5e1] text-sm text-[#0b1c30] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#4059aa]/20 focus:border-[#4059aa] shadow-2xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-2.5 text-[#76777d] hover:text-[#0b1c30]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-[#000000] text-white shadow-xs'
                : 'bg-white text-[#45464d] border border-[#cbd5e1] hover:bg-[#f1f5f9]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Verdict Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {verdicts.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setSelectedVerdict(v.id)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-all ${
              selectedVerdict === v.id
                ? 'bg-[#4059aa] text-white'
                : 'bg-[#e5eeff] text-[#4059aa] hover:bg-[#dce9ff]'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Dossier Cards List */}
      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-[#e5eeff] flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[36px] text-[#76777d]">
              find_in_page
            </span>
            <p className="font-semibold text-sm text-[#0b1c30]">No matching records found</p>
            <p className="text-xs text-[#76777d]">Try modifying your search or filters.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const isFalse = item.clearVerdictStatus === 'FAKE' || item.verdict === 'false';
            const isMisleading = item.clearVerdictStatus === 'MISLEADING' || item.verdict === 'misleading';
            const isPartly = item.clearVerdictStatus === 'PARTLY_TRUE' || item.verdict === 'partly_true';
            const isContext = item.clearVerdictStatus === 'CONTEXT_MISSING' || item.verdict === 'context_missing';
            const isTrue = item.clearVerdictStatus === 'REAL' || item.verdict === 'verified_true';

            const barColor = isFalse
              ? 'bg-[#ba1a1a]'
              : isMisleading
              ? 'bg-[#d97706]'
              : isPartly
              ? 'bg-[#ea580c]'
              : isContext
              ? 'bg-[#7c3aed]'
              : isTrue
              ? 'bg-[#16a34a]'
              : 'bg-[#64748b]';

            const badgeBg = isFalse
              ? 'bg-[#fee2e2] text-[#93000a]'
              : isMisleading
              ? 'bg-[#fef3c7] text-[#92400e]'
              : isPartly
              ? 'bg-[#ffedd5] text-[#c2410c]'
              : isContext
              ? 'bg-[#ede9fe] text-[#6d28d9]'
              : isTrue
              ? 'bg-[#dcfce7] text-[#15803d]'
              : 'bg-[#f1f5f9] text-[#334155]';

            const badgeIcon = isFalse
              ? 'cancel'
              : isMisleading
              ? 'warning'
              : isPartly
              ? 'published_with_changes'
              : isContext
              ? 'info'
              : isTrue
              ? 'check_circle'
              : 'help';

            return (
              <div
                key={item.id}
                onClick={() => onInspectDossier(item)}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-2 relative overflow-hidden border border-[#e5eeff] cursor-pointer group"
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />

                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-['Inter'] text-[11px] font-bold ${badgeBg}`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {badgeIcon}
                    </span>
                    {item.verdictLabel}
                  </span>

                  <span className="font-['Inter'] text-[11px] text-[#76777d] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">schedule</span>
                    {item.timeAgo}
                  </span>
                </div>

                <h3 className="font-['Plus Jakarta Sans'] text-base font-bold text-[#0b1c30] group-hover:text-[#4059aa] transition-colors">
                  {item.title}
                </h3>

                <p className="font-['Inter'] text-xs sm:text-sm text-[#45464d] line-clamp-2 leading-relaxed">
                  {item.summary[currentLang] || item.summary.en}
                </p>

                <div className="flex items-center justify-between pt-1 mt-1 border-t border-[#f1f5f9]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#45464d] font-['Inter'] text-[11px] font-medium">
                      {item.sourceEntity}
                    </span>
                    <span className="text-[11px] text-[#76777d]">
                      Score: <strong>{item.confidenceScore}%</strong>
                    </span>
                  </div>

                  <span className="font-['Inter'] text-xs text-[#4059aa] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    {t.inspectDossier}{' '}
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
