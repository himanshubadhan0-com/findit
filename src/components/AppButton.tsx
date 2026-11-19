/**
 * AppButton: one button component, styled per platform:
 *   iOS 26     → capsule button, dims while pressed.
 *   Material 3 → pill button with a ripple.
 * Variants: primary (filled), secondary (tonal), outline, danger, ghost (text only).
 * While `loading`, it shows a spinner and ignores taps (no double submits).
 */
import type { ComponentProps } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, pick, spacing, typography } from '../constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'large' | 'small';
  loading?: boolean;
  disabled?: boolean;
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: colors.primaryContainer, fg: colors.onPrimaryContainer },
  outline: { bg: 'transparent', fg: colors.primary, border: colors.outline },
  danger: { bg: colors.error, fg: colors.onPrimary },
  ghost: { bg: 'transparent', fg: colors.primary },
};

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  loading = false,
  disabled = false,
  icon,
  style,
  accessibilityHint,
}: Props) {
  const isDisabled = disabled || loading;
  const v = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={{ color: variant === 'primary' || variant === 'danger' ? 'rgba(255,255,255,0.24)' : 'rgba(79,70,229,0.12)' }}
      style={({ pressed }) => [
        styles.base,
        size === 'small' ? styles.small : styles.large,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1, borderColor: v.border } : null,
        Platform.OS === 'ios' && pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={size === 'small' ? 16 : 18} color={v.fg} />}
          <Text style={[styles.text, size === 'small' && styles.smallText, { color: v.fg }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // keeps the Android ripple inside the pill
  },
  large: { minHeight: pick({ ios: 52, android: 52 }), paddingHorizontal: spacing.lg },
  small: { minHeight: pick({ ios: 36, android: 40 }), paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { ...typography.label, fontSize: pick({ ios: 17, android: 15 }) },
  smallText: { fontSize: pick({ ios: 15, android: 14 }) },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
