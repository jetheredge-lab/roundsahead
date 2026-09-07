import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collegeIdFromUnitId } from '@shared';
import { api, type CollegeFinancials } from '@/api';
import { useAuth } from '@/auth';
import { StudentSelector } from '@/StudentSelector';
import { FinalFiveList } from '@/FinalFiveList';
import { MAX_FINAL_FIVE } from '@/finalFive';

const usd = (n: number | null): string =>
  n == null ? '—' : `$${Math.round(n).toLocaleString('en-US')}`;

const pct = (n: number | null): string =>
  n == null ? '—' : `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;

const INCOME_BANDS: { key: keyof CollegeFinancials['netPriceByIncome']; label: string }[] = [
  { key: 'band0_30k', label: 'Under $30k' },
  { key: 'band30_48k', label: '$30–48k' },
  { key: 'band48_75k', label: '$48–75k' },
  { key: 'band75_110k', label: '$75–110k' },
  { key: 'band110k_plus', label: '$110k+' },
];

type Mode = 'search' | 'final5';

export default function Colleges() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('search');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce typing so we don't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Student + bundle drive Final 5 membership and the "Add" action.
  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => api.listStudents(token!),
    enabled: !!token,
  });
  const students = studentsQuery.data?.students ?? [];
  const activeId = selectedStudentId ?? students[0]?.id ?? null;

  const bundleQuery = useQuery({
    queryKey: ['student', activeId],
    queryFn: () => api.getStudent(token!, activeId!),
    enabled: !!token && !!activeId,
  });
  const finalFive = bundleQuery.data?.finalFive ?? [];
  const finalFiveIds = new Set(finalFive.map((f) => f.collegeId));

  const statusQuery = useQuery({
    queryKey: ['scorecard-status'],
    queryFn: () => api.scorecardStatus(),
  });
  const enabled = statusQuery.data?.enabled ?? false;

  const searchQuery = useQuery({
    queryKey: ['scorecard', debounced],
    queryFn: () => api.searchColleges(token!, debounced),
    enabled: !!token && enabled && debounced.length >= 2,
  });
  const results = searchQuery.data?.results ?? [];

  const addMutation = useMutation({
    mutationFn: (collegeId: string) =>
      api.addFinalFive(token!, activeId!, { collegeId, category: 'Target' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['student', activeId] }),
  });

  const onAdd = (unitId: number) => {
    if (!activeId) {
      Alert.alert('No student yet', 'Create a student on the Profile tab first.');
      return;
    }
    if (finalFive.length >= MAX_FINAL_FIVE) {
      Alert.alert('Final 5 is full', 'Remove a school in “My Final 5” before adding another.');
      return;
    }
    addMutation.mutate(collegeIdFromUnitId(unitId));
  };

  return (
    <View className="flex-1 bg-slate-50">
      <Segmented mode={mode} onChange={setMode} count={finalFive.length} />

      {mode === 'search' ? (
        <>
          <View className="border-b border-slate-200 bg-white px-5 pb-3 pt-2">
            <TextInput
              className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
              placeholder="Search any U.S. college…"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              autoCorrect={false}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          <FlatList
            contentContainerClassName="p-5 gap-4"
            data={results}
            keyExtractor={(c) => String(c.unitId)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <CollegeCard
                college={item}
                inFinalFive={finalFiveIds.has(collegeIdFromUnitId(item.unitId))}
                onAdd={() => onAdd(item.unitId)}
              />
            )}
            ListEmptyComponent={
              <EmptyState
                statusLoading={statusQuery.isLoading}
                enabled={enabled}
                searching={searchQuery.isFetching}
                query={debounced}
                error={searchQuery.isError}
              />
            }
          />
        </>
      ) : activeId ? (
        <>
          {students.length > 1 ? (
            <View className="bg-white px-5 py-3">
              <StudentSelector
                students={students}
                activeId={activeId}
                onSelect={setSelectedStudentId}
              />
            </View>
          ) : null}
          <FinalFiveList token={token!} activeId={activeId} items={finalFive} />
        </>
      ) : (
        <ScrollView contentContainerClassName="p-5">
          <View className="rounded-2xl bg-white p-6 shadow-sm">
            <Text className="text-base font-semibold text-ink">No student yet</Text>
            <Text className="mt-2 text-sm leading-5 text-muted">
              Create a student on the Profile tab first, then add your Final 5
              schools from Search.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Segmented({
  mode,
  onChange,
  count,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  count: number;
}) {
  const Tab = ({ value, label }: { value: Mode; label: string }) => {
    const on = mode === value;
    return (
      <Pressable
        className={`flex-1 items-center rounded-lg py-2 ${on ? 'bg-white shadow-sm' : ''}`}
        onPress={() => onChange(value)}
      >
        <Text className={`text-sm ${on ? 'font-semibold text-ink' : 'text-muted'}`}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View className="flex-row gap-1 border-b border-slate-200 bg-slate-100 p-1">
      <Tab value="search" label="Search" />
      <Tab value="final5" label={`My Final 5${count ? ` (${count})` : ''}`} />
    </View>
  );
}

function EmptyState({
  statusLoading,
  enabled,
  searching,
  query,
  error,
}: {
  statusLoading: boolean;
  enabled: boolean;
  searching: boolean;
  query: string;
  error: boolean;
}) {
  if (statusLoading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }
  if (!enabled) {
    return (
      <Card>
        <Text className="text-base font-semibold text-ink">Search unavailable</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          College net-price search isn't configured on the server yet.
        </Text>
      </Card>
    );
  }
  if (searching) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }
  if (error) {
    return (
      <Card>
        <Text className="text-base font-semibold text-ink">Something went wrong</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          Couldn't reach college search. Check your connection and try again.
        </Text>
      </Card>
    );
  }
  if (query.length >= 2) {
    return (
      <Card>
        <Text className="text-base font-semibold text-ink">No matches</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          No operating colleges matched “{query}”. Try the official name.
        </Text>
      </Card>
    );
  }
  return (
    <Card>
      <Text className="text-base font-semibold text-ink">What will college actually cost?</Text>
      <Text className="mt-2 text-sm leading-5 text-muted">
        Search any U.S. college to see the <Text className="font-semibold">net price by family
        income</Text> — what families really pay after aid, not the sticker price — plus
        admission rate, test ranges, median debt, and graduate earnings.
      </Text>
      <Text className="mt-3 text-xs text-muted">
        Source: U.S. Dept. of Education — College Scorecard (public domain).
      </Text>
    </Card>
  );
}

function CollegeCard({
  college,
  inFinalFive,
  onAdd,
}: {
  college: CollegeFinancials;
  inFinalFive: boolean;
  onAdd: () => void;
}) {
  const openNpc = () => {
    if (college.netPriceCalculatorUrl) Linking.openURL(college.netPriceCalculatorUrl);
  };
  return (
    <Card>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-ink">{college.name}</Text>
          <Text className="mt-0.5 text-sm text-muted">
            {[college.city, college.state].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View className="rounded-full bg-slate-100 px-3 py-1">
          <Text className="text-xs font-semibold text-ink capitalize">{college.ownership}</Text>
        </View>
      </View>

      {/* Net price by income — the headline. */}
      <Text className="mt-4 text-xs font-semibold uppercase text-muted">
        Net price / year by family income
      </Text>
      <View className="mt-2 gap-1.5">
        {INCOME_BANDS.map((b) => (
          <View key={b.key} className="flex-row items-center justify-between">
            <Text className="text-sm text-muted">{b.label}</Text>
            <Text className="text-sm font-semibold text-ink">
              {usd(college.netPriceByIncome[b.key])}
            </Text>
          </View>
        ))}
      </View>

      <View className="mt-4 flex-row flex-wrap gap-x-8 gap-y-3">
        <Stat label="Admit rate" value={pct(college.admissionRate)} />
        <Stat
          label="SAT range"
          value={college.sat25 && college.sat75 ? `${college.sat25}–${college.sat75}` : '—'}
        />
        <Stat label="Median debt" value={usd(college.medianDebt)} />
        <Stat label="Earnings (10 yr)" value={usd(college.earnings10yr)} />
      </View>

      {inFinalFive ? (
        <View className="mt-4 items-center rounded-xl bg-brand-light/30 py-3">
          <Text className="text-sm font-semibold text-brand-dark">✓ In your Final 5</Text>
        </View>
      ) : (
        <Pressable
          className="mt-4 items-center rounded-xl border border-brand py-3 active:opacity-80"
          onPress={onAdd}
        >
          <Text className="text-sm font-semibold text-brand">+ Add to Final 5</Text>
        </Pressable>
      )}

      {college.netPriceCalculatorUrl ? (
        <Pressable className="mt-2 items-center py-2 active:opacity-70" onPress={openNpc}>
          <Text className="text-sm font-semibold text-muted">
            Open the school's Net Price Calculator
          </Text>
        </Pressable>
      ) : null}

      <Text className="mt-3 text-[11px] leading-4 text-muted">
        {college.source}. {college.vintage}.
      </Text>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="rounded-2xl bg-white p-5 shadow-sm">{children}</View>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs uppercase text-muted">{label}</Text>
      <Text className="text-base font-semibold text-ink">{value}</Text>
    </View>
  );
}
