import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { getItem, getLesson, getScene, getTopic } from '@/features/content/loader';
import { textOf } from '@/features/content/text';
import { DialogStep } from '@/features/lesson/components/DialogStep';
import { activeUiLanguage, type UiLanguage } from '@/i18n/language';
import { claimUiLanguage } from '@/i18n/preference';
import { colors } from '@/theme/tokens';

const LESSON_ID = 'a1.hola.l1';

/** Dev preview of the mini-dialog. The lesson player wires this in later. */
export default function DevDialogScreen() {
  const { i18n } = useTranslation();
  const params = useLocalSearchParams<{ lang?: string }>();
  const langParam = Array.isArray(params.lang) ? params.lang[0] : params.lang;
  const language: UiLanguage = activeUiLanguage(langParam ?? 'ru');
  const [ready, setReady] = useState(i18n.language === language);
  const lesson = useMemo(() => getLesson(LESSON_ID), []);
  const scene = useMemo(() => getScene(getTopic(lesson.topic).scene), [lesson.topic]);
  const items = useMemo(() => {
    const ids = new Set<string>();
    for (const line of lesson.dialog.lines) {
      if (line.who !== 'user') continue;
      for (const id of line.accept) ids.add(id);
      for (const id of line.options) ids.add(id);
    }
    return [...ids].map((id) => getItem(id));
  }, [lesson]);
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void i18n.changeLanguage(language).then(() => {
      if (!cancelled) setReady(true);
    });
    claimUiLanguage(language);
    return () => {
      cancelled = true;
    };
  }, [i18n, language]);

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

  if (!step || !ready) return null;

  return (
    <View style={styles.root}>
      <DialogStep
        key={round}
        step={step}
        items={items}
        partner={textOf(scene.partner, language)}
        place={textOf(scene.place, language)}
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
