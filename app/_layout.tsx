import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import 'react-native-reanimated';

import i18n from '@/i18n';
import { colors } from '@/theme/tokens';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

const vamosTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.ground,
    card: colors.ground,
    primary: colors.coral,
    text: colors.ink,
    border: colors.border,
  },
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    BricolageGrotesque_800ExtraBold,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <RootLayoutNav />
    </I18nextProvider>
  );
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={vamosTheme}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.ground },
          headerStyle: { backgroundColor: colors.ground },
          headerTintColor: colors.ink,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(lesson)"
          options={{ presentation: 'fullScreenModal', headerShown: false }}
        />
        <Stack.Screen name="(onboarding)" options={{ presentation: 'modal', headerShown: false }} />
        {__DEV__ ? <Stack.Screen name="dev" options={{ headerShown: false }} /> : null}
      </Stack>
    </ThemeProvider>
  );
}
