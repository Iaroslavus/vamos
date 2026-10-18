import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ProgressBar } from '@/components/ProgressBar';
import { ResultSheet } from '@/components/ResultSheet';
import { Ring } from '@/components/Ring';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

type SheetDemo = 'success' | 'error' | null;

export default function DevComponentsScreen() {
  const [sheet, setSheet] = useState<SheetDemo>(null);
  const [usedChip, setUsedChip] = useState(false);

  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Text">
          <Text variant="h1">Heading 1</Text>
          <Text variant="h2">Heading 2</Text>
          <Text variant="h3">Heading 3</Text>
          <Text variant="body">Body — Manrope 600</Text>
          <Text variant="bodyBold">Body bold — Manrope 700</Text>
          <Text variant="button">Button — Manrope 800</Text>
          <Text variant="caption" color={colors.inkMuted}>
            Caption muted
          </Text>
          <Text variant="label" color={colors.inkMuted}>
            LABEL
          </Text>
        </Section>

        <Section title="Button">
          <Button title="Primary" variant="primary" onPress={() => undefined} />
          <Button title="Secondary" variant="secondary" onPress={() => undefined} />
          <Button title="Success" variant="success" onPress={() => undefined} />
          <Button title="Disabled" disabled onPress={() => undefined} />
        </Section>

        <Section title="Chip">
          <View style={styles.row}>
            <Chip label="hola" onPress={() => setUsedChip(true)} />
            <Chip label="mundo" used={usedChip} onPress={() => undefined} />
            <Chip label="used" used onPress={() => undefined} />
          </View>
        </Section>

        <Section title="ProgressBar">
          <ProgressBar progress={0.35} accessibilityLabel="Progress 35%" />
          <ProgressBar progress={0.7} color={colors.teal} accessibilityLabel="Progress 70%" />
          <ProgressBar progress={1} color={colors.saffron} accessibilityLabel="Progress 100%" />
        </Section>

        <Section title="Ring">
          <View style={styles.row}>
            <Ring progress={0.25} label="1/4" />
            <Ring progress={0.6} label="60%" color={colors.coral} />
            <Ring progress={1} label="Done" color={colors.teal} />
          </View>
        </Section>

        <Section title="ResultSheet">
          <Button title="Show success" variant="success" onPress={() => setSheet('success')} />
          <Button title="Show error" variant="primary" onPress={() => setSheet('error')} />
        </Section>
      </ScrollView>

      <ResultSheet
        visible={sheet === 'success'}
        variant="success"
        title="¡Correcto!"
        message="Отличный ответ"
        onContinue={() => setSheet(null)}
      />
      <ResultSheet
        visible={sheet === 'error'}
        variant="error"
        title="Неверно"
        message="Попробуй ещё раз"
        onContinue={() => setSheet(null)}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h3" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    padding: space.xl,
    paddingBottom: space.xxxl * 2,
    gap: space.xxl,
  },
  section: {
    gap: space.md,
  },
  sectionTitle: {
    color: colors.ink,
  },
  sectionBody: {
    gap: space.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    alignItems: 'center',
  },
});
