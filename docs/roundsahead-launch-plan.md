# RoundsAhead — Web App to Paid Mobile App

*(formerly PathPilot — see Phase 0b for the rebrand checklist)*

Ordered task list. Phase 1 (developer accounts) has multi-week waiting periods —
start it immediately and let it run in the background. Phases 2–6 should be done
on the web app *before* the mobile port, so you don't build the same thing twice
on two platforms. **Track B (distribution) is not a phase and does not wait for
launch** — start it around Phase 4.

Highest-value items across the whole document, if you only do a few things:
Phase 2 (auth, the blocker), 5a (net price by income), 6a (award letter
comparison), and Track B (distribution).

**Companion documents:**
- `roundsahead-marketing-plan.md` — counselor channel, conference calendar, SEO
- `roundsahead-budget.xlsx` — all costs, scenarios, and break-even

Repo: `github.com/jetheredge-lab/pathpilot` → rename to `roundsahead` (Phase 0b)
Domain: `roundsahead.com` (purchased)
Current state: Vite + React 18 + TS + Tailwind SPA (~7,600 LOC), 9 tab views,
one AppContext, localStorage persistence, Express + better-sqlite3 API behind
Cloudflare Tunnel + Access.

---

## Phase 0 — Hygiene (do first, it's an hour)

- [x] Scrub `README.md`: no hardcoded local path remains. (Working copy now lives at `~/dev/roundsahead`.)
- [ ] Scrub README language: "your son's readiness score" → neutral phrasing
- [ ] Rename in `package.json`: `college-prep-navigator` → `roundsahead` (see Phase 0b)
- [ ] Verify no secrets in git history now that the repo is public:
      `git grep -iE "api_key|secret|password|token" $(git rev-list --all) | head -40`
- [ ] Add a `LICENSE` — decide deliberately. A permissive license on a repo you
      intend to sell means anyone can fork and ship it. Consider making the repo
      private again once it's a commercial asset, or split public/private.
- [ ] Add `.editorconfig` / `eslint` / `prettier` if you want consistency before
      the codebase doubles
- [ ] There are currently **zero tests**. Add Vitest + a few tests around the
      readiness score and admission-chance logic before you refactor them.

---

## Phase 0b — Rebrand to RoundsAhead

Name decided: **RoundsAhead**, `roundsahead.com` purchased. Do this before
anything else touches the codebase — every later phase (SEO content, store
listings, counselor materials) bakes the name in, and renaming after those
exist is genuinely expensive.

Old name PathPilot was abandoned due to conflicts: Tormach's PathPilot™ (CNC
software, owns pathpilot.com), a YC-backed PathPilot in lending, and PathPilot
Ltd in the UK. Recorded so it doesn't get revisited.

### Trademark and identity (do first)

- [ ] USPTO search on ROUNDS AHEAD in **class 9** (software) and **class 41**
      (education services) — both, not one
- [ ] Search both app stores for "rounds" — it's a common word, so measure how
      much noise you'd be competing against for ASO
- [ ] Register social handles: @roundsahead on the platforms you'll actually use
- [ ] Optional defensive hold: `shadowrounds.com` (the runner-up). Cheap, but
      don't plan to use it.
- [ ] Trademark attorney clearance search before filing. Cheaper than a second
      rebrand.

### Repository and code

- [ ] Rename the GitHub repo → `roundsahead` (GitHub redirects the old URL, but
      update your local remote: `git remote set-url origin <new>`)
- [ ] `package.json` name: `college-prep-navigator` → `roundsahead`
- [ ] Update `README.md` title and all body references
- [ ] Grep the whole tree for the old name, case-insensitively:
      `grep -rin "pathpilot\|college.prep.navigator" --exclude-dir=node_modules .`
- [ ] Check for the name in: page `<title>` tags, meta description, `manifest.json`,
      `index.html`, favicon/logo assets, PDF export headers, email templates,
      seed data, and test fixtures
- [ ] Update the LICENSE copyright line if it names the project

### Domain and hosting

- [ ] Point `roundsahead.com` at the marketing site (Phase 7a split)
- [ ] `roundsahead.com/app` for the SPA
- [ ] `api.roundsahead.com` for the backend
- [ ] Set up email on the domain: `support@roundsahead.com` and
      `hello@roundsahead.com`. Both stores require a support contact.
- [ ] SPF, DKIM, DMARC records before you send a single transactional email —
      counselor outreach from an unauthenticated domain lands in spam, and
      that's the one channel you can't afford to burn.

### Product surfaces

- [ ] App display name and bundle identifier (`com.roundsahead.app`) — set this
      correctly the first time; the bundle ID cannot be changed after an app is
      published
