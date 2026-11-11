import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RetryNote } from '@/components/RetryNote';
import { Text } from '@/components/Text';
import type { AudioPreference } from '@/features/audio/select';
import { FolderStudySection } from '@/features/study/components/FolderStudySection';
import { colors, space } from '@/theme/tokens';

import type { Folder, UserItem } from '../types';
import { AddWordsControl } from './AddWordsControl';
import { FolderPhraseList } from './FolderPhraseList';

type FolderContentsProps = {
  isError: boolean;
  isReady: boolean;
  folder: Folder | undefined;
  userId: string | null;
  itemIds: readonly string[];
  userItems?: readonly UserItem[];
  editable: boolean;
  preference: AudioPreference;
  onRetry: () => void;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onAdd: () => void;
};

export function FolderContents({
  isError,
  isReady,
  folder,
  userId,
  itemIds,
  userItems = [],
  editable,
  preference,
  onRetry,
  onRemove,
  onMove,
  onEdit,
  onAdd,
}: FolderContentsProps) {
  const { t } = useTranslation();

  if (isError) {
    return <RetryNote title={t('vocab.loadError')} action={t('common.retry')} onPress={onRetry} />;
  }

  if (!isReady) {
    return (
      <View style={styles.empty}>
        <Text variant="body" color={colors.inkMuted}>
          {t('vocab.loading')}
        </Text>
      </View>
    );
  }

  if (!folder) {
    return (
      <View style={styles.empty}>
        <Text variant="h3" style={styles.center}>
          {t('vocab.missing')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <FolderStudySection
        folderId={folder.id}
        userId={userId}
        itemIds={itemIds}
        userItems={userItems}
      />
      {itemIds.length === 0 ? (
        <View style={styles.afterStudy}>
          {editable ? <AddWordsControl variant="button" onPress={onAdd} /> : null}
          <Text variant="body" color={colors.inkMuted} style={styles.center}>
            {t('vocab.emptyFolder')}
          </Text>
        </View>
      ) : (
        <FolderPhraseList
          itemIds={itemIds}
          userItems={userItems}
          editable={editable}
          canAdd={editable}
          preference={preference}
          onRemove={onRemove}
          onMove={onMove}
          onEdit={onEdit}
          onAdd={onAdd}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
  },
  afterStudy: {
    marginTop: space.xxl,
    gap: space.lg,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  center: {
    textAlign: 'center',
  },
});
