import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { reviewRepository } from '@/features/review/defaultRepository';
import { vocabRepository } from '@/features/vocab/defaultRepository';
import { colors, space } from '@/theme/tokens';

import { FlashcardSession } from './components/FlashcardSession';
import { StudyPlayer } from './components/StudyPlayer';
import { flashcardSteps } from './flashcards';
import { recordStudyResult, studyModeGrades } from './fsrs';
import { useStudyLaunch } from './hooks/useStudyLaunch';
import type { StudyRecordInput } from './hooks/useStudyPlayer';
import { isStudyMode } from './modes';

export function StudySessionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ folder?: string | string[]; mode?: string | string[] }>();
  const folderId = typeof params.folder === 'string' ? params.folder : '';
  const rawMode = typeof params.mode === 'string' ? params.mode : '';
  const mode = isStudyMode(rawMode) ? rawMode : null;
  const launch = useStudyLaunch(folderId, mode);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/vocab');
  };

  const onRecord = (record: StudyRecordInput) => {
    if (!launch.userId || !mode) return Promise.resolve();
    return recordStudyResult(reviewRepository, launch.userId, {
      mode,
      itemId: record.itemId,
      direction: record.direction,
      grade: record.grade,
      clientId: `${mode}:${record.stepId}:${record.grade}`,
    }).then(() => undefined);
  };

  const pad = {
    paddingTop: insets.top + space.md,
    paddingBottom: Math.max(insets.bottom, space.lg),
    paddingHorizontal: space.xl,
  };

  return (
    <View style={[styles.root, pad]}>
      {launch.status === 'ready' && mode === 'flashcards' ? (
        <FlashcardSession
          steps={flashcardSteps(launch.steps)}
          onClose={leave}
          onAddDifficult={(itemIds) => {
            if (!launch.userId) return Promise.reject(new Error('Missing user'));
            return vocabRepository.pinDifficult(launch.userId, itemIds).then(() => undefined);
          }}
        />
      ) : launch.status === 'ready' && mode ? (
        <StudyPlayer
          steps={launch.steps}
          recordGrades={studyModeGrades(mode)}
          onRecord={onRecord}
          onClose={leave}
        />
      ) : (
        <Status
          status={launch.status}
          onClose={leave}
          onRetry={() => {
            launch.reload();
          }}
        />
      )}
    </View>
  );
}

function Status({
  status,
  onClose,
  onRetry,
}: {
  status: ReturnType<typeof useStudyLaunch>['status'];
  onClose: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const copy = statusCopy(status);

  return (
    <View style={styles.status}>
      <View style={styles.statusHeader}>
        <IconButton accessibilityLabel={t('study.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
      </View>
      {status === 'error' ? (
        <RetryNote title={t('study.loadError')} action={t('common.retry')} onPress={onRetry} />
      ) : (
        <View style={styles.center}>
          <Text variant="h3" style={styles.centerText}>
            {t(copy.title)}
          </Text>
          {copy.body ? (
            <Text variant="body" color={colors.inkMuted} style={styles.centerText}>
              {t(copy.body)}
            </Text>
          ) : null}
          {status === 'loading' ? null : (
            <Button title={t('study.backToFolder')} onPress={onClose} />
          )}
        </View>
      )}
    </View>
  );
}

function statusCopy(status: ReturnType<typeof useStudyLaunch>['status']): {
  title: string;
  body: string | null;
} {
  switch (status) {
    case 'unavailable':
    case 'invalid':
      return { title: 'study.unavailableTitle', body: 'study.unavailableBody' };
    case 'empty':
      return { title: 'study.emptyTitle', body: 'study.emptyBody' };
    case 'missing':
      return { title: 'vocab.missing', body: null };
    case 'loading':
    case 'ready':
    case 'error':
      return { title: 'study.loading', body: null };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  status: {
    flex: 1,
  },
  statusHeader: {
    alignItems: 'flex-start',
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
