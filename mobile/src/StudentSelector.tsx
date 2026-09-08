import { Pressable, ScrollView, Text, View } from 'react-native';
import type { StudentSummary } from './api';

// Horizontal pill row for switching the active student. Renders nothing for a
// single student (Phase 3: one account can hold many students).
export function StudentSelector({
  students,
  activeId,
  onSelect,
}: {
  students: StudentSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (students.length <= 1) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mb-1">
      <View className="flex-row gap-2">
        {students.map((s) => {
          const on = s.id === activeId;
          return (
            <Pressable
              key={s.id}
              className={`rounded-full px-4 py-2 ${on ? 'bg-brand' : 'bg-white border border-slate-300'}`}
              onPress={() => onSelect(s.id)}
            >
              <Text className={on ? 'text-white font-semibold' : 'text-ink'}>
                {s.fullName || 'Unnamed'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
