// Apple external-purchase-link commission seam (Phase 9).
//
// RoundsAhead sells its license as an external web purchase. Today the US
// storefront rate for external links is 0%, but Apple has proposed a rate and a
// court may set one. This module is the seam that lets us "turn a percentage on
// from a date" without re-architecting: the rate and its effective date come
// from env, and only purchases attributed to an iOS-app referral can incur it.
//
// This does NOT itself remit anything to Apple or price the commission into the
// charge — it computes the applicable rate and we record it on the Stripe
// session/charge metadata so a future reconciliation job has what it needs.
// Env is read at call time so the value can be changed without a redeploy.

// The commission rate in effect on `date`, or 0 if unset / not yet effective.
// APPLE_EXTERNAL_LINK_COMMISSION_RATE is a fraction (e.g. "0.15" for 15%);
// APPLE_EXTERNAL_LINK_COMMISSION_EFFECTIVE is an ISO date it takes effect.
export function commissionRateForDate(date: Date = new Date()): number {
  const rate = Number(process.env.APPLE_EXTERNAL_LINK_COMMISSION_RATE ?? '0');
  const effectiveRaw = process.env.APPLE_EXTERNAL_LINK_COMMISSION_EFFECTIVE ?? '';
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  if (!effectiveRaw) return 0;
  const effective = new Date(effectiveRaw);
  if (Number.isNaN(effective.getTime())) return 0;
  return date.getTime() >= effective.getTime() ? rate : 0;
}

// Only purchases the iOS app referred to web checkout can incur Apple's
// external-link commission. Anything else (a parent buying directly on the web)
// is always 0.
export function commissionRateForSource(source: string | undefined, date: Date = new Date()): number {
  return source === 'ios_referral' ? commissionRateForDate(date) : 0;
}
