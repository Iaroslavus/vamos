import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { colors, space } from '@/theme/tokens';

export default function TabOneScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
      {__DEV__ ? (
        <Link href="/dev/components" style={styles.devLink}>
          <Text style={styles.devLinkText}>Dev components</Text>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  devLink: {
    marginTop: space.xl,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
  },
  devLinkText: {
    color: colors.coral,
    fontWeight: '700',
  },
});
