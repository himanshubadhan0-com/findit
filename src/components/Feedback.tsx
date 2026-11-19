/**
 * Feedback.tsx: small status components used on every screen:
 *   ErrorBanner : an inline error with an optional Retry
 *   InfoBanner  : neutral / success / warning notes
 *   LoadingView : a centred native spinner
 *   EmptyState  : "nothing here yet" with an icon and optional action
 */
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppButton from './AppButton';
import { colors, continuous, radius, spacing, typography } from '../constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={[styles.banner, { backgroundColor: colors.errorContainer }]} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={20} color={colors.error} />
      <Text style={[styles.bannerText, { color: colors.error }]}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} hitSlop={10} accessibilityRole="button">
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const TONES = {
  info: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer, icon: 'information-circle' },
  success: { bg: colors.successContainer, fg: colors.success, icon: 'checkmark-circle' },
  warning: { bg: colors.warningContainer, fg: colors.warning, icon: 'warning' },
} as const;

export function InfoBanner({ message, tone = 'info', icon }: { message: string; tone?: keyof typeof TONES; icon?: IconName }) {
  const t = TONES[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]}>
      <Ionicons name={icon ?? t.icon} size={20} color={t.fg} />
      <Text style={[styles.bannerText, { color: t.fg }]}>{message}</Text>
    </View>
  );
}

export function LoadingView({ message }: { message?: string }) {
  return (
    <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel={message ?? 'Loading'}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.loadingText}>{message}</Text>}
    </View>
  );
}

interface EmptyProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'file-tray-outline', title, message, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message && <Text style={styles.emptyMessage}>{message}</Text>}
      {actionLabel && onAction && <AppButton title={actionLabel} onPress={onAction} size="small" style={styles.emptyButton} />}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    ...continuous,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { flex: 1, ...typography.subhead },
  retry: { color: colors.primary, ...typography.label },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.xl },
  loadingText: { marginTop: spacing.md, color: colors.textMuted, ...typography.subhead },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: spacing.md, ...typography.headline, color: colors.text, textAlign: 'center' },
  emptyMessage: { marginTop: spacing.xs, ...typography.subhead, color: colors.textMuted, textAlign: 'center' },
  emptyButton: { marginTop: spacing.lg },
});
