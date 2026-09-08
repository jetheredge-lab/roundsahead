import * as Sentry from '@sentry/react-native';

// Error monitoring (Phase 7d). Fully env-gated: with no EXPO_PUBLIC_SENTRY_DSN
// set this is a no-op, so local dev and CI need nothing. Set the public DSN in
// the EAS build env / app config to turn it on.
const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export const sentryEnabled = Boolean(DSN);

// Call once at app startup (from the root layout, before render).
export function initSentry(): void {
  if (!sentryEnabled) return;
  Sentry.init({
    dsn: DSN,
    // Tracing off by default; opt in with EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE.
    tracesSampleRate: Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? '0'),
  });
}

// Wraps the root component with Sentry's error boundary / instrumentation when
// enabled, and is a passthrough otherwise.
export function wrapRoot<T>(root: T): T {
  return sentryEnabled ? (Sentry.wrap(root as never) as T) : root;
}
