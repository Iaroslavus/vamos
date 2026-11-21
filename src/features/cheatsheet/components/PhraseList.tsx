import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import { displayText } from '@/features/content/displayText';
import { textOf } from '@/features/content/text';
import type { Item } from '@/features/content/schema';
import { motion, space } from '@/theme/tokens';

import type { PhraseGroup } from '../group';
import { PhraseRow } from './PhraseRow';

type PhraseListProps = {
  groups: readonly PhraseGroup<Item>[];
  language: string;
  playingId: string | null;
  onPlay: (item: Item) => void;
  onShow: (item: Item) => void;
};

export function PhraseList({ groups, language, playingId, onPlay, onShow }: PhraseListProps) {
  const rows = useMemo(() => decorate(groups), [groups]);

  return (
    <View style={styles.list}>
      {rows.map((group) => (
        <View key={group.lessonId} style={styles.group}>
          <Text variant="bodyBold" accessibilityRole="header">
            {displayText(textOf(group.title, language))}
          </Text>
          {group.items.map(({ item, delay }) => (
            <Appear key={item.id} delay={delay}>
              <PhraseRow
                phrase={item.es}
                translation={textOf(item.tr, language)}
                playing={playingId === item.id}
                onPlay={() => onPlay(item)}
                onShow={() => onShow(item)}
              />
            </Appear>
          ))}
        </View>
      ))}
    </View>
  );
}

function decorate(groups: readonly PhraseGroup<Item>[]) {
  let index = 0;
  return groups.map((group) => ({
    lessonId: group.lessonId,
    title: group.title,
    items: group.items.map((item) => {
      const delay = Math.min(index, 8) * motion.stagger;
      index += 1;
      return { item, delay };
    }),
  }));
}

const styles = StyleSheet.create({
  list: {
    gap: space.lg,
  },
  group: {
    gap: space.sm,
  },
});
