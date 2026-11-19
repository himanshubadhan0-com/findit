/**
 * Controls.tsx: selection controls in each platform's style.
 *
 *   Chip             iOS: capsule pill, filled when selected.
 *                    M3:  8dp filter chip, outlined; tonal fill + ✓ when selected.
 *   SegmentedControl iOS: capsule track with a sliding white thumb.
 *                    M3:  outlined segmented buttons; selected one tonal + ✓.
 */
import type { ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, pick, radius, spacing, typography } from '../constants/theme';
import { haptics } from '../utils/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Shows a ▾ to signal the chip opens a picker. */
  dropdown?: boolean;
  /** Override the selected colour (e.g. red for "Lost"). */
  selectedColor?: string;
}

export function Chip({ label, selected = false, onPress, icon, dropdown, selectedColor }: ChipProps) {
  const isIOS = Platform.OS === 'ios';
  const fg = selected ? (isIOS ? colors.onDark : colors.onPrimaryContainer) : colors.text;
  const leading: IconName | undefined = !isIOS && selected ? 'checkmark' : icon;

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => [
        styles.chip,
        selected && (isIOS ? { backgroundColor: selectedColor ?? colors.primary } : styles.chipSelectedAndroid),
        isIOS && pressed && { opacity: 0.7 },
      ]}
    >
      {leading && <Ionicons name={leading} size={16} color={fg} />}
      <Text style={[styles.chipText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
      {dropdown && <Ionicons name="chevron-down" size={14} color={fg} />}
    </Pressable>
  );
}

interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SegmentedProps<T extends string> {
  segments: Segment<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /** Per-segment selected colour (iOS thumb text / M3 container). */
  colorFor?: (value: T) => { fg: string; bg: string } | undefined;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({ segments, value, onChange, colorFor, accessibilityLabel }: SegmentedProps<T>) {
  const isIOS = Platform.OS === 'ios';
  return (
    <View style={styles.track} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {segments.map((s, i) => {
        const selected = s.value === value;
        const custom = selected ? colorFor?.(s.value) : undefined;
        const fg = custom?.fg ?? (selected && !isIOS ? colors.onPrimaryContainer : colors.text);
        const icon: IconName | undefined = !isIOS && selected ? 'checkmark' : s.icon;
        return (
          <Pressable
            key={s.value}
            onPress={() => {
              haptics.selection();
              onChange(s.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={s.label}
            android_ripple={{ color: colors.fill }}
            style={[
              styles.segment,
              !isIOS && i > 0 && styles.segmentDivider,
              selected && (isIOS ? styles.thumbIOS : { backgroundColor: colors.secondaryContainer }),
              selected && custom && { backgroundColor: custom.bg },
            ]}
          >
            {icon && <Ionicons name={icon} size={18} color={fg} />}
            <Text style={[styles.segmentText, { color: fg }, selected && styles.segmentTextSelected]}>{s.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    overflow: 'hidden',
    ...pick({
      ios: { height: 34, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.fill },
      android: {
        height: 32,
        paddingHorizontal: 12,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.outline,
      },
    }),
  },
  chipSelectedAndroid: { backgroundColor: colors.secondaryContainer, borderColor: colors.secondaryContainer },
  chipText: { ...typography.subhead, fontWeight: pick({ ios: '500', android: '500' }) },

  track: pick({
    ios: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 999, padding: 3 },
    android: { flexDirection: 'row', borderWidth: 1, borderColor: colors.outline, borderRadius: 999, overflow: 'hidden' },
  }),
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    minHeight: pick({ ios: 40, android: 48 }),
    borderRadius: pick({ ios: 999, android: 0 }),
  },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: colors.outline },
  thumbIOS: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentText: { ...typography.subhead, fontWeight: '500' },
  segmentTextSelected: { fontWeight: '600' },
});
