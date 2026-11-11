import { StyleSheet, View } from 'react-native';

import { play } from '@/features/audio/playback';
import type { AudioPreference } from '@/features/audio/select';
import { contentLanguage, getItem } from '@/features/content/loader';
import { blankAudio, type Item } from '@/features/content/schema';
import { textOf } from '@/features/content/text';
import { space } from '@/theme/tokens';

import type { UserItem } from '../types';
import { AddWordsControl } from './AddWordsControl';
import { FolderItemRow } from './FolderItemRow';

type FolderPhraseListProps = {
  itemIds: readonly string[];
  userItems?: readonly UserItem[];
  editable: boolean;
  canAdd: boolean;
  preference: AudioPreference;
  onRemove: (itemId: string) => void;
  onMove: (itemId: string) => void;
  onEdit: (itemId: string) => void;
  onAdd: () => void;
};

export function FolderPhraseList({
  itemIds,
  userItems = [],
  editable,
  canAdd,
  preference,
  onRemove,
  onMove,
  onEdit,
  onAdd,
}: FolderPhraseListProps) {
  return (
    <View testID="folder-phrases" style={styles.list}>
      {itemIds.map((itemId) => {
        const word = lookup(itemId, userItems);
        return (
          <FolderItemRow
            key={itemId}
            es={word.es}
            ru={word.ru}
            editable={editable}
            own={word.own}
            onPlay={() => {
              void play(word.item ?? { es: word.es, audio: blankAudio() }, 'normal', preference);
            }}
            onRemove={() => onRemove(itemId)}
            onMove={() => onMove(itemId)}
            onEdit={() => onEdit(itemId)}
          />
        );
      })}
      {canAdd ? <AddWordsControl variant="row" onPress={onAdd} /> : null}
    </View>
  );
}

function lookup(
  itemId: string,
  custom: readonly UserItem[],
): { es: string; ru: string; item: Item | null; own: boolean } {
  const own = custom.find((item) => item.id === itemId);
  if (own) return { es: own.es, ru: own.tr, item: null, own: true };
  try {
    const item = getItem(itemId);
    return {
      es: item.es,
      ru: textOf(item.tr, contentLanguage()),
      item,
      own: false,
    };
  } catch {
    return { es: itemId, ru: '', item: null, own: false };
  }
}

const styles = StyleSheet.create({
  list: {
    marginTop: space.xxl,
    gap: space.md,
  },
});
