/**
 * NotificationsScreen: match alerts and claim updates.
 * New ones arrive live (Supabase Realtime). Tap to open the item; long-press to delete.
 */
import { useLayoutEffect } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState, ErrorBanner, LoadingView } from '../../components/Feedback';
import { useActionSheet } from '../../components/ActionSheet';
import { useNotifications } from '../../context/NotificationsContext';
import { getErrorMessage } from '../../utils/errors';
import { timeAgo } from '../../utils/dateHelpers';
import type { TabScreenProps } from '../../navigation/types';
import type { AppNotification } from '../../types';
import { colors, continuous, radius, spacing, typography } from '../../constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/** Pick an icon + colour from the notification's title. */
function iconFor(title: string): { icon: IconName; color: string } {
  const t = title.toLowerCase();
  if (t.includes('match')) return { icon: 'sparkles', color: colors.primary };
  if (t.includes('approved') && !t.includes('not')) return { icon: 'checkmark-circle', color: colors.success };
  if (t.includes('not approved')) return { icon: 'close-circle', color: colors.error };
  if (t.includes('returned')) return { icon: 'gift', color: colors.success };
  if (t.includes('reported')) return { icon: 'flag', color: colors.warning };
  return { icon: 'hand-left', color: colors.warning }; // new claim
}

export default function NotificationsScreen({ navigation }: TabScreenProps<'Notifications'>) {
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead, remove } = useNotifications();
  const showActions = useActionSheet();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        unreadCount > 0
          ? () => (
          <Pressable onPress={() => markAllRead().catch((e) => Alert.alert('Error', getErrorMessage(e)))} hitSlop={10} accessibilityRole="button" style={styles.headerButton}>
            <Text style={styles.headerButtonText}>Read all</Text>
          </Pressable>
            )
          : undefined,
    });
  }, [navigation, unreadCount, markAllRead]);

  const open = (n: AppNotification) => {
    if (!n.read) markRead(n.id).catch(() => undefined);
    if (n.item_id) navigation.navigate('ItemDetails', { itemId: n.item_id });
  };

  const menu = (n: AppNotification) =>
    showActions({
      title: n.title,
      options: [
        ...(!n.read ? [{ label: 'Mark as read', icon: 'mail-open-outline' as const, onPress: () => markRead(n.id).catch(() => undefined) }] : []),
        { label: 'Delete', icon: 'trash-outline', destructive: true, onPress: () => remove(n.id).catch((e) => Alert.alert('Error', getErrorMessage(e))) },
      ],
    });

  return (
    <FlatList
      style={styles.screen}
      data={notifications}
      keyExtractor={(n) => n.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      ListHeaderComponent={error != null ? <ErrorBanner message={getErrorMessage(error)} onRetry={refresh} /> : undefined}
      ListEmptyComponent={
        loading ? (
          <LoadingView />
        ) : (
          <EmptyState icon="notifications-outline" title="You're all caught up" message="Match alerts and claim updates will show up here." />
        )
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      renderItem={({ item: n }) => {
        const { icon, color } = iconFor(n.title);
        return (
          <Pressable
            onPress={() => open(n)}
            onLongPress={() => menu(n)}
            android_ripple={{ color: colors.fill }}
            style={({ pressed }) => [styles.row, !n.read && styles.unreadRow, Platform.OS === 'ios' && pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={`${n.read ? '' : 'Unread. '}${n.title}. ${n.body}`}
            accessibilityHint="Opens the item. Long-press for more options."
          >
            <View style={[styles.icon, { backgroundColor: `${color}1F` }]}>
              <Ionicons name={icon} size={20} color={color} />
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={[styles.title, !n.read && styles.titleUnread]} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={styles.time}>{timeAgo(n.created_at)}</Text>
              </View>
              <Text style={styles.text} numberOfLines={3}>
                {n.body}
              </Text>
            </View>
            {!n.read && <View style={styles.dot} />}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  separator: { height: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...continuous,
    overflow: 'hidden',
  },
  unreadRow: { backgroundColor: colors.primaryContainer },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  title: { flex: 1, ...typography.headline, fontWeight: '500', color: colors.text },
  titleUnread: { fontWeight: '700' },
  time: { ...typography.footnote, color: colors.textMuted },
  text: { ...typography.subhead, color: colors.textMuted },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
  headerButton: { paddingHorizontal: spacing.sm },
  headerButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },
});
