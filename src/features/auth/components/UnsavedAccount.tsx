import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import type { LinkConfirmResult, LinkRequestResult } from '../account';
import { SaveProgressForm } from './SaveProgressForm';

type UnsavedAccountProps = {
  requestEmailLink: (email: string) => Promise<LinkRequestResult>;
  confirmEmailLink: (email: string, code: string) => Promise<LinkConfirmResult>;
  requestEmailSignIn: (email: string) => Promise<LinkRequestResult>;
  confirmEmailSignIn: (email: string, code: string) => Promise<LinkConfirmResult>;
};

type Mode = 'save' | 'signIn';

export function UnsavedAccount({
  requestEmailLink,
  confirmEmailLink,
  requestEmailSignIn,
  confirmEmailSignIn,
}: UnsavedAccountProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('save');
  const saving = mode === 'save';

  return (
    <View style={styles.column}>
      <Text variant="h3" accessibilityRole="header">
        {saving ? t('auth.saveTitle') : t('auth.signInTitle')}
      </Text>
      <Text color={colors.inkMuted}>{saving ? t('auth.saveBody') : t('auth.signInBody')}</Text>
      <SaveProgressForm
        key={mode}
        requestEmailLink={saving ? requestEmailLink : requestEmailSignIn}
        confirmEmailLink={saving ? confirmEmailLink : confirmEmailSignIn}
      />
      <Button
        title={saving ? t('auth.signInExisting') : t('auth.saveInstead')}
        variant="secondary"
        onPress={() => setMode(saving ? 'signIn' : 'save')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    gap: space.lg,
  },
});
