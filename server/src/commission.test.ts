import { describe, it, expect, afterEach } from 'vitest';
import { commissionRateForDate, commissionRateForSource } from './commission.js';

const RATE = 'APPLE_EXTERNAL_LINK_COMMISSION_RATE';
const EFF = 'APPLE_EXTERNAL_LINK_COMMISSION_EFFECTIVE';

afterEach(() => {
  delete process.env[RATE];
  delete process.env[EFF];
});

describe('commissionRateForDate', () => {
  it('is 0 when nothing is configured', () => {
    expect(commissionRateForDate()).toBe(0);
  });

  it('is 0 when a rate is set but no effective date is given', () => {
    process.env[RATE] = '0.15';
    expect(commissionRateForDate()).toBe(0);
  });

  it('is 0 before the effective date', () => {
    process.env[RATE] = '0.15';
    process.env[EFF] = '2027-01-01';
    expect(commissionRateForDate(new Date('2026-12-31'))).toBe(0);
  });

  it('applies the rate on and after the effective date', () => {
    process.env[RATE] = '0.15';
    process.env[EFF] = '2027-01-01';
    expect(commissionRateForDate(new Date('2027-01-01'))).toBe(0.15);
    expect(commissionRateForDate(new Date('2027-06-01'))).toBe(0.15);
  });

  it('ignores a malformed rate or date', () => {
    process.env[RATE] = 'nonsense';
    process.env[EFF] = '2027-01-01';
    expect(commissionRateForDate(new Date('2027-06-01'))).toBe(0);
    process.env[RATE] = '0.15';
    process.env[EFF] = 'not-a-date';
    expect(commissionRateForDate(new Date('2027-06-01'))).toBe(0);
  });
});

describe('commissionRateForSource', () => {
  it('only applies to iOS-referred purchases', () => {
    process.env[RATE] = '0.15';
    process.env[EFF] = '2027-01-01';
    const when = new Date('2027-06-01');
    expect(commissionRateForSource('ios_referral', when)).toBe(0.15);
    expect(commissionRateForSource('web', when)).toBe(0);
    expect(commissionRateForSource(undefined, when)).toBe(0);
  });
});
