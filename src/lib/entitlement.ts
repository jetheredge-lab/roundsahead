// Free/paid feature policy for the web app (Phase 9).
//
// Web copy of shared/lib/entitlement.ts — the web app keeps its own src/lib
// mirror (as it does for readiness/awardLetter/coursePlan). The canonical
// policy and rationale live in shared/lib/entitlement.ts, and the server
// enforces the same boundary independently. These keys match Navbar's TabType
// exactly, so `isPaidFeature(activeTab)` gates a tab directly.

export const PAID_FEATURES = [
  'final_five',
  'timeline',
  'course_planner',
  'resume',
  'essays',
  'campus_visits',
  'award_letters',
] as const;

const PAID_SET: ReadonlySet<string> = new Set(PAID_FEATURES);

export function isPaidFeature(key: string): boolean {
  return PAID_SET.has(key);
}
