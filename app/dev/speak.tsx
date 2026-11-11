import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SpeakPracticeSheet } from '@/features/speech/components/SpeakPracticeSheet';
import { scoreSpeech } from '@/features/speech/score';
import { activeUiLanguage, type UiLanguage } from '@/i18n/language';
import { claimUiLanguage } from '@/i18n/preference';
import { colors } from '@/theme/tokens';

const PHRASE = 'me llamo';
const SAY = 'ме йАмо';

/** Dev preview of the speak sheet, before an attempt and after a miss. */
export default function DevSpeakScreen() {
  const { i18n } = useTranslation();
  const params = useLocalSearchParams<{ lang?: string; phase?: string }>();
  const langParam = Array.isArray(params.lang) ? params.lang[0] : params.lang;
  const phaseParam = Array.isArray(params.phase) ? params.phase[0] : params.phase;
  const language: UiLanguage = activeUiLanguage(langParam ?? 'ru');
  const [ready, setReady] = useState(i18n.language === language);

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

  const preview = phaseParam === 'after' ? scoreSpeech(PHRASE, 'xxxx') : null;

  return (
    <View style={styles.root}>
      {ready ? (
        <SpeakPracticeSheet
          visible
          mode="practice"
          phrase={PHRASE}
          sayRu={SAY}
          preview={preview}
          onClose={() => undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
});
