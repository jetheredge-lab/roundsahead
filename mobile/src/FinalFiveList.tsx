import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FinalFiveItem } from '@shared';
import { api, type StudentBundle } from './api';
import {
  CATEGORY_STYLE,
  MAX_FINAL_FIVE,
  completionPercent,
  isBalanced,
  type Category,
} from './finalFive';
import { FinalFiveTracker } from './FinalFiveTracker';
import { useResolvedCollege } from './useResolvedCollege';

export function FinalFiveList({
  token,
  activeId,
  items,
}: {
  token: string;
  activeId: string;
  items: FinalFiveItem[];
}) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const key = ['student', activeId];

  // Optimistically patch one Final Five item in the cached bundle so tier /
  // checklist taps feel instant, then reconcile with the server.
  const patchCache = (collegeId: string, updates: Partial<FinalFiveItem>) => {
    qc.setQueryData<StudentBundle>(key, (old) =>
      old
        ? {
            ...old,
            finalFive: old.finalFive.map((f) =>
              f.collegeId === collegeId ? { ...f, ...updates } : f,
            ),
          }
        : old,
    );
  };

  const patchMutation = useMutation({
    mutationFn: ({ collegeId, updates }: { collegeId: string; updates: Partial<FinalFiveItem> }) =>
      api.patchFinalFive(token, activeId, collegeId, updates),
    onMutate: async ({ collegeId, updates }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<StudentBundle>(key);
      patchCache(collegeId, updates);
      return { prev };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  const removeMutation = useMutation({
    mutationFn: (collegeId: string) => api.removeFinalFive(token, activeId, collegeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const patch = (collegeId: string, updates: Partial<FinalFiveItem>) =>
    patchMutation.mutate({ collegeId, updates });

  const toggle = (collegeId: string, checkKey: keyof FinalFiveItem['checklist']) => {
    const item = items.find((i) => i.collegeId === collegeId);
    if (!item) return;
    patch(collegeId, {
      checklist: { ...item.checklist, [checkKey]: !item.checklist[checkKey] },
    });
  };

  const confirmRemove = (collegeId: string) =>
    Alert.alert('Remove school', 'Remove this school from your Final 5?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeMutation.mutate(collegeId);
          setSelectedId(null);
        },
      },
    ]);

  const selected = items.find((i) => i.collegeId === selectedId);
  if (selected) {
    return (
      <FinalFiveTracker
        item={selected}
        index={items.findIndex((i) => i.collegeId === selectedId)}
        token={token}
        onBack={() => setSelectedId(null)}
        onPatch={(updates) => patch(selected.collegeId, updates)}
        onToggle={(k) => toggle(selected.collegeId, k)}
        onRemove={() => confirmRemove(selected.collegeId)}
      />
    );
  }

  const counts = {
    Safety: items.filter((i) => i.category === 'Safety').length,
    Target: items.filter((i) => i.category === 'Target').length,
    Reach: items.filter((i) => i.category === 'Reach').length,
  };

  if (items.length === 0) {
    return (
      <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5">
        <View className="rounded-2xl bg-white p-6 shadow-sm">
          <Text className="text-base font-semibold text-ink">Your Final 5 is empty</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            Switch to Search, find the schools you're applying to, and tap “Add to
            Final 5.” Then track each application's checklist here.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5 gap-4">
      <View className="rounded-2xl bg-white p-5 shadow-sm">
        <Text className="text-base font-semibold text-ink">List balance</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {(['Safety', 'Target', 'Reach'] as Category[]).map((c) => (
            <View key={c} className={`rounded px-2.5 py-1 ${CATEGORY_STYLE[c].chip}`}>
              <Text className={`text-xs font-semibold ${CATEGORY_STYLE[c].text}`}>
                {counts[c]} {c}
              </Text>
            </View>
          ))}
        </View>
        <Text className="mt-3 text-sm leading-5 text-muted">
          {items.length < MAX_FINAL_FIVE
            ? `You've added ${items.length} of ${MAX_FINAL_FIVE}. Add ${MAX_FINAL_FIVE - items.length} more from Search to complete your list.`
            : isBalanced(items)
              ? 'Balanced list — a safety, targets, and a reach. Nicely done.'
              : 'Tip: a strong list has 1–2 safety, 2–3 target, and 1–2 reach schools.'}
        </Text>
      </View>

      {items.map((item, i) => (
        <FinalFiveCard
          key={item.collegeId}
          item={item}
          index={i}
          token={token}
          onPress={() => setSelectedId(item.collegeId)}
        />
      ))}
    </ScrollView>
  );
}

function FinalFiveCard({
  item,
  index,
  token,
  onPress,
}: {
  item: FinalFiveItem;
  index: number;
  token: string;
  onPress: () => void;
}) {
  const college = useResolvedCollege(item, token);
  const percent = completionPercent(item.checklist);
  const style = CATEGORY_STYLE[item.category];

  return (
    <Pressable className="rounded-2xl bg-white p-5 shadow-sm active:opacity-80" onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
          <Text className="text-sm font-bold text-ink">#{index + 1}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-semibold text-ink">{college.name}</Text>
          {college.location ? (
            <Text className="mt-0.5 text-xs text-muted">{college.location}</Text>
          ) : null}
        </View>
        <View className={`rounded-full px-2.5 py-1 ${style.chip}`}>
          <Text className={`text-xs font-semibold ${style.text}`}>{item.category}</Text>
        </View>
      </View>

      <View className="mt-4">
        <View className="flex-row justify-between">
          <Text className="text-xs font-semibold uppercase text-muted">Readiness</Text>
          <Text className="text-xs font-semibold text-ink">{percent}%</Text>
        </View>
        <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <View className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
        </View>
      </View>

      <Text className="mt-3 text-xs font-semibold text-brand">Open checklist ›</Text>
    </Pressable>
  );
}
