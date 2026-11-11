import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { depth, space } from '@/theme/tokens';

import { FOLDER_SWIPE_ACTION_WIDTH } from '../hooks/useFolderRowSwipe';

type SwipeActionProps = {
  label: string;
  face: string;
  sole: string;
  ink: string;
  onPress: () => void;
};

export function SwipeAction({ label, face, sole, ink, onPress }: SwipeActionProps) {
  return (
    <Pressable
      accessibilityElementsHidden
      importantForAccessibility="no"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
    >
      <View style={[styles.sole, { backgroundColor: sole }]} />
      <View style={[styles.face, { backgroundColor: face }]}>
        <Text variant="caption" color={ink} style={styles.label}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: FOLDER_SWIPE_ACTION_WIDTH,
    minHeight: 56,
  },
  pressed: {
    opacity: 0.72,
  },
  sole: {
    position: 'absolute',
    left: space.xs,
    right: space.xs,
    bottom: 0,
    height: depth.chip,
  },
  face: {
    flex: 1,
    marginBottom: depth.chip,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xs,
  },
  label: {
    textAlign: 'center',
  },
});
