/**
 * Screen: the wrapper every screen uses.
 *
 * - `scroll` screens use a ScrollView that:
 *     • slides under the iOS 26 glass header and tab bar
 *       (contentInsetAdjustmentBehavior="automatic"), as native apps do,
 *     • moves content above the keyboard automatically,
 *     • lets you swipe the keyboard away.
 * - `edges` adds safe-area padding (notch / home bar) for screens WITHOUT a
 *   header, like Welcome. Screens with a header don't need it.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type RefreshControlProps, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, spacing } from '../constants/theme';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Pinned content below the scroll area (e.g. an action bar). */
  footer?: ReactNode;
}

export default function Screen({ children, scroll = false, edges = [], contentStyle, refreshControl, footer }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          refreshControl={refreshControl}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentStyle]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xxl },
});
