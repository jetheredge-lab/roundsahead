import { useQuery } from '@tanstack/react-query';
import { COLLEGES_DATABASE, unitIdFromCollegeId, type FinalFiveItem } from '@shared';
import { api } from './api';

export interface ResolvedCollege {
  loading: boolean;
  name: string;
  location: string;
  deadline: string | null;
}

// Resolves a Final Five item's collegeId to a display name/location/deadline.
// Curated schools come from the bundled list; scorecard schools (sc_<unitId>)
// are fetched live by IPEDS UNITID and cached for an hour.
export function useResolvedCollege(item: FinalFiveItem, token: string): ResolvedCollege {
  const unitId = unitIdFromCollegeId(item.collegeId);
  const curated = COLLEGES_DATABASE.find((c) => c.id === item.collegeId);

  const scQuery = useQuery({
    queryKey: ['scorecard-college', unitId],
    queryFn: () => api.getCollegeByUnitId(token, unitId!),
    enabled: !curated && unitId != null,
    staleTime: 1000 * 60 * 60,
  });

  if (curated) {
    return {
      loading: false,
      name: curated.name,
      location: [curated.city, curated.state].filter(Boolean).join(', '),
      deadline: curated.deadlines.earlyAction || curated.deadlines.regularDecision,
    };
  }
  const f = scQuery.data?.financials;
  return {
    loading: scQuery.isLoading,
    name: f?.name ?? 'This school',
    location: f ? [f.city, f.state].filter(Boolean).join(', ') : '',
    deadline: null,
  };
}
