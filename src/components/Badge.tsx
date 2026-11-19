/** Badges: Lost (red) / Found (green) type badge, and the item status badge. */
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, typography } from '../constants/theme';
import type { ClaimStatus, ItemStatus, ItemType } from '../types';

function Pill({ label, fg, bg, icon }: { label: string; fg: string; bg: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]} accessibilityLabel={label}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function TypeBadge({ type }: { type: ItemType }) {
  return type === 'lost' ? (
    <Pill label="LOST" fg={colors.lost} bg={colors.lostContainer} icon="search" />
  ) : (
    <Pill label="FOUND" fg={colors.found} bg={colors.foundContainer} icon="hand-left" />
  );
}

const STATUS: Record<ItemStatus, { label: string; fg: string; bg: string }> = {
  open: { label: 'Open', fg: colors.onPrimaryContainer, bg: colors.primaryContainer },
  claimed: { label: 'Claimed', fg: colors.warning, bg: colors.warningContainer },
  returned: { label: 'Returned', fg: colors.success, bg: colors.successContainer },
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  const s = STATUS[status];
  return <Pill label={s.label} fg={s.fg} bg={s.bg} />;
}

const CLAIM: Record<ClaimStatus, { label: string; fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Pending', fg: colors.warning, bg: colors.warningContainer, icon: 'time' },
  approved: { label: 'Approved', fg: colors.success, bg: colors.successContainer, icon: 'checkmark-circle' },
  rejected: { label: 'Not approved', fg: colors.error, bg: colors.errorContainer, icon: 'close-circle' },
};

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  const c = CLAIM[status];
  return <Pill label={c.label} fg={c.fg} bg={c.bg} icon={c.icon} />;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 999,
  },
  text: { ...typography.caption, letterSpacing: 0.3 },
});
