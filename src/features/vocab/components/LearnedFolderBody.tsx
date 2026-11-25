import * as Haptics from 'expo-haptics';
import type { TFunction } from 'i18next';
import { Search, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/Text';
import { play } from '@/features/audio/playback';
import type { AudioPreference } from '@/features/audio/select';
import { displayEs, displayText } from '@/features/content/displayText';
import { getItem, getTopic, listLessons } from '@/features/content/loader';
import { blankAudio, type Item } from '@/features/content/schema';
import { contentLocale, textOf } from '@/features/content/text';
import { FolderStudySection } from '@/features/study/components/FolderStudySection';
import { colors, fonts, radius, space, type } from '@/theme/tokens';

import {
  filterLearnedIds,
  groupLearned,
  matchesLearnedQuery,
  membersFromFolder,
  type LearnedFilter,
  type LearnedGroupBy,
} from '../learned';
import type { FolderItem, UserItem } from '../types';

const ICON_STROKE = 2.2;

type LearnedFolderBodyProps = {
  folderId: string;
  userId: string | null;
  items: readonly FolderItem[];
  userItems: readonly UserItem[];
  dueIds: readonly string[];
  difficultIds: readonly string[];
  preference: AudioPreference;
};

type Gloss = { es: string; translation: string; item: Item | null };

export function LearnedFolderBody({
  folderId,
  userId,
  items,
  userItems,
  dueIds,
  difficultIds,
  preference,
}: LearnedFolderBodyProps) {
  const { t, i18n } = useTranslation();
  const language = contentLocale(i18n.language);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LearnedFilter>('all');
  const [groupBy, setGroupBy] = useState<LearnedGroupBy>('topic');
  const itemIds = useMemo(() => items.map((item) => item.itemId), [items]);
  const glosses = useMemo(
    () => glossMap(itemIds, userItems, language),
    [itemIds, language, userItems],
  );
  const visible = useMemo(() => {
    const matched = itemIds.filter((id) => {
      const gloss = glosses.get(id);
      return matchesLearnedQuery(gloss?.es ?? '', gloss?.translation ?? '', query);
    });
    return filterLearnedIds(matched, filter, new Set(dueIds), new Set(difficultIds));
  }, [difficultIds, dueIds, filter, glosses, itemIds, query]);
  const groups = useMemo(() => {
    const allowed = new Set(visible);
    const lessons = listLessons().map((lesson) => ({
      topicId: lesson.topic,
      itemIds: lesson.items,
    }));
    return groupLearned(
      membersFromFolder(items, lessons).filter((member) => allowed.has(member.itemId)),
      groupBy,
    );
  }, [groupBy, items, visible]);

  const playItem = (itemId: string) => {
    const gloss = glosses.get(itemId);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void play(
      gloss?.item ?? { es: gloss?.es ?? itemId, audio: blankAudio() },
      'normal',
      preference,
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <FolderStudySection
        folderId={folderId}
        userId={userId}
        itemIds={itemIds}
        userItems={userItems}
      />
      <SearchField value={query} onChangeText={setQuery} />
      <View style={styles.controls}>
        <Choice
          label={t('vocab.groupTopics')}
          selected={groupBy === 'topic'}
          onPress={() => setGroupBy('topic')}
        />
        <Choice
          label={t('vocab.groupDates')}
          selected={groupBy === 'date'}
          onPress={() => setGroupBy('date')}
        />
      </View>
      <View style={styles.controls}>
        <Choice
          label={t('vocab.filterAll')}
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
        />
        <Choice
          label={t('vocab.filterDue')}
          selected={filter === 'due'}
          onPress={() => setFilter('due')}
        />
        <Choice
          label={t('vocab.filterDifficult')}
          selected={filter === 'difficult'}
          onPress={() => setFilter('difficult')}
        />
      </View>
      {visible.length === 0 ? (
        <Text variant="body" color={colors.inkMuted} style={styles.empty}>
          {itemIds.length === 0 ? t('vocab.learnedEmpty') : t('vocab.learnedNone')}
        </Text>
      ) : (
        groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text variant="bodyBold" accessibilityRole="header">
              {groupTitle(group, language, t)}
            </Text>
            {group.itemIds.map((itemId) => {
              const gloss = glosses.get(itemId);
              const es = gloss?.es ?? itemId;
              return (
                <Pressable
                  key={itemId}
                  accessibilityRole="button"
                  accessibilityLabel={t('vocab.play', { es })}
                  onPress={() => playItem(itemId)}
                  style={styles.row}
                >
                  <Text variant="bodyBold">{es}</Text>
                  {gloss?.translation ? (
                    <Text variant="caption" color={colors.inkMuted}>
                      {gloss.translation}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ))
      )}
    </ScrollView>
  );
}

function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.field}>
      <Search color={colors.inkMuted} size={20} strokeWidth={ICON_STROKE} />
      <TextInput
        accessibilityLabel={t('vocab.learnedSearchLabel')}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('vocab.learnedSearchPlaceholder')}
        placeholderTextColor={colors.inkDisabled}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('vocab.searchClear')}
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <X color={colors.ink} size={18} strokeWidth={ICON_STROKE} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.chip, selected ? styles.chipOn : null]}
    >
      <Text variant="caption" color={selected ? colors.coral : colors.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

function groupTitle(
  group: { topicId: string | null; day: string | null; own: boolean },
  language: string,
  t: TFunction,
): string {
  if (group.own) return t('vocab.learnedOwn');
  if (group.topicId) {
    try {
      return displayText(textOf(getTopic(group.topicId).title, language));
    } catch {
      return group.topicId;
    }
  }
  if (!group.day || group.day === 'unknown') return t('vocab.learnedOwn');
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'long' }).format(
    new Date(`${group.day}T12:00:00`),
  );
}

function glossMap(
  itemIds: readonly string[],
  userItems: readonly UserItem[],
  language: string,
): Map<string, Gloss> {
  const glosses = new Map<string, Gloss>();
  for (const itemId of itemIds) {
    const own = userItems.find((item) => item.id === itemId);
    if (own) {
      glosses.set(itemId, { es: displayEs(own.es), translation: displayText(own.tr), item: null });
      continue;
    }
    try {
      const item = getItem(itemId);
      glosses.set(itemId, {
        es: displayEs(item.es),
        translation: displayText(textOf(item.tr, language)),
        item,
      });
    } catch {
      glosses.set(itemId, { es: itemId, translation: '', item: null });
    }
  }
  return glosses;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.lg,
  },
  field: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: type.body.fontSize,
    paddingVertical: space.sm,
  },
  clear: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chipOn: {
    borderColor: colors.coral,
  },
  group: {
    gap: space.sm,
  },
  row: {
    minHeight: 44,
    justifyContent: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  empty: {
    textAlign: 'center',
  },
});
