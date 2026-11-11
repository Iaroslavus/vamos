import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import { displayText } from '@/features/content/displayText';
import type { Item } from '@/features/content/schema';
import { contentLocale, textOf } from '@/features/content/text';
import { colors, radius, space } from '@/theme/tokens';

type Part = Item['parts'][number];

type IntroBreakdownProps = {
  open: boolean;
  item: Item;
  say: string | null;
  onPlayPart: (part: Part, index: number) => void;
};

export function IntroBreakdown({ open, item, say, onPlayPart }: IntroBreakdownProps) {
  const { t, i18n } = useTranslation();
  const language = contentLocale(i18n.language);
  const literal = textOf(item.literal, language);
  const note = textOf(item.note, language);
  const why = textOf(item.why, language);
  const wordForWord = item.parts.length > 0 || literal.length > 0;

  if (!open) return null;

  return (
    <Appear>
      <View style={styles.block}>
        {say ? (
          <Section title={t('lesson.introSay')}>
            <Text variant="body" style={styles.say}>
              {say}
            </Text>
          </Section>
        ) : null}

        {wordForWord ? (
          <Section title={t('lesson.introWordForWord')}>
            {item.parts.length > 0 ? (
              <View style={styles.parts}>
                {item.parts.map((part, index) => {
                  const label = t('lesson.introPart', {
                    es: displayText(part.es),
                    ru: displayText(textOf(part.tr, language)),
                  });
                  return (
                    <Chip
                      key={`${part.es}-${index}`}
                      label={label}
                      accessibilityLabel={label}
                      onPress={() => onPlayPart(part, index)}
                    />
                  );
                })}
              </View>
            ) : null}
            {literal ? (
              <Text variant="caption" color={colors.inkMuted} style={styles.center}>
                {t('lesson.introLiteral', { text: displayText(literal) })}
              </Text>
            ) : null}
          </Section>
        ) : null}

        {note ? (
          <Text variant="caption" color={colors.inkMuted} style={styles.center}>
            {displayText(note)}
          </Text>
        ) : null}

        {why ? (
          <Section title={t('lesson.introWhy')}>
            <Text variant="body" style={styles.center}>
              {displayText(why)}
            </Text>
          </Section>
        ) : null}
      </View>
    </Appear>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="caption" color={colors.inkMuted} style={styles.center}>
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.lg,
  },
  section: {
    gap: space.sm,
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  say: {
    textAlign: 'center',
    color: colors.ink,
    backgroundColor: colors.hint,
    borderRadius: radius.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    overflow: 'hidden',
  },
  parts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.sm,
  },
});
