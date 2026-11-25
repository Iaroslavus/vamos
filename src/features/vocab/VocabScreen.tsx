import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import { CheatsheetScreen } from '@/features/cheatsheet/CheatsheetScreen';
import { colors, motion, space } from '@/theme/tokens';

import { FolderFormSheet } from './components/FolderFormSheet';
import { FolderRow } from './components/FolderRow';
import { VocabHeader } from './components/VocabHeader';
import { VocabTabs, type VocabTab } from './components/VocabTabs';
import { useFolders } from './hooks/useFolders';
import { vocabRepository } from './defaultRepository';

export function VocabScreen() {
  const params = useLocalSearchParams<{
    tab?: string;
    topicId?: string;
    focus?: string;
    source?: string;
  }>();
  const requested = first(params.tab) === 'phrasebook' ? 'phrasebook' : 'folders';
  const routeKey = `${requested}:${first(params.topicId) ?? ''}:${first(params.focus) ?? ''}`;
  const [choice, setChoice] = useState<{ key: string; tab: VocabTab } | null>(null);
  if (choice && choice.key !== routeKey) setChoice(null);
  const tab = choice?.key === routeKey ? choice.tab : requested;

  return (
    <View style={styles.root}>
      <VocabTabs tab={tab} onChange={(next) => setChoice({ key: routeKey, tab: next })} />
      {tab === 'phrasebook' ? (
        <CheatsheetScreen
          embedded
          topicId={first(params.topicId)}
          source={first(params.source) === 'path' ? 'path' : 'search'}
          autoFocus={first(params.focus) === '1'}
        />
      ) : (
        <FoldersPane />
      )}
    </View>
  );
}

function FoldersPane() {
  const { t } = useTranslation();
  const router = useRouter();
  const vocab = useFolders();
  const [creating, setCreating] = useState(false);

  if (!vocab.userId) {
    return (
      <View style={styles.empty}>
        <Text variant="body" color={colors.inkMuted} style={styles.center}>
          {t('vocab.signedOut')}
        </Text>
      </View>
    );
  }

  if (vocab.isPending || (!vocab.data && !vocab.isError)) {
    return (
      <View style={styles.empty}>
        <Text variant="body" color={colors.inkMuted}>
          {t('vocab.loading')}
        </Text>
      </View>
    );
  }

  if (vocab.isError) {
    return (
      <RetryNote
        title={t('vocab.loadError')}
        action={t('common.retry')}
        onPress={() => {
          void vocab.refetch();
        }}
      />
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <VocabHeader
          learned={vocab.learnedTotal}
          due={vocab.dueTotal}
          nextInMs={vocab.nextInMs}
          onReview={() => router.push('/review')}
          onLearned={() => {
            if (!vocab.learnedFolderId) return;
            router.push({ pathname: '/vocab/[id]', params: { id: vocab.learnedFolderId } });
          }}
        />
        <View style={styles.list}>
          {vocab.rows.map((row, index) => (
            <Appear key={row.folder.id} delay={index * motion.stagger}>
              <FolderRow
                row={row}
                onPress={() =>
                  router.push({ pathname: '/vocab/[id]', params: { id: row.folder.id } })
                }
              />
            </Appear>
          ))}
        </View>
        <Button
          title={t('vocab.newFolder')}
          variant="secondary"
          onPress={() => setCreating(true)}
        />
      </ScrollView>
      <FolderFormSheet
        visible={creating}
        title={t('vocab.createTitle')}
        onClose={() => setCreating(false)}
        onSubmit={async (input) => {
          if (!vocab.userId) throw new Error('Invalid user id');
          await vocabRepository.createFolder(vocab.userId, input);
          await vocab.refresh();
        }}
      />
    </>
  );
}

function first(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value)) return first(value[0]);
  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
  list: {
    gap: space.md,
  },
  empty: {
    flex: 1,
    backgroundColor: colors.ground,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  center: {
    textAlign: 'center',
  },
});
