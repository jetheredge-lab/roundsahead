import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { TimelineTask } from '@shared';
import { genId } from './AwardLetterForm';

type Category = TimelineTask['category'];
type GradeLevel = TimelineTask['gradeLevel'];
type Priority = TimelineTask['priority'];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'testing', label: 'Testing' },
  { value: 'academics', label: 'Academics' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'college_search', label: 'College search' },
  { value: 'essays', label: 'Essays' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'financial_aid', label: 'Financial aid' },
  { value: 'applications', label: 'Applications' },
];

const GRADE_LEVELS: GradeLevel[] = [
  'Junior Year (11th)',
  'Summer Before Senior',
  'Senior Year (12th)',
];

const PRIORITIES: Priority[] = ['high', 'medium', 'low'];

// Builds a fresh custom TimelineTask. Custom tasks carry a `custom_` id so the
// list can offer delete only for the milestones a family added themselves.
export function newCustomTask(): TimelineTask {
  return {
    id: `custom_${genId()}`,
    title: '',
    category: 'testing',
    targetMonth: '',
    gradeLevel: 'Junior Year (11th)',
    priority: 'high',
    description: '',
    actionItems: [],
    completed: false,
    isCustom: true,
  };
}

export function TimelineTaskForm({
  onCancel,
  onSave,
  saving,
}: {
  onCancel: () => void;
  onSave: (task: TimelineTask) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState('');
  const [targetMonth, setTargetMonth] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('testing');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel>('Junior Year (11th)');
  const [priority, setPriority] = useState<Priority>('high');

  const canSave = title.trim().length > 0 && !saving;

  const save = () =>
    onSave({
      ...newCustomTask(),
      title: title.trim(),
      targetMonth: targetMonth.trim(),
      description: description.trim(),
      category,
      gradeLevel,
      priority,
    });

  return (
    <ScrollView
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-5"
      keyboardShouldPersistTaps="handled"
    >
      <View className="rounded-2xl bg-white p-5 shadow-sm gap-4">
        <Text className="text-lg font-semibold text-ink">Add a custom milestone</Text>
        <Text className="-mt-2 text-sm leading-5 text-muted">
          Track something specific to your student's plan — a shadowing date, a
          scholarship deadline, an application step.
        </Text>

        <Field label="Milestone title">
          <TextInput
            className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Shadow a nurse at the county hospital"
            placeholderTextColor="#94a3b8"
          />
        </Field>

        <Field label="Target month">
          <TextInput
            className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
            value={targetMonth}
            onChangeText={setTargetMonth}
            placeholder="e.g. November (Junior Fall)"
            placeholderTextColor="#94a3b8"
          />
        </Field>

        <Field label="Phase">
          <ChipRow
            options={GRADE_LEVELS.map((g) => ({ value: g, label: g }))}
            selected={gradeLevel}
            onSelect={setGradeLevel}
          />
        </Field>

        <Field label="Category">
          <ChipRow options={CATEGORIES} selected={category} onSelect={setCategory} />
        </Field>

        <Field label="Priority">
          <ChipRow
            options={PRIORITIES.map((p) => ({ value: p, label: cap(p) }))}
            selected={priority}
            onSelect={setPriority}
          />
        </Field>

        <Field label="Notes (optional)">
          <TextInput
            className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
            value={description}
            onChangeText={setDescription}
            placeholder="Details or specific action steps"
            placeholderTextColor="#94a3b8"
            multiline
          />
        </Field>

        <View className="mt-1 flex-row gap-3">
          <Pressable
            className="flex-1 items-center rounded-xl border border-slate-300 py-3.5 active:opacity-80"
            onPress={onCancel}
            disabled={saving}
          >
            <Text className="text-base font-semibold text-ink">Cancel</Text>
          </Pressable>
          <Pressable
            className={`flex-1 items-center rounded-xl py-3.5 active:opacity-80 ${
              canSave ? 'bg-brand' : 'bg-slate-300'
            }`}
            onPress={save}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">Save milestone</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase text-muted">{label}</Text>
      {children}
    </View>
  );
}

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === selected;
        return (
          <Pressable
            key={o.value}
            className={`rounded-full px-3.5 py-2 ${on ? 'bg-brand' : 'bg-white border border-slate-300'}`}
            onPress={() => onSelect(o.value)}
          >
            <Text className={`text-sm ${on ? 'font-semibold text-white' : 'text-ink'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
