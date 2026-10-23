import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { ReviewStudy } from '@/features/review/components/ReviewStudy';
import { ReviewSummary } from '@/features/review/components/ReviewSummary';
import { useReviewSession } from '@/features/review/hooks/useReviewSession';
import { colors, space } from '@/theme/tokens';

export default function ReviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { phase, reload, reveal, rate } = useReviewSession();
  const card = phase.status === 'study' ? phase.queue[phase.index] : undefined;

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.md,
          paddingBottom: Math.max(insets.bottom, space.lg),
        },
      ]}
    >
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('review.close')} onPress={leave}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
      </View>

      {phase.status === 'loading' ? (
        <View style={styles.center}>
          <Text variant="body" color={colors.inkMuted}>
            {t('review.loading')}
          </Text>
        </View>
      ) : null}

      {phase.status === 'error' ? (
        <RetryNote
          title={t('review.loadError')}
          action={t('common.retry')}
          onPress={() => {
            void reload();
          }}
        />
      ) : null}

      {phase.status === 'empty' || phase.status === 'limited' ? (
        <View style={styles.center}>
          <Text variant="h3" style={styles.centerText}>
            {phase.status === 'limited' ? t('review.limitTitle') : t('review.emptyTitle')}
          </Text>
          <Text variant="body" color={colors.inkMuted} style={styles.centerText}>
            {phase.status === 'limited' ? t('review.limitBody') : t('review.emptyBody')}
          </Text>
          <Button title={t('review.summaryContinue')} onPress={() => router.replace('/(tabs)')} />
        </View>
      ) : null}

      {phase.status === 'study' && card ? (
        <ReviewStudy
          card={card}
          index={phase.index}
          total={phase.queue.length}
          revealed={phase.revealed}
          busy={phase.busy}
          rateError={phase.rateError}
          onReveal={reveal}
          onRate={rate}
        />
      ) : null}

      {phase.status === 'summary' ? (
        <ReviewSummary
          reviewed={phase.reviewed}
          accuracy={phase.accuracy}
          xp={phase.xp}
          onDone={() => router.replace('/(tabs)')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
    paddingHorizontal: space.xl,
    gap: space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    gap: space.lg,
  },
  centerText: {
    textAlign: 'center',
  },
});
