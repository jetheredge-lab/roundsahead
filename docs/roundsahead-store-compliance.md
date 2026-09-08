# RoundsAhead — Store Compliance Worksheet (Phase 10)

Fill-in-the-blank source of truth for the store questionnaires and compliance
tasks. Derived from what the code actually collects — keep it in sync when data
flows change. **None of this is legal advice; have counsel review the privacy
policy, terms, and these answers before taking money** (launch plan Phase 10).

Last reviewed: 2026-09-08.

---

## What the app actually collects (the ground truth)

| Data | Where | Category | Linked to user? | Purpose |
|---|---|---|---|---|
| Email address | `users.email` | Contact info | Yes | Auth, account, service email |
| Password hash | `users.passwordHash` | Credentials (not "collected data") | Yes | Auth (argon2/bcrypt hash only) |
| Google/Apple account id | `users.googleId` / `appleId` | Identifier | Yes | OAuth sign-in |
| Stripe customer id + entitlement | `users.stripeCustomerId`, `plan`, `entitlementExpiresAt` | Purchase history | Yes | Manage paid access |
| Student name, grad year, grade | `students.*` | User content / contact (name) | Yes | Planning |
| High school, city, state | `students.*` | User content (coarse location, self-entered) | Yes | Net-price & state-school matching |
| GPA, test scores, coursework | `students.*` | User content (education) | Yes | Readiness, matching |
| Activities, awards | `students.*` | User content | Yes | Resume / brag sheet |
| College lists, Final 5, checklists | `savedColleges`, `finalFive` | User content | Yes | Planning |
| Essay drafts | `essayDrafts` | User content | Yes | Organizing essays |
| Campus-visit notes/ratings | `campusVisits` | User content | Yes | Comparison |
| Financial-aid award letters | `awardLetters` | Financial info (self-entered, the family's own) | Yes | Net-cost comparison |
| Request/error logs | server logs | Diagnostics | Partially | Operate & secure |

Card details never touch our servers (Stripe hosted Checkout).

**Not collected:** no precise location/GPS, no contacts, no device advertising id,
no health/biometric data, no browsing across other apps/sites, no third-party
analytics/ad SDKs. **No tracking. No data sold. No data used for third-party
advertising. No data used to train AI models.**

---

## Apple — App Privacy ("nutrition label")

Set per data type: collected? linked to identity? used for tracking?

- **Contact Info → Email Address** — Collected · Linked · Not for tracking · Purposes: App Functionality, Account Management.
- **Contact Info → Name** (student name) — Collected · Linked · Not for tracking · App Functionality.
- **User Content → Other User Content** (essays, notes, activities, GPA/scores, award letters) — Collected · Linked · Not for tracking · App Functionality.
- **Purchases → Purchase History** — Collected · Linked · Not for tracking · App Functionality.
- **Identifiers → User ID** (our id; OAuth subject id) — Collected · Linked · Not for tracking · App Functionality, Authentication.
- **Diagnostics → Crash / Performance / Other Diagnostic Data** — only if a crash/monitoring SDK (e.g. Sentry, Phase 7d) is added; otherwise mark **Not Collected**. Revisit when Sentry lands.

**"Used for tracking across companies' apps/websites": No** for every type.
No **Sensitive Info** (Apple's defined list — race, health, etc.) is collected.

## Google Play — Data Safety form

- **Personal info:** Name (student), Email address — collected, not shared, processed on our servers, users can request deletion.
- **Financial info:** Purchase history — collected, not shared. (Award-letter figures the family enters are user content, not "collected financial info about the user"; describe under App activity / user content.)
- **App activity / other user-generated content:** essays, notes, college lists, GPA/scores — collected, not shared.
- **App info & performance → Crash logs / Diagnostics:** only if a monitoring SDK is added (see above).
- **Security practices:** Data encrypted in transit — **Yes**. Users can request data deletion — **Yes** (in-app account deletion). Committed to Play Families policy if targeting minors — see age section.
- **Data shared with third parties:** None for advertising. Service providers (Stripe, Google/Apple sign-in, hosting) are processors, not "sharing" in the ad sense — disclose as processing, not sale.

## Age rating / minimum age

- **Minimum age 13+.** Enforced by a self-attestation age gate at signup on both
  web (`src/components/AuthScreen.tsx`) and mobile (`mobile/app/(auth)/sign-in.tsx`):
  "I'm 13 or older, or a parent/guardian creating this account." No birth date is
  collected (data minimization).
- **COPPA:** by staying 13+ and not knowingly collecting under-13 data, COPPA's
  verifiable-parental-consent requirements don't apply. Children's-privacy section
  in the policy states the under-13 posture and a deletion contact.
- **Apple age rating questionnaire:** no objectionable content → content rating is
  low (≈4+/9+), but set the app's availability/marketing to 13+; nothing in the
  content itself raises the rating.
- **Google IARC questionnaire:** expect "Everyone"/"Teen"; answer honestly (no
  violence, no user-to-user comms, no ads). Do **not** opt into the "Designed for
  Families" program (that pulls in stricter under-13 obligations we're avoiding).
- **State app-store age-verification laws (several effective 2026):** review before
  submission; our self-attestation + store-level age signals are the baseline.
  Flagged, not yet legally reviewed.

---

## Data-minimization pass (launch plan Phase 10)

Audit result: collection is already close to minimal — every stored field feeds a
feature.

- Every `students.*` field drives readiness scoring, college matching, net-price,
  the resume/brag sheet, or the pathway comparison. Nothing is collected "just in
  case."
- Essays are **stored only** — never analyzed, scored, or sent anywhere.
- Payment card data is never received (Stripe hosted Checkout); we keep only a
  customer id + entitlement.
- Location is coarse and self-entered (city/state), used for state-school and
  net-price matching. No GPS/precise location.

Open items:
- [ ] **Encryption at rest.** The policy currently claims "encryption in transit
      and access controls." Confirm the Phase 7 managed Postgres (Neon/Supabase)
      encrypts at rest (both do by default) and then upgrade the policy wording to
      "in transit and at rest."
- [ ] **Log retention.** Decide and document how long request/error logs (which may
      include IP) are kept, and trim to what's needed to operate/secure.
- [ ] **Diagnostics SDK.** If Sentry (Phase 7d) is added, update both store forms to
      mark crash/diagnostic data collected.

---

## Remaining Phase 10 work (account-side / legal — not code)

- [ ] Submit the Apple App Privacy answers in App Store Connect (mapping above).
- [ ] Submit the Google Play Data Safety form (mapping above).
- [ ] Complete both age-rating questionnaires.
- [ ] Legal review of the privacy policy + terms before taking money.
- [ ] Review 2026 state age-verification laws for the storefronts you ship in.
