import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CAREER_PATHWAYS,
  computeReadinessScore,
  DEFAULT_TIMELINE_TASKS,
  type StudentProfile,
} from '@shared';
import { api, type StudentBundle } from '@/api';
import { useAuth } from '@/auth';
import { StudentSelector } from '@/StudentSelector';

const GRADES: StudentProfile['currentGrade'][] = [
  '10th (Sophomore)',
  '11th (Junior)',
  '12th (Senior)',
];

const PATHWAY_OPTIONS = Object.values(CAREER_PATHWAYS).map((p) => ({
  id: p.id,
  title: p.title,
}));

interface FormState {
  fullName: string;
  currentGrade: StudentProfile['currentGrade'];
  careerGoal: string;
  unweightedGpa: string;
  weightedGpa: string;
  satScore: string;
  actScore: string;
  clinicalHours: string;
  communityServiceHours: string;
}

function formFromProfile(p: StudentProfile): FormState {
  const num = (n: number | null) => (n == null ? '' : String(n));
  return {
    fullName: p.fullName,
    currentGrade: p.currentGrade,
    careerGoal: p.careerGoal,
    unweightedGpa: num(p.unweightedGpa),
    weightedGpa: num(p.weightedGpa),
    satScore: num(p.satScore),
    actScore: num(p.actScore),
    clinicalHours: num(p.clinicalHours),
    communityServiceHours: num(p.communityServiceHours),
  };
}

// Empty score fields become null; the rest parse to numbers (invalid → 0).
function patchFromForm(f: FormState): Partial<StudentProfile> {
  const req = (s: string) => (Number.isFinite(Number(s)) && s.trim() !== '' ? Number(s) : 0);
  const opt = (s: string) => (s.trim() === '' ? null : Number(s));
  return {
    fullName: f.fullName.trim(),
    currentGrade: f.currentGrade,
    careerGoal: f.careerGoal,
    unweightedGpa: req(f.unweightedGpa),
    weightedGpa: req(f.weightedGpa),
    satScore: opt(f.satScore),
    actScore: opt(f.actScore),
    clinicalHours: req(f.clinicalHours),
    communityServiceHours: req(f.communityServiceHours),
  };
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-brand-dark';
  if (score >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export default function Profile() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);

  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => api.listStudents(token!),
    enabled: !!token,
  });

  const students = studentsQuery.data?.students ?? [];
  // Default the selection to the first student once the list arrives.
  const activeId = selectedId ?? students[0]?.id ?? null;

  const bundleQuery = useQuery({
    queryKey: ['student', activeId],
    queryFn: () => api.getStudent(token!, activeId!),
    enabled: !!token && !!activeId,
  });

  const createMutation = useMutation({
    mutationFn: () => api.createStudent(token!, { timelineTasks: DEFAULT_TIMELINE_TASKS }),
    onSuccess: (bundle: StudentBundle) => {
      qc.invalidateQueries({ queryKey: ['students'] });
      setSelectedId(bundle.profile.id);
      setForm(formFromProfile(bundle.profile));
      setEditing(true);
    },
  });

  const saveMutation = useMutation({
    mutationFn: (patch: Partial<StudentProfile>) =>
      api.patchStudent(token!, activeId!, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', activeId] });
      qc.invalidateQueries({ queryKey: ['students'] });
      setEditing(false);
    },
  });

  const bundle = bundleQuery.data;
  const readiness = useMemo(() => {
    if (!bundle) return null;
    return computeReadinessScore(
      bundle.profile,
      bundle.finalFive.length,
      bundle.essays.length,
      bundle.profile.careerGoal,
    );
  }, [bundle]);

  const startEditing = () => {
    if (!bundle) return;
    setForm(formFromProfile(bundle.profile));
    setEditing(true);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  // ── Loading / empty states ──────────────────────────────────────
  if (studentsQuery.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator color="#0f766e" />
      </View>
    );
  }

  if (students.length === 0) {
    return (
      <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5 gap-4">
        <View className="rounded-2xl bg-white p-6 shadow-sm">
          <Text className="text-lg font-semibold text-ink">No student yet</Text>
          <Text className="mt-2 text-sm leading-5 text-muted">
            Create a student profile to track readiness, colleges, and the
            pre-health plan. It syncs with the web app automatically.
          </Text>
          <Pressable
            className="mt-4 items-center rounded-xl bg-brand py-3.5 active:opacity-80"
            disabled={createMutation.isPending}
            onPress={() => createMutation.mutate()}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Create student profile
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5 gap-4">
      {/* Multi-student selector (Phase 3: one account, many students). */}
      <StudentSelector
        students={students}
        activeId={activeId}
        onSelect={(id) => {
          setSelectedId(id);
          setEditing(false);
        }}
      />

      {bundleQuery.isLoading || !bundle ? (
        <View className="items-center py-12">
          <ActivityIndicator color="#0f766e" />
        </View>
      ) : editing && form ? (
        <EditForm
          form={form}
          setField={setField}
          onCancel={() => setEditing(false)}
          onSave={() => saveMutation.mutate(patchFromForm(form))}
          saving={saveMutation.isPending}
        />
      ) : (
        <ProfileView
          profile={bundle.profile}
          readiness={readiness ?? 0}
          onEdit={startEditing}
        />
      )}
    </ScrollView>
  );
}

