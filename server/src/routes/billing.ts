import { Router } from 'express';
import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../prisma.js';
import { type AuthedRequest } from '../auth.js';
import { entitlementActive } from '../entitlement.js';
import { commissionRateForSource } from '../commission.js';

// ── Configuration ───────────────────────────────────────────────────
const APP_BASE_URL = (process.env.APP_BASE_URL ?? '').replace(/\/$/, '');
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? '';
// One-time license grants access for this many months.
const ENTITLEMENT_MONTHS = Number(process.env.ENTITLEMENT_MONTHS ?? 12);
// Stripe Tax (automatic sales-tax calculation) is opt-in: it requires tax
// registrations configured on the Stripe account, so it stays off until that's
// set up, otherwise session creation would error.
const STRIPE_TAX_ENABLED = (process.env.STRIPE_TAX_ENABLED ?? '').toLowerCase() === 'true';

// Pin an API version new enough to accept `managed_payments` (which we disable
// per session — we don't need Stripe's Managed Payments for a one-time buy).
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' as Stripe.StripeConfig['apiVersion'] })
  : null;
// Checkout needs a secret key + a price; the webhook additionally needs its secret.
const billingEnabled = Boolean(stripe && STRIPE_PRICE_ID && APP_BASE_URL);

console.log(`[billing] enabled=${billingEnabled} webhook=${Boolean(stripe && STRIPE_WEBHOOK_SECRET)}`);

function customerIdOf(v: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!v) return null;
  return typeof v === 'string' ? v : v.id;
}

async function grant(userId: string, customerId: string | null) {
  const expires = new Date();
  expires.setMonth(expires.getMonth() + ENTITLEMENT_MONTHS);
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: 'paid',
      entitlementExpiresAt: expires,
      ...(customerId ? { stripeCustomerId: customerId } : {}),
    },
  });
}

async function revokeByCustomer(customerId: string | null) {
  if (!customerId) return;
  const user = await prisma.user.findUnique({ where: { stripeCustomerId: customerId } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { plan: 'free', entitlementExpiresAt: null } });
  }
}

// ── Webhook (mounted with a raw body parser, BEFORE express.json) ───
export async function billingWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    res.status(400).end();
    return;
  }
  const sig = req.headers['stripe-signature'];
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig as string, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    res.status(400).send(`Webhook Error: ${(e as Error).message}`);
    return;
  }

  // Grant from a completed session, but only once the payment has actually
  // settled. Card payments settle synchronously (payment_status 'paid' on the
  // completed event); delayed methods (ACH, etc.) complete first as 'unpaid'
  // and settle later via async_payment_succeeded — or fail via
  // async_payment_failed, in which case we never granted anything.
  const grantFromSession = async (session: Stripe.Checkout.Session) => {
    if (session.payment_status !== 'paid') return;
    const userId = session.client_reference_id ?? session.metadata?.userId;
    if (userId) await grant(userId, customerIdOf(session.customer));
  };

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        await grantFromSession(event.data.object);
        break;
      }
      case 'checkout.session.async_payment_failed': {
        // Delayed payment failed; nothing was granted, so nothing to revoke.
        console.warn('[billing] async payment failed for session', event.data.object.id);
        break;
      }
      case 'charge.refunded': {
        await revokeByCustomer(customerIdOf(event.data.object.customer));
        break;
      }
      case 'charge.dispute.created': {
        // The dispute's charge carries the customer.
        const dispute = event.data.object;
        const charge = typeof dispute.charge === 'string' ? await stripe.charges.retrieve(dispute.charge) : dispute.charge;
        await revokeByCustomer(customerIdOf(charge.customer));
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (e) {
    console.error('[billing] webhook handler error', e);
    res.status(500).end();
  }
}

// ── Authenticated billing routes ────────────────────────────────────
export const billingRouter = Router();

billingRouter.get('/status', async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({
    enabled: billingEnabled,
    active: entitlementActive(user),
    plan: user.plan,
    expiresAt: user.entitlementExpiresAt,
    hasCustomer: Boolean(user.stripeCustomerId),
  });
});

billingRouter.post('/checkout', async (req: AuthedRequest, res) => {
  if (!stripe || !billingEnabled) {
    res.status(503).json({ error: 'Billing is not configured' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  // Where the purchase originated. Only an iOS-app referral can incur Apple's
  // external-link commission; a parent buying on the web is always 'web'.
  const source = typeof (req.body as any)?.source === 'string' ? (req.body as any).source : 'web';
  const appleCommissionRate = commissionRateForSource(source);
  const metadata = {
    userId: user.id,
    source,
    // Recorded (not charged) so a future reconciliation job can compute what,
    // if anything, is owed to Apple for this purchase.
    appleCommissionRate: String(appleCommissionRate),
  };

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: user.id,
    metadata,
    // Carry the same metadata onto the PaymentIntent/charge for reconciliation.
    payment_intent_data: { metadata },
    ...(user.stripeCustomerId
      ? {
          customer: user.stripeCustomerId,
          // Stripe Tax needs to save the address collected at checkout back to
          // the reused customer, or session creation errors.
          ...(STRIPE_TAX_ENABLED ? { customer_update: { address: 'auto', name: 'auto' } } : {}),
        }
      : { customer_email: user.email, customer_creation: 'always' }),
    allow_promotion_codes: true,
    // Sales tax across jurisdictions is Stripe's problem, not ours — but only
    // once tax registrations are configured on the account (env-gated above).
    ...(STRIPE_TAX_ENABLED ? { automatic_tax: { enabled: true }, billing_address_collection: 'auto' as const } : {}),
    success_url: `${APP_BASE_URL}/app/?upgraded=1`,
    cancel_url: `${APP_BASE_URL}/app/?checkout=cancelled`,
  };
  // Not in the SDK types yet; disables Stripe Managed Payments for this session.
  (params as Record<string, unknown>).managed_payments = { enabled: false };
  const session = await stripe.checkout.sessions.create(params);
  res.json({ url: session.url });
});

billingRouter.post('/portal', async (req: AuthedRequest, res) => {
  if (!stripe) {
    res.status(503).json({ error: 'Billing is not configured' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.stripeCustomerId) {
    res.status(400).json({ error: 'No billing account yet' });
    return;
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${APP_BASE_URL}/app/`,
  });
  res.json({ url: session.url });
});
