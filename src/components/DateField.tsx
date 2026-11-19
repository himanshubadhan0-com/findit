/**
 * DateField: pick a day with the platform's own date picker.
 *   iOS     → the compact inline date pill (tap → calendar popover).
 *   Android → a field that opens the Material 3 date picker dialog.
 * Value is a 'YYYY-MM-DD' string.
 */
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { colors, continuous, pick, radius, spacing, typography } from '../constants/theme';
import { formatItemDate, parseISODate, toISODate } from '../utils/dateHelpers';

interface Props {
  label: string;
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  maximumDate?: Date;
  minimumDate?: Date;
  error?: string;
  /** Render without the outer label/error (inside a list row). */
  bare?: boolean;
}

export default function DateField({ label, value, onChange, maximumDate = new Date(), minimumDate, error, bare }: Props) {
  const date = parseISODate(value) ?? new Date();

  const picker =
    Platform.OS === 'ios' ? (
      <View style={[styles.iosRow, bare && styles.bareRow]}>
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={styles.iosLabel}>{bare ? label : formatItemDate(value)}</Text>
        <DateTimePicker
          value={date}
          mode="date"
          display="compact"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          accentColor={colors.primary}
          onValueChange={(_, d) => onChange(toISODate(d))}
          accessibilityLabel={label}
        />
      </View>
    ) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatItemDate(value)}`}
        android_ripple={{ color: colors.fill }}
        style={[styles.androidField, bare && styles.bareRow, !!error && styles.androidError]}
        onPress={() =>
          DateTimePickerAndroid.open({
            value: date,
            mode: 'date',
            design: 'material', // Material 3 date picker dialog
            title: label,
            maximumDate,
            minimumDate,
            onValueChange: (_, d) => onChange(toISODate(d)), // only called when the user taps OK
          })
        }
      >
        <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        <Text style={styles.androidValue}>{bare ? `${label}: ${formatItemDate(value)}` : formatItemDate(value)}</Text>
        <Ionicons name="caret-down" size={16} color={colors.textMuted} />
      </Pressable>
    );

  if (bare) return picker;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, !!error && { color: colors.error }]}>{label}</Text>
      {picker}
      <Text style={styles.error}>{error ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm },
  label: {
    ...typography.footnote,
    fontWeight: pick({ ios: '400', android: '500' }),
    color: colors.textMuted,
    marginBottom: spacing.xs + 2,
    marginLeft: pick({ ios: spacing.md, android: spacing.xs }),
  },
  iosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    ...continuous,
  },
  iosLabel: { flex: 1, ...typography.body, color: colors.text },
  bareRow: { borderRadius: 0, borderWidth: 0, backgroundColor: 'transparent' },
  androidField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  androidError: { borderWidth: 2, borderColor: colors.error },
  androidValue: { flex: 1, ...typography.body, color: colors.text },
  error: { color: colors.error, ...typography.footnote, minHeight: 18, marginTop: spacing.xs, marginLeft: spacing.md },
});
