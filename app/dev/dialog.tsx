import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getItem, getLesson } from '@/features/content/loader';
import { DialogStep } from '@/features/lesson/components/DialogStep';
import { colors } from '@/theme/tokens';

const LESSON_ID = 'a1.hola.l1';

/** Dev preview of the mini-dialog. The lesson player wires this in later. */
export default function DevDialogScreen() {
  const lesson = useMemo(() => getLesson(LESSON_ID), []);
  const items = useMemo(() => {
    const ids = new Set<string>();
    for (const line of lesson.dialog.lines) {
      if (line.who !== 'user') continue;
      ids.add(line.target);
      for (const id of line.options) ids.add(id);
    }
    return [...ids].map((id) => getItem(id));
  }, [lesson]);
  const [round, setRound] = useState(0);

  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }

  const step = lesson.dialog.lines.length
    ? {
        id: `${lesson.id}-dialog`,
        type: 'dialog' as const,
        lines: lesson.dialog.lines,
        itemIds: items.map((item) => item.id),
        distractorIds: [] as string[],
      }
    : null;

  if (!step) return null;

  return (
    <View style={styles.root}>
      <DialogStep
        key={round}
        step={step}
        items={items}
        onContinue={() => setRound((current) => current + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
});
