// Final Five items reference a college by id. Curated colleges use a short slug
// (e.g. "upenn"); colleges pulled from the federal College Scorecard use an
// `sc_<unitId>` id so they can be re-fetched by IPEDS UNITID on demand.

export const SCORECARD_PREFIX = 'sc_';

export const isScorecardId = (id: string): boolean => id.startsWith(SCORECARD_PREFIX);

export const collegeIdFromUnitId = (unitId: number): string => `${SCORECARD_PREFIX}${unitId}`;

export const unitIdFromCollegeId = (id: string): number | null => {
  if (!isScorecardId(id)) return null;
  const n = Number(id.slice(SCORECARD_PREFIX.length));
  return Number.isFinite(n) ? n : null;
};
