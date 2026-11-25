import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { Botas } from '@/components/hero/Botas';
import { playLessonAudio, stopLessonAudio } from '@/features/audio/playback';
import { colors, radius, space } from '@/theme/tokens';

import type { PlayableDialogLine } from '../dialog';

type DialogFinaleProps = {
  lines: readonly PlayableDialogLine[];
  onContinue: () => void;
};

export function DialogFinale({ lines, onContinue }: DialogFinaleProps) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(false);

  const replay = () => {
    if (playing) return;
    setPlaying(true);
    void playSequence(lines).finally(() => setPlaying(false));
  };

  return (
    <View style={styles.root}>
      <Text variant="h2" style={styles.center}>
        {t('lesson.dialogDone')}
      </Text>
      <View style={styles.hero}>
        <Botas size={72} />
        <View style={styles.cheer}>
          <Text variant="bodyBold">{t('lesson.dialogCheer')}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Button
          title={t('lesson.dialogReplayAll')}
          variant="secondary"
          footer
          disabled={playing}
          onPress={replay}
          style={styles.half}
        />
        <Button
          title={t('lesson.continue')}
          variant="primary"
          footer
          onPress={() => {
            void stopLessonAudio();
            onContinue();
          }}
          style={styles.half}
        />
      </View>
    </View>
  );
}

async function playSequence(lines: readonly PlayableDialogLine[]): Promise<void> {
  for (const line of lines) {
    await new Promise<void>((resolve) => {
      void playLessonAudio({
        text: line.es,
        audio: line.who === 'user' ? line.audio : null,
        onEnd: resolve,
      }).catch(() => resolve());
    });
  }
}

const styles = StyleSheet.create({
  root: {
    gap: space.md,
  },
  center: {
    textAlign: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  cheer: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
});
