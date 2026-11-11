import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { play } from '@/features/audio/playback';
import { useAudioPreference } from '@/features/audio/preference';
import { getItem, listItems } from '@/features/content/loader';
import { textOf } from '@/features/content/text';
import { colors, space } from '@/theme/tokens';

import { searchPhrases } from '../phraseSearch';
import { PhraseResultRow } from './PhraseResultRow';
import { PhraseSearchField } from './PhraseSearchField';

const ICON_STROKE = 2.2;

type PhraseSearchModalProps = {
  visible: boolean;
  selectedIds: readonly string[];
  onClose: () => void;
  onToggle: (itemId: string) => Promise<void>;
  onAddOwn: () => void;
};

export function PhraseSearchModal({
  visible,
  selectedIds,
  onClose,
  onToggle,
  onAddOwn,
}: PhraseSearchModalProps) {
  const { t, i18n } = useTranslation();
  const preference = useAudioPreference();
  const [query, setQuery] = useState('');
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const results = useMemo(() => {
    const phrases = listItems().map((item) => ({
      id: item.id,
      es: item.es,
      translation: textOf(item.tr, i18n.language),
    }));
    return searchPhrases(phrases, query);
  }, [i18n.language, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.bar}>
          <Text variant="h3" style={styles.title}>
            {t('folder.searchTitle')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            onPress={onClose}
            style={styles.close}
          >
            <X color={colors.ink} size={22} strokeWidth={ICON_STROKE} />
          </Pressable>
        </View>
        <PhraseSearchField value={query} onChangeText={setQuery} autoFocus={visible} />
        <ScrollView
          contentContainerStyle={styles.results}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {query.trim().length > 0 && results.length === 0 ? (
            <Text variant="body" color={colors.inkMuted} style={styles.empty}>
              {t('folder.searchEmpty')}
            </Text>
          ) : null}
          {results.map((item) => (
            <PhraseResultRow
              key={item.id}
              id={item.id}
              es={item.es}
              translation={item.translation}
              added={selected.has(item.id)}
              onToggle={() => {
                void onToggle(item.id);
              }}
              onPlay={() => {
                void play(getItem(item.id), 'normal', preference);
              }}
            />
          ))}
          <Button title={t('folder.addOwn')} variant="secondary" onPress={onAddOwn} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ground,
    paddingTop: space.lg,
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  title: {
    flex: 1,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  results: {
    gap: space.md,
    paddingBottom: space.xxxl,
  },
  empty: {
    textAlign: 'center',
  },
});
