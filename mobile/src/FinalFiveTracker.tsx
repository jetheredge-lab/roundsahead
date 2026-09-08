import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { FinalFiveItem } from '@shared';
import {
  APPLICATION_PLANS,
  CATEGORIES,
  CHECKLIST_SECTIONS,
  completionPercent,
} from './finalFive';
import { useResolvedCollege } from './useResolvedCollege';

export function FinalFiveTracker({
  item,
  index,
  token,
  onBack,
  onPatch,
  onToggle,
  onRemove,
}: {
  item: FinalFiveItem;
  index: number;
  token: string;
  onBack: () => void;
  onPatch: (updates: Partial<FinalFiveItem>) => void;
  onToggle: (key: keyof FinalFiveItem['checklist']) => void;
  onRemove: () => void;
}) {
  const college = useResolvedCollege(item, token);
  const percent = completionPercent(item.checklist);

  // Text fields save on blur so we don't fire a request per keystroke.
  const [targetMajor, setTargetMajor] = useState(item.targetMajor);
  const [portalUrl, setPortalUrl] = useState(item.portalUrl ?? '');
  const [notes, setNotes] = useState(item.notes);

  const saveIfChanged = (field: 'targetMajor' | 'portalUrl' | 'notes', value: string) => {
    if ((item[field] ?? '') !== value) onPatch({ [field]: value } as Partial<FinalFiveItem>);
  };

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-5 gap-4"
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={onBack} hitSlop={8} className="self-start active:opacity-70">
        <Text className="text-sm font-semibold text-brand">‹ All 5 schools</Text>
      </Pressable>

      <View className="rounded-2xl bg-white p-5 shadow-sm gap-3">
        <View className="flex-row items-start gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand">
            <Text className="text-sm font-bold text-white">#{index + 1}</Text>
          </View>
          <View className="flex-1">
            {college.loading ? (
              <ActivityIndicator color="#0f766e" />
            ) : (
              <>
                <Text className="text-lg font-semibold text-ink">{college.name}</Text>
                {college.location ? (
                  <Text className="mt-0.5 text-sm text-muted">{college.location}</Text>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View>
          <View className="flex-row justify-between">
            <Text className="text-xs font-semibold uppercase text-muted">Package readiness</Text>
            <Text className="text-xs font-semibold text-ink">{percent}%</Text>
          </View>
          <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <View className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
          </View>
        </View>

        {college.deadline ? (
          <Text className="text-xs text-muted">Deadline: {college.deadline}</Text>
        ) : null}
      </View>

      {/* Tier */}
      <View className="rounded-2xl bg-white p-5 shadow-sm gap-3">
        <Text className="text-xs font-semibold uppercase text-muted">List tier</Text>
        <View className="flex-row gap-2">
          {CATEGORIES.map((c) => {
            const on = item.category === c;
            return (
              <Pressable
                key={c}
                className={`rounded-full px-4 py-2 ${on ? 'bg-brand' : 'bg-white border border-slate-300'}`}
                onPress={() => onPatch({ category: c })}
              >
                <Text className={on ? 'font-semibold text-white' : 'text-ink'}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-1 text-xs font-semibold uppercase text-muted">Application plan</Text>
        <View className="flex-row flex-wrap gap-2">
          {APPLICATION_PLANS.map((p) => {
            const on = item.applicationType === p.value;
            return (
              <Pressable
                key={p.value}
                className={`rounded-full px-4 py-2 ${on ? 'bg-brand' : 'bg-white border border-slate-300'}`}
                onPress={() => onPatch({ applicationType: p.value })}
              >
                <Text className={on ? 'font-semibold text-white' : 'text-ink'}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-1 text-xs font-semibold uppercase text-muted">Target major</Text>
        <TextInput
          className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
          value={targetMajor}
          onChangeText={setTargetMajor}
          onEndEditing={() => saveIfChanged('targetMajor', targetMajor.trim())}
          placeholder="e.g. Nursing (BSN), Biology (pre-med)"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Checklist */}
      <View className="rounded-2xl bg-white p-5 shadow-sm gap-4">
        <Text className="text-base font-semibold text-ink">Application checklist</Text>
        {CHECKLIST_SECTIONS.map((section) => (
          <View key={section.title} className="gap-2">
            <Text className="text-xs font-semibold uppercase text-muted">{section.title}</Text>
            {section.items.map(({ key, label }) => {
              const checked = item.checklist[key];
              return (
                <Pressable
                  key={key}
                  className="flex-row items-center gap-3 active:opacity-70"
                  onPress={() => onToggle(key)}
                  hitSlop={4}
                >
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-md border-2 ${
                      checked ? 'border-brand bg-brand' : 'border-slate-300'
                    }`}
                  >
                    {checked ? <Text className="text-xs font-bold text-white">✓</Text> : null}
                  </View>
                  <Text
                    className={`flex-1 text-sm ${checked ? 'text-muted line-through' : 'text-ink'}`}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Portal + notes */}
      <View className="rounded-2xl bg-white p-5 shadow-sm gap-3">
        <Text className="text-xs font-semibold uppercase text-muted">Applicant portal URL</Text>
        <TextInput
          className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
          value={portalUrl}
          onChangeText={setPortalUrl}
          onEndEditing={() => saveIfChanged('portalUrl', portalUrl.trim())}
          placeholder="https://apply.school.edu/status"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          keyboardType="url"
        />
        <Text className="text-xs font-semibold uppercase text-muted">Notes & strategy</Text>
        <TextInput
          className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
          value={notes}
          onChangeText={setNotes}
          onEndEditing={() => saveIfChanged('notes', notes.trim())}
          placeholder="Interview dates, contacts, reminders"
          placeholderTextColor="#94a3b8"
          multiline
        />
      </View>

      <Pressable onPress={onRemove} className="items-center py-2 active:opacity-70">
        <Text className="text-sm font-semibold text-red-600">Remove from Final 5</Text>
      </Pressable>
    </ScrollView>
  );
}
