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
  onPlay: () => void;
  onRemove: () => void;
  onMove: () => void;
};

export function FolderItemRow({ es, ru, editable, onPlay, onRemove, onMove }: FolderItemRowProps) {
  const { t } = useTranslation();
  const [menu, setMenu] = useState(false);
  const shownEs = displayText(es);
  const shownRu = displayText(ru);
  const { gesture, cardStyle, close } = useFolderRowSwipe(editable);
  const phrase = shownRu ? `${shownEs}, ${shownRu}` : shownEs;

  return (
    <View style={styles.clip}>
      {editable ? (
        <View
          style={styles.actions}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
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
          <SwipeAction
            label={t('vocab.delete')}
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
              accessibilityLabel={phrase}
              accessibilityHint={t('vocab.rowActionsHint')}
              accessibilityActions={[
                { name: 'move', label: t('vocab.move', { es: shownEs }) },
                { name: 'delete', label: t('vocab.deleteNamed', { es: shownEs }) },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'move') onMove();
                if (event.nativeEvent.actionName === 'delete') onRemove();
              }}
              onLongPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMenu(true);
              }}
            >
              <PhraseCopy es={shownEs} ru={shownRu} />
            </Pressable>
          ) : (
            <View style={styles.copy}>
              <PhraseCopy es={shownEs} ru={shownRu} />
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
          onClose={() => setMenu(false)}
          onMove={onMove}
          onRemove={onRemove}
        />
      ) : null}
    </View>
  );
}

function PhraseCopy({ es, ru }: { es: string; ru: string }) {
  return (
    <>
      <Text variant="bodyBold">{es}</Text>
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
