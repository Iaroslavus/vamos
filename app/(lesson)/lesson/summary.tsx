import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { playUiSound } from '@/features/audio/sounds';
import { NewWordsList } from '@/features/lesson/components/NewWordsList';
import { XpCounter } from '@/features/lesson/components/XpCounter';
import { formatAccuracyPercent, formatElapsed } from '@/features/lesson/format';
import { useLessonStore } from '@/features/lesson/store';
import { usePathProgressStore } from '@/features/path/progressStore';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { colors, space } from '@/theme/tokens';

export default function LessonSummaryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const summary = useLessonStore((s) => s.getSummary());
  const reset = useLessonStore((s) => s.reset);
  const markComplete = usePathProgressStore((s) => s.markComplete);

  const finished = summary.status === 'completed' || summary.status === 'failed';

  useEffect(() => {
    if (finished) {
      void playUiSound('complete');
    }
  }, [finished]);

  const goHome = () => {
    if (summary.status === 'completed' && summary.lessonId) {
      markComplete(summary.lessonId, summary.xpEarned);
    }
    reset();
    router.replace('/(tabs)');
  };

  if (!finished) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top + space.xl }]}>
        <Text variant="h3">{t('lesson.summaryEmpty')}</Text>
        <Button title={t('lesson.summaryContinue')} variant="primary" onPress={goHome} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + space.md }]}>
      {!reduceMotion ? (
        <View pointerEvents="none" style={styles.confetti}>
          <LottieView
            source={require('../../../assets/lottie/confetti.json')}
            autoPlay
            loop={false}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, space.lg) + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="h1" style={styles.title}>
          {summary.status === 'failed' ? t('lesson.summaryFailedTitle') : t('lesson.summaryTitle')}
        </Text>

        <XpCounter xp={summary.xpEarned} label={t('lesson.summaryXp')} />

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text variant="caption" color={colors.inkMuted}>
              {t('lesson.summaryAccuracy')}
            </Text>
            <Text variant="h2" color={colors.teal}>
              {formatAccuracyPercent(summary.accuracy)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text variant="caption" color={colors.inkMuted}>
              {t('lesson.summaryTime')}
            </Text>
            <Text variant="h2">{formatElapsed(summary.elapsedMs)}</Text>
          </View>
        </View>

        <NewWordsList items={summary.newItems} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
        <Button title={t('lesson.summaryContinue')} variant="primary" onPress={goHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 420,
    zIndex: 1,
  },
  content: {
    alignItems: 'center',
    gap: space.xxl,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
  },
  title: {
    textAlign: 'center',
    zIndex: 2,
  },
  stats: {
    flexDirection: 'row',
    gap: space.xxl,
    zIndex: 2,
  },
  stat: {
    alignItems: 'center',
    gap: space.xs,
    minWidth: 100,
  },
  footer: {
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    zIndex: 2,
  },
});
