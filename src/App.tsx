import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import MobileNav from './components/MobileNav';

// Views
import MapView from './views/MapView';
import ReportView from './views/ReportView';
import IssueDetailView from './views/IssueDetailView';
import DashboardView from './views/DashboardView';
import ImpactView from './views/ImpactView';
import AuthorityView from './views/AuthorityView';

import { Issue, User } from './types';

export default function App() {
  const [activeView, setActiveView] = useState<string>('map');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load active user and fetch seeded issues on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Auto Login/Create Demo User
        const loginRes = await fetch('/api/users/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'demo@communityhero.in',
            name: 'Demo Citizen'
          })
        });
        if (loginRes.ok) {
          const user = await loginRes.json();
          setCurrentUser(user);
        }

        // 2. Fetch Issues
        await fetchIssues();
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const fetchIssues = async () => {
    try {
      const response = await fetch('/api/issues');
      if (response.ok) {
        const data = await response.json();
        setIssues(data);
      }
    } catch (e) {
      console.error('Failed to fetch issues:', e);
    }
  };

  // Re-fetch current user profile to synchronize level and XP
  const refreshUser = async () => {
    if (!currentUser) return;
    try {
      const response = await fetch(`/api/users/${currentUser.id}`);
      if (response.ok) {
        const updatedUser = await response.json();
        setCurrentUser(updatedUser);
      }
    } catch (e) {
      console.error('Failed to sync user profile:', e);
    }
  };

  const handleNavigate = (view: string) => {
    setActiveView(view);
    setSelectedIssueId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Keep user state synchronized
    refreshUser();
  };

  const handleNavigateToIssue = (issueId: string) => {
    setSelectedIssueId(issueId);
    setActiveView('issue');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshUser();
  };

  const handleBackToMap = () => {
    setActiveView('map');
    setSelectedIssueId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshUser();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 font-sans" id="app-initial-loader">
        <span className="border-4 border-slate-200 border-t-blue-600 rounded-full w-12 h-12 animate-spin block mb-4" />
        <h1 className="text-xl font-bold text-slate-800 font-display">Initializing Community Hero...</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Booting Bengaluru Hyperlocal Engine</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans antialiased pb-16 md:pb-0" id="app-root">
      {/* Desktop sticky navbar */}
      <Navbar
        activeView={activeView}
        onNavigate={handleNavigate}
        currentUser={currentUser}
      />

      {/* Main Container Stage */}
      <main className="flex-1 w-full" id="view-renderer-container">
        {activeView === 'map' && (
          <MapView
            issues={issues}
            onNavigateToIssue={handleNavigateToIssue}
          />
        )}

        {activeView === 'report' && (
          <ReportView
            currentUser={currentUser}
            onNavigateToIssue={handleNavigateToIssue}
            onRefreshIssues={fetchIssues}
          />
        )}

        {activeView === 'issue' && selectedIssueId && (
          <IssueDetailView
            issueId={selectedIssueId}
            currentUser={currentUser}
            onBack={handleBackToMap}
            onRefreshIssues={fetchIssues}
          />
        )}

        {activeView === 'dashboard' && (
          <DashboardView
            issues={issues}
            onNavigateToIssue={handleNavigateToIssue}
          />
        )}

        {activeView === 'impact' && (
          <ImpactView
            currentUser={currentUser}
            issues={issues}
          />
        )}

        {activeView === 'authority' && (
          <AuthorityView
            issues={issues}
            onNavigateToIssue={handleNavigateToIssue}
            onRefreshIssues={fetchIssues}
          />
        )}
      </main>

      {/* Mobile fixed bottom navigation bar */}
      <MobileNav
        activeView={activeView}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
