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
Phase 10 — compliance (end user is a minor). Auth (Phase 2), storage (Phase 3),
web features through Phase 6, the mobile port (Phase 8), and payments (Phase 9)
are done. Payments use Option A: Stripe hosted Checkout → a one-time 12-month
per-account license; entitlement is enforced server-side via `requirePaid`, and
the free/paid policy lives in `shared/lib/entitlement.ts` (free = College
Matcher, pathway explorer, profile, dashboard). Phase 10 engineering is done: a
13+ self-attestation age gate at signup (web + mobile, no DOB collected),
hosted Privacy/Terms (`landing/`) linked in-app, and the AI/content position
stated in the policy (no training on user content). Store-questionnaire
mappings + data-minimization audit: `docs/roundsahead-store-compliance.md`.
Remaining Phase 10 is account-side/legal (submit store forms, counsel review).
WIP branch: `feat/phase8-mobile-timeline-finalfive`.

## Non-negotiables
- Every pathway fact needs sourceUrl + lastVerified
- No SAI estimator, no aid recommendations, no essay generation
- Address the parent on buying surfaces, the student in-app.
