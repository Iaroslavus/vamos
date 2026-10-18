import { Heart } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors, space } from '@/theme/tokens';

type LessonHeartsProps = {
  hearts: number;
  maxHearts: number;
};

export function LessonHearts({ hearts, maxHearts }: LessonHeartsProps) {
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${hearts} из ${maxHearts}`}
    >
      {Array.from({ length: maxHearts }, (_, index) => {
        const filled = index < hearts;
        return (
          <Heart
            key={index}
            size={22}
            color={filled ? colors.coral : colors.borderStrong}
            fill={filled ? colors.coral : 'transparent'}
            strokeWidth={2.2}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
});
