import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/auth';
import { queryClient } from '@/query';
import { initSentry, wrapRoot } from '@/sentry';

// Initialize error monitoring before anything renders (no-op without a DSN).
initSentry();

// Redirects between the auth flow and the app based on session state — the
// standard Expo Router protected-routes pattern.
function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (user && !inTabsGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default wrapRoot(RootLayout);
