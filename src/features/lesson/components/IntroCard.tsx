import * as Haptics from 'expo-haptics';
import { ChevronDown, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { displayText } from '@/features/content/displayText';
import type { Item } from '@/features/content/schema';
import { contentLocale, textOf } from '@/features/content/text';
import { colors, depth, radius, space } from '@/theme/tokens';

import { hasIntroBreakdown } from '../intro';
import { IntroAudioButtons } from './IntroAudioButtons';
import { IntroBreakdown } from './IntroBreakdown';
import { IntroCardHeader } from './IntroCardHeader';

type Part = Item['parts'][number];

type IntroCardProps = {
  item: Item;
  TopicIcon: LucideIcon;
  sayRu: string | null;
  saved: boolean;
  saveLabel: string;
  expanded: boolean;
  onPlay: (rate: number) => void;
  onPlayPart: (part: Part, index: number) => void;
  onSave: () => void;
  onToggleDetails: () => void;
};

export function IntroCard({
  item,
  TopicIcon,
  sayRu,
  saved,
  saveLabel,
  expanded,
  onPlay,
  onPlayPart,
  onSave,
  onToggleDetails,
}: IntroCardProps) {
  const { t, i18n } = useTranslation();
  const language = contentLocale(i18n.language);
  const translation = textOf(item.tr, language);
  const showDetails = hasIntroBreakdown(item, language);
  const detailsLabel = expanded ? t('lesson.introLess') : t('lesson.introMore');

  const toggleDetails = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggleDetails();
  };

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
          {displayText(item.es)}
        </Text>

        <IntroAudioButtons onPlay={onPlay} />

        <Text variant="bodyBold" style={styles.center}>
          {displayText(translation)}
        </Text>

        {showDetails ? (
          <>
            <IntroBreakdown open={expanded} item={item} say={sayRu} onPlayPart={onPlayPart} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={detailsLabel}
              accessibilityState={{ expanded }}
              onPress={toggleDetails}
              style={styles.more}
            >
              <Text variant="body" color={colors.inkMuted}>
                {detailsLabel}
              </Text>
              <View style={expanded ? styles.chevronOpen : undefined}>
                <ChevronDown size={18} color={colors.inkMuted} strokeWidth={2.2} />
              </View>
            </Pressable>
          </>
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
  more: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
});
