import { Redirect, Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export default function DevLayout() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.ground },
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="components" options={{ title: 'Components' }} />
    </Stack>
  );
}