// ── Read-only view ──────────────────────────────────────────────────
function ProfileView({
  profile,
  readiness,
  onEdit,
}: {
  profile: StudentProfile;
  readiness: number;
  onEdit: () => void;
}) {
  const pathway = CAREER_PATHWAYS[profile.careerGoal];
  return (
    <>
      <View className="rounded-2xl bg-white p-6 shadow-sm">
        <Text className="text-sm text-muted">Junior-year readiness</Text>
        <Text className={`mt-1 text-5xl font-bold ${scoreColor(readiness)}`}>
          {readiness}
          <Text className="text-2xl text-muted"> / 100</Text>
        </Text>
        <Text className="mt-2 text-xs text-muted">
          Weighted for {pathway?.title ?? 'your pathway'}. Improve it with clinical
          hours, testing, activities, your Final Five, and essays.
        </Text>
      </View>

      <View className="rounded-2xl bg-white p-5 shadow-sm gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-ink">
            {profile.fullName || 'Unnamed student'}
          </Text>
          <Pressable onPress={onEdit} className="active:opacity-70">
            <Text className="text-sm font-semibold text-brand">Edit</Text>
          </Pressable>
        </View>
        <Text className="text-sm text-muted">
          {profile.currentGrade} · Class of {profile.gradYear}
        </Text>
        <View className="mt-1 flex-row flex-wrap gap-x-8 gap-y-3">
          <Stat label="Unweighted GPA" value={profile.unweightedGpa || '—'} />
          <Stat label="Weighted GPA" value={profile.weightedGpa || '—'} />
          <Stat label="SAT" value={profile.satScore ?? '—'} />
          <Stat label="ACT" value={profile.actScore ?? '—'} />
          <Stat label="Clinical hrs" value={profile.clinicalHours} />
          <Stat label="Service hrs" value={profile.communityServiceHours} />
        </View>
      </View>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View>
      <Text className="text-xs uppercase text-muted">{label}</Text>
      <Text className="text-base font-semibold text-ink">{value}</Text>
    </View>
  );
}

// ── Edit form ───────────────────────────────────────────────────────
function EditForm({
  form,
  setField,
  onCancel,
  onSave,
  saving,
}: {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <View className="rounded-2xl bg-white p-5 shadow-sm gap-4">
      <Text className="text-lg font-semibold text-ink">Edit profile</Text>

      <Field label="Full name">
        <TextInput
          className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
          value={form.fullName}
          onChangeText={(v) => setField('fullName', v)}
          placeholder="Student name"
          placeholderTextColor="#94a3b8"
        />
      </Field>

      <Field label="Grade">
        <View className="flex-row flex-wrap gap-2">
          {GRADES.map((g) => {
            const on = g === form.currentGrade;
            return (
              <Pressable
                key={g}
                className={`rounded-full px-3 py-2 ${on ? 'bg-brand' : 'bg-slate-100'}`}
                onPress={() => setField('currentGrade', g)}
              >
                <Text className={on ? 'text-white text-sm font-semibold' : 'text-ink text-sm'}>
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="Pathway">
        <View className="flex-row flex-wrap gap-2">
          {PATHWAY_OPTIONS.map((p) => {
            const on = p.id === form.careerGoal;
            return (
              <Pressable
                key={p.id}
                className={`rounded-full px-3 py-2 ${on ? 'bg-brand' : 'bg-slate-100'}`}
                onPress={() => setField('careerGoal', p.id)}
              >
                <Text className={on ? 'text-white text-sm font-semibold' : 'text-ink text-sm'}>
                  {p.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <View className="flex-row gap-3">
        <NumberField
          label="Unweighted GPA"
          value={form.unweightedGpa}
          onChange={(v) => setField('unweightedGpa', v)}
        />
        <NumberField
          label="Weighted GPA"
          value={form.weightedGpa}
          onChange={(v) => setField('weightedGpa', v)}
        />
      </View>
      <View className="flex-row gap-3">
        <NumberField label="SAT" value={form.satScore} onChange={(v) => setField('satScore', v)} />
        <NumberField label="ACT" value={form.actScore} onChange={(v) => setField('actScore', v)} />
      </View>
      <View className="flex-row gap-3">
        <NumberField
          label="Clinical hours"
          value={form.clinicalHours}
          onChange={(v) => setField('clinicalHours', v)}
        />
        <NumberField
          label="Service hours"
          value={form.communityServiceHours}
          onChange={(v) => setField('communityServiceHours', v)}
        />
      </View>

      <View className="mt-1 flex-row gap-3">
        <Pressable
          className="flex-1 items-center rounded-xl border border-slate-300 py-3.5 active:opacity-80"
          onPress={onCancel}
          disabled={saving}
        >
          <Text className="text-base font-semibold text-ink">Cancel</Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center rounded-xl bg-brand py-3.5 active:opacity-80"
          onPress={onSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">Save</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs uppercase text-muted">{label}</Text>
      {children}
    </View>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-1 gap-2">
      <Text className="text-xs uppercase text-muted">{label}</Text>
      <TextInput
        className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="—"
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}
