/**
 * OfflineBanner: a small floating pill at the bottom while the phone has no
 * internet. NetInfo reports the connection state live.
 */
import { StyleSheet, Text } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import GlassSurface from './GlassSurface';
import { colors, spacing, typography } from '../constants/theme';

export default function OfflineBanner() {
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();

  // isConnected is null while NetInfo is still checking, so only show on an explicit false.
  if (isConnected !== false) return null;

  return (
    <GlassSurface
      tintColor={colors.warning}
      style={[styles.pill, { top: insets.top + spacing.xs }]}
      pointerEvents="none"
      accessibilityRole="alert"
    >
      <Ionicons name="cloud-offline" size={16} color={colors.onDark} />
      <Text style={styles.text}>You’re offline. Changes need internet.</Text>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: colors.warning,
  },
  text: { color: colors.onDark, ...typography.footnote, fontWeight: '600' },
});
