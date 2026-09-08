import type { Response, NextFunction } from 'express';
import { prisma } from './prisma.js';
import { type AuthedRequest } from './auth.js';
import { entitlementActive } from './entitlement.js';

// Whether the authenticated caller currently holds an active paid entitlement.
// Loads only the two fields the check needs.
export async function callerEntitled(req: AuthedRequest): Promise<boolean> {
  if (!req.userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { plan: true, entitlementExpiresAt: true },
  });
  return !!user && entitlementActive(user);
}

// Route guard for paid features. This is the real entitlement boundary — the
// client's tab gating is UX only. Responds 402 Payment Required with a stable
// `code` the clients can branch on, without leaking anything sensitive.
export async function requirePaid(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  if (await callerEntitled(req)) {
    next();
    return;
  }
  res.status(402).json({
    error: 'This feature requires RoundsAhead Pro.',
    code: 'entitlement_required',
  });
}
