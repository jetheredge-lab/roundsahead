import { useState } from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';
import type { AwardLetter, AwardLetterGrant } from '@shared';

// A client-side id for new letters/grants (no crypto.randomUUID on all RN yet).
export const genId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function emptyAwardLetter(): AwardLetter {
  return {
    id: genId(),
    collegeName: '',
    academicYear: '',
    tuitionAndFees: 0,
    housingAndMeals: 0,
    booksAndSupplies: 0,
    transportation: 0,
    personalExpenses: 0,
    grants: [],
    workStudy: 0,
    loanSubsidized: 0,
    loanUnsubsidized: 0,
    loanParentPlus: 0,
    loanOther: 0,
    notes: '',
  };
}

// Form state keeps money fields as strings (what TextInput edits); we parse on
// save so a half-typed number never becomes NaN mid-edit.
type Money =
  | 'tuitionAndFees'
  | 'housingAndMeals'
  | 'booksAndSupplies'
  | 'transportation'
  | 'personalExpenses'
  | 'workStudy'
  | 'loanSubsidized'
  | 'loanUnsubsidized'
  | 'loanParentPlus'
  | 'loanOther';

const num = (s: string): number => {
  const n = Number(s.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const str = (n: number): string => (n ? String(n) : '');

export function AwardLetterForm({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial: AwardLetter;
  onCancel: () => void;
  onSave: (letter: AwardLetter) => void;
  saving: boolean;
}) {
  const [collegeName, setCollegeName] = useState(initial.collegeName);
  const [academicYear, setAcademicYear] = useState(initial.academicYear);
  const [notes, setNotes] = useState(initial.notes);
  const [money, setMoney] = useState<Record<Money, string>>({
    tuitionAndFees: str(initial.tuitionAndFees),
    housingAndMeals: str(initial.housingAndMeals),
    booksAndSupplies: str(initial.booksAndSupplies),
    transportation: str(initial.transportation),
    personalExpenses: str(initial.personalExpenses),
    workStudy: str(initial.workStudy),
    loanSubsidized: str(initial.loanSubsidized),
    loanUnsubsidized: str(initial.loanUnsubsidized),
    loanParentPlus: str(initial.loanParentPlus),
    loanOther: str(initial.loanOther),
  });
  const [grants, setGrants] = useState<AwardLetterGrant[]>(initial.grants);

  const setM = (k: Money, v: string) => setMoney((p) => ({ ...p, [k]: v }));
  const setGrant = (id: string, patch: Partial<AwardLetterGrant>) =>
    setGrants((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const addGrant = () =>
    setGrants((g) => [...g, { id: genId(), name: '', amount: 0, renewable: true, condition: '' }]);
  const removeGrant = (id: string) => setGrants((g) => g.filter((x) => x.id !== id));

  const save = () =>
    onSave({
      ...initial,
      collegeName: collegeName.trim(),
      academicYear: academicYear.trim(),
      notes: notes.trim(),
      tuitionAndFees: num(money.tuitionAndFees),
      housingAndMeals: num(money.housingAndMeals),
      booksAndSupplies: num(money.booksAndSupplies),
      transportation: num(money.transportation),
      personalExpenses: num(money.personalExpenses),
      workStudy: num(money.workStudy),
      loanSubsidized: num(money.loanSubsidized),
      loanUnsubsidized: num(money.loanUnsubsidized),
      loanParentPlus: num(money.loanParentPlus),
      loanOther: num(money.loanOther),
      grants: grants.map((g) => ({ ...g, name: g.name.trim() })),
    });

  return (
    <View className="rounded-2xl bg-white p-5 shadow-sm gap-4">
      <Text className="text-lg font-semibold text-ink">
        {initial.collegeName ? 'Edit offer' : 'Add an offer'}
      </Text>

      <Section title="School" />
      <TextField value={collegeName} onChange={setCollegeName} placeholder="College name" />
      <TextField value={academicYear} onChange={setAcademicYear} placeholder="Year (e.g. 2027–2028)" />

      <Section title="Direct costs (billed by the school)" />
      <MoneyRow label="Tuition & fees" value={money.tuitionAndFees} onChange={(v) => setM('tuitionAndFees', v)} />
      <MoneyRow label="Housing & meals" value={money.housingAndMeals} onChange={(v) => setM('housingAndMeals', v)} />

      <Section title="Indirect costs (estimated, not billed)" />
      <MoneyRow label="Books & supplies" value={money.booksAndSupplies} onChange={(v) => setM('booksAndSupplies', v)} />
      <MoneyRow label="Transportation" value={money.transportation} onChange={(v) => setM('transportation', v)} />
      <MoneyRow label="Personal expenses" value={money.personalExpenses} onChange={(v) => setM('personalExpenses', v)} />

      <Section title="Grants & scholarships (not repaid)" />
      {grants.map((g) => (
        <View key={g.id} className="rounded-xl border border-slate-200 p-3 gap-2">
          <TextField value={g.name} onChange={(v) => setGrant(g.id, { name: v })} placeholder="Grant / scholarship name" />
          <MoneyRow
            label="Amount / year"
            value={str(g.amount)}
            onChange={(v) => setGrant(g.id, { amount: num(v) })}
          />
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-ink">Renews each year</Text>
            <Switch value={g.renewable} onValueChange={(v) => setGrant(g.id, { renewable: v })} />
          </View>
          {!g.renewable ? (
            <TextField
              value={g.condition}
              onChange={(v) => setGrant(g.id, { condition: v })}
              placeholder="Condition (e.g. freshman-only, GPA)"
            />
          ) : null}
          <Pressable onPress={() => removeGrant(g.id)} className="self-end active:opacity-70">
            <Text className="text-sm font-semibold text-red-600">Remove</Text>
          </Pressable>
        </View>
      ))}
      <Pressable
        onPress={addGrant}
        className="items-center rounded-xl border border-dashed border-slate-300 py-3 active:opacity-70"
      >
        <Text className="text-sm font-semibold text-brand">+ Add a grant / scholarship</Text>
      </Pressable>

      <Section title="Work-study (must be earned)" />
      <MoneyRow label="Work-study" value={money.workStudy} onChange={(v) => setM('workStudy', v)} />

      <Section title="Loans (must be repaid)" />
      <MoneyRow label="Subsidized" value={money.loanSubsidized} onChange={(v) => setM('loanSubsidized', v)} />
      <MoneyRow label="Unsubsidized" value={money.loanUnsubsidized} onChange={(v) => setM('loanUnsubsidized', v)} />
      <MoneyRow label="Parent PLUS" value={money.loanParentPlus} onChange={(v) => setM('loanParentPlus', v)} />
      <MoneyRow label="Other" value={money.loanOther} onChange={(v) => setM('loanOther', v)} />

      <Section title="Notes" />
      <TextInput
        className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything to remember about this offer"
        placeholderTextColor="#94a3b8"
        multiline
      />

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
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-base font-semibold text-white">Save offer</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <Text className="mt-1 text-xs font-semibold uppercase text-muted">{title}</Text>;
}

function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      className="rounded-xl border border-slate-300 px-4 py-3 text-base text-ink"
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
    />
  );
}

function MoneyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="flex-1 text-sm text-ink">{label}</Text>
      <View className="flex-row items-center rounded-xl border border-slate-300 px-3">
        <Text className="text-base text-muted">$</Text>
        <TextInput
          className="min-w-[90px] py-3 pl-1 text-base text-ink"
          value={value}
          onChangeText={onChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#94a3b8"
          textAlign="right"
        />
      </View>
    </View>
  );
}
