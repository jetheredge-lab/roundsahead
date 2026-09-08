import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  costOfAttendance,
  hasLoans,
  netCostThisYear,
  projectedFourYearBorrowing,
  totalGiftAid,
  totalLoans,
  type AwardLetter,
} from '@shared';
import { api } from '@/api';
import { useAuth } from '@/auth';
import { StudentSelector } from '@/StudentSelector';
import { LockedFeature } from '@/LockedFeature';
import { AwardLetterForm, emptyAwardLetter } from '@/AwardLetterForm';

const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

export default function Awards() {
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AwardLetter | null>(null);

  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => api.listStudents(token!),
    enabled: !!token,
  });
  const students = studentsQuery.data?.students ?? [];
  const activeId = selectedId ?? students[0]?.id ?? null;

  const bundleQuery = useQuery({
    queryKey: ['student', activeId],
    queryFn: () => api.getStudent(token!, activeId!),
    enabled: !!token && !!activeId,
  });
  const letters = bundleQuery.data?.awardLetters ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['student', activeId] });

  const saveMutation = useMutation({
    mutationFn: (letter: AwardLetter) => api.putAwardLetter(token!, activeId!, letter),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (letterId: string) => api.deleteAwardLetter(token!, activeId!, letterId),
    onSuccess: invalidate,
  });

  const confirmDelete = (letter: AwardLetter) =>
    Alert.alert('Delete offer', `Remove the offer from ${letter.collegeName || 'this school'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(letter.id) },
    ]);

  // Paid feature — the server also enforces this on every write.
  if (!user?.active) {
    return (
      <LockedFeature
        title="Award Letter Comparison"
        blurb="Enter each financial-aid offer and see net cost and total four-year borrowing side by side, with loans-dressed-as-aid flagged."
      />
    );
  }

  if (studentsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

  if (students.length === 0) {
    return (
      <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5">
        <View className="rounded-2xl bg-white p-6 shadow-sm">
          <Text className="text-lg font-semibold text-ink">No student yet</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            Create a student on the Profile tab first, then add each college's
            financial-aid award letter here to compare them.
          </Text>
        </View>
      </ScrollView>
    );
  }

  // ── Editing ──────────────────────────────────────────────────────
  if (editing) {
    return (
      <ScrollView
        className="flex-1 bg-slate-50"
        contentContainerClassName="p-5"
        keyboardShouldPersistTaps="handled"
      >
        <AwardLetterForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSave={(l) => saveMutation.mutate(l)}
          saving={saveMutation.isPending}
        />
      </ScrollView>
    );
  }

  const lowestNet = letters.length >= 2 ? Math.min(...letters.map(netCostThisYear)) : null;

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5 gap-4">
      <StudentSelector students={students} activeId={activeId} onSelect={setSelectedId} />

      <View className="rounded-2xl bg-brand-light/40 p-4">
        <Text className="text-sm font-semibold text-brand-dark">Compare your award letters</Text>
        <Text className="mt-1 text-xs leading-4 text-brand-dark">
          Enter each offer to see net cost and total borrowing side by side.
          Decision Day is May 1.
        </Text>
      </View>

      {bundleQuery.isLoading ? (
        <View className="items-center py-10">
          <ActivityIndicator color="#0f766e" />
        </View>
      ) : letters.length === 0 ? (
        <View className="rounded-2xl bg-white p-6 shadow-sm">
          <Text className="text-base font-semibold text-ink">No offers yet</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            Add each college's financial-aid award letter — costs, grants,
            work-study, and loans — to compare what you'd actually pay.
          </Text>
        </View>
      ) : (
        letters.map((l) => (
          <AwardCard
            key={l.id}
            letter={l}
            isLowestNet={lowestNet != null && netCostThisYear(l) === lowestNet}
            onEdit={() => setEditing(l)}
            onDelete={() => confirmDelete(l)}
          />
        ))
      )}

      <Pressable
        className="mt-1 items-center rounded-xl bg-brand py-3.5 active:opacity-80"
        onPress={() => setEditing(emptyAwardLetter())}
      >
        <Text className="text-base font-semibold text-white">+ Add an offer</Text>
      </Pressable>

      {letters.length >= 2 ? (
        <Text className="mt-1 px-1 text-xs leading-4 text-muted">
          These are the numbers from each letter — not a recommendation. The right
          school depends on more than cost.
        </Text>
      ) : null}
    </ScrollView>
  );
}

function AwardCard({
  letter,
  isLowestNet,
  onEdit,
  onDelete,
}: {
  letter: AwardLetter;
  isLowestNet: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const net = netCostThisYear(letter);
  const loans = totalLoans(letter);
  return (
    <View className="rounded-2xl bg-white p-5 shadow-sm gap-3">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-ink">
            {letter.collegeName || 'Untitled offer'}
          </Text>
          {letter.academicYear ? (
            <Text className="mt-0.5 text-sm text-muted">{letter.academicYear}</Text>
          ) : null}
        </View>
        {isLowestNet ? (
          <View className="rounded-full bg-brand-light px-3 py-1">
            <Text className="text-xs font-semibold text-brand-dark">Lowest net cost</Text>
          </View>
        ) : null}
      </View>

      <View>
        <Text className="text-xs uppercase text-muted">Net cost this year</Text>
        <Text className="text-3xl font-bold text-ink">{usd(net)}</Text>
        <Text className="mt-0.5 text-xs text-muted">
          Cost of attendance {usd(costOfAttendance(letter))} − gift aid{' '}
          {usd(totalGiftAid(letter))}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-x-8 gap-y-3">
        <Stat label="Total loans" value={usd(loans)} />
        <Stat label="Borrowing over 4 yrs" value={usd(projectedFourYearBorrowing(letter))} />
      </View>

      {hasLoans(letter) ? (
        <View className="rounded-xl bg-amber-50 p-3">
          <Text className="text-xs leading-4 text-amber-800">
            ⚠️ This offer includes {usd(loans)} in loans. Loans are borrowed money
            that must be repaid with interest — not aid, even when a letter lists
            them under “awards.”
          </Text>
        </View>
      ) : null}

      <View className="flex-row gap-4">
        <Pressable onPress={onEdit} className="active:opacity-70">
          <Text className="text-sm font-semibold text-brand">Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} className="active:opacity-70">
          <Text className="text-sm font-semibold text-red-600">Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-xs uppercase text-muted">{label}</Text>
      <Text className="text-base font-semibold text-ink">{value}</Text>
    </View>
  );
}
