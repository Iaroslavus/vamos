import { Tabs } from 'expo-router';
import { LayoutGrid, Library, Route, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

const ICON_STROKE = 2.2;
const ICON_SIZE = 24;

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.ground },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabel: ({ color, children }) => (
          <Text
            style={{ color, fontFamily: fonts.bodyBold, fontSize: 11, textAlign: 'center' }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {children}
          </Text>
        ),
        sceneStyle: { backgroundColor: colors.ground },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('path.tab'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Route color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="topics"
        options={{
          title: t('tabs.topics'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <LayoutGrid color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="vocab"
        options={{
          title: t('tabs.vocab'),
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <Library color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ color }) => (
            <User color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen name="today" options={{ href: null }} />
      <Tabs.Screen name="dialog" options={{ href: null, title: t('dialog.title') }} />
      <Tabs.Screen name="progress" options={{ href: null, title: t('progress.title') }} />
    </Tabs>
  );
}
