import { Stack } from 'expo-router';

// Gives the (auth) route group its own navigator so the root layout can address
// it as a single "(auth)" screen (without this, expo-router flattens the group
// to "(auth)/sign-in" and the root <Stack.Screen name="(auth)"> warns).
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
