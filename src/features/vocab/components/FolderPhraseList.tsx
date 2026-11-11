import { StyleSheet, View } from 'react-native';

import { play } from '@/features/audio/playback';
import type { AudioPreference } from '@/features/audio/select';
import { contentLanguage, getItem } from '@/features/content/loader';
import { blankAudio, type Item } from '@/features/content/schema';
import { textOf } from '@/features/content/text';
import { space } from '@/theme/tokens';

import { AddWordsControl } from './AddWordsControl';
import { FolderItemRow } from './FolderItemRow';

type FolderPhraseListProps = {
  itemIds: readonly string[];
  editable: boolean;
  canAdd: boolean;
  preference: AudioPreference;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string) => void;
  onAdd: () => void;
};

export function FolderPhraseList({
  itemIds,
  editable,
  canAdd,
  preference,
  onRemove,
  onMove,
  onAdd,
}: FolderPhraseListProps) {
  return (
    <View testID="folder-phrases" style={styles.list}>
      {itemIds.map((itemId) => {
        const word = lookup(itemId);
        return (
          <FolderItemRow
            key={itemId}
            es={word.es}
            ru={word.ru}
            editable={editable}
            onPlay={() => {
              void play(word.item ?? { es: word.es, audio: blankAudio() }, 'normal', preference);
            }}
            onRemove={() => onRemove(itemId)}
            onMove={() => onMove(itemId)}
          />
        );
      })}
      {canAdd ? <AddWordsControl variant="row" onPress={onAdd} /> : null}
    </View>
  );
}

function lookup(itemId: string): { es: string; ru: string; item: Item | null } {
  try {
    const item = getItem(itemId);
    return {
      es: item.es,
      ru: textOf(item.tr, contentLanguage()),
      item,
    };
  } catch {
    return { es: itemId, ru: '', item: null };
  }
}

const styles = StyleSheet.create({
  list: {
    marginTop: space.xxl,
    gap: space.md,
  },
});
