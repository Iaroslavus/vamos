import { Tabs } from 'expo-router';
import { BookOpen, MessageCircle, Trophy, User } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme/tokens';

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
        sceneStyle: { backgroundColor: colors.ground },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.learn'),
          tabBarIcon: ({ color }) => (
            <BookOpen color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="dialog"
        options={{
          title: t('tabs.dialog'),
          tabBarIcon: ({ color }) => (
            <MessageCircle color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: t('tabs.progress'),
          tabBarIcon: ({ color }) => (
            <Trophy color={color} size={ICON_SIZE} strokeWidth={ICON_STROKE} />
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
    </Tabs>
  );
}
