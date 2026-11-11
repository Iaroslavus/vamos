import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

import {
  CUSTOM_ES_MAX,
  CUSTOM_NOTE_MAX,
  CUSTOM_TR_MAX,
  customWordIssueKey,
  parseCustomWord,
  type CustomWordIssue,
} from '../customWord';
import type { UserItemDraft } from '../types';
import { BottomSheet } from './BottomSheet';

type CustomWordSheetProps = {
  visible: boolean;
  mode: 'create' | 'edit';
  initial?: UserItemDraft;
  existing: readonly { id: string; es: string }[];
  editingId?: string;
  onClose: () => void;
  onSubmit: (draft: UserItemDraft) => Promise<void>;
};

export function CustomWordSheet({ visible, onClose, ...fields }: CustomWordSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      {visible ? (
        <CustomWordFields
          key={`${fields.mode}:${fields.editingId ?? ''}:${fields.initial?.es ?? ''}`}
          mode={fields.mode}
          initial={fields.initial}
          existing={fields.existing}
          editingId={fields.editingId}
          onClose={onClose}
          onSubmit={fields.onSubmit}
        />
      ) : null}
    </BottomSheet>
  );
}

function CustomWordFields({
  mode,
  initial,
  existing,
  editingId,
  onClose,
  onSubmit,
}: Omit<CustomWordSheetProps, 'visible'>) {
  const { t } = useTranslation();
  const [es, setEs] = useState(initial?.es ?? '');
  const [tr, setTr] = useState(initial?.tr ?? '');
  const [note, setNote] = useState(initial?.note ?? '');
  const [issue, setIssue] = useState<CustomWordIssue | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (busy) return;
    const parsed = parseCustomWord({ es, tr, note }, existing, editingId);
    if (!parsed.ok) {
      setIssue(parsed.issue);
      setFailed(false);
      return;
    }
    setBusy(true);
    setIssue(null);
    setFailed(false);
    void onSubmit({ es: parsed.value.es, tr: parsed.value.tr, note: parsed.value.note ?? '' })
      .then(onClose)
      .catch(() => {
        setFailed(true);
        setBusy(false);
      });
  };

  return (
    <>
      <Text variant="h3" style={styles.center}>
        {t(mode === 'edit' ? 'customWords.editTitle' : 'customWords.addTitle')}
      </Text>
      <Field
        label={t('customWords.esLabel')}
        value={es}
        placeholder={t('customWords.esPlaceholder')}
        maxLength={CUSTOM_ES_MAX}
        onChangeText={setEs}
      />
      <Field
        label={t('customWords.trLabel')}
        value={tr}
        placeholder={t('customWords.trPlaceholder')}
        maxLength={CUSTOM_TR_MAX}
        onChangeText={setTr}
      />
      <Field
        label={t('customWords.noteLabel')}
        hint={t('customWords.noteHint')}
        value={note}
        placeholder={t('customWords.noteHint')}
        maxLength={CUSTOM_NOTE_MAX}
        onChangeText={setNote}
      />
      {issue ? (
        <Text variant="caption" color={colors.errorInk} style={styles.center}>
          {t(customWordIssueKey(issue))}
        </Text>
      ) : null}
      {failed ? (
        <Text variant="caption" color={colors.errorInk} style={styles.center}>
          {t('customWords.saveError')}
        </Text>
      ) : null}
      <Button title={t('customWords.save')} disabled={busy} onPress={submit} />
    </>
  );
}

function Field({
  label,
  hint,
  value,
  placeholder,
  maxLength,
  onChangeText,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder: string;
  maxLength: number;
  onChangeText: (value: string) => void;
}) {
  return (
    <>
      <Text variant="bodyBold">{hint ? `${label} · ${hint}` : label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkDisabled}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={maxLength}
        style={styles.input}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    textAlign: 'center',
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.ground,
    paddingHorizontal: space.lg,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: type.body.fontSize,
  },
});
