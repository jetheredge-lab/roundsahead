# RoundsAhead — Mobile (Expo)

React Native app (iOS + Android) for RoundsAhead, built with Expo Router,
NativeWind, and React Query. It authenticates against the live backend at
`https://roundsahead.com/api` using **Bearer tokens** (Phase 8.0) and shares
domain types, logic, and data with the web app via the `../shared` package
(Phase 8.1).

## First run

This project is committed as source; dependencies are not. From this folder:

```bash
npm install
npx expo install --fix   # aligns native package versions to the Expo SDK
npx expo start           # press i (iOS sim), a (Android), or scan in Expo Go
```

> `expo start` builds the JS bundle on demand. The email/password flow and the
> Pathways tab work in **Expo Go**. The **Sign in with Apple** button needs a
> development build (`npx expo run:ios` or an EAS build) because it uses a native
> module — it is a no-op stub in Expo Go.

## What works today

- **Email / password auth** against the live API — token stored in
  `expo-secure-store`, session restored on cold start, protected-route redirect.
- **Sign in with Apple** — the button runs the native prompt and posts the
  identity token to `POST /api/auth/apple/native`, which verifies it (signature +
  issuer + audience against the bundle id) and returns our session token. Needs a
  dev build (see above); no extra client-id config required.
- **Sign in with Google** — via `expo-auth-session`; posts the id_token to
  `POST /api/auth/google/native`. Requires OAuth client IDs (below); until they
  are set the button explains it isn't configured yet.
- **Home tab** — shows the signed-in user and entitlement (Pro/free) read from
  the server, so a web purchaser is Pro on mobile automatically.
- **Profile tab** — lists the account's students (multi-student aware), creates
  one when none exist, computes the pathway-aware junior-year readiness score
  from `@shared`, and edits core fields (name, grade, pathway, GPAs, SAT/ACT,
  clinical/service hours) against the per-resource students API via React Query.
- **Colleges tab** — searches any U.S. college via the College Scorecard API and
  shows **net price by family income** (what families actually pay after aid),
  admission rate, SAT range, median debt, and 10-year earnings, with a link to
  each school's Net Price Calculator.
- **Awards tab** — enter each college's financial-aid award letter (costs,
  grants, work-study, loans) and compare them: net cost this year, total
  borrowing over four years, the lowest-net-cost offer flagged, and a warning
  when loans are presented as "awards." Money math comes from `@shared`;
  presents numbers, never a recommendation.
- **Pathways tab** — renders all career pathways from `@shared` (title, BLS pay,
  job growth, years, source count + verified date).

## Configuring Google sign-in

1. In Google Cloud Console create OAuth client IDs for the platforms you build
   (iOS, Android, and/or Web).
2. Expose them to the app via `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`,
   `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   (or an `extra` block in `app.json`).
3. On the **backend**, list those same client IDs in `GOOGLE_NATIVE_CLIENT_IDS`
   (comma-separated) so the token exchange accepts their audience.

## Not yet wired (next steps)

- **Saved colleges / Final Five, timeline** → remaining ports of the web views.
- **Save-to-student from college search** → lands with the saved-colleges list.
- **Payments** (IAP vs. external) → deferred pending the product decision.

## Layout

```
app/
  _layout.tsx        Providers (React Query, Auth) + protected-route redirect
  index.tsx          Splash while the navigator decides auth vs. app
  (auth)/sign-in.tsx Email/password + Apple/Google buttons
  (tabs)/            Home + Pathways
src/
  api.ts             Bearer fetch client → roundsahead.com/api
  auth.tsx           SecureStore token context (signIn/signUp/signOut)
  config.ts          API base URL (override with EXPO_PUBLIC_API_BASE_URL)
  query.ts           React Query client
```

`@shared` (see `../shared`) is resolved by `babel.config.js` (module-resolver),
`tsconfig.json` (paths), and `metro.config.js` (watchFolders) so the bundler can
reach it outside this folder.
