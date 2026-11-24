import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { ADDRESS_FORMS, type AddressForm } from './profile';
import { useLearnerProfile, useSaveLearner } from './useLearnerProfile';

const LABEL: Record<AddressForm, string> = {
  m: 'profile.addressMasculine',
  f: 'profile.addressFeminine',
  both: 'profile.addressBoth',
};

/** How gendered phrases address the learner. Both is the default. */
export function AddressSetting() {
  const { t } = useTranslation();
  const profile = useLearnerProfile();
  const save = useSaveLearner();
  const selected = profile.data?.address ?? 'both';

  return (
    <View style={styles.box}>
      <Text variant="bodyBold">{t('profile.addressTitle')}</Text>
      <View style={styles.row}>
        {ADDRESS_FORMS.map((form) => {
          const on = form === selected;
          return (
            <Pressable
              key={form}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(LABEL[form])}
              onPress={() => {
                if (on) return;
                void save({ address: form });
              }}
              style={[styles.choice, on ? styles.choiceOn : null]}
            >
              <Text variant="caption" style={styles.choiceLabel}>
                {t(LABEL[form])}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: space.sm,
  },
  choice: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.ground,
  },
  choiceOn: {
    borderColor: colors.teal,
    backgroundColor: colors.tealSoft,
  },
  choiceLabel: {
    textAlign: 'center',
  },
});
