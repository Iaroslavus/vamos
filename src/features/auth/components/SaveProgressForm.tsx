import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

import type { LinkConfirmResult, LinkRequestResult } from '../account';
import { isValidEmail, isValidOtp, OTP_LENGTH } from '../email';
import type { AuthErrorCode } from '../errors';
import { AuthField } from './AuthField';
import { ErrorNote } from './ErrorNote';

type SaveProgressFormProps = {
  requestEmailLink: (email: string) => Promise<LinkRequestResult>;
  confirmEmailLink: (email: string, code: string) => Promise<LinkConfirmResult>;
};

type Pending = 'send' | 'confirm' | null;

export function SaveProgressForm({ requestEmailLink, confirmEmailLink }: SaveProgressFormProps) {
  const { t } = useTranslation();
  const mounted = useRef(true);
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const busy = pending !== null;
  const emailReady = isValidEmail(email);
  const codeReady = isValidOtp(code);

  async function sendCode() {
    setPending('send');
    setError(null);
    const result = await requestEmailLink(email);
    if (!mounted.current) return;
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.step === 'code_sent') setStep('code');
  }

  async function confirmCode() {
    setPending('confirm');
    setError(null);
    const result = await confirmEmailLink(email, code);
    if (!mounted.current) return;
    setPending(null);
    if (!result.ok) setError(result.error);
  }

  function editEmail() {
    setStep('email');
    setCode('');
    setError(null);
  }

  return (
    <View style={styles.form}>
      {step === 'email' ? (
        <AuthField
          label={t('auth.emailLabel')}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.emailPlaceholder')}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
          editable={!busy}
        />
      ) : (
        <>
          <Text variant="body" color={colors.inkMuted}>
            {t('auth.codeSent', { email: email.trim() })}
          </Text>
          <AuthField
            label={t('auth.codeLabel')}
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
            placeholder={t('auth.codePlaceholder')}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            maxLength={OTP_LENGTH}
            editable={!busy}
          />
        </>
      )}

      {error ? <ErrorNote message={t(`auth.errors.${error}`)} /> : null}

      {step === 'email' ? (
        <Button
          title={pending === 'send' ? t('auth.sending') : t('auth.sendCode')}
          disabled={!emailReady || busy}
          onPress={() => {
            void sendCode();
          }}
        />
      ) : (
        <>
          <Button
            title={pending === 'confirm' ? t('auth.confirming') : t('auth.confirm')}
            disabled={!codeReady || busy}
            onPress={() => {
              void confirmCode();
            }}
          />
          <Button
            title={pending === 'send' ? t('auth.sending') : t('auth.resend')}
            variant="secondary"
            disabled={busy}
            onPress={() => {
              void sendCode();
            }}
          />
          <Button
            title={t('auth.changeEmail')}
            variant="secondary"
            disabled={busy}
            onPress={editEmail}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: space.md,
  },
});
