import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radius, space } from '@/theme/tokens';

import { orderBySeed, type TestPairLink, type TestPairsQuestion } from '../testMode';

type TestPairsProps = {
  question: TestPairsQuestion;
  matched: Readonly<Record<string, string>>;
  onChange: (matched: Readonly<Record<string, string>>) => void;
};

export function TestPairs({ question, matched, onChange }: TestPairsProps) {
  const [active, setActive] = useState<string | null>(null);
  const links = question.links;
  const left = orderBySeed(links, `${question.id}:left`);
  const right = orderBySeed(
    links.map((link) => link.right),
    `${question.id}:right`,
  );
  const numbers = pairNumbers(links, matched);

  const assign = (itemId: string, value: string) => {
    const next: Record<string, string> = {};
    for (const [id, current] of Object.entries(matched)) {
      if (id === itemId || current === value) continue;
      next[id] = current;
    }
    if (matched[itemId] !== value) next[itemId] = value;
    onChange(next);
    setActive(null);
  };

  return (
    <View style={styles.columns}>
      <View style={styles.column}>
        {left.map((link) => (
          <Tile
            key={link.itemId}
            label={link.left}
            mark={numbers.left.get(link.itemId) ?? null}
            selected={active === link.itemId}
            onPress={() => setActive((current) => (current === link.itemId ? null : link.itemId))}
          />
        ))}
      </View>
      <View style={styles.column}>
        {right.map((value, index) => (
          <Tile
            key={`${value}:${index}`}
            label={value}
            mark={numbers.right.get(value) ?? null}
            selected={false}
            onPress={() => {
              if (active) assign(active, value);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Tile({
  label,
  mark,
  selected,
  onPress,
}: {
  label: string;
  mark: number | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mark == null ? label : `${label}. ${mark}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.tile, selected ? styles.tileOn : styles.tileOff]}
    >
      {mark == null ? null : (
        <Text variant="caption" color={colors.inkMuted}>
          {mark}
        </Text>
      )}
      <Text variant="bodyBold">{label}</Text>
    </Pressable>
  );
}

function pairNumbers(
  links: readonly TestPairLink[],
  matched: Readonly<Record<string, string>>,
): { left: Map<string, number>; right: Map<string, number> } {
  const left = new Map<string, number>();
  const right = new Map<string, number>();
  let next = 1;
  for (const link of links) {
    const value = matched[link.itemId];
    if (!value) continue;
    left.set(link.itemId, next);
    right.set(value, next);
    next += 1;
  }
  return { left, right };
}

const styles = StyleSheet.create({
  columns: {
    flexDirection: 'row',
    gap: space.md,
  },
  column: {
    flex: 1,
    gap: space.sm,
  },
  tile: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    justifyContent: 'center',
    gap: space.xs,
  },
  tileOn: {
    backgroundColor: colors.surface,
    borderColor: colors.ink,
  },
  tileOff: {
    backgroundColor: colors.surfaceSunken,
    borderColor: colors.borderStrong,
  },
});
