import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

type TopicTestEntryProps = {
  onPress: () => void;
};

/** Text button under the topic actions. Available until the topic is finished. */
export function TopicTestEntry({ onPress }: TopicTestEntryProps) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('topicTest.entry')}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.hit, pressed ? styles.pressed : null]}
    >
      <Text variant="bodyBold" color={colors.coral}>
        {t('topicTest.entry')}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});
