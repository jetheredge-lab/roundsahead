import React, { useState } from 'react';
import { Lock, Sparkles, Check } from 'lucide-react';
import { startCheckout } from '../api/billing';
import type { TabType } from './Navbar';

// The one-line pitch shown on the paywall for each paid tab.
const FEATURE_COPY: Partial<Record<TabType, { title: string; blurb: string }>> = {
  final_five: {
    title: 'Final 5 Package',
    blurb: 'Narrow your list to five and track every application requirement to the deadline.',
  },
  timeline: {
    title: 'Timeline & Deadlines',
    blurb: 'A grade-by-grade plan of every task and deadline, from junior year through May 1.',
  },
  course_planner: {
    title: 'Course Planner',
    blurb: 'Map the four-year course sequence a pre-health pathway actually requires.',
  },
  resume: {
    title: 'Resume & Brag Sheet',
    blurb: 'Turn activities and clinical hours into a polished resume and counselor brag sheet.',
  },
  essays: {
    title: 'Essay & Letter Studio',
    blurb: 'Organize every supplemental essay and recommendation request in one place.',
  },
  campus_visits: {
    title: 'Campus Visits',
    blurb: 'Rate and compare campus visits so the decision is grounded in what you saw.',
  },
  award_letters: {
    title: 'Award Letter Comparison',
    blurb: 'Normalize every financial aid offer to real net cost and total four-year borrowing.',
  },
};

interface UpgradeGateProps {
  feature: TabType;
  billingEnabled: boolean;
}

// Shown in place of a paid tab's content when a free account opens it. Doubles
// as the primary conversion surface — the parent buys here on the web, and the
// app (web and mobile) unlocks automatically once the webhook lands.
export const UpgradeGate: React.FC<UpgradeGateProps> = ({ feature, billingEnabled }) => {
  const [busy, setBusy] = useState(false);
  const copy = FEATURE_COPY[feature] ?? {
    title: 'RoundsAhead Pro',
    blurb: 'Unlock the full planning toolkit.',
  };

  const onUpgrade = async () => {
    setBusy(true);
    const err = await startCheckout();
    if (err) {
      alert(err);
      setBusy(false);
    }
    // On success the browser is redirected to Stripe, so no need to reset busy.
  };

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-8 shadow-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white mx-auto shadow-md shadow-amber-500/20">
          <Lock className="w-7 h-7" />
        </div>

        <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">{copy.blurb}</p>

        <div className="mt-6 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
          <Sparkles className="w-3.5 h-3.5" />
          Part of RoundsAhead Pro
        </div>

        <ul className="mt-6 text-left max-w-sm mx-auto space-y-2">
          {[
            'One-time purchase — a full year of access',
            'Every planning tool, for every student on your account',
            'Free college search & pathway explorer stay free',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-sm text-slate-700">
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        {billingEnabled ? (
          <button
            onClick={onUpgrade}
            disabled={busy}
            className="mt-7 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-sm transition-colors disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {busy ? 'Starting checkout…' : 'Upgrade to Pro'}
          </button>
        ) : (
          <p className="mt-7 text-sm text-slate-500">Upgrades aren’t available right now — check back soon.</p>
        )}
      </div>
    </div>
  );
};
