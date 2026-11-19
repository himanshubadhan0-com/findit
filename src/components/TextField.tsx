/**
 * TextField: a labelled text input with an error (or hint) underneath.
 *   iOS        → borderless white field on the grey grouped background.
 *   Material 3 → outlined field; the outline turns primary (2dp) on focus.
 * `secureToggle` adds a show/hide eye button for passwords.
 * `maxLength` shows a live character counter.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, continuous, pick, radius, spacing, typography } from '../constants/theme';

interface Props extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  secureToggle?: boolean;
}

export default function TextField({
  label,
  error,
  hint,
  secureToggle = false,
  style,
  onFocus,
  onBlur,
  maxLength,
  value,
  ...inputProps
}: Props) {
  const [hidden, setHidden] = useState(secureToggle);
  const [focused, setFocused] = useState(false);
  const showCounter = maxLength !== undefined && focused;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, focused && styles.labelFocused, !!error && styles.labelError]}>{label}</Text>
      <View style={[styles.field, focused && styles.fieldFocused, !!error && styles.fieldError]}>
        <TextInput
          placeholderTextColor={colors.textFaint}
          secureTextEntry={hidden}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          maxLength={maxLength}
          value={value}
          {...inputProps}
          style={[styles.input, inputProps.multiline && styles.multiline, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
        {secureToggle && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      <View style={styles.helperRow}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : (
          <View style={styles.flex} />
        )}
        {showCounter && (
          <Text style={styles.counter}>
            {(value ?? '').length}/{maxLength}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.sm },
  flex: { flex: 1 },
  label: {
    ...typography.footnote,
    fontWeight: pick({ ios: '400', android: '500' }),
    color: colors.textMuted,
    marginBottom: spacing.xs + 2,
    marginLeft: pick({ ios: spacing.md, android: spacing.xs }),
  },
  labelFocused: pick({ ios: {}, android: { color: colors.primary } }),
  labelError: { color: colors.error },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    ...continuous,
    ...pick({
      ios: { backgroundColor: colors.surface },
      android: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.outline },
    }),
  },
  fieldFocused: pick({ ios: {}, android: { borderWidth: 2, borderColor: colors.primary, paddingHorizontal: spacing.md - 1 } }),
  fieldError: pick({
    ios: { backgroundColor: colors.errorContainer },
    android: { borderWidth: 2, borderColor: colors.error, paddingHorizontal: spacing.md - 1 },
  }),
  input: { flex: 1, minHeight: pick({ ios: 48, android: 56 }), ...typography.body, color: colors.text },
  multiline: { minHeight: 110, paddingTop: spacing.md - 2, paddingBottom: spacing.md - 2, textAlignVertical: 'top' },
  helperRow: { flexDirection: 'row', minHeight: 18, marginTop: spacing.xs, marginHorizontal: pick({ ios: spacing.md, android: spacing.md }) },
  error: { flex: 1, color: colors.error, ...typography.footnote },
  hint: { flex: 1, color: colors.textMuted, ...typography.footnote },
  counter: { color: colors.textMuted, ...typography.footnote, marginLeft: spacing.sm },
});
