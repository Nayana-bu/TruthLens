import React, { useState, useEffect } from 'react';
import { TabType, Language, ClaimDossier, SubmissionMode, UserSession } from './types';
import { INITIAL_DOSSIERS } from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { DashboardView } from './components/DashboardView';
import { AuthPage } from './components/AuthPage';
import { AuthorityDirectoryModal } from './components/AuthorityDirectoryModal';
import { InvestigationTab } from './components/InvestigationTab';
import { ExploreFeedTab } from './components/ExploreFeedTab';
import { CommunityTab } from './components/CommunityTab';
import { DossierModal } from './components/DossierModal';
import { GuidelinesModal } from './components/GuidelinesModal';
import { ProfileModal } from './components/ProfileModal';
import { analyzeClaimText } from './utils/claimAnalyzer';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<TabType>('verify');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [allDossiers, setAllDossiers] = useState<ClaimDossier[]>(() => {
    try {
      const saved = localStorage.getItem('truthlens_dossiers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse error
    }
    return INITIAL_DOSSIERS;
  });

  const [selectedDossier, setSelectedDossier] = useState<ClaimDossier | null>(null);

  // Active investigation dossier defaults to the first dossier (matching the uploaded image)
  const [activeInvestigationDossier, setActiveInvestigationDossier] = useState<ClaimDossier>(() => {
    try {
      const saved = sessionStorage.getItem('truthlens_active_investigation');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse error
    }
    return INITIAL_DOSSIERS[0];
  });

  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationStatusMessage, setInvestigationStatusMessage] = useState('');

  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuthorities, setShowAuthorities] = useState(false);

  // Authenticated user session persisted in localStorage
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved =
        localStorage.getItem('truthlens_user_session') ||
        sessionStorage.getItem('truthlens_user_session');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore parse error
    }
    return null;
  });

  const handleLogout = () => {
    try {
      localStorage.removeItem('truthlens_user_session');
      sessionStorage.removeItem('truthlens_user_session');
    } catch {
      // Ignore
    }
    setCurrentUser(null);
  };

  // Sync active dossier to sessionStorage
  useEffect(() => {
    if (activeInvestigationDossier) {
      sessionStorage.setItem(
        'truthlens_active_investigation',
        JSON.stringify(activeInvestigationDossier)
      );
    }
  }, [activeInvestigationDossier]);

  // Persist dossiers list in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('truthlens_dossiers', JSON.stringify(allDossiers));
    } catch {
      // Ignore quota error
    }
  }, [allDossiers]);

  // Handle live claim investigation
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
      console.warn('API call issue, falling back to local forensic engine:', err);
    }

    if (!resolvedDossier) {
      resolvedDossier = analyzeClaimText(rawText, mode);
    }

    setAllDossiers((prev) => [
      resolvedDossier!,
      ...prev.filter((d) => d.id !== resolvedDossier!.id),
    ]);

    setActiveInvestigationDossier(resolvedDossier);
    setIsInvestigating(false);
    setInvestigationStatusMessage('');
    setActiveTab('verify');
  };

  // Gated Authentication view
  if (!currentUser) {
    return <AuthPage onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="bg-[#f8fafc] text-[#0f172a] min-h-screen flex font-['Inter'] relative selection:bg-[#dce1ff] selection:text-[#00164e]">
      {/* 1. Desktop Left Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          activeTab={activeTab}
          onChangeTab={(tab) => {
            setActiveTab(tab);
          }}
          currentLang={currentLang}
          onOpenAuthorities={() => setShowAuthorities(true)}
          onOpenSettings={() => setShowProfile(true)}
        />
      </div>

      {/* Mobile Drawer Overlay for Sidebar */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden flex"
          onClick={() => setIsMobileSidebarOpen(false)}
        >
          <div
            className="w-64 max-w-[80vw] h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              activeTab={activeTab}
              onChangeTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              currentLang={currentLang}
              onOpenAuthorities={() => {
                setShowAuthorities(true);
                setIsMobileSidebarOpen(false);
              }}
              onOpenSettings={() => {
                setShowProfile(true);
                setIsMobileSidebarOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 flex flex-col max-w-[1440px] mx-auto w-full">
        {/* Top Header Bar (Language, Help, Notifications, Avatar) */}
        <TopHeader
          currentLang={currentLang}
          onSelectLang={(lang) => setCurrentLang(lang)}
          onOpenHelp={() => setShowGuidelines(true)}
          onOpenProfile={() => setShowProfile(true)}
          currentUser={currentUser}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Tab 1: Home / Verify Dashboard (Exact layout from lens.jpeg) */}
        {activeTab === 'verify' && (
          <DashboardView
            currentLang={currentLang}
            activeDossier={activeInvestigationDossier}
            allDossiers={allDossiers}
            onSelectDossier={(dossier) => setActiveInvestigationDossier(dossier)}
            onStartInvestigation={handleStartInvestigation}
            isInvestigating={isInvestigating}
            investigationStatusMessage={investigationStatusMessage}
            onOpenAuthorities={() => setShowAuthorities(true)}
            onViewAllTrending={() => setActiveTab('explore-feed')}
          />
        )}

        {/* Tab 2: My Investigations & Forensic Dossier Explorer */}
        {activeTab === 'investigation' && (
          <InvestigationTab
            currentLang={currentLang}
            allDossiers={allDossiers}
            activeDossier={activeInvestigationDossier}
            onInspectDossier={(dossier) => {
              setActiveInvestigationDossier(dossier);
              setActiveTab('verify');
            }}
            onRunNewAudit={() => setActiveTab('verify')}
          />
        )}

        {/* Tab 3: Trending Verifications & Feed */}
        {activeTab === 'explore-feed' && (
          <ExploreFeedTab
            currentLang={currentLang}
            allDossiers={allDossiers}
            onInspectDossier={(dossier) => {
              setActiveInvestigationDossier(dossier);
              setActiveTab('verify');
            }}
          />
        )}

        {/* Tab 4: Civic Community Collective */}
        {activeTab === 'community' && <CommunityTab currentLang={currentLang} />}
      </main>

      {/* Interactive Dossier Modal */}
      <DossierModal
        dossier={selectedDossier}
        onClose={() => setSelectedDossier(null)}
        currentLang={currentLang}
      />

      {/* Guidelines Modal */}
      {showGuidelines && <GuidelinesModal onClose={() => setShowGuidelines(false)} />}

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal
          onClose={() => setShowProfile(false)}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* Official Authorities Directory */}
      {showAuthorities && (
        <AuthorityDirectoryModal
          onClose={() => setShowAuthorities(false)}
          currentLang={currentLang}
        />
      )}
    </div>
  );
}
