import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, type ScrollViewInstance } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import type { DialogState } from '../dialog';
import { DialogBubble } from './DialogBubble';

type DialogTranscriptProps = {
  state: DialogState;
  title: string;
  openTranslations: ReadonlySet<number>;
  onToggleTranslation: (index: number) => void;
  onReplay: (index: number) => void;
};

export function DialogTranscript({
  state,
  title,
  openTranslations,
  onToggleTranslation,
  onReplay,
}: DialogTranscriptProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [state.visibleCount]);

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text variant="bodyBold" color={colors.inkMuted} style={styles.kicker}>
        {title}
      </Text>
      {state.lines.slice(0, state.visibleCount).map((line, index) => {
        if (line.who === 'npc') {
          const canReplay =
            (state.phase === 'listen' && state.index === index) ||
            (state.phase === 'choose' && index < state.index);
          return (
            <DialogBubble
              key={`npc-${index}`}
              side="npc"
              es={line.es}
              ru={line.ru}
              revealed={openTranslations.has(index)}
              onToggleTranslation={() => onToggleTranslation(index)}
              onReplay={canReplay ? () => onReplay(index) : undefined}
            />
          );
        }
        return (
          <DialogBubble
            key={`user-${index}`}
            side="user"
            es={line.es}
            ru={line.ru}
            revealed={false}
          />
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xl,
    gap: space.sm,
  },
  kicker: {
    textAlign: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    marginBottom: space.sm,
  },
});
