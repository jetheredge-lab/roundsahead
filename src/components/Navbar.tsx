import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  GraduationCap, 
  Search, 
  CheckSquare, 
  Calendar, 
  User, 
  FileText, 
  PenTool, 
  MapPin, 
  Download, 
  Upload, 
  RefreshCw,
  Sparkles,
  Stethoscope,
  LogOut,
  Trash2,
  Scale,
  CalendarRange,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getBillingStatus, startCheckout, openBillingPortal } from '../api/billing';
import { isPaidFeature } from '../lib/entitlement';
import { Modal } from './common/Modal';

export type TabType = 
  | 'dashboard' 
  | 'career_pathways' 
  | 'colleges' 
  | 'final_five' 
  | 'timeline' 
  | 'profile' 
  | 'resume' 
  | 'essays'
  | 'campus_visits'
  | 'award_letters'
  | 'course_planner';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const {
    profile,
    readinessScore,
    finalFive,
    loadSampleData,
    resetAllData,
    exportDataJSON,
    importDataJSON,
    syncStatus,
    students,
    currentStudentId,
    selectStudent,
    addStudent,
    deleteStudent
  } = useApp();

  const { user, logout, deleteAccount, refresh } = useAuth();

  const [billing, setBilling] = useState<{ enabled: boolean; hasCustomer: boolean }>({ enabled: false, hasCustomer: false });
  const isPro = !!user?.active;

  // Load billing availability, and refresh entitlement after returning from
  // Stripe Checkout (?upgraded=1) — the webhook may land a beat after redirect.
  useEffect(() => {
    getBillingStatus().then((s) => setBilling({ enabled: s.enabled, hasCustomer: s.hasCustomer }));
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === '1') {
      const bump = () => { refresh(); getBillingStatus().then((s) => setBilling({ enabled: s.enabled, hasCustomer: s.hasCustomer })); };
      setTimeout(bump, 1500);
      setTimeout(bump, 4000);
      params.delete('upgraded');
      const q = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''));
    }
  }, [refresh]);

  const syncMeta: Record<typeof syncStatus, { label: string; dot: string; text: string }> = {
    local: { label: 'Local only', dot: 'bg-slate-400', text: 'text-slate-500' },
    syncing: { label: 'Saving…', dot: 'bg-amber-400 animate-pulse', text: 'text-amber-600' },
    synced: { label: 'Synced', dot: 'bg-emerald-500', text: 'text-emerald-600' },
    offline: { label: 'Offline', dot: 'bg-rose-400', text: 'text-rose-600' },
  };
  const sync = syncMeta[syncStatus];

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [importError, setImportError] = useState(false);

  const navTabs: { id: TabType; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Compass className="w-4 h-4" /> },
    { id: 'career_pathways', label: 'Career Pathways', icon: <Stethoscope className="w-4 h-4 text-emerald-600" /> },
    { id: 'colleges', label: 'College Matcher', icon: <Search className="w-4 h-4" /> },
    { 
      id: 'final_five', 
      label: 'Final 5 Package', 
      icon: <CheckSquare className="w-4 h-4 text-indigo-600" />,
      badge: `${finalFive.length}/5`
    },
    { id: 'timeline', label: 'Timeline & Deadlines', icon: <Calendar className="w-4 h-4" /> },
    { id: 'course_planner', label: 'Course Planner', icon: <CalendarRange className="w-4 h-4 text-indigo-600" /> },
    { id: 'profile', label: 'Student Portfolio', icon: <User className="w-4 h-4" /> },
    { id: 'resume', label: 'Resume & Brag Sheet', icon: <FileText className="w-4 h-4" /> },
    { id: 'essays', label: 'Essay & Letter Studio', icon: <PenTool className="w-4 h-4" /> },
    { id: 'campus_visits', label: 'Campus Visits', icon: <MapPin className="w-4 h-4" /> },
    { id: 'award_letters', label: 'Award Letters', icon: <Scale className="w-4 h-4 text-emerald-600" /> },
  ];

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(exportDataJSON());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleImport = () => {
    if (!importJsonText.trim()) return;
    const success = importDataJSON(importJsonText);
    if (success) {
      setIsBackupModalOpen(false);
      setImportJsonText('');
      setImportError(false);
      alert('Data imported successfully!');
    } else {
      setImportError(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        {/* Top bar with Branding, Readiness Score, Profile Summary & Actions */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-black tracking-tight text-slate-900">
                    Rounds<span className="text-brand-600">Ahead</span>
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-100 text-brand-800">
                    Pre-Health
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">Pre-health pathway planning for high school students</p>
              </div>
            </div>

            {/* Quick Readiness Score Gauge & Action Buttons */}
            <div className="flex items-center space-x-3 sm:space-x-4">

              {/* Student switcher (parent with multiple kids) */}
              {students.length > 0 && (
                <select
                  value={currentStudentId ?? ''}
                  onChange={(e) => {
                    if (e.target.value === '__add__') addStudent();
                    else selectStudent(e.target.value);
                  }}
                  className="hidden md:block text-xs font-semibold rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[180px]"
                  title="Switch student"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {(s.fullName || 'Unnamed student') + ' · ' + s.gradYear}
                    </option>
                  ))}
                  <option value="__add__">+ Add student</option>
                </select>
              )}

              {/* Junior Readiness Chip */}
              <div 
                className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-full px-3.5 py-1.5 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => setActiveTab('profile')}
                title="Your Junior Year College Admissions Readiness"
              >
                <div className="flex flex-col text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">Junior Readiness</span>
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {profile.fullName || 'Student'} • {readinessScore}% Ready
                  </span>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center relative">
                  <svg className="w-8 h-8 transform -rotate-90">
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      stroke="#e2e8f0"
                      strokeWidth="3"
                      fill="none"
                    />
                    <circle
                      cx="16"
                      cy="16"
                      r="12"
                      stroke={readinessScore >= 80 ? '#10b981' : readinessScore >= 50 ? '#0e8ce9' : '#f59e0b'}
                      strokeWidth="3"
                      strokeDasharray={75.4}
                      strokeDashoffset={75.4 - (75.4 * readinessScore) / 100}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="text-[9px] font-black absolute text-slate-700">{readinessScore}</span>
                </div>
              </div>

              {/* Sample Profile loader */}
              <button
                onClick={loadSampleData}
                className="flex items-center space-x-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors shadow-sm"
                title="Reset or load realistic pre-med & CRNA student profile"
              >
                <Sparkles className="w-3.5 h-3.5 text-brand-600" />
                <span className="hidden sm:inline">Load Sample Profile</span>
              </button>

              {/* Upgrade / Pro */}
              {billing.enabled && !isPro && (
                <button
                  onClick={async () => { const err = await startCheckout(); if (err) alert(err); }}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm transition-colors"
                  title="Unlock the full RoundsAhead"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upgrade</span>
                </button>
              )}
              {isPro && (
                <span
                  className="hidden sm:flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg text-amber-700 bg-amber-50 border border-amber-200"
                  title="Pro — thank you"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Pro
                </span>
              )}

              {/* Cloud sync status */}
              <div
                className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                title={`Cloud sync: ${sync.label}`}
              >
                <span className={`w-2 h-2 rounded-full ${sync.dot}`} />
                <span className={`text-[11px] font-semibold ${sync.text}`}>{sync.label}</span>
              </div>

              {/* Data Backup / Sync */}
              <button
                onClick={() => setIsBackupModalOpen(true)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Backup, restore, or account settings"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Sign out */}
              <button
                onClick={() => logout()}
                className="flex items-center gap-1.5 p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                title={user ? `Signed in as ${user.email} — sign out` : 'Sign out'}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline text-xs font-semibold max-w-[140px] truncate">{user?.email}</span>
              </button>
            </div>
          </div>

          {/* Navigation Bar Tabs */}
          <div className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none pt-1">
            {navTabs.map(tab => {
              const isActive = activeTab === tab.id;
              const locked = isPaidFeature(tab.id) && !isPro;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  title={locked ? `${tab.label} — part of RoundsAhead Pro` : undefined}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {locked && (
                    <Lock className={`w-3 h-3 ${isActive ? 'text-amber-300' : 'text-amber-500'}`} />
                  )}
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-brand-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Backup / Export / Import Modal */}
      <Modal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        title="Backup & Restore Student Application Data"
        subtitle="Your data syncs automatically to your private cloud account and is cached in this browser. You can also export or restore a JSON backup file."
      >
        <div className="space-y-6">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center space-x-2">
              <Download className="w-4 h-4 text-brand-600" />
              <span>Export Application Portfolio</span>
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Export all colleges, essays, timeline tasks, clinical hours, and student profile as a JSON backup.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleCopyJSON}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                {copySuccess ? 'Copied to Clipboard! ✓' : 'Copy JSON Backup'}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Import / Restore Data</span>
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              Paste a previously exported JSON backup to restore all profile data.
            </p>
            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste exported JSON text here..."
              rows={4}
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            />
            {importError && (
              <p className="text-xs text-rose-600 font-medium mt-1">
                Invalid JSON format. Please check your backup data and try again.
              </p>
            )}
            <div className="mt-3 flex justify-end">
              <button
                onClick={handleImport}
                disabled={!importJsonText.trim()}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                Restore Data
              </button>
            </div>
          </div>

          {/* Plan / billing */}
          {billing.enabled && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Plan</span>
              </h4>
              {isPro ? (
                <>
                  <p className="text-xs text-slate-600 mb-3">
                    You're on <span className="font-semibold text-amber-700">RoundsAhead Pro</span>
                    {user?.entitlementExpiresAt ? <> · access through {new Date(user.entitlementExpiresAt).toLocaleDateString()}</> : null}.
                  </p>
                  {billing.hasCustomer && (
                    <button
                      onClick={async () => { const err = await openBillingPortal(); if (err) alert(err); }}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Manage billing &amp; receipts
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-600 mb-3">You're on the free plan. Upgrade to unlock the full RoundsAhead.</p>
                  <button
                    onClick={async () => { const err = await startCheckout(); if (err) alert(err); }}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                  >
                    Upgrade to Pro
                  </button>
                </>
              )}
            </div>
          )}

          {/* Students */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 mb-1 flex items-center space-x-2">
              <User className="w-4 h-4 text-brand-600" />
              <span>Students on this account</span>
            </h4>
            <p className="text-xs text-slate-600 mb-3">
              You have {students.length} student{students.length === 1 ? '' : 's'}. Add another from the switcher in the top bar.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { addStudent(); }}
                className="px-3 py-1.5 bg-brand-600 text-white text-xs font-semibold rounded-lg hover:bg-brand-700 transition-colors"
              >
                Add student
              </button>
              {currentStudentId && (
                <button
                  onClick={() => {
                    const name = profile.fullName || 'this student';
                    if (window.confirm(`Remove ${name} and all of their data? This cannot be undone.`)) {
                      deleteStudent(currentStudentId);
                    }
                  }}
                  className="px-3 py-1.5 text-rose-600 hover:text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors"
                >
                  Remove current student
                </button>
              )}
            </div>
          </div>

          {/* Account (danger zone) */}
          <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
            <h4 className="text-sm font-bold text-rose-800 mb-1 flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete account</span>
            </h4>
            <p className="text-xs text-rose-700/80 mb-3">
              {user ? <>Signed in as <span className="font-semibold">{user.email}</span>. </> : null}
              Permanently deletes your account and all saved data. This cannot be undone.
            </p>
            <button
              onClick={async () => {
                if (!window.confirm('Delete your account and all saved data? This cannot be undone.')) return;
                if (!window.confirm('This is permanent. Delete your account now?')) return;
                const ok = await deleteAccount();
                if (!ok) alert('Could not delete the account. Please try again.');
                // On success the app returns to the sign-in screen automatically.
              }}
              className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors"
            >
              Delete my account
            </button>
          </div>

          <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to reset all profile data to blank?")) {
                  resetAllData();
                  setIsBackupModalOpen(false);
                }
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium flex items-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset to Blank Profile</span>
            </button>
            <button
              onClick={() => setIsBackupModalOpen(false)}
              className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
