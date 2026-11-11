import * as Haptics from 'expo-haptics';
import { Volume2 } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import { IconButton } from '@/components/IconButton';
import { Text } from '@/components/Text';
import { displayText } from '@/features/content/displayText';
import { colors, radius, space } from '@/theme/tokens';

import { useFolderRowSwipe } from '../hooks/useFolderRowSwipe';
import { FolderItemMenu } from './FolderItemMenu';
import { SwipeAction } from './SwipeAction';

type FolderItemRowProps = {
  es: string;
  ru: string;
  editable: boolean;
  own?: boolean;
  onPlay: () => void;
  onRemove: () => void;
  onMove: () => void;
  onEdit?: () => void;
};

export function FolderItemRow({
  es,
  ru,
  editable,
  own = false,
  onPlay,
  onRemove,
  onMove,
  onEdit,
}: FolderItemRowProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  const shownEs = displayText(es);
  const shownRu = displayText(ru);
  const { gesture, cardStyle, close } = useFolderRowSwipe(editable);
  const phrase = shownRu ? `${shownEs}, ${shownRu}` : shownEs;
  const label = own ? `${t('customWords.badge')}. ${phrase}` : phrase;
  const edit = () => {
    close();
    onEdit?.();
  };

  return (
    <View style={styles.clip}>
      {editable ? (
        <View
          style={styles.actions}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {own ? (
            <SwipeAction
              label={t('customWords.edit')}
              face={colors.surface}
              sole={colors.borderStrong}
              ink={colors.ink}
              onPress={edit}
            />
          ) : (
            <SwipeAction
              label={t('vocab.moveTitle')}
              face={colors.surface}
              sole={colors.borderStrong}
              ink={colors.ink}
              onPress={() => {
                close();
                onMove();
              }}
            />
          )}
          <SwipeAction
            label={own ? t('customWords.delete') : t('vocab.delete')}
            face={colors.coral}
            sole={colors.coralDeep}
            ink={colors.inkOnDark}
            onPress={() => {
              close();
              onRemove();
            }}
          />
        </View>
      ) : null}
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.card, cardStyle]}>
          {editable ? (
            <Pressable
              style={styles.copy}
              delayLongPress={400}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityHint={t('vocab.rowActionsHint')}
              accessibilityActions={
                own
                  ? [
                      { name: 'edit', label: t('customWords.editNamed', { es: shownEs }) },
                      { name: 'delete', label: t('customWords.deleteNamed', { es: shownEs }) },
                    ]
                  : [
                      { name: 'move', label: t('vocab.move', { es: shownEs }) },
                      { name: 'delete', label: t('vocab.deleteNamed', { es: shownEs }) },
                    ]
              }
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'edit') onEdit?.();
                if (event.nativeEvent.actionName === 'move') onMove();
                if (event.nativeEvent.actionName === 'delete') onRemove();
              }}
              onLongPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMenu(true);
              }}
            >
              <PhraseCopy es={shownEs} ru={shownRu} own={own} mark={t('customWords.mark')} />
            </Pressable>
          ) : (
            <View style={styles.copy}>
              <PhraseCopy es={shownEs} ru={shownRu} own={own} mark={t('customWords.mark')} />
            </View>
          )}
          <IconButton accessibilityLabel={t('vocab.play', { es: shownEs })} onPress={onPlay}>
            <Volume2 color={colors.blue} size={22} strokeWidth={2.2} />
          </IconButton>
        </Animated.View>
      </GestureDetector>
      {menu ? (
        <FolderItemMenu
          es={shownEs}
          own={own}
          onClose={() => setMenu(false)}
          onMove={onMove}
          onRemove={onRemove}
          onEdit={() => onEdit?.()}
        />
      ) : null}
    </View>
  );
}

function PhraseCopy({ es, ru, own, mark }: { es: string; ru: string; own: boolean; mark: string }) {
  return (
    <>
      <Text variant="bodyBold">{own ? `${mark} ${es}` : es}</Text>
      {ru ? (
        <Text variant="caption" color={colors.inkMuted}>
          {ru}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  clip: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  actions: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    paddingVertical: space.sm,
    paddingLeft: space.md,
    paddingRight: space.sm,
    backgroundColor: colors.surface,
  },
  copy: {
    flex: 1,
    gap: space.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
});
