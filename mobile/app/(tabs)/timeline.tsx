import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_TIMELINE_TASKS, type TimelineTask } from '@shared';
import { api, type StudentBundle } from '@/api';
import { useAuth } from '@/auth';
import { StudentSelector } from '@/StudentSelector';
import { LockedFeature } from '@/LockedFeature';
import { TimelineTaskForm } from '@/TimelineTaskForm';

type GradeFilter = 'all' | TimelineTask['gradeLevel'];

const GRADE_FILTERS: { value: GradeFilter; label: string }[] = [
  { value: 'all', label: 'All phases' },
  { value: 'Junior Year (11th)', label: 'Junior (11th)' },
  { value: 'Summer Before Senior', label: 'Summer' },
  { value: 'Senior Year (12th)', label: 'Senior (12th)' },
];

const CATEGORY_EMOJI: Record<TimelineTask['category'], string> = {
  testing: '🎯',
  academics: '🎓',
  clinical: '🩺',
  college_search: '📚',
  essays: '✍️',
  recommendations: '📨',
  financial_aid: '💰',
  applications: '📄',
};

export default function Timeline() {
  const { token, user } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [filter, setFilter] = useState<GradeFilter>('all');

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
  const tasks = bundleQuery.data?.timelineTasks ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['student', activeId] });

  // Optimistic toggle so the checkbox feels instant; roll back on error.
  const toggleMutation = useMutation({
    mutationFn: (task: TimelineTask) =>
      api.putTask(token!, activeId!, { ...task, completed: !task.completed }),
    onMutate: async (task: TimelineTask) => {
      await qc.cancelQueries({ queryKey: ['student', activeId] });
      const prev = qc.getQueryData<StudentBundle>(['student', activeId]);
      qc.setQueryData<StudentBundle>(['student', activeId], (old) =>
        old
          ? {
              ...old,
              timelineTasks: old.timelineTasks.map((t) =>
                t.id === task.id ? { ...t, completed: !t.completed } : t,
              ),
            }
          : old,
      );
      return { prev };
    },
    onError: (_e, _task, ctx) => {
      if (ctx?.prev) qc.setQueryData(['student', activeId], ctx.prev);
    },
    onSettled: invalidate,
  });

  const saveMutation = useMutation({
    mutationFn: (task: TimelineTask) => api.putTask(token!, activeId!, task),
    onSuccess: () => {
      invalidate();
      setComposing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) => api.deleteTask(token!, activeId!, taskId),
    onSuccess: invalidate,
  });

  const seedMutation = useMutation({
    // Seed one task at a time. Firing all ~14 writes in parallel overwhelms the
    // origin behind Cloudflare (it 502s under the burst); sequential writes are
    // reliable, and this only runs once per student.
    mutationFn: async () => {
      for (const t of DEFAULT_TIMELINE_TASKS) {
        await api.putTask(token!, activeId!, t);
      }
    },
    onSuccess: invalidate,
    onError: (e) =>
      Alert.alert('Could not set up the timeline', String((e as Error)?.message ?? e)),
  });

  const confirmDelete = (task: TimelineTask) =>
    Alert.alert('Delete milestone', `Remove “${task.title}” from your timeline?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(task.id) },
    ]);

  // Paid feature — the server also enforces this on every write.
  if (!user?.active) {
    return (
      <LockedFeature
        title="Timeline & Deadlines"
        blurb="A grade-by-grade roadmap of every task and deadline, from junior year through Decision Day."
      />
    );
  }

  // ── Loading / empty account ──────────────────────────────────────
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
            Create a student on the Profile tab first, then build out the
            junior-to-senior year milestone roadmap here.
          </Text>
        </View>
      </ScrollView>
    );
  }

  if (composing) {
    return (
      <TimelineTaskForm
        onCancel={() => setComposing(false)}
        onSave={(t) => saveMutation.mutate(t)}
        saving={saveMutation.isPending}
      />
    );
  }

  // Bundle's first fetch for this student.
  if (bundleQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

  // Student exists but has no milestones yet — the seed entry point. Rendered as
  // a plain ScrollView rather than the list's ListEmptyComponent, because
  // touchables inside ListEmptyComponent don't reliably receive taps under the
  // new architecture (Bridgeless).
  if (tasks.length === 0) {
    return (
      <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5 gap-4">
        <StudentSelector students={students} activeId={activeId} onSelect={setSelectedId} />
        <View className="rounded-2xl bg-white p-5 shadow-sm">
          <Text className="text-lg font-semibold text-ink">Admissions timeline</Text>
          <Text className="mt-1 text-sm leading-5 text-muted">
            Milestones across junior and senior year — testing, clinical hours,
            recommendations, essays, and application deadlines.
          </Text>
        </View>
        <View className="rounded-2xl bg-white p-6 shadow-sm">
          <Text className="text-base font-semibold text-ink">Build your timeline</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            Load the standard junior-to-senior milestone roadmap to start, then
            check off and customize it as you go.
          </Text>
          <Pressable
            className="mt-4 items-center rounded-xl bg-brand py-3.5 active:opacity-80"
            onPress={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
          >
            {seedMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Set up the standard timeline
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const completed = tasks.filter((t) => t.completed).length;
  const percent = Math.round((completed / tasks.length) * 100);
  const visible = tasks.filter((t) => filter === 'all' || t.gradeLevel === filter);

  return (
    <FlatList
      className="flex-1 bg-slate-50"
      contentContainerClassName="p-5 gap-4"
      data={visible}
      keyExtractor={(t) => t.id}
      ListHeaderComponent={
        <View className="gap-4">
          <StudentSelector students={students} activeId={activeId} onSelect={setSelectedId} />

          <View className="rounded-2xl bg-white p-5 shadow-sm">
            <Text className="text-lg font-semibold text-ink">Admissions timeline</Text>
            <Text className="mt-1 text-sm leading-5 text-muted">
              Milestones across junior and senior year — testing, clinical hours,
              recommendations, essays, and application deadlines.
            </Text>

            <View className="mt-4">
              <View className="flex-row justify-between">
                <Text className="text-xs font-semibold uppercase text-muted">Progress</Text>
                <Text className="text-xs font-semibold text-ink">
                  {completed} of {tasks.length} done ({percent}%)
                </Text>
              </View>
              <View className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <View className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
              </View>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mb-1">
            <View className="flex-row gap-2">
              {GRADE_FILTERS.map((f) => {
                const on = f.value === filter;
                return (
                  <Pressable
                    key={f.value}
                    className={`rounded-full px-4 py-2 ${on ? 'bg-brand' : 'bg-white border border-slate-300'}`}
                    onPress={() => setFilter(f.value)}
                  >
                    <Text className={on ? 'font-semibold text-white' : 'text-ink'}>{f.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => (
        <TaskCard
          task={item}
          onToggle={() => toggleMutation.mutate(item)}
          onDelete={() => confirmDelete(item)}
        />
      )}
      ListEmptyComponent={
        <View className="rounded-2xl bg-white p-6 shadow-sm">
          <Text className="text-base font-semibold text-ink">Nothing in this phase</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            No milestones match this filter yet.
          </Text>
        </View>
      }
      ListFooterComponent={
        <Pressable
          className="mt-1 items-center rounded-xl border border-dashed border-slate-300 bg-white py-3.5 active:opacity-70"
          onPress={() => setComposing(true)}
        >
          <Text className="text-base font-semibold text-brand">+ Add a custom milestone</Text>
        </Pressable>
      }
    />
  );
}

function TaskCard({
  task,
  onToggle,
  onDelete,
}: {
  task: TimelineTask;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      className={`rounded-2xl border p-4 ${
        task.completed ? 'border-brand-light bg-brand-light/10' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <View className="flex-row items-start gap-3">
        <Pressable onPress={onToggle} hitSlop={8} className="pt-0.5 active:opacity-60">
          <View
            className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
              task.completed ? 'border-brand bg-brand' : 'border-slate-300'
            }`}
          >
            {task.completed ? <Text className="text-xs font-bold text-white">✓</Text> : null}
          </View>
        </Pressable>

        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-[11px] font-semibold uppercase text-brand-dark">
              {task.targetMonth}
            </Text>
            <Text className="text-[11px] text-muted">
              {CATEGORY_EMOJI[task.category]} {task.category.replace('_', ' ')}
            </Text>
            {task.priority === 'high' ? (
              <Text className="text-[11px] font-bold uppercase text-red-600">High</Text>
            ) : null}
          </View>

          <Text
            className={`mt-1.5 text-base font-semibold ${
              task.completed ? 'text-muted line-through' : 'text-ink'
            }`}
          >
            {task.title}
          </Text>

          {task.description ? (
            <Text className="mt-1 text-sm leading-5 text-muted">{task.description}</Text>
          ) : null}

          {task.actionItems.length > 0 ? (
            <View className="mt-2 gap-1 border-t border-slate-100 pt-2">
              {task.actionItems.map((item, i) => (
                <View key={i} className="flex-row gap-2">
                  <Text className="text-brand">•</Text>
                  <Text className="flex-1 text-xs leading-4 text-muted">{item}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {task.isCustom ? (
            <Pressable onPress={onDelete} className="mt-2 self-start active:opacity-70">
              <Text className="text-sm font-semibold text-red-600">Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
