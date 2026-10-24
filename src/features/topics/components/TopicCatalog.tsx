import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { Appear } from '@/features/auth/components/Appear';
import type { TopicSection } from '@/features/topics/catalog';
import { TopicCard } from '@/features/topics/components/TopicCard';
import { colors, motion, space } from '@/theme/tokens';

type TopicCatalogProps = {
  emptyLevel: boolean;
  sections: readonly TopicSection[];
  onOpen: (topicId: string) => void;
};

export function TopicCatalog({ emptyLevel, sections, onOpen }: TopicCatalogProps) {
  const { t } = useTranslation();

  if (emptyLevel) {
    return <EmptyState title={t('topics.soonTitle')} body={t('topics.soonBody')} />;
  }

  if (sections.length === 0) {
    return <EmptyState title={t('topics.emptySearch')} body={t('topics.emptySearchBody')} />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {sections.map((section) => (
        <View key={section.category} style={styles.section}>
          <Text variant="label" color={colors.inkMuted} accessibilityRole="header">
            {t(`topics.categories.${section.category}`)}
          </Text>
          {section.topics.map((topic, index) => (
            <Appear key={topic.id} delay={Math.min(index, 8) * motion.stagger}>
              <TopicCard topic={topic} onPress={() => onOpen(topic.id)} />
            </Appear>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text variant="h3" accessibilityRole="header" style={styles.center}>
        {title}
      </Text>
      <Text variant="body" color={colors.inkMuted} style={styles.center}>
        {body}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    paddingBottom: space.xxxl,
    gap: space.xl,
  },
  section: {
    gap: space.md,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.xl,
    gap: space.sm,
  },
  center: {
    textAlign: 'center',
  },
});
