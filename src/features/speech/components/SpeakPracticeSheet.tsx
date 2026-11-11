import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { BottomSheet } from '@/features/vocab/components/BottomSheet';
import { colors } from '@/theme/tokens';

import { SpeakPractice, type SpeakPracticeProps } from './SpeakPractice';

type SpeakPracticeSheetProps = Omit<SpeakPracticeProps, 'onClose'> & {
  visible: boolean;
  onClose: () => void;
};

export function SpeakPracticeSheet({ visible, onClose, ...practice }: SpeakPracticeSheetProps) {
  const { t } = useTranslation();

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.header}>
        <IconButton accessibilityLabel={t('common.close')} onPress={onClose}>
          <X size={22} color={colors.ink} strokeWidth={2.2} />
        </IconButton>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <SpeakPractice {...practice} onClose={onClose} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-end',
  },
  scroll: {
    maxHeight: 560,
  },
  content: {
    flexGrow: 1,
  },
});
