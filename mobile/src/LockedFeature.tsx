import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/auth';

// Shown in place of a paid tab when the signed-in account has no active
// entitlement.
//
// Deliberately Apple-compliant: RoundsAhead sells the license as an external
// web purchase (a parent buys on roundsahead.com), so this screen shows NO
// price, NO buy button, and NO tappable link to checkout — only an explanation
// and a refresh, so we don't trip App Review's anti-steering rules. Once the
// parent's purchase lands, the entitlement flows back through /auth/me and the
// tab unlocks.
export function LockedFeature({ title, blurb }: { title: string; blurb: string }) {
  const { refreshUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-5 gap-4">
      <View className="mt-6 items-center rounded-2xl bg-white p-6 shadow-sm">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Text style={{ fontSize: 26 }}>🔒</Text>
        </View>

        <Text className="mt-4 text-center text-xl font-bold text-ink">{title}</Text>
        <Text className="mt-2 text-center text-sm leading-5 text-muted">{blurb}</Text>

        <View className="mt-5 rounded-full bg-amber-100 px-3 py-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Part of RoundsAhead Pro
          </Text>
        </View>

        <View className="mt-6 w-full gap-2">
          {[
            'One purchase covers a full year of access',
            'Unlocks every planning tool, for every student on the account',
            'College search & the pathway explorer stay free',
          ].map((line) => (
            <View key={line} className="flex-row gap-2">
              <Text className="text-emerald-600">✓</Text>
              <Text className="flex-1 text-sm leading-5 text-ink">{line}</Text>
            </View>
          ))}
        </View>

        <Text className="mt-6 text-center text-xs leading-4 text-muted">
          RoundsAhead Pro is purchased on the web at roundsahead.com. Once it’s
          active on your account, this unlocks automatically — tap below if
          you’ve already upgraded.
        </Text>

        <Pressable
          onPress={onRefresh}
          disabled={refreshing}
          className="mt-4 w-full items-center rounded-xl border border-slate-300 py-3 active:opacity-70"
        >
          {refreshing ? (
            <ActivityIndicator color="#0f766e" />
          ) : (
            <Text className="text-base font-semibold text-brand">Refresh access</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