- [ ] App icon, splash screen, adaptive icon
- [ ] In-app branding: header, footer, About, onboarding
- [ ] App Store subtitle: **Pre-health college planning** (27 chars, under
      Apple's 30-char cap). Google Play short description too.
- [ ] Marketing site hero: **The road to medicine starts in high school.**
- [ ] Reserve *"Let's get you there"* for in-app encouragement only —
      onboarding and milestone moments, not positioning surfaces
- [ ] Copy rule: address the parent on buying surfaces, the student inside
      the app. See Part 0 of the marketing plan.
- [ ] PDF export headers and footers (resume export, pathway handouts)
- [ ] Email templates: verification, password reset, receipts
- [ ] Stripe: business name on the checkout page and on card statements

### Documents

- [ ] Rename the three planning docs to `roundsahead-*` if you keep them in the
      repo
- [ ] Counselor handouts and conference materials carry `roundsahead.com`

---

## Phase 1 — Developer accounts (start now, long lead times)

- [ ] Apple Developer Program — $99/year, recurring. Identity verification takes
      a few days.
- [ ] Decide Apple account type: individual vs. LLC. LLC shows a company name on
      the store listing instead of your personal name. Requires a D-U-N-S number.
- [ ] Google Play Console — $25 one-time.
- [ ] Decide Google account type — **this matters a lot**:
      - Personal account → must run a closed test with **≥12 testers opted in
        continuously for 14 days** before you can even apply for production access.
        Google checks that testers actually used the app.
      - Organization account (needs registered business + D-U-N-S) → exempt from
        the 12-tester rule, but D-U-N-S can take ~4 weeks.
- [ ] Google Play identity verification — mandatory for new personal accounts as
      of September 2026. Have government ID ready; details must match exactly.
- [ ] Start recruiting your 12 testers *now* if going the personal-account route.
      This is the step people underestimate. Real devices, real Google accounts.
      Emulators or fake accounts risk permanent account suspension.
- [ ] Decide on a business entity (LLC vs. sole proprietor). Affects taxes,
      liability, and store listing name. Talk to an accountant — I'm not one.
- [ ] Register a domain + set up a support email address (both stores require a
      support URL and contact)

---

## Phase 2 — Real authentication (THE BLOCKER)

Today identity comes entirely from Cloudflare Access. There is no signup, no
password, no users table. Strangers who buy the app have no way in, and there's
nothing to attach a subscription to.

- [ ] **Security fix first:** in `server/src/auth.ts`, if `CF_ACCESS_TEAM_DOMAIN`
      is unset, every request is treated as `dev@local` with no verification.
      Make this fail closed in production — gate the fallback behind an explicit
      `NODE_ENV !== 'production'` check.
- [ ] Create a real `users` table: id, email, password_hash, email_verified,
      created_at, plan/entitlement fields
- [ ] Implement signup / login / logout with your own session or JWT
- [ ] Password hashing with argon2 or bcrypt — never roll your own
- [ ] Email verification flow (need a transactional email provider: Resend,
      Postmark, SES)
- [ ] Password reset flow
- [ ] Rate limiting on auth endpoints (`express-rate-limit`)
- [ ] Add OAuth providers — Google and Apple are the two that matter
- [ ] **Sign in with Apple is required by App Review** if you offer any other
      third-party login on iOS. Not optional.
- [ ] Account deletion, self-service and in-app. Apple requires this for any app
      that supports account creation.
- [ ] Keep Cloudflare Access only in front of a *staging* environment, not prod

---

## Phase 3 — Storage model (second blocker)

`user_state` stores each user's entire app state as one JSON blob, replaced
wholesale on every `PUT`. Last write wins — parent on a laptop and student on a
phone will silently overwrite each other. You also can't query across it.

- [ ] Move from SQLite to Postgres (you already run it for tv-tracker; SQLite's
      write concurrency won't hold up multi-tenant)
- [ ] Introduce Prisma for schema + migrations (you know it from tv-tracker)
- [ ] Split the blob into real tables, each with a `user_id` FK and `updated_at`:
      - `student_profiles`
      - `saved_colleges`
      - `final_five_items` (+ checklist columns or a related table)
      - `timeline_tasks`
      - `essay_drafts`
      - `campus_visits`
- [ ] Replace the single `PUT /api/state` with per-resource REST endpoints
- [ ] Add optimistic concurrency (version or `updated_at` check) so simultaneous
      edits conflict loudly instead of silently
- [ ] **Support multiple students per account** — a parent with two kids is a
      completely normal case and today's model can't represent it. One account →
      many student profiles.
- [ ] Remove `SHARED_PORTFOLIO` mode, or rebuild it properly as household
      members / collaborators with an invite flow (this is actually a *feature*
      for the parent-buyer market — parent and student both get logins)
- [ ] Write a migration script for your own existing data
- [ ] Set up automated Postgres backups before you have a single paying customer

---

## Phase 4 — Generalize the career paths (+ where the content comes from)

Better shape than expected: the `CareerPathway` type and the `CAREER_PATHWAYS`
record are already generic. `CareerGoal` declares five values but only
`anesthesiologist` and `crna` have content.

### 4a. Schema work

- [ ] Change `CareerGoal` from a hardcoded union type to a string id resolved
      against data — otherwise every new path is a code change and a redeploy
- [ ] Move `CAREER_PATHWAYS` out of a TS constant into the database (or seeded
      JSON) so you can add paths without shipping a new app build. **This matters
      more once you're on mobile** — store review adds days to every update.
- [ ] Add `sourceUrl` and `lastVerified` to every pathway requirement and every
      stage. Non-negotiable — see 4c.
- [ ] Build a path-selection step in onboarding, not buried in ProfileView
- [ ] Support multiple/undecided paths per student (comparing MD vs. CRNA is the
      app's best feature — don't lose it by forcing a single choice)
- [ ] Generalize the pathway-specific fields on the `College` type:
      `hasDirectEntryBsn`, `bsnProgramRank`, `preMedAdvisingRank`,
      `medicalSchoolAffiliation`, `hospitalSystem`, `preMedNotes`, `nursingNotes`
      → replace with `pathwayFit: Record<PathwayId, {...}>`
- [ ] Generalize `CampusVisit.ratings.preMedNursingAdvising` → a pathway-labeled
      advising rating
- [ ] Make the readiness score in `DashboardView` pathway-aware — clinical hours
      shouldn't weigh the same for every path
- [ ] Make `essayPrompts.ts` and `timelineDefaults.ts` pathway-aware where they
      currently assume health careers

### 4b. Pathways to add, and the accreditor that defines each

Each accreditor publishes an authoritative directory of accredited programs.
These are your source of truth — not blogs, not test-prep sites, not another AI.

**Reality check from the sourcing survey: none of these have an API. None have a
bulk file. None carry IPEDS UNITID. All assert copyright and none grant
commercial redistribution rights.** Every one is an HTML or PDF scrape followed
by fuzzy name+city+state matching.

| Pathway | Authority | Format | Notes |
|---|---|---|---|
| MD | LCME | HTML directory | Counts vary by source (155–159); cite the directory + date you ingest |
| DO | COCA (AOA) | HTML + PDF | AOA site says 47 COMs/74 sites; its own May 2026 PDF says 46/73 — discrepancy is real |
| CRNA | COA | HTML search + periodic PDF | 151 programs as of the Mar 6 2026 list; all entry-level now doctoral |
| BSN / nursing | CCNE, ACEN | HTML directories | See the direct-entry gap below |
| Physician Assistant | ARC-PA, PAEA | HTML listing | Updated after each commission meeting |
| Dental | CODA | HTML "Find a Program" | 1,400+ programs; updates Feb/Aug |
| Pharmacy | ACPE | HTML lookup + annual directory | ~143 PharmD programs |
| Physical Therapy | CAPTE | HTML directory | Confirm whether any download exists — unverified |
| Veterinary | AVMA COE | HTML list | Updated biannually |

- [ ] Fill in the three declared-but-empty pathways first: `premed_general`,
      `nursing_general`, `undecided`
- [ ] Then add, in rough order of market size: pre-PA, pre-pharmacy, pre-dental,
      pre-PT, pre-vet
- [ ] Pull salary and job-growth figures from **BLS**. Important detail: the
      public BLS API returns *time series keyed to Series IDs* (OEWS wages,
      employment) — **not** the OOH narrative text. Median-pay-by-occupation
      comes from OEWS via the API; OOH profile prose must be scraped. Join
      programs to occupations via CIP→SOC crosswalks. Public domain, free.
- [ ] ⚠️ **Known content gap — direct-entry vs. upper-division BSN.** CCNE and
      ACEN classify by degree level but do **not** flag direct-entry/freshman-
      admit vs. 2+2 upper-division BSN. This is not machine-derivable from
      accreditor data and must come from each program's admissions pages. It's
      also one of the most valuable things you can tell a nursing-track family,
      so it's worth the manual effort — just budget for it as manual.

**Legal posture for accreditor data (do this before shipping):**

- [ ] These are copyrighted compilations. Safest pattern: use accreditor lists
      **internally** to verify and link, and surface the accreditor's own page as
      the citation rather than re-hosting their list in your paid product.
- [ ] Have counsel review each accreditor's terms before redistribution
- [ ] Use **DAPIP's bulk download** as a free, public-domain accreditation
      cross-check — it carries OPE ID and references IPEDS UnitID, making it the
      best federal bridge between accreditation and IPEDS

### 4c. How to author it without shipping hallucinations

Drafting pathway content with an LLM is fine and will save enormous time.
Shipping it unverified is the fastest route to refunds.

- [ ] Draft → verify against the accreditor → record `sourceUrl` + `lastVerified`
- [ ] Never let a prerequisite, required-hours figure, or stage timeline reach
      production without a source URL attached
- [ ] Surface "verified [date] — source" in the UI. Trust feature no competitor
      bothers with, and it's honest.
- [ ] Have someone who actually knows one of these paths read the first
      non-anesthesia pathway end to end before launch

**Recommendation:** stay inside pre-health. Your `College` schema is a
health-careers schema — that's an asset, not a limitation. Going fully generic
means gutting it and competing with free tools.


### 4d. Expansion pathways (only after the health cluster is solid)

The test for adding a pathway is **not** "is this a prestigious career." It's:
does it have a licensed terminal credential, prerequisite coursework, required
experience hours, and an accreditor with a program directory? That's what the
schema encodes. Careers that fail this test produce empty-looking pathways that
make the app feel broken.

**Tier 1 — allied health (near-zero marginal cost, same pipeline)**

| Pathway | Accreditor |
|---|---|
| Occupational Therapy | ACOTE |
| Speech-Language Pathology | CAA (ASHA) |
| Athletic Training | CAATE |
| Respiratory Therapy | CoARC |
| Diagnostic Medical Sonography | CAAHEP / JRC-DMS |
| Optometry | ACOE |
| Podiatry | CPME |

- [ ] These reuse the College schema, the accreditor-scrape pipeline, and the
      CIP→SOC/BLS join you already built. Adding them is content work, not
      engineering work.

**Tier 2 — non-health, structurally compatible**

- [ ] **Architecture (NAAB).** Strong fit: the B.Arch vs. 4+2 M.Arch decision is
      structurally identical to direct-entry vs. upper-division BSN, and AXP
      hour requirements map onto your required-hours model.
- [ ] **Engineering (ABET).** Direct-admit vs. pre-engineering admission is the
      same pattern again; co-op requirements map to experience hours. Much
      larger market than any health pathway.

**Documented decision: no pre-law pathway**

- [ ] Pre-law has no prerequisite courses, no required major, no clinical hours,
      and no accredited undergraduate program directory. The entire path is GPA
      → LSAT → apply. There is nothing for the schema's stage, prerequisite,
      hours, or accreditor fields to hold, so it would ship visibly empty next
      to the CRNA content.
- [ ] If you want pre-law coverage anyway, ship it as a **College field**
      (3+3 accelerated JD programs) rather than a pathway. That's the one
      genuinely useful, structured pre-law data point.
- [ ] Same reasoning applies to most business/finance tracks — recorded here so
      it doesn't get re-litigated later.

---

## Phase 5 — College data (the biggest ongoing cost)

22 colleges hand-entered in a 1,048-line TS file. Tuition, acceptance rates, SAT
ranges, and deadlines all decay annually. Wrong deadlines are how you get refund
requests and one-star reviews.

**Sort every source into one of three buckets before you touch it:**

| Bucket | Sources | Commercial reuse |
|---|---|---|
| 🟢 Green | College Scorecard, IPEDS/NCES, DAPIP, BLS, NPC URL list | Public domain — unrestricted |
| 🟡 Yellow | All health accreditors, Common App grid, CSS participant list, AAMC free reports | Copyrighted; no license. Link, don't re-host |
| 🔴 Red | AAMC MSAR full DB, any structured deadline feed | Paywalled or license-only |

### 5a. 🟢 Green tier — build the spine here first

- [ ] **College Scorecard API** (api.data.gov, free key, 1,000 req/IP/hour).
      ~6,000 schools, 1,900+ data points each, drawn from IPEDS, NSLDS, and
      Treasury tax records.
- [ ] Net price by income band: `latest.cost.net_price` broken into five
      brackets (~0–30k, 30,001–48k, 48,001–75k, 75,001–110k, 110k+), split
      public/private. **Verify exact current-year field names against the live
      data dictionary at implementation** — they shift.
- [ ] Other fields you need: `latest.admissions.admission_rate.overall`,
      `latest.admissions.sat_scores` / `act_scores` (25th/75th percentiles),
      median debt under the aid objects, `latest.earnings` (6- and 10-year)
- [ ] **Use Scorecard's OPEID↔UNITID crosswalk files as your master key.**
      The API `id` *is* the IPEDS UNITID. Key your entire database on UNITID.
      This is the single most important schema decision in Phase 5.
- [ ] ⚠️ Lag varies by metric and is significant — earnings derive from tax
      records and often run 3–5 years behind; field-of-study figures are pooled
      across award years. Store and display the vintage per metric, not one
      global "last updated."
- [ ] **IPEDS bulk files** for what Scorecard doesn't expose (program CIP
      inventories, granular tuition, NPC URLs). No modern REST API exists —
      it's bulk CSV ETL. The Urban Institute education-data API is a usable
      third-party wrapper if you'd rather not build the ETL.
- [ ] Note: public IPEDS aggregate data are unrestricted. NCES *restricted-use
      microdata* (NPSAS etc.) require a license and bar commercial use — you
      have no reason to touch those. Don't confuse the two.
- [ ] **DAPIP bulk download** — accreditation records with OPE ID. Free. Treat
      as corroborating, not primary: ED publishes it unaudited and explicitly
      disclaims accuracy.

### 5b. 🟡 Yellow tier — scrape carefully, link rather than re-host

- [ ] Build one normalizer per accreditor source (see the 4b table)
- [ ] Expect name-matching pain: no accreditor ships UNITID, and multi-campus
      systems and standalone health-science centers break naive matching.
      **This is the biggest data-engineering risk in the project** — budget a
      manual QA pass, don't assume the join is clean.
- [ ] American College of Surgeons verified trauma centers — HTML scrape.
      Caveat required in-product: ACS *verifies*, states *designate*, and they
      are not the same list.
- [ ] AAMC teaching-hospital listings — HTML

### 5c. 🔴 Red tier — deadlines and requirements: license, don't scrape

The survey confirmed there is **no free authoritative machine-readable source
for application deadlines**. The Common App requirements grid is a flat PDF
(`content.commonapp.org/Files/ReqGrid.pdf`). A partner-gated API exists at
partners.commonapp.org but requires a Common App partnership; fields and pricing
aren't public.

Scraping a copyrighted deadline compilation into a paid product is a legal
exposure, not an engineering decision.

- [ ] Get quotes from the three real vendors:
      - **Peterson's Data** — ~4,200 undergrad institutions, explicitly markets
        deadline coverage, API + flat file, Standard/Plus/Premium tiers,
        quote-based pricing. Most direct fit.
      - **College Board Annual Survey of Colleges** — ~3,000–4,000 institutions,
        negotiated fee-based term-limited license, approval-gated. Powers
        BigFuture.
      - **CollegeAI** — ~2,967 colleges, JSON API, per-domain tiers
        (Education → Full Commercial). **Confirm in writing that deadlines and
        essay prompts are actually included fields** before relying on it. ToS
        forbids sublicensing/redistribution, requires ≤24h cache refresh and
        encrypted storage.
- [ ] The Common Data Set is the de-facto schema everyone licenses through —
      align your own schema to CDS field names to make vendor swaps cheap
- [ ] Common App essay prompts are published annually and safe to reference;
      keep summarizing supplemental prompts (`supplementPromptSummary`) rather
      than reproducing college wording
- [ ] If licensing exceeds budget: dates themselves aren't copyrightable but the
      compiled grid arguably is. Any collect-the-facts-only fallback needs
      counsel sign-off first.
- [ ] If Common App ever opens its partner API on acceptable terms, prefer it
      over aggregators

### 5d. Doesn't exist — stop implying it does

- [ ] **Drop or reframe `preMedAdvisingRank` and med-school acceptance rates.**
      No reliable dataset of med school acceptance rates by undergraduate
      institution exists. Schools self-report and numbers are heavily gamed —
      many count only committee-endorsed students, excluding those who didn't
      make it.
- [ ] ⚠️ **AAMC licensing correction:** the free MSAR summary reports are
      licensed for "individual, educational, and noncommercial purposes only."
      **You cannot embed them in a paid product.** Cite headline figures with
      attribution, or negotiate an AAMC data agreement. The full MSAR database
      is a paid individual subscription, not redistributable.
- [ ] Usable AAMC debt figures (attribute, don't re-host): median education debt
      **$200,000**, **71%** of graduates with education debt (Tuition and
      Student Fees Questionnaire 2025-26, 94 public / 66 private schools).
      Graduation Questionnaire *mean* for the Class of 2025 was **$223,130**,
      up 5% year over year. Prefer the median; cite the mean separately if used.

### 5e. Coverage and trust

- [ ] Expand well beyond 22 schools before charging money. A stranger who
      searches for their kid's state school and finds nothing never comes back.
- [ ] Every college record carries `dataYear`, `lastVerified`, and per-field
      sourcing where vintages differ
- [ ] Surface it in the UI
- [ ] Budget line item: data licensing is now a real operating cost, not a
      one-time build cost. Factor it into the pricing decision.

### 5f. Financial aid and affordability (the parent's actual question)

The app currently answers "can my kid get in?" — the student's question. It does
not answer "what will this cost us?" — the parent's question. The parent is the
buyer. Close this gap.

**Replace sticker price with net price (highest leverage item in the plan)**

- [ ] `College.tuitionInState` / `tuitionOutState` / `roomAndBoard` are sticker
      price, which almost no family with need actually pays. College Scorecard —
      already a Phase 5a integration — publishes **net price by family income
      band**. Add those bands to the schema.
- [ ] Use the existing `StudentProfile.budgetPerYear` to show each school's net
      price for that family's income band, not a number nobody pays
- [ ] Add `netPriceCalculatorUrl` per college. Every Title IV institution has
      been legally required to host an NPC since Oct 29, 2011 (HEOA §132) — and
      **institutions report that URL to IPEDS**, so an aggregated directory
      already exists as a public-domain bulk file keyed to UNITID. No manual
      collection needed. URL accuracy is uneven; validate on ingest.
- [ ] Pull median debt at graduation and post-grad median earnings (both in
      Scorecard) — these turn "affordable" into "affordable relative to outcome"

**Fill in the pathway cost model you already stubbed out**

`CareerPathway.stages[].annualCostEstimate` and
`comparisonPoints.debtBurden` exist but are thin. The MD-vs-CRNA decision is
substantially a debt decision, and this is the most decision-relevant content
the app could hold.

- [ ] Populate real cost estimates per stage, per pathway, with sources
- [ ] Model cumulative debt across the full pathway, not per-stage in isolation
- [ ] Show lost earning years alongside salary — 12–13 years to attending vs.
      8–9 to CRNA is the entire tradeoff, and the salary figures are misleading
      without it
- [ ] Source med school debt figures from AAMC; nursing/DNP program costs from
      the programs themselves

**Federal aid basics (pull, never hardcode)**

- [ ] Pell maximum and minimum are set by congressional appropriation and
      published via Dear Colleague Letter (2025–26: GEN-25-02, Jan 31 2025).
      Max $7,395 / min $740 for 2025–26; 2026–27 remains in that range.
      **Fetch or update annually — do not bake into the bundle.**
- [ ] OBBBA (Pub. L. 119-21, signed Jul 4 2025) changed FAFSA/SAI and Pell
      eligibility rules beginning 2026–27, including an eligibility cliff at
      an SAI at or above $14,790. Verify against current FSA guidance rather
      than older summaries.
- [ ] ⚠️ FSA's Loan Simulator is an interactive consumer tool with **no API** —
      it cannot be embedded or called. Repayment projections would have to be
      implemented yourself, which raises the same liability concern as the SAI
      estimator below. Linking out is the safer default.
- [ ] FAFSA opens around October 1 each year (2027–28 expected by Oct 1, 2026)
- [ ] Surface `College.deadlines.financialAidPriority` prominently — it is often
      *earlier* than the admission deadline and is a common expensive miss
- [ ] CSS Profile: required by several hundred mostly-private schools, has a fee,
      separate deadline. The `cssProfileSubmitted` checklist item already exists;
      give it real supporting content.

**Do not build**

- [ ] ❌ **Do not compute SAI or estimate aid awards yourself.** An estimator
      families plan around puts you in the same liability class as the
      med-school-acceptance-rate problem. Link out to each school's official Net
      Price Calculator and the federal tools instead. "We'll take you to the
      school's own estimator" is a better product and a safer one.
- [ ] ❌ **Do not build a scholarship database.** Most tempting adjacent feature,
      worst one: enormous scope, fastest decay, and every competitor already does
      it badly. Link to established searches if you want the coverage.

---

## Phase 6 — Product expansion (the macro gaps)

Three features that address structural gaps in what the app covers, plus one
deliberately deprioritized. **6a is the highest-value feature in this entire
document.**

### 6a. Award letter comparison ⭐ (build this)

The app currently walks a family to the door and stops at "applied." The peak
anxiety moment — and the peak willingness to pay — is **April of senior year**,
when a family holds four acceptances and four financial aid award letters that
are deliberately non-standardized and nearly impossible to compare.

Nobody does this well. It's a natural extension of the net-price work in 5f.

- [ ] Let a family enter each award letter and normalize to a common shape:
      - Full cost of attendance — **direct costs (tuition, fees, housing) and
        indirect costs (books, travel, personal)** separately. Schools routinely
        omit or understate indirect costs.
      - Grants and scholarships — money that is not repaid
      - Work-study — money that must be *earned*, not awarded
      - Loans — split subsidized / unsubsidized / Parent PLUS
- [ ] Compute and lead with two numbers: **net cost this year** and **total
      borrowing over four years**
- [ ] ⚠️ **Flag loans presented as "awards."** This is the single most common
      way award letters mislead families, and calling it out is the feature.
- [ ] Multi-year projection: is the scholarship renewable? Is there a GPA
      condition? Does institutional aid drop after year one while tuition rises?
- [ ] Side-by-side comparison of up to ~6 offers
- [ ] PDF export for the family conversation (you already have PDF export
      machinery — move it server-side per Phase 9)
- [ ] Hard deadline in the UI: **May 1, National College Decision Day**
- [ ] Data note: this is **entirely user-entered from their own letters.** No
      scraping, no licensing, no vendor. One of the few high-value features with
      zero data-acquisition cost.
- [ ] ⚠️ Present numbers; do not recommend a school. "Here is what each costs"
      is a tool. "Choose this one" is advice you're not licensed to give.

### 6b. Four-year high school course planner

The app measures readiness but not the decisions that produce it. A pre-health
student's course sequence — chem, bio, calc, which APs, dual enrollment — is the
actual planning artifact, and it's the part a sophomore's family can still
change.

- [ ] Model a recommended course sequence per pathway, grade 9–12
- [ ] Encode prerequisite chains (AP Bio needs prior coursework, calc track
      determines whether AP Calc is reachable by senior year)
- [ ] Reverse-plan: derive the sequence from the pathway's college prerequisites
      rather than hand-listing it per pathway
- [ ] Flag decision points that close doors — the math placement in 8th/9th
      grade is the highest-leverage one and almost nobody warns families
- [ ] Dual enrollment vs. AP tradeoffs (transfer credit acceptance varies by
      college; some health programs won't accept dual-enrollment prereqs)
- [ ] ⚠️ Data gap: high school course catalogs are per-district and not
      centrally published. Keep the model generic with user-entered course
      names; do not attempt a district catalog database.
- [ ] Business effect: this extends usefulness back into 9th–10th grade, which
      lengthens the license window and strengthens the case for the
      through-graduation price tier.

### 6c. Aid eligibility timeline (prior-prior year)

FAFSA uses **prior-prior-year** income. A family with a sophomore has a real,
still-open window in which financial decisions affect aid eligibility two years
later. Almost nobody surfaces this, and it's the kind of insight that makes a
parent feel the purchase paid for itself.

- [ ] Per student grad year, show which tax year is the FAFSA base year
- [ ] Countdown to when that base year closes
- [ ] Explain what the FAFSA/SAI formula does and does not count
- [ ] Re-verify all of this against current FSA guidance — OBBBA changed the
      SAI and Pell rules starting 2026-27
- [ ] ⚠️ **Hard line: inform, do not advise.** Explaining that FAFSA uses a
      specific base year is information. Suggesting how to time income, shift
      assets, or structure accounts is tax and financial advice you are not
      licensed to give, and it's a serious liability. State the mechanics,
      then point to a professional.

### 6d. Essay feedback (deprioritized — guardrails if built)

- [ ] Ranked below 6a, 6b, and 6c. It's a commodity, it's ethically contested in
      admissions, and some institutions have explicit AI policies.
- [ ] If built: feedback on **structure, specificity, and clarity only**
- [ ] ❌ Never generate essay text or rewrite a student's draft
- [ ] Disclose AI involvement in the product and the privacy policy
- [ ] Surface the "check your target schools' AI policies" warning in-product
- [ ] Ties to the Phase 10 decision about student essays and model training

---

## Phase 7 — Infrastructure, hosting & ops

Replaces the Cloudflare-Tunnel-to-a-Mac-Mini setup. Do this before the mobile
port: the SEO decision below changes your frontend architecture, and it's
cheaper to change before there are two clients.

### 7a. ⚠️ The SEO problem forces an architecture decision

Your app is a Vite SPA — the server sends a nearly empty HTML shell and
JavaScript builds the page in the browser. Google can render JS, but slowly and
inconsistently, and it deprioritizes those pages. Every other crawler (Bing, and
the AI answer engines that are becoming a real referral source) handles it
worse.

**A client-rendered SPA is close to the worst possible foundation for a
content-driven SEO strategy.** The public pathway pages in Track B need to
arrive as finished HTML.

- [ ] **Split the site in two:**
      - **Marketing + content site** — statically generated. Astro is the
        easiest option and fast to learn; Next.js if you'd rather have one
        framework for everything. All SEO pages live here.
      - **The app** — keep the existing React SPA unchanged. It sits behind a
        login, so it needs no SEO at all.
- [ ] Share a domain: `roundsahead.com` for content, `/app` for the SPA
- [ ] Both consume the same `/shared` types package and the same API
- [ ] This avoids rewriting the app you just built while getting real HTML where
      it matters

### 7b. Hosting stack

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Vercel (or Cloudflare Pages) | Static generation, global CDN, preview deploys per branch |
| API | Railway or Render | Takes your existing Docker Compose nearly as-is |
| Postgres | Neon or Supabase | Managed, PITR, connection pooling, branching |

- [ ] Database branching is worth more than it sounds — a throwaway copy of
      production to test a migration against, once you have real user data
- [ ] ⚠️ **Fly.io's Postgres is explicitly unmanaged.** They say so plainly and
      people miss it. Fly is fine for the API; get the database elsewhere.
- [ ] Expect tens of dollars a month at your scale, not hundreds. Verify current
      pricing — these tiers change constantly.
- [ ] Move off the Cloudflare Tunnel entirely. A tunnel to a Mac Mini is not a
      production posture for paying customers.

### 7c. Backups over high availability

At zero to a few thousand users, an HA replica roughly doubles your database
bill to protect against a failure mode that costs you an apologetic email.
HA is a second engine on the plane; backups are the parachute. Buy the
parachute, and buy a good one.

- [ ] Managed provider daily backups **plus point-in-time recovery**
- [ ] **An independent `pg_dump` to object storage you control** (S3, R2). This
      is the step people skip. Provider backups don't protect you against losing
      account access, or against a bad migration that replicates cleanly into
      every replica.
- [ ] **A tested restore.** An untested backup is not a backup. Restore to a
      scratch database once a quarter and confirm the data is actually there.
- [ ] Revisit HA when downtime costs customers rather than dignity

### 7d. Operations

- [ ] Staging environment separate from production
- [ ] Error monitoring — Sentry (good Expo support for later)
- [ ] Structured logging on the API
- [ ] Uptime monitoring with alerting
- [ ] CI: typecheck, tests, build on push (GitHub Actions)
- [ ] Secrets in the platform's secret store, never in the repo
- [ ] Document the restore procedure somewhere you'll find it at 2am

---

## Phase 8 — Mobile port (Expo)

Good news: no SSR, no browser-only dependencies beyond localStorage, no routing
to untangle. And you already know this stack from tv-tracker.

- [ ] Restructure into a monorepo like tv-tracker: `/web`, `/mobile`, `/server`,
      `/shared`
- [ ] Move `src/types/`, `src/data/`, and the scoring/categorization logic into
      `/shared` — these port essentially untouched
- [ ] `npx create-expo-app`, add Expo Router + NativeWind
- [ ] Rewrite the 9 view components (~4,400 lines of JSX). React web components
      do not carry over — no `div`, no Tailwind class strings on DOM elements.
- [ ] Replace `localStorage` with React Query + server as source of truth, plus
      AsyncStorage or MMKV for offline cache
- [ ] Replace `canvas-confetti` — browser canvas API, won't run in RN
- [ ] Replace `jspdf` — either `expo-print` or generate PDFs server-side
      (server-side is better anyway; the resume export is a selling point)
- [ ] Swap `lucide-react` → `lucide-react-native`
- [ ] App icon, splash screen, adaptive icon
- [ ] Set up EAS Build and EAS Submit
- [ ] Target Android API 36+ (required for new apps and updates)
- [ ] Test on real devices, both platforms, small screens included

Do **not** ship a Capacitor/WebView wrapper of the existing web app. Apple
rejects thin web wrappers under the minimum-functionality guideline.

---

## Phase 9 — Payments

You must choose one — Apple does not allow both in-app purchase and external
purchase links for digital goods on the same storefront.

> **Status — Option A chosen and implemented.** Stripe hosted Checkout, a
> one-time license → 12-month entitlement, signed webhooks
> (`checkout.session.completed`, `charge.refunded`, `charge.dispute.created`),
> and the Customer Portal are live on the server (`server/src/routes/billing.ts`).
> The web app has Upgrade / Plan / Manage-billing UI (`src/components/Navbar.tsx`).
>
> **Entitlement now enforced (this session).** The server gates every paid
> write endpoint via `requirePaid` (`server/src/requirePaid.ts`); free accounts
> can't seed paid data through the bulk create/replace paths either. The
> free/paid policy is centralized in `shared/lib/entitlement.ts` (web mirror in
> `src/lib/entitlement.ts`) and surfaced as `UpgradeGate` (web) and
> `LockedFeature` (mobile, Apple-compliant — no in-app buy button or link).
>
> **Free tier (the acquisition surface):** College Matcher, pathway explorer,
> student profile, dashboard. **Paid:** Final 5, Timeline, Course Planner,
> Resume, Essay & Letter Studio, Campus Visits, Award Letters. **Trial/refund:**
> the free tier *is* the trial — no time-limited trial; refunds via the Stripe
> Customer Portal. **Model:** one-time per-account 12-month license (covers all
> students on the account).
>
> Still open: Stripe Tax, dunning/failed-card retries, the turn-on-a-commission
> switch for a future Apple external-link rate, and region-aware link rules.

**Option A — External web checkout (my lean for a parent buyer)**
- [ ] **Stripe Checkout, hosted** — not custom Elements. Card data never touches
      your server, which collapses PCI scope to the minimum questionnaire.
      Faster to build and materially safer.
- [ ] Your per-student license is a **one-time payment, not a subscription.**
      Sell a Payment Intent, then write an entitlement row with `expires_at`.
      Much simpler than modeling a fixed-term subscription in Stripe.
- [ ] **Webhooks are your source of truth, not the browser redirect.** Users
      close tabs. Handle `checkout.session.completed`, `charge.refunded`, and
      dispute events. Verify the signature on every webhook and make handlers
      idempotent — Stripe retries.
- [ ] Use the Stripe **Customer Portal** for receipts and refunds so you aren't
      building account admin yourself
- [ ] Parent buys on a laptop, app just unlocks — parents complete web checkouts
      fine, unlike teenagers
- [ ] Currently 0% Apple commission on US external links, but Apple has proposed
      15% (5% for Small Business Program) and a court will set a rate. Build so
      you can turn a percentage on from a date without re-architecting.
- [ ] You now own sales tax across many jurisdictions — use Stripe Tax
- [ ] You now own chargebacks, dunning, failed-card retries, subscription state
- [ ] Region-aware: external links are a US-storefront rule. Other regions differ.

**Option B — In-app purchase**
- [ ] RevenueCat on top of StoreKit / Google Play Billing (do not hand-roll this)
- [ ] Enroll in the Small Business Program — 15% instead of 30% under $1M
- [ ] "Restore Purchases" is required by App Review
- [ ] Higher conversion, less plumbing, bigger cut

**Either way**
- [ ] Server-side entitlement check — never trust the client about who paid
- [ ] Design the free tier. Something has to be genuinely useful for free or
      nobody gets far enough to buy.
- [ ] Free trial length and refund policy
- [ ] Decide subscription vs. one-time. College prep has a natural 2–3 year
      window per kid, which argues for annual, not monthly.
- [ ] Family plan / multi-student pricing (ties back to Phase 3)

---

## Phase 10 — Compliance (your end user is a minor)

- [ ] Privacy policy — publicly hosted URL, required by both stores
- [ ] Terms of service
- [ ] Apple App Privacy "nutrition label" questionnaire
- [ ] Google Play Data Safety form
- [ ] Age rating questionnaires, both stores
- [ ] Set minimum age to 13+ so COPPA doesn't apply — under 13 triggers verifiable
      parental consent requirements you do not want to build
- [ ] Review state app-store age-verification laws (several took effect in 2026)
- [ ] Data minimization pass: you collect GPA, test scores, school name, city,
      state, and essays about a minor. Collect only what the features need, and
      encrypt at rest.
- [ ] Decide your position on training/AI features touching student essays, and
      say it plainly in the privacy policy
- [ ] Have a lawyer review the privacy policy and terms before you take money.
      This is the one place I'd spend real money — I'm not a lawyer.

---

## Phase 11 — Store submission

- [ ] Store screenshots at all required sizes, both platforms
- [ ] App description, keywords, category, promotional text
- [ ] Google Play closed test: 12 testers × 14 continuous days
- [ ] Apple TestFlight beta with real families
- [ ] Submit for review, budget for at least one rejection round
- [ ] Set pricing (see notes below)

---

## Track B — Distribution and lifecycle (runs parallel; start during Phase 4)

> **Full operational detail — conference calendar, counselor outreach scripts,
> SEO page inventory — lives in `roundsahead-marketing-plan.md`.**
> Costs for everything below are modeled in `roundsahead-budget.xlsx`.

**This is not a build phase and it does not wait for launch.** You currently
have a detailed plan for building the product and no plan for anyone finding it.
App stores stopped functioning as a discovery channel years ago. A good
pre-health planning app with no acquisition strategy sells roughly eleven
copies, mostly to people you already know.

### B1. The counselor channel (highest leverage)

Not a pivot away from parents — a *channel* to parents. One counselor who likes
the app puts it in front of 200 families at once, at near-zero acquisition cost.

- [ ] Free counselor tier: multi-student roster view, no payment required
- [ ] Counselors as a referral source, parents still the paying customer
- [ ] Target the specific niche first — health-science magnet programs, HOSA
      chapters, nursing-track high schools. These have exactly your students.
- [ ] Ask ten counselors for feedback before building anything for them

### B2. Content and search

Your pathway data is inherently searchable in a way most apps' content isn't.

- [ ] Publish public pathway pages: "direct-entry BSN programs in Ohio,"
      "CRNA prerequisites," "how many clinical hours for PA school"
- [ ] These are long-tail queries with real volume, high intent, and weak
      existing answers — and you'll have better data than the sites currently
      ranking
- [ ] The free tier (college search, shallow pathway explorer) is the landing
      surface for this traffic

### B3. Communities

- [ ] Student Doctor Network, allnurses, r/premed, r/nursing, PA forums, HOSA
- [ ] Participate honestly as a builder; these communities detect and punish
      marketing. A useful free tool posted plainly does better than any ad.

### B4. Lifecycle — the structural problem

Intense use for ~18 months, then the student graduates and the family never
returns. Every customer is a fresh acquisition, forever. Siblings are your only
natural repeat purchase.

- [ ] This is the argument for the per-student license model over a subscription
- [ ] Family/multi-student pricing turns the sibling case into a bigger first
      sale rather than a second acquisition
- [ ] Ask for the referral at the moment of highest satisfaction — right after
      the award letter comparison in April, not at signup

### B5. Measure

- [ ] Track customer acquisition cost against the license price. If CAC
      approaches $129, the model doesn't work regardless of how good the
      product is.
- [ ] Free-tier → paid conversion rate is the number that determines whether
      the free tier is an acquisition engine or just free hosting costs


---

## Pricing notes

Anchors: the free end of college prep is crowded and good, so anything generic
gets compared to free. The paid end is human advising — CollegeVine's advising
averages around $1,300, independent counselors go higher.

You are not selling a college-prep app. You are selling *pre-health pathway
planning*, to parents, during a 2–3 year window, in a category where the
alternative costs four figures. That supports annual pricing well above the
$4.99 impulse tier — but only once Phases 4 and 5 make it credible to a family
that isn't yours.

Firm number after Phase 4, when we know how many paths you're actually shipping.

---

## Appendix A — Resource collection

Ship this as an in-app resources section. Cheap to build, genuinely useful, and
it positions you as the honest option in a category full of inflated claims.

**Federal aid**

- studentaid.gov — FAFSA, Pell, federal loan programs
- studentaid.gov loan simulator — repayment projections
- fsapartners.ed.gov — Dear Colleague Letters (where Pell amounts get published)
- Each school's Net Price Calculator (legally required; link per school)

**College data**

- College Scorecard (api.data.gov) — tuition, net price by income, outcomes
- IPEDS / NCES College Navigator
- DAPIP — accredited institutions and programs

**Applications**

- commonapp.org — member list, requirements grid, annual essay prompts
- cssprofile.collegeboard.org — CSS Profile schools, fees, deadlines
- Individual admissions pages — the only authoritative deadline source

**Career pathway authorities**

- BLS Occupational Outlook Handbook — salary, job growth (API available)
- AAMC — MD schools, med school debt data
- AACOM — DO schools
- COA — accredited nurse anesthesia programs
- CCNE / ACEN — accredited nursing programs
- ARC-PA and PAEA — physician assistant
- CODA — dental | ACPE — pharmacy | CAPTE — physical therapy
- AVMA COE — veterinary
- American College of Surgeons — verified trauma centers

**Maintenance calendar**

| When | What |
|---|---|
| Early February | Pell max/min published — update |
| ~August 1 | Common App opens; new essay prompts; deadline refresh begins |
| ~October 1 | FAFSA opens for the next cycle |
| Annually | Scorecard data refresh; accreditor program lists |
---

## Appendix B — Licensing posture and vendor shortlist

The single most important output of the sourcing research: **which data you may
legally redistribute in a paid product.** Sort before you build.

### 🟢 Public domain — redistribute freely

| Source | Access | Join key |
|---|---|---|
| College Scorecard | REST API (free key) + bulk CSV | UNITID (`id`), OPEID crosswalk |
| IPEDS / NCES | Bulk CSV; no REST API | UNITID |
| DAPIP | HTML + bulk download | OPE ID → UNITID (partial) |
| BLS OEWS / OOH | Public Data API (series-keyed) | SOC codes |
| NPC URL directory | Inside IPEDS | UNITID |
| Federal Student Aid guidance | HTML/PDF, no API | n/a |

### 🟡 Copyrighted, no commercial license — link, don't re-host

All health accreditors (COA, CCNE, ACEN, LCME, COCA, ARC-PA, PAEA, CODA, ACPE,
CAPTE, AVMA COE), the Common App requirements grid, the CSS Profile participant
list, ACS trauma center list, AAMC hospital listings.

Safe pattern: ingest for internal verification and linking; cite and link to the
source rather than reproducing the compilation.

### 🔴 Paywalled or license-only

- **AAMC MSAR** — full DB is a paid individual subscription. Free summary
  reports are explicitly **noncommercial-only**; cannot go in a paid product.
- **Any structured deadline/requirements feed** — commercial license only.

### Deadline data vendor shortlist

| Vendor | Coverage | Delivery | Pricing model |
|---|---|---|---|
| Peterson's Data | ~4,200 undergrad institutions | API + flat file, tiered | Quote-based / custom |
| College Board Annual Survey | ~3,000–4,000 | Licensed dataset | Negotiated fee, approval-gated |
| CollegeAI | ~2,967 colleges, ~1.3M attributes | JSON API | Per-domain tiers to Full Commercial |

Notes:
- Deadline data is essentially never sold standalone — it comes bundled into a
  broader college dataset.
- The **Common Data Set** (College Board + Peterson's + U.S. News, since 1995) is
  the de-facto schema. Align your field names to CDS so vendors are swappable.
- Peterson's holds the former Wintergreen Orchard House undergraduate collection
  (acquired 2020), which is why its deadline coverage is the most direct fit.
- EAB/Appily, RNL, College Greenlight and Cirkled In are **not** deadline
  licensors — they're enrollment-marketing or consumer platforms.
- DIY scraping vendors (Apify, ScraperAPI ~$49/mo, Zyte ~$0.13/1K req, Bright
  Data ~$1.50/1K) exist, but scraping copyrighted deadline compilations into a
  paid product is a legal decision, not a cost decision.

### Verify at implementation

Two items the research flagged as unconfirmed:

- [ ] CAPTE's exact delivery format (any download, or HTML-only?)
- [ ] Current-year field names for College Scorecard net-price income bands —
      check the live data dictionary, they shift between releases

### Counsel checklist before taking money

- [ ] Accreditor terms reviewed for each source you redistribute
- [ ] AAMC content confirmed either attributed-only or licensed
- [ ] Deadline data licensed, not scraped — or a documented counsel sign-off on
      a facts-only fallback
- [ ] Privacy policy and terms reviewed (also Phase 10)
