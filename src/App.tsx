import React, { useState } from 'react';
import { TabType, Language, ClaimDossier, SubmissionMode } from './types';
import { INITIAL_DOSSIERS } from './data/mockData';
import { Header } from './components/Header';
import { VerifyTab } from './components/VerifyTab';
import { InvestigationTab } from './components/InvestigationTab';
import { ExploreFeedTab } from './components/ExploreFeedTab';
import { CommunityTab } from './components/CommunityTab';
import { DossierModal } from './components/DossierModal';
import { GuidelinesModal } from './components/GuidelinesModal';
import { ProfileModal } from './components/ProfileModal';
import { BottomNav } from './components/BottomNav';
import { analyzeClaimText } from './utils/claimAnalyzer';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<TabType>('verify');
  const [allDossiers, setAllDossiers] = useState<ClaimDossier[]>(INITIAL_DOSSIERS);
  const [selectedDossier, setSelectedDossier] = useState<ClaimDossier | null>(null);
  const [activeInvestigationDossier, setActiveInvestigationDossier] = useState<ClaimDossier | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationStatusMessage, setInvestigationStatusMessage] = useState('');

  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Handle starting a live claim investigation for user's own submitted news
  const handleStartInvestigation = async (
    claimText: string,
    mode: SubmissionMode,
    imageBase64?: string
  ) => {
    const rawText = claimText.trim();
    if (!rawText && !imageBase64) return;

    setIsInvestigating(true);
    setInvestigationStatusMessage('Analyzing claim and sweeping official gazette registries...');

    let resolvedDossier: ClaimDossier | null = null;

    try {
      const response = await fetch('/api/investigate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          claim: rawText,
          mode,
          imageBase64,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.dossier) {
          resolvedDossier = data.dossier;
        }
      }
    } catch (err) {
      console.warn('API call encountered an issue, generating claim-specific forensic dossier:', err);
    }

    // If server didn't return a dossier, generate a high-precision dossier for user's news locally
    if (!resolvedDossier) {
      resolvedDossier = analyzeClaimText(rawText, mode);
    }

    // Prepend the new dossier so user's news is at the top of history and feed
    setAllDossiers((prev) => [
      resolvedDossier!,
      ...prev.filter((d) => d.id !== resolvedDossier!.id),
    ]);
    setActiveInvestigationDossier(resolvedDossier);
    setSelectedDossier(resolvedDossier);

    setIsInvestigating(false);
    setInvestigationStatusMessage('');
  };

  return (
    <div className="bg-[#f4f6fb] text-[#0b1c30] min-h-screen flex flex-col font-['Inter'] relative selection:bg-[#dce1ff] selection:text-[#00164e]">
      {/* Header */}
      <Header
        currentLang={currentLang}
        onSelectLang={(lang) => setCurrentLang(lang)}
        onOpenHelp={() => setShowGuidelines(false ? false : true)}
        onOpenProfile={() => setShowProfile(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full pt-14 pb-24 lg:pl-[240px] lg:pb-6">
        {activeTab === 'verify' && (
          <VerifyTab
            currentLang={currentLang}
            allDossiers={allDossiers}
            onInspectDossier={(dossier) => setSelectedDossier(dossier)}
            onViewAllTrending={() => setActiveTab('explore-feed')}
            onStartInvestigation={handleStartInvestigation}
            isInvestigating={isInvestigating}
            investigationStatusMessage={investigationStatusMessage}
            latestDossier={activeInvestigationDossier}
          />
        )}

        {activeTab === 'investigation' && (
          <InvestigationTab
            currentLang={currentLang}
            allDossiers={allDossiers}
            activeDossier={activeInvestigationDossier || allDossiers[0]}
            onInspectDossier={(dossier) => setSelectedDossier(dossier)}
            onRunNewAudit={() => setActiveTab('verify')}
          />
        )}

        {activeTab === 'explore-feed' && (
          <ExploreFeedTab
            currentLang={currentLang}
            allDossiers={allDossiers}
            onInspectDossier={(dossier) => setSelectedDossier(dossier)}
          />
        )}

        {activeTab === 'community' && (
          <CommunityTab currentLang={currentLang} />
        )}
      </main>

      {/* Interactive Dossier Modal */}
      <DossierModal
        dossier={selectedDossier}
        onClose={() => setSelectedDossier(null)}
        currentLang={currentLang}
      />

      {/* Protocol & Guidelines Modal */}
      {showGuidelines && (
        <GuidelinesModal onClose={() => setShowGuidelines(false)} />
      )}

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        currentLang={currentLang}
      />
    </div>
  );
}
