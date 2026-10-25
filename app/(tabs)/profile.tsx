import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { isProgressSaved, signOutWarningKind } from '@/features/auth/account';
import { Appear } from '@/features/auth/components/Appear';
import { ErrorNote } from '@/features/auth/components/ErrorNote';
import { UnsavedAccount } from '@/features/auth/components/UnsavedAccount';
import { useSession } from '@/features/auth/useSession';
import type { AuthErrorCode } from '@/features/auth/errors';
import { colors, radius, space } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    status,
    session,
    signingOut,
    signOut,
    requestEmailLink,
    confirmEmailLink,
    requestEmailSignIn,
    confirmEmailSignIn,
  } = useSession();
  const [signOutError, setSignOutError] = useState<AuthErrorCode | null>(null);

  const user = session?.user ?? null;
  const saved = isProgressSaved(user);
  const email = user?.email?.trim() ?? '';

  function handleSignOut() {
    if (!user || signingOut) return;

    const message =
      signOutWarningKind(user) === 'saved'
        ? t('auth.signOutWarningSaved', { email })
        : t('auth.signOutWarningUnsaved');

    Alert.alert(t('auth.signOutTitle'), message, [
      { text: t('auth.signOutCancel'), style: 'cancel' },
      {
        text: t('auth.signOutConfirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setSignOutError(null);
            const result = await signOut();
            if (!result.ok) setSignOutError(result.error);
          })();
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Appear style={styles.flex}>
          <View style={styles.column}>
            {status === 'loading' || !user ? (
              <>
                <Text variant="h3" accessibilityRole="header">
                  {t('auth.saveTitle')}
                </Text>
                <Text color={colors.inkMuted}>{t('auth.loading')}</Text>
              </>
            ) : saved ? (
              <>
                <Text variant="h3" accessibilityRole="header">
                  {t('auth.savedTitle')}
                </Text>
                <View style={styles.saved}>
                  <Text variant="bodyBold">{email}</Text>
                  <Text color={colors.inkMuted}>{t('auth.savedBody')}</Text>
                </View>
              </>
            ) : (
              <UnsavedAccount
                key={user.id}
                requestEmailLink={requestEmailLink}
                confirmEmailLink={confirmEmailLink}
                requestEmailSignIn={requestEmailSignIn}
                confirmEmailSignIn={confirmEmailSignIn}
              />
            )}

            {signOutError ? <ErrorNote message={t(`auth.errors.${signOutError}`)} /> : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('settings.open')}
              onPress={() => router.push('/settings')}
              style={styles.settings}
            >
              <Text variant="bodyBold">{t('settings.open')}</Text>
              <Text variant="caption" color={colors.inkMuted}>
                {t('settings.languageTitle')}
              </Text>
            </Pressable>

            <View style={styles.footer}>
              <Button
                title={signingOut ? t('auth.signingOut') : t('auth.signOut')}
                variant="secondary"
                disabled={signingOut || status !== 'ready' || !user}
                onPress={handleSignOut}
              />
            </View>
          </View>
        </Appear>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.ground,
  },
  content: {
    flexGrow: 1,
    backgroundColor: colors.ground,
  },
  column: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
  saved: {
    backgroundColor: colors.tealSoft,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
  },
  settings: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.xs,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: space.xl,
  },
});
