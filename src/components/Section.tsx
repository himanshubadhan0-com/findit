/**
 * Section + ListRow: grouped lists in each platform's style.
 *   iOS        → "inset grouped" list: white rounded block, hairline separators, chevrons.
 *   Material 3 → list in a tonal card, primary-coloured subheader, ripple rows.
 */
import { Children, Fragment, isValidElement, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, continuous, pick, radius, spacing, typography } from '../constants/theme';

export function Section({
  title,
  footer,
  children,
  style,
  padded = false,
  plain = false,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Pad the content (for free-form content instead of ListRows). */
  padded?: boolean;
  /** No card: render children straight on the background (for form fields that draw their own boxes). */
  plain?: boolean;
}) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[styles.section, style]}>
      {title && (
        <Text style={styles.header} accessibilityRole="header">
          {title}
        </Text>
      )}
      {plain ? (
        children
      ) : (
      <View style={[styles.card, padded && styles.padded]}>
        {padded
          ? children
          : rows.map((row, i) => (
              <Fragment key={row.key ?? i}>
                {i > 0 && <View style={styles.separator} />}
                {row}
              </Fragment>
            ))}
      </View>
      )}
      {footer && <Text style={styles.footer}>{footer}</Text>}
    </View>
  );
}

type IconName = ComponentProps<typeof Ionicons>['name'];

interface RowProps {
  icon?: IconName;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  right?: ReactNode;
  /** Show a chevron (iOS convention for rows that navigate). Defaults to true when onPress is set. */
  chevron?: boolean;
}

export function ListRow({ icon, iconColor, title, subtitle, value, onPress, destructive, right, chevron }: RowProps) {
  const tint = destructive ? colors.error : (iconColor ?? colors.primary);
  const showChevron = Platform.OS === 'ios' && (chevron ?? !!onPress);
  const content = (
    <>
      {icon && (
        <View style={[styles.iconWrap, Platform.OS === 'ios' && { backgroundColor: tint }]}>
          <Ionicons name={icon} size={pick({ ios: 17, android: 22 })} color={Platform.OS === 'ios' ? colors.onDark : tint} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, destructive && { color: colors.error }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.rowSubtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        )}
      </View>
      {value && (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      )}
      {right}
      {showChevron && <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => [styles.row, Platform.OS === 'ios' && pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  header: pick({
    ios: { ...typography.footnote, color: colors.textMuted, textTransform: 'uppercase', marginLeft: spacing.md, marginBottom: spacing.sm },
    android: { ...typography.label, color: colors.primary, marginLeft: spacing.md, marginBottom: spacing.sm },
  }),
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, ...continuous, overflow: 'hidden' },
  padded: { padding: spacing.md },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: pick({ ios: 60, android: 0 }),
    opacity: pick({ ios: 1, android: 0 }), // M3 lists don't use dividers between rows
  },
  footer: { ...typography.footnote, color: colors.textMuted, marginHorizontal: spacing.md, marginTop: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: pick({ ios: 48, android: 56 }),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  rowPressed: { backgroundColor: colors.fill },
  iconWrap: pick({
    ios: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', ...continuous },
    android: { width: 24, alignItems: 'center' },
  }),
  rowText: { flex: 1 },
  rowTitle: { ...typography.body, color: colors.text },
  rowSubtitle: { ...typography.footnote, color: colors.textMuted, marginTop: 2 },
  rowValue: { ...typography.body, color: colors.textMuted, maxWidth: '50%' },
});
