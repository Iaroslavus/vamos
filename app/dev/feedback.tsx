import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ResultSheet } from '@/components/ResultSheet';
import { displayText } from '@/features/content/displayText';
import { getItem } from '@/features/content/loader';
import { textOf } from '@/features/content/text';
import { BuildSentenceExercise } from '@/features/lesson/components/BuildSentenceExercise';
import { IntroStep } from '@/features/lesson/components/IntroStep';
import { SelectTranslationExercise } from '@/features/lesson/components/SelectTranslationExercise';
import { phraseTileLabels } from '@/features/lesson/tiles';
import { ReviewModeChoice } from '@/features/review/components/ReviewModeChoice';
import { activeUiLanguage, type UiLanguage } from '@/i18n/language';
import { claimUiLanguage } from '@/i18n/preference';
import { colors, space } from '@/theme/tokens';

/** Dev gallery for the lesson-feedback screenshots. */
export default function DevFeedbackScreen() {
  const { i18n } = useTranslation();
  const params = useLocalSearchParams<{ lang?: string; shot?: string }>();
  const langParam = Array.isArray(params.lang) ? params.lang[0] : params.lang;
  const shot = (Array.isArray(params.shot) ? params.shot[0] : params.shot) ?? 'correct';
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

  if (!__DEV__) return <Redirect href="/(tabs)" />;
  if (!ready) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      {shot === 'build' ? <BuildShot /> : null}
      {shot === 'number' ? <NumberShot /> : null}
      {shot === 'review' ? <ReviewModeChoice count={12} onChoose={() => undefined} /> : null}
      {shot === 'correct' ? <CorrectShot /> : null}
    </View>
  );
}

function CorrectShot() {
  const { t, i18n } = useTranslation();
  const hello = displayText(textOf(getItem('hola.hola').tr, i18n.language));
  const thanks = displayText(textOf(getItem('hola.gracias').tr, i18n.language));
  const bye = displayText(textOf(getItem('hola.adios').tr, i18n.language));
  return (
    <View style={styles.correct}>
      <SelectTranslationExercise
        exercise={{
          id: 'shot',
          type: 'select_translation',
          prompt_ru: t('lesson.promptSelect'),
          prompt: 'Hola',
          options: [hello, thanks, bye],
          answer: hello,
        }}
        selected={hello}
        gradeStatus="correct"
        disabled
        onSelect={() => undefined}
      />
      <ResultSheet
        visible
        variant="success"
        title={t('lesson.feedbackCorrect')}
        continueLabel={t('lesson.continue')}
        onSave={() => undefined}
        onContinue={() => undefined}
      />
    </View>
  );
}

function BuildShot() {
  const { t, i18n } = useTranslation();
  const item = getItem('hola.me_llamo');
  const gloss = displayText(textOf(item.tr, i18n.language).replaceAll('{name}', '').trim());
  return (
    <View style={styles.pad}>
      <BuildSentenceExercise
        exercise={{
          id: 'build',
          type: 'build_sentence',
          prompt_ru: t('lesson.promptBuildNamed', { text: gloss }),
          answer: item.es,
          phraseEs: item.es,
          tiles: [
            ...phraseTileLabels(['Me', 'llamo', '{name}']),
            ...phraseTileLabels(['Soy', 'Ana']),
          ],
          audio: null,
        }}
        onAnswerChange={() => undefined}
      />
    </View>
  );
}

function NumberShot() {
  return (
    <IntroStep
      item={getItem('numbers.uno')}
      position={1}
      total={6}
      topicIcon="hash"
      onNext={() => undefined}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  pad: {
    padding: space.xl,
  },
  correct: {
    flex: 1,
    padding: space.xl,
  },
});
