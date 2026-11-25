import LottieView from 'lottie-react-native';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

type TopicTestResultProps = {
  passed: boolean;
  title: string;
  body: string;
  lessons: string | null;
  primary: string;
  onPrimary: () => void;
  saving: boolean;
  error: string | null;
  retry: string;
  onRetry: () => void;
  reduceMotion: boolean;
};

export function TopicTestResult({
  passed,
  title,
  body,
  lessons,
  primary,
  onPrimary,
  saving,
  error,
  retry,
  onRetry,
  reduceMotion,
}: TopicTestResultProps) {
  return (
    <View style={styles.root}>
      {passed && !reduceMotion ? (
        <View pointerEvents="none" style={styles.confetti}>
          <LottieView
            source={require('../../../../assets/lottie/confetti.json')}
            autoPlay
            loop={false}
            style={styles.confetti}
          />
        </View>
      ) : null}
      <View style={styles.copy}>
        <Text variant="h1" style={styles.center} color={passed ? colors.teal : colors.ink}>
          {title}
        </Text>
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {body}
        </Text>
        {lessons ? (
          <Text variant="bodyBold" style={styles.center}>
            {lessons}
          </Text>
        ) : null}
        {error ? (
          <Text variant="caption" color={colors.errorInk} style={styles.center}>
            {error}
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        {error ? (
          <Button title={retry} variant="secondary" onPress={onRetry} disabled={saving} />
        ) : null}
        <Button title={primary} onPress={onPrimary} disabled={saving || error != null} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.xxxl,
    gap: space.xl,
  },
  copy: {
    gap: space.md,
  },
  center: {
    textAlign: 'center',
  },
  actions: {
    gap: space.sm,
  },
  confetti: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
});
