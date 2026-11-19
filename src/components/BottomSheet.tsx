/**
 * BottomSheet: a native-feeling sheet on both platforms.
 *   iOS        → a real UIKit page sheet (swipe down to close, glass on iOS 26)
 *                with a Cancel / Done bar on top.
 *   Material 3 → a modal bottom sheet: scrim, 28dp top corners, drag handle.
 */
import type { ReactNode } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '../constants/theme';

interface Props {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Optional confirm button in the top bar (iOS) / at the bottom (Android). */
  doneLabel?: string;
  onDone?: () => void;
}

export default function BottomSheet({ visible, title, onClose, children, doneLabel, onDone }: Props) {
  const insets = useSafeAreaInsets();

  if (Platform.OS === 'ios') {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={styles.iosContainer}>
          <View style={styles.iosBar}>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Text style={styles.iosBarButton}>{onDone ? 'Cancel' : 'Close'}</Text>
            </Pressable>
            <Text style={styles.iosTitle} accessibilityRole="header">
              {title}
            </Text>
            {onDone ? (
              <Pressable onPress={onDone} hitSlop={12} accessibilityRole="button">
                <Text style={[styles.iosBarButton, styles.iosDone]}>{doneLabel ?? 'Done'}</Text>
              </Pressable>
            ) : (
              <View style={styles.iosBarSpacer} />
            )}
          </View>
          <ScrollView contentContainerStyle={styles.iosContent} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            {children}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.handle} />
        <Text style={styles.androidTitle} accessibilityRole="header">
          {title}
        </Text>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.androidScroll}>
          {children}
        </ScrollView>
        {onDone && (
          <View style={styles.androidActions}>
            <Pressable onPress={onClose} style={styles.androidTextButton} android_ripple={{ color: colors.fill }}>
              <Text style={styles.androidTextButtonLabel}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onDone} style={styles.androidTextButton} android_ripple={{ color: colors.fill }}>
              <Text style={styles.androidTextButtonLabel}>{doneLabel ?? 'Done'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // iOS page sheet
  iosContainer: { flex: 1, backgroundColor: colors.background },
  iosBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iosTitle: { ...typography.headline, color: colors.text, flex: 1, textAlign: 'center' },
  iosBarButton: { ...typography.body, color: colors.primary, minWidth: 64 },
  iosDone: { fontWeight: '600', textAlign: 'right' },
  iosBarSpacer: { minWidth: 64 },
  iosContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Material 3 bottom sheet
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '85%',
    backgroundColor: colors.surfaceHigh,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.4,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  androidTitle: { ...typography.title, color: colors.text, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  androidScroll: { paddingHorizontal: spacing.md },
  androidActions: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  androidTextButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: 999, overflow: 'hidden' },
  androidTextButtonLabel: { ...typography.label, color: colors.primary },
});
