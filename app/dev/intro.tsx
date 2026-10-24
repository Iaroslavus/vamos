import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { getItem, getLesson, getTopic } from '@/features/content/loader';
import { IntroStep } from '@/features/lesson/components/IntroStep';
import { colors } from '@/theme/tokens';

const LESSON_ID = 'a1.hola.l1';

/** Dev preview of the intro card. The lesson player wires this in later. */
export default function DevIntroScreen() {
  const lesson = useMemo(() => getLesson(LESSON_ID), []);
  const topic = useMemo(() => getTopic(lesson.topic), [lesson.topic]);
  const items = useMemo(() => lesson.items.map((id) => getItem(id)), [lesson.items]);
  const [index, setIndex] = useState(0);
  const item = items[index];

  if (!__DEV__) {
    return <Redirect href="/(tabs)" />;
  }

  if (!item) {
    return null;
  }

  return (
    <View style={styles.root}>
      <IntroStep
        item={item}
        position={index + 1}
        total={items.length}
        topicIcon={topic.icon}
        onNext={() => setIndex((current) => (current + 1) % items.length)}
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
