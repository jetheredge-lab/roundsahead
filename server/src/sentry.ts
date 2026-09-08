import * as Sentry from '@sentry/node';
import { log } from './log.js';

// Error monitoring (Phase 7d). Fully env-gated: with no SENTRY_DSN set this is a
// no-op, so local dev and CI need nothing. Set SENTRY_DSN in the hosting
// platform's secret store to turn it on.
const DSN = process.env.SENTRY_DSN ?? '';

export const sentryEnabled = Boolean(DSN);

// Call once, as early as possible in process startup — before the Express app
// is created — so instrumentation can hook in.
export function initSentry(): void {
  if (!sentryEnabled) return;
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // Conservative default; override with SENTRY_TRACES_SAMPLE_RATE if wanted.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
  });
  log.info('sentry enabled', { environment: process.env.NODE_ENV ?? 'development' });
}

// Attach Sentry's Express error handler. No-op when disabled.
export function setupSentryErrorHandler(app: Parameters<typeof Sentry.setupExpressErrorHandler>[0]): void {
  if (!sentryEnabled) return;
  Sentry.setupExpressErrorHandler(app);
}
