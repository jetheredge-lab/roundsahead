// Canonical free/paid feature policy (Phase 9).
//
// This is the single source of truth for which parts of the app require an
// active paid entitlement. It is intentionally platform-agnostic — the web app
// keys tabs by these exact strings, and the mobile app maps its routes onto
// them. The server enforces the same policy independently by attaching the
// `requirePaid` middleware to the matching write endpoints (see
// server/src/routes/students.ts); the client checks below are UX only and are
// never trusted as the boundary.
//
// Decision (see docs/roundsahead-launch-plan.md, Phase 9): the free tier is the
// acquisition surface and the "try before you buy" — College Matcher (search +
// net price), the shallow pathway explorer, the student profile, and the
// dashboard. Everything that produces the planning/decision artifacts a family
// pays for is gated.

export const FREE_FEATURES = [
  'dashboard',
  'career_pathways',
  'colleges',
  'profile',
] as const;

export const PAID_FEATURES = [
  'final_five',
  'timeline',
  'course_planner',
  'resume',
  'essays',
  'campus_visits',
  'award_letters',
] as const;

export type FreeFeature = (typeof FREE_FEATURES)[number];
export type PaidFeature = (typeof PAID_FEATURES)[number];
export type FeatureKey = FreeFeature | PaidFeature;

const PAID_SET: ReadonlySet<string> = new Set(PAID_FEATURES);

// Whether a feature key requires a paid entitlement. Unknown keys are treated
// as free (fail-open in the UI only — the server is the real gate).
export function isPaidFeature(key: string): boolean {
  return PAID_SET.has(key);
}
