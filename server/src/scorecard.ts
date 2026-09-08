import { prisma } from './prisma.js';
import { log } from './log.js';

// College Scorecard integration (U.S. Dept. of Education, public domain).
// Docs: https://collegescorecard.ed.gov/data/documentation/
const API_BASE = 'https://api.data.gov/ed/collegescorecard/v1/schools';
const API_KEY = process.env.SCORECARD_API_KEY ?? '';
export const scorecardEnabled = Boolean(API_KEY);

// Refresh cached rows at most this often (Scorecard updates ~annually).
const CACHE_TTL_DAYS = 60;

// Fields we pull. Net price is reported separately for public vs. private
// institutions, broken into five family-income bands.
const FIELDS = [
  'id',
  'school.name',
  'school.city',
  'school.state',
  'school.ownership',
  'school.school_url',
  'school.price_calculator_url',
  'latest.student.size',
  'latest.cost.attendance.academic_year',
  'latest.admissions.admission_rate.overall',
  'latest.admissions.sat_scores.25th_percentile.critical_reading',
  'latest.admissions.sat_scores.25th_percentile.math',
  'latest.admissions.sat_scores.75th_percentile.critical_reading',
  'latest.admissions.sat_scores.75th_percentile.math',
  'latest.aid.median_debt.completers.overall',
  'latest.earnings.10_yrs_after_entry.median',
  'latest.earnings.6_yrs_after_entry.median',
  'latest.cost.net_price.public.by_income_level.0-30000',
  'latest.cost.net_price.public.by_income_level.30001-48000',
  'latest.cost.net_price.public.by_income_level.48001-75000',
  'latest.cost.net_price.public.by_income_level.75001-110000',
  'latest.cost.net_price.public.by_income_level.110001-plus',
  'latest.cost.net_price.private.by_income_level.0-30000',
  'latest.cost.net_price.private.by_income_level.30001-48000',
  'latest.cost.net_price.private.by_income_level.48001-75000',
  'latest.cost.net_price.private.by_income_level.75001-110000',
  'latest.cost.net_price.private.by_income_level.110001-plus',
].join(',');

export interface Financials {
  unitId: number;
  name: string;
  city: string;
  state: string;
  ownership: 'public' | 'private' | 'other';
  enrollment: number | null;
  sat25: number | null;
  sat75: number | null;
  websiteUrl: string | null;
  // Net price the family actually pays, by income band (annual USD).
  netPriceByIncome: {
    band0_30k: number | null;
    band30_48k: number | null;
    band48_75k: number | null;
    band75_110k: number | null;
    band110k_plus: number | null;
  };
  costOfAttendance: number | null;
  admissionRate: number | null;
  medianDebt: number | null;
  earnings10yr: number | null;
  earnings6yr: number | null;
  netPriceCalculatorUrl: string | null;
  source: string;
  vintage: string;
}

const num = (v: unknown): number | null => (typeof v === 'number' && !Number.isNaN(v) ? v : null);

function parse(r: Record<string, any>): Financials {
  const ownershipCode = r['school.ownership'];
  const ownership: Financials['ownership'] = ownershipCode === 1 ? 'public' : ownershipCode === 2 || ownershipCode === 3 ? 'private' : 'other';
  const tier = ownership === 'public' ? 'public' : 'private';
  const np = (band: string) => num(r[`latest.cost.net_price.${tier}.by_income_level.${band}`]);
  const cr25 = num(r['latest.admissions.sat_scores.25th_percentile.critical_reading']);
  const m25 = num(r['latest.admissions.sat_scores.25th_percentile.math']);
  const cr75 = num(r['latest.admissions.sat_scores.75th_percentile.critical_reading']);
  const m75 = num(r['latest.admissions.sat_scores.75th_percentile.math']);
  return {
    unitId: r['id'],
    name: r['school.name'] ?? '',
    city: r['school.city'] ?? '',
    state: r['school.state'] ?? '',
    ownership,
    enrollment: num(r['latest.student.size']),
    sat25: cr25 != null && m25 != null ? cr25 + m25 : null,
    sat75: cr75 != null && m75 != null ? cr75 + m75 : null,
    websiteUrl: r['school.school_url'] ?? null,
    netPriceByIncome: {
      band0_30k: np('0-30000'),
      band30_48k: np('30001-48000'),
      band48_75k: np('48001-75000'),
      band75_110k: np('75001-110000'),
      band110k_plus: np('110001-plus'),
    },
    costOfAttendance: num(r['latest.cost.attendance.academic_year']),
    admissionRate: num(r['latest.admissions.admission_rate.overall']),
    medianDebt: num(r['latest.aid.median_debt.completers.overall']),
    earnings10yr: num(r['latest.earnings.10_yrs_after_entry.median']),
    earnings6yr: num(r['latest.earnings.6_yrs_after_entry.median']),
    netPriceCalculatorUrl: r['school.price_calculator_url'] ?? null,
    source: 'U.S. Dept. of Education — College Scorecard',
    vintage: 'Most recent available year',
  };
}

