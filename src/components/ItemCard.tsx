/**
 * ItemCard: one post in a list: photo (or category icon), Lost/Found badge,
 * title, category, location and date.
 */
import { memo, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { StatusBadge, TypeBadge } from './Badge';
import { CATEGORY_ICONS } from '../constants/categories';
import { colors, continuous, radius, spacing, typography } from '../constants/theme';
import { formatItemDate } from '../utils/dateHelpers';
import type { Item } from '../types';

interface Props {
  item: Item;
  onPress: () => void;
  /** Extra content on the right (e.g. a match score or a ⋯ menu). */
  accessory?: ReactNode;
  /** Show the Open/Claimed/Returned badge (useful in My Activity). */
  showStatus?: boolean;
}

function ItemCard({ item, onPress, accessory, showStatus = item.status !== 'open' }: Props) {
  const photo = item.photo_urls[0];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.type === 'lost' ? 'Lost' : 'Found'}: ${item.title}, ${item.category}, ${item.location}, ${formatItemDate(item.date)}`}
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => [styles.card, Platform.OS === 'ios' && pressed && styles.pressed]}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.thumb} contentFit="cover" transition={150} recyclingKey={item.id} />
      ) : (
        <View style={[styles.thumb, styles.thumbIcon]}>
          <Ionicons name={CATEGORY_ICONS[item.category]} size={34} color={colors.primary} />
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.badges}>
          <TypeBadge type={item.type} />
          {showStatus && <StatusBadge status={item.status} />}
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {item.location} · {formatItemDate(item.date)}
          </Text>
        </View>
        <Text style={styles.category} numberOfLines={1}>
          {item.category}
        </Text>
      </View>
      {accessory}
    </Pressable>
  );
}

export default memo(ItemCard);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...continuous,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.7 },
  thumb: { width: 92, height: 92, borderRadius: radius.md, ...continuous },
  thumbIcon: { backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  badges: { flexDirection: 'row', gap: spacing.xs + 2 },
  title: { ...typography.headline, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  meta: { ...typography.footnote, color: colors.textMuted, flexShrink: 1 },
  category: { ...typography.footnote, color: colors.textFaint },
});
