# RoundsAhead

Pre-health pathway planning for high school students.
Buyer is the parent; counselors are the distribution channel.

## Repo location
Local working copy: `~/dev/roundsahead` (moved off `~/Desktop/College Prep` —
React Native's iOS build scripts break on paths containing spaces). The mobile
app requires Node 20 LTS; see the `roundsahead-mobile-dev` memory for the full
local-build setup.

## Planning docs — read before major work
- docs/roundsahead-launch-plan.md — phased build plan
- docs/roundsahead-marketing-plan.md — positioning, messaging, distribution

## Current phase
Phase 9 — payments & entitlement gating. Auth (Phase 2), storage (Phase 3),
web features through Phase 6, and the mobile port (Phase 8) are done. Payments
use Option A: Stripe hosted Checkout → a one-time 12-month per-account license
(`server/src/routes/billing.ts`). Entitlement is enforced server-side via
`requirePaid` on paid write endpoints; the free/paid policy lives in
`shared/lib/entitlement.ts`. Free tier = College Matcher, pathway explorer,
profile, dashboard; everything else is paid. The free tier is the trial;
refunds via the Stripe Customer Portal. Mobile shows a paywall (`LockedFeature`)
with no in-app buy button (Apple-compliant) — a parent buys on the web and the
app unlocks. WIP branch: `feat/phase8-mobile-timeline-finalfive`.

## Non-negotiables
- Every pathway fact needs sourceUrl + lastVerified
- No SAI estimator, no aid recommendations, no essay generation
- Address the parent on buying surfaces, the student in-app.