async function apiGet(params: Record<string, string>): Promise<any> {
  const url = new URL(API_BASE);
  url.searchParams.set('api_key', API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Scorecard API ${res.status}`);
  return res.json();
}

// Resolve a school name (optionally a state) to its IPEDS UNITID.
export async function lookupUnitId(name: string, state?: string): Promise<number | null> {
  const params: Record<string, string> = { 'school.name': name, fields: 'id,school.name,school.state', per_page: '5' };
  if (state) params['school.state'] = state;
  const json = await apiGet(params);
  const results = json?.results ?? [];
  if (results.length === 0) return null;
  return results[0].id ?? null;
}

// Fetch fresh financials for a UNITID from the API.
async function fetchFinancials(unitId: number): Promise<Financials | null> {
  const json = await apiGet({ id: String(unitId), fields: FIELDS });
  const r = json?.results?.[0];
  if (!r) return null;
  return parse(r);
}

// Cached-or-fetch financials for a UNITID.
export async function getFinancials(unitId: number): Promise<Financials | null> {
  const cached = await prisma.collegeFinancials.findUnique({ where: { unitId } });
  const stale =
    !cached || Date.now() - new Date(cached.fetchedAt).getTime() > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
  if (cached && !stale) return cached.data as unknown as Financials;

  try {
    const fresh = await fetchFinancials(unitId);
    if (fresh) {
      await prisma.collegeFinancials.upsert({
        where: { unitId },
        create: { unitId, data: fresh as any },
        update: { data: fresh as any, fetchedAt: new Date() },
      });
      return fresh;
    }
  } catch (e) {
    log.error('scorecard fetch failed', { error: (e as Error).message });
  }
  // Fall back to stale cache if the refresh failed.
  return cached ? (cached.data as unknown as Financials) : null;
}

// Look up by name (+ state), resolving the UNITID and returning financials.
export async function getByName(name: string, state?: string): Promise<Financials | null> {
  const unitId = await lookupUnitId(name, state);
  if (!unitId) return null;
  return getFinancials(unitId);
}

// Search operating colleges by name (+ optional state). Warms the cache so
// opening any result's detail is instant.
export async function searchColleges(query: string, state?: string, page = 0): Promise<Financials[]> {
  // The API's `sort` is unreliable for name searches, so fetch a wide set and
  // rank client-side: bigger campuses (the flagship) first over satellites.
  const params: Record<string, string> = {
    'school.name': query,
    'school.operating': 'true',
    fields: FIELDS,
    per_page: '40',
    page: String(page),
  };
  if (state) params['school.state'] = state;
  const json = await apiGet(params);
  const results = (json?.results ?? []) as Record<string, any>[];
  // Rank: names that actually contain the query first (so "Texas A&M" beats the
  // larger "UT Austin"), then by enrollment so the flagship outranks satellites.
  const ql = query.toLowerCase().trim();
  const nameScore = (f: Financials) => (f.name.toLowerCase().includes(ql) ? 1 : 0);
  const parsed = results
    .filter((r) => r?.id)
    .map(parse)
    .filter((f) => f.enrollment != null && f.enrollment > 0)
    .sort((a, b) => nameScore(b) - nameScore(a) || (b.enrollment ?? 0) - (a.enrollment ?? 0))
    .slice(0, 20);
  await Promise.all(
    parsed.map((f) =>
      prisma.collegeFinancials.upsert({
        where: { unitId: f.unitId },
        create: { unitId: f.unitId, data: f as any },
        update: { data: f as any, fetchedAt: new Date() },
      }),
    ),
  );
  return parsed;
}
