import { ScrollView, StyleSheet } from 'react-native';

import { BottomSheet } from '@/features/vocab/components/BottomSheet';
import { space } from '@/theme/tokens';

import { SpeakPractice, type SpeakPracticeProps } from './SpeakPractice';

type SpeakPracticeSheetProps = Omit<SpeakPracticeProps, 'onClose'> & {
  visible: boolean;
  onClose: () => void;
};

export function SpeakPracticeSheet({ visible, onClose, ...practice }: SpeakPracticeSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
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
  scroll: {
    maxHeight: 560,
  },
  content: {
    gap: space.md,
  },
});
