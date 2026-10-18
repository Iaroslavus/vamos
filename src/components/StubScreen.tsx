import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, space } from '@/theme/tokens';

type StubScreenProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function StubScreen({ title, description, children }: StubScreenProps) {
  return (
    <View style={styles.container}>
      <Text variant="h2" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color={colors.inkMuted} style={styles.description}>
        {description}
      </Text>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ground,
    paddingHorizontal: space.xl,
    paddingVertical: space.xxxl,
    justifyContent: 'center',
    gap: space.md,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
  },
  actions: {
    marginTop: space.xl,
    gap: space.md,
  },
});
