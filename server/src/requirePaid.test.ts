import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';
import { entitlementActive } from './entitlement.js';

// Mock the Prisma client the middleware loads the user through.
const findUnique = vi.fn();
vi.mock('./prisma.js', () => ({
  prisma: { user: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}));

import { requirePaid, callerEntitled } from './requirePaid.js';

const HOUR = 60 * 60 * 1000;

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: any };
}

describe('entitlementActive', () => {
  it('is false for a free plan regardless of expiry', () => {
    expect(entitlementActive({ plan: 'free', entitlementExpiresAt: new Date(Date.now() + HOUR) })).toBe(false);
  });

  it('is false for a paid plan with no expiry', () => {
    expect(entitlementActive({ plan: 'paid', entitlementExpiresAt: null })).toBe(false);
  });

  it('is false for a paid plan that has expired', () => {
    expect(entitlementActive({ plan: 'paid', entitlementExpiresAt: new Date(Date.now() - HOUR) })).toBe(false);
  });

  it('is true for a paid plan not yet expired', () => {
    expect(entitlementActive({ plan: 'paid', entitlementExpiresAt: new Date(Date.now() + HOUR) })).toBe(true);
  });
});

describe('requirePaid', () => {
  beforeEach(() => findUnique.mockReset());

  it('responds 402 with a stable code when the caller has no entitlement', async () => {
    findUnique.mockResolvedValue({ plan: 'free', entitlementExpiresAt: null });
    const res = mockRes();
    const next = vi.fn();
    await requirePaid({ userId: 'u1' } as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(402);
    expect(res.body.code).toBe('entitlement_required');
  });

  it('calls next() when the caller has an active paid entitlement', async () => {
    findUnique.mockResolvedValue({ plan: 'paid', entitlementExpiresAt: new Date(Date.now() + HOUR) });
    const res = mockRes();
    const next = vi.fn();
    await requirePaid({ userId: 'u1' } as any, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it('treats an unauthenticated request as not entitled', async () => {
    const res = mockRes();
    const next = vi.fn();
    await requirePaid({} as any, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(402);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('callerEntitled', () => {
  beforeEach(() => findUnique.mockReset());

  it('is false when the user cannot be found', async () => {
    findUnique.mockResolvedValue(null);
    expect(await callerEntitled({ userId: 'ghost' } as any)).toBe(false);
  });

  it('is true for an active paid user', async () => {
    findUnique.mockResolvedValue({ plan: 'paid', entitlementExpiresAt: new Date(Date.now() + HOUR) });
    expect(await callerEntitled({ userId: 'u1' } as any)).toBe(true);
  });
});
