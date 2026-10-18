import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/Button';
import { StubScreen } from '@/components/StubScreen';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

export default function LearnScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <StubScreen title={t('learn.title')} description={t('learn.stub')}>
      <Button
        title={t('common.openLesson')}
        variant="primary"
        onPress={() => router.push('/lesson/demo')}
      />
      <Button
        title={t('common.openOnboarding')}
        variant="secondary"
        onPress={() => router.push('/onboarding')}
      />
      {__DEV__ ? (
        <Text
          variant="bodyBold"
          color={colors.coral}
          style={styles.devLink}
          onPress={() => router.push('/dev/components')}
        >
          {t('common.devComponents')}
        </Text>
      ) : null}
    </StubScreen>
  );
}

const styles = StyleSheet.create({
  devLink: {
    alignSelf: 'center',
    marginTop: space.sm,
    paddingVertical: space.sm,
    textAlign: 'center',
  },
});
