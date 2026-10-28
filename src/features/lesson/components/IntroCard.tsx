import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Text } from '@/components/Text';
import type { Item } from '@/features/content/schema';
import { contentLocale, textOf } from '@/features/content/text';
import { colors, depth, radius, space } from '@/theme/tokens';

import { IntroAudioButtons } from './IntroAudioButtons';
import { IntroCardHeader } from './IntroCardHeader';

type Part = Item['parts'][number];

type IntroCardProps = {
  item: Item;
  TopicIcon: LucideIcon;
  sayRu: string | null;
  saved: boolean;
  saveLabel: string;
  onPlay: (rate: number) => void;
  onPlayPart: (part: Part, index: number) => void;
  onSave: () => void;
  onWhy: () => void;
};

export function IntroCard({
  item,
  TopicIcon,
  sayRu,
  saved,
  saveLabel,
  onPlay,
  onPlayPart,
  onSave,
  onWhy,
}: IntroCardProps) {
  const { t, i18n } = useTranslation();
  const language = contentLocale(i18n.language);
  const translation = textOf(item.tr, language);
  const note = textOf(item.note, language);

  return (
    <View style={styles.wrap}>
      <View style={styles.sole} />
      <View style={styles.face}>
        <IntroCardHeader
          TopicIcon={TopicIcon}
          saved={saved}
          saveLabel={saveLabel}
          onSave={onSave}
        />

        <Text variant="h1" style={styles.center}>
          {item.es}
        </Text>

        <IntroAudioButtons onPlay={onPlay} />

        {sayRu ? (
          <Text variant="body" style={styles.say}>
            {sayRu}
          </Text>
        ) : null}

        <Text variant="bodyBold" style={styles.center}>
          {translation}
        </Text>

        {item.parts.length > 0 ? (
          <View style={styles.parts}>
            {item.parts.map((part, index) => {
              const label = t('lesson.introPart', { es: part.es, ru: textOf(part.tr, language) });
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

        {note ? (
          <Text variant="caption" color={colors.inkMuted} style={styles.center}>
            {note}
          </Text>
        ) : null}

        {textOf(item.why, language) ? (
          <Button title={t('lesson.introWhy')} variant="secondary" onPress={onWhy} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  sole: {
    ...StyleSheet.absoluteFill,
    top: depth.button,
    borderRadius: radius.xl,
    backgroundColor: colors.borderStrong,
  },
  face: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    padding: space.xl,
    marginBottom: depth.button,
    gap: space.lg,
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
