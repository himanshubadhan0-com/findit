/**
 * SelectSheet + SelectField: a "dropdown" done the native way.
 * The field looks like a form row; tapping it opens a sheet listing the
 * options with a ✓ (iOS) or radio button (Material 3) on the selected one.
 */
import { useState, type ComponentProps } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomSheet from './BottomSheet';
import { ListRow, Section } from './Section';
import { colors, continuous, pick, radius, spacing, typography } from '../constants/theme';
import { haptics } from '../utils/haptics';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

interface SheetProps<T extends string> {
  visible: boolean;
  title: string;
  options: readonly SelectOption<T>[];
  selected: T | null;
  onSelect: (value: T | null) => void;
  onClose: () => void;
  /** Adds a first option that clears the choice, e.g. "Any category". */
  clearLabel?: string;
}

export function SelectSheet<T extends string>({ visible, title, options, selected, onSelect, onClose, clearLabel }: SheetProps<T>) {
  const choose = (value: T | null) => {
    haptics.selection();
    onSelect(value);
    onClose();
  };
  const mark = (isSelected: boolean) =>
    Platform.OS === 'ios' ? (
      isSelected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null
    ) : (
      <Ionicons name={isSelected ? 'radio-button-on' : 'radio-button-off'} size={22} color={isSelected ? colors.primary : colors.textMuted} />
    );

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <Section>
        {[
          ...(clearLabel
            ? [<ListRow key="__any" title={clearLabel} icon="apps-outline" onPress={() => choose(null)} right={mark(selected === null)} chevron={false} />]
            : []),
          ...options.map((o) => (
            <ListRow
              key={o.value}
              icon={o.icon}
              title={o.label}
              onPress={() => choose(o.value)}
              right={mark(selected === o.value)}
              chevron={false}
            />
          )),
        ]}
      </Section>
    </BottomSheet>
  );
}

interface FieldProps<T extends string> {
  label: string;
  placeholder: string;
  options: readonly SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
}

/** A form field that opens a SelectSheet. */
export function SelectField<T extends string>({ label, placeholder, options, value, onChange, error }: FieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, !!error && { color: colors.error }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        android_ripple={{ color: colors.fill }}
        style={({ pressed }) => [styles.field, !!error && styles.fieldError, Platform.OS === 'ios' && pressed && { opacity: 0.6 }]}
      >
        {selected?.icon && <Ionicons name={selected.icon} size={20} color={colors.primary} />}
        <Text style={[styles.value, !selected && { color: colors.textFaint }]}>{selected?.label ?? placeholder}</Text>
        <Ionicons name={Platform.OS === 'ios' ? 'chevron-expand' : 'caret-down'} size={16} color={colors.textMuted} />
      </Pressable>
      <Text style={styles.error}>{error ?? ''}</Text>
      <SelectSheet
        visible={open}
        title={label}
        options={options}
        selected={value}
        onSelect={(v) => v && onChange(v)}
        onClose={() => setOpen(false)}
      />
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: pick({ ios: 48, android: 56 }),
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...continuous,
    ...pick({
      ios: { backgroundColor: colors.surface },
      android: { borderWidth: 1, borderColor: colors.outline },
    }),
  },
  fieldError: pick({ ios: { backgroundColor: colors.errorContainer }, android: { borderWidth: 2, borderColor: colors.error } }),
  value: { flex: 1, ...typography.body, color: colors.text },
  error: { color: colors.error, ...typography.footnote, minHeight: 18, marginTop: spacing.xs, marginLeft: spacing.md },
});
