import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Quicksand_400Regular,
  Quicksand_500Medium,
  Quicksand_600SemiBold,
  Quicksand_700Bold,
} from '@expo-google-fonts/quicksand';
import {
  DynaPuff_500Medium,
  DynaPuff_600SemiBold,
  DynaPuff_700Bold,
} from '@expo-google-fonts/dynapuff';
import { palettes } from '@/theme/theme';
import { useScheme } from '@/theme/useTheme';
import { useStore } from '@/state/store';
import { configureNotificationHandler, isCrowdRefreshResponse } from '@/notifications';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

/**
 * Tapping a crowd-refresh reminder lands on the full-screen refresh ceremony —
 * the "everyone opens the app together" moment. Works for cold starts (last
 * response) and taps while running (listener), each tap handled once.
 */
function useCrowdRefreshRouting(ready: boolean) {
  const router = useRouter();
  const lastResponse = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !lastResponse || !isCrowdRefreshResponse(lastResponse)) return;
    const id = lastResponse.notification.request.identifier + ':' + lastResponse.notification.date;
    if (handled.current === id) return;
    handled.current = id;
    const { identity, onboardingComplete } = useStore.getState();
    if (identity && onboardingComplete) router.push('/refresh');
  }, [ready, lastResponse, router]);
}

function navTheme(scheme: 'light' | 'dark') {
  const c = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: c.bg,
      card: c.bg,
      text: c.text,
      border: c.border,
      primary: c.accent,
    },
  };
}

export default function RootLayout() {
  const scheme = useScheme();
  const hydrated = useStore((s) => s.hydrated);
  const [fontsLoaded] = useFonts({
    // Quicksand — body & UI
    Quicksand_400Regular,
    Quicksand_500Medium,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    // DynaPuff — expressive display headlines
    DynaPuff_500Medium,
    DynaPuff_600SemiBold,
    DynaPuff_700Bold,
  });

  const ready = hydrated && fontsLoaded;
  useCrowdRefreshRouting(ready);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  const c = palettes[scheme];

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={navTheme(scheme)}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="board" />
            <Stack.Screen name="compose" options={{ presentation: 'modal' }} />
            <Stack.Screen name="refresh" options={{ presentation: 'modal' }} />
            <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friends" options={{ presentation: 'modal' }} />
            <Stack.Screen name="friend" />
          </Stack>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
