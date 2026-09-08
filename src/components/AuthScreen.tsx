import React, { useState, useEffect } from 'react';
import { GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiProviders } from '../api/auth';

// The gate shown to signed-out visitors. This is a buying surface, so the copy
// addresses the parent; the app itself addresses the student.
export const AuthScreen: React.FC = () => {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Age gate: required at account creation so RoundsAhead stays 13+ and COPPA
  // does not apply. Self-attestation — we don't collect a minor's birth date.
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [providers, setProviders] = useState<{ google: boolean; apple: boolean }>({ google: false, apple: false });

  const isSignup = mode === 'signup';

  // Discover which social sign-ins are configured, and surface OAuth errors
  // passed back on the redirect (?auth_error=google|apple).
  useEffect(() => {
    apiProviders().then(setProviders);
    const params = new URLSearchParams(window.location.search);
    const authErr = params.get('auth_error');
    if (authErr) {
      setError(`We couldn't sign you in with ${authErr === 'apple' ? 'Apple' : 'Google'}. Please try again.`);
      params.delete('auth_error');
      const q = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Enter your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (isSignup && !ageConfirmed) {
      setError('Please confirm you’re 13 or older (or a parent/guardian) to create an account.');
      return;
    }

    setSubmitting(true);
    const { error: err } = isSignup
      ? await signup(email, password)
      : await login(email, password);
    setSubmitting(false);
    if (err) setError(err);
    // On success, AuthProvider sets the user and the app renders.
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 font-sans text-slate-900">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/20 mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="text-2xl font-black tracking-tight">
            Rounds<span className="text-brand-600">Ahead</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">The road to medicine starts in high school.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h1 className="text-lg font-bold mb-1">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-slate-500 mb-5">
            {isSignup
              ? 'Set up your family account to start planning.'
              : 'Sign in to your family account.'}
          </p>

          {(providers.google || providers.apple) && (
            <div className="space-y-2.5 mb-5">
              {providers.google && (
                <a
                  href="/api/auth/google"
                  onClick={(e) => {
                    if (isSignup && !ageConfirmed) {
                      e.preventDefault();
                      setError('Please confirm you’re 13 or older (or a parent/guardian) to create an account.');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2.5 border border-slate-300 rounded-lg py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 34.6 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.6 5.6C39.8 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5z"/>
                  </svg>
                  Continue with Google
                </a>
              )}
              {providers.apple && (
                <a
                  href="/api/auth/apple"
                  onClick={(e) => {
                    if (isSignup && !ageConfirmed) {
                      e.preventDefault();
                      setError('Please confirm you’re 13 or older (or a parent/guardian) to create an account.');
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2.5 bg-black text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </a>
              )}
              <div className="flex items-center gap-3 pt-1">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-xs text-slate-400 font-medium">or</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
              <input
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                placeholder={isSignup ? 'At least 8 characters' : 'Your password'}
              />
            </div>

            {isSignup && (
              <label className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span>
                  I’m 13 or older, or a parent/guardian creating this account, and I agree to the{' '}
                  <a href="/terms" className="text-brand-600 hover:text-brand-700 font-semibold">Terms</a> and{' '}
                  <a href="/privacy" className="text-brand-600 hover:text-brand-700 font-semibold">Privacy Policy</a>.
                </span>
              </label>
            )}

            {error && (
              <p className="text-sm text-rose-600 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-semibold text-sm py-2.5 rounded-lg transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-slate-500">
            {isSignup ? 'Already have an account?' : 'New to RoundsAhead?'}{' '}
            <button
              onClick={() => {
                setMode(isSignup ? 'login' : 'signup');
                setError(null);
              }}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              {isSignup ? 'Sign in' : 'Create an account'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Pre-health pathway planning for high school students and their families.
        </p>
        <p className="text-center text-xs text-slate-400 mt-2">
          <a href="/privacy" className="hover:text-slate-600">Privacy</a>
          <span className="mx-1.5">·</span>
          <a href="/terms" className="hover:text-slate-600">Terms</a>
        </p>
      </div>
    </div>
  );
};
