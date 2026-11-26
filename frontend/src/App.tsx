import React, { useState, useEffect } from 'react';
import type { TabType, Language, ClaimDossier, SubmissionMode, UserSession, InvestigationStatistics } from './types';
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
import {
  deleteInvestigationRequest,
  fetchInvestigationsAndStats,
  investigateClaimRequest,
  updateInvestigationRequest,
} from './services/investigationService';
import { clearUserSession, getStoredUserSession } from './services/authService';

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<TabType>('verify');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Real database-backed investigations
  const [allDossiers, setAllDossiers] = useState<ClaimDossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<ClaimDossier | null>(null);
  const [activeInvestigationDossier, setActiveInvestigationDossier] = useState<ClaimDossier | null>(null);

  // Genuine computed statistics
  const [statistics, setStatistics] = useState<InvestigationStatistics>({
    total: 0,
    trueCount: 0,
    truePercent: 0,
    fakeCount: 0,
    fakePercent: 0,
    misleadingCount: 0,
    misleadingPercent: 0,
    partlyTrueCount: 0,
    partlyTruePercent: 0,
    unverifiedCount: 0,
    unverifiedPercent: 0,
    contextMissingCount: 0,
    contextMissingPercent: 0,
  });

  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigationStatusMessage, setInvestigationStatusMessage] = useState('');

  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuthorities, setShowAuthorities] = useState(false);

  // Authenticated user session persisted in localStorage
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => getStoredUserSession());

  const handleLogout = () => {
    clearUserSession();
    setCurrentUser(null);
  };

  // Fetch real persistent investigations & statistics on load
  const refreshInvestigationsAndStats = async () => {
    try {
      const { dossiers, statistics: stats } = await fetchInvestigationsAndStats();
      if (dossiers) {
        setAllDossiers(dossiers);
        setActiveInvestigationDossier((prev) => {
          if (prev) {
            const matched = dossiers.find((d) => d.id === prev.id);
            if (matched) return matched;
          }
          return dossiers.length > 0 ? dossiers[0] : null;
        });
      }
      if (stats) {
        setStatistics(stats);
      }
    } catch (err) {
      console.warn('Error fetching investigations or statistics:', err);
    }
  };

  useEffect(() => {
    refreshInvestigationsAndStats();
  }, []);

  // Handle individual deletion with backend persistence and stat recalculation
  const handleDeleteInvestigation = async (id: string): Promise<boolean> => {
    try {
      const result = await deleteInvestigationRequest(id);
      if (result.ok) {
        setAllDossiers((prev) => {
          const updated = prev.filter((d) => d.id !== id);
          if (activeInvestigationDossier?.id === id) {
            setActiveInvestigationDossier(updated.length > 0 ? updated[0] : null);
          }
          return updated;
        });

        if (result.statistics) {
          setStatistics(result.statistics);
        } else {
          refreshInvestigationsAndStats();
        }
        return true;
      }
    } catch (err) {
      console.error('Failed to delete investigation:', err);
    }
    return false;
  };

  // Handle edit investigation with full re-verification and state update
  const handleEditInvestigation = async (
    id: string,
    newClaimText: string
  ): Promise<{ success: boolean; dossier?: ClaimDossier; error?: string }> => {
    try {
      const data = await updateInvestigationRequest({
        id,
        claim: newClaimText,
        language: currentLang,
      });

      if (data.success && data.dossier) {
        const updatedDossier: ClaimDossier = data.dossier;

        setAllDossiers((prev) =>
          prev.map((d) => (d.id === id ? updatedDossier : d))
        );

        setActiveInvestigationDossier((prev) =>
          prev?.id === id ? updatedDossier : prev
        );

        if (data.statistics) {
          setStatistics(data.statistics);
        } else {
          refreshInvestigationsAndStats();
        }

        return { success: true, dossier: updatedDossier };
      }
      return {
        success: false,
        error: data.error || 'Failed to update and re-investigate claim.',
      };
    } catch (err: any) {
      console.error('Failed to edit investigation:', err);
      return {
        success: false,
        error: err?.message || 'Network error while re-investigating claim.',
      };
    }
  };

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
      resolvedDossier = await investigateClaimRequest({
        claim: rawText,
        mode,
        imageBase64,
        language: currentLang,
      });
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

    // Refresh live statistics from backend database
    refreshInvestigationsAndStats();
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
            statistics={statistics}
            onSelectDossier={(dossier) => setActiveInvestigationDossier(dossier)}
            onStartInvestigation={handleStartInvestigation}
            onDeleteDossier={handleDeleteInvestigation}
            onEditDossier={handleEditInvestigation}
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
            statistics={statistics}
            onInspectDossier={(dossier) => {
              setActiveInvestigationDossier(dossier);
              setActiveTab('verify');
            }}
            onDeleteInvestigation={handleDeleteInvestigation}
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
