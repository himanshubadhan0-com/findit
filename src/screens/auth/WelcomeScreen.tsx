/** WelcomeScreen: the first screen a logged-out student sees. */
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../../components/Screen';
import AppButton from '../../components/AppButton';
import { ListRow, Section } from '../../components/Section';
import type { AuthScreenProps } from '../../navigation/types';
import { colors, continuous, pick, spacing, typography } from '../../constants/theme';

export default function WelcomeScreen({ navigation }: AuthScreenProps<'Welcome'>) {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="search" size={46} color={colors.onPrimary} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          FindIt
        </Text>
        <Text style={styles.subtitle}>Campus lost &amp; found, made smart.</Text>
      </View>

      <Section>
        <ListRow icon="megaphone" title="Post in seconds" subtitle="Lost or found something? Add a photo and where it was." />
        <ListRow icon="sparkles" iconColor="#AF52DE" title="Smart matching" subtitle="We compare Lost and Found posts and alert both people." />
        <ListRow icon="shield-checkmark" iconColor={colors.success} title="Verified claims" subtitle="Secret questions stop false claims. Contacts shared only after approval." />
      </Section>

      <View style={styles.actions}>
        <AppButton title="Create an account" onPress={() => navigation.navigate('SignUp')} />
        <AppButton title="I already have an account" variant="ghost" onPress={() => navigation.navigate('Login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: spacing.xl },
  logo: {
    width: 96,
    height: 96,
    borderRadius: pick({ ios: 24, android: 28 }),
    ...continuous,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.largeTitle, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  actions: { gap: spacing.xs },
});
