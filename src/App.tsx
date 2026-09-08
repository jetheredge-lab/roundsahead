import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Loader2 } from 'lucide-react';
import { Navbar, TabType } from './components/Navbar';
import { UpgradeGate } from './components/UpgradeGate';
import { isPaidFeature } from './lib/entitlement';
import { getBillingStatus } from './api/billing';
import { DashboardView } from './components/tabs/DashboardView';
import { CareerPathwayView } from './components/tabs/CareerPathwayView';
import { CollegeSearchView } from './components/tabs/CollegeSearchView';
import { FinalFiveView } from './components/tabs/FinalFiveView';
import { TimelineView } from './components/tabs/TimelineView';
import { ProfileView } from './components/tabs/ProfileView';
import { ResumeBuilderView } from './components/tabs/ResumeBuilderView';
import { EssayStudioView } from './components/tabs/EssayStudioView';
import { CampusVisitsView } from './components/tabs/CampusVisitsView';
import { AwardLettersView } from './components/tabs/AwardLettersView';
import { CoursePlannerView } from './components/tabs/CoursePlannerView';
import { GraduationCap, Heart, Sparkles } from 'lucide-react';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { user } = useAuth();
  const [billingEnabled, setBillingEnabled] = useState(false);

  useEffect(() => {
    getBillingStatus().then((s) => setBillingEnabled(s.enabled));
  }, []);

  // The client gate is UX only — the server independently enforces entitlement
  // on every paid write endpoint.
  const locked = isPaidFeature(activeTab) && !user?.active;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {locked ? (
          <UpgradeGate feature={activeTab} billingEnabled={billingEnabled} />
        ) : (
          <>
            {activeTab === 'dashboard' && <DashboardView setActiveTab={setActiveTab} />}
            {activeTab === 'career_pathways' && <CareerPathwayView />}
            {activeTab === 'colleges' && <CollegeSearchView setActiveTab={setActiveTab} />}
            {activeTab === 'final_five' && <FinalFiveView setActiveTab={setActiveTab} />}
            {activeTab === 'timeline' && <TimelineView />}
            {activeTab === 'profile' && <ProfileView />}
            {activeTab === 'resume' && <ResumeBuilderView />}
            {activeTab === 'essays' && <EssayStudioView />}
            {activeTab === 'campus_visits' && <CampusVisitsView />}
            {activeTab === 'award_letters' && <AwardLettersView />}
            {activeTab === 'course_planner' && <CoursePlannerView />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-xs">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900">RoundsAhead</span>
            <span>— Pre-health pathway planning for high school students</span>
          </div>

          <div className="flex items-center space-x-4">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className="hover:text-brand-600 transition-colors"
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('career_pathways')} 
              className="hover:text-brand-600 transition-colors"
            >
              MD vs CRNA
            </button>
            <button 
              onClick={() => setActiveTab('colleges')} 
              className="hover:text-brand-600 transition-colors"
            >
              College Matcher
            </button>
            <button 
              onClick={() => setActiveTab('final_five')} 
              className="hover:text-brand-600 transition-colors"
            >
              Final 5 Package
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Gates the app behind authentication: a loading state while the session is
// restored, the auth screen when signed out, the app when signed in.
const Gate: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

export default App;
