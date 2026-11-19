/**
 * MyActivityScreen: "My posts" and "My claims", with their status.
 * The ⋯ button on a post offers Edit / Mark as returned / Delete.
 */
import { useState } from 'react';
import { Alert, FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import ItemCard from '../../components/ItemCard';
import { SegmentedControl } from '../../components/Controls';
import { ClaimStatusBadge, TypeBadge } from '../../components/Badge';
import { EmptyState, ErrorBanner, LoadingView } from '../../components/Feedback';
import { useActionSheet } from '../../components/ActionSheet';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { deleteItem, fetchMyItems, markReturned } from '../../services/items';
import { fetchMyClaims } from '../../services/claims';
import { CATEGORY_ICONS } from '../../constants/categories';
import { getErrorMessage } from '../../utils/errors';
import { timeAgo } from '../../utils/dateHelpers';
import { haptics } from '../../utils/haptics';
import type { TabScreenProps } from '../../navigation/types';
import type { ClaimWithItem, ItemWithPoster } from '../../types';
import { colors, continuous, radius, spacing, typography } from '../../constants/theme';

type Tab = 'posts' | 'claims';

export default function MyActivityScreen({ navigation }: TabScreenProps<'MyActivity'>) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [tab, setTab] = useState<Tab>('posts');
  const showActions = useActionSheet();

  const posts = useAsyncData(() => fetchMyItems(userId), [userId]);
  const claims = useAsyncData(() => fetchMyClaims(userId), [userId]);
  const current = tab === 'posts' ? posts : claims;

  const confirmDelete = (item: ItemWithPoster) =>
    Alert.alert('Delete this post?', `“${item.title}” and its photos will be removed for everyone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(item);
            haptics.success();
            posts.setData((list) => list?.filter((i) => i.id !== item.id));
          } catch (err) {
            Alert.alert('Could not delete', getErrorMessage(err));
          }
        },
      },
    ]);

  const openPostMenu = (item: ItemWithPoster) =>
    showActions({
      title: item.title,
      options: [
        { label: 'Edit', icon: 'create-outline', onPress: () => navigation.navigate('EditItem', { itemId: item.id }) },
        ...(item.status !== 'returned'
          ? [
              {
                label: 'Mark as returned',
                icon: 'checkmark-done-outline' as const,
                onPress: async () => {
                  try {
                    await markReturned(item.id);
                    haptics.success();
                    posts.reload();
                  } catch (err) {
                    Alert.alert('Could not update', getErrorMessage(err));
                  }
                },
              },
            ]
          : []),
        { label: 'Delete', icon: 'trash-outline', destructive: true, onPress: () => confirmDelete(item) },
      ],
    });

  const header = (
    <View style={styles.header}>
      <SegmentedControl<Tab>
        accessibilityLabel="Show posts or claims"
        segments={[
          { value: 'posts', label: `My posts${posts.data ? ` (${posts.data.length})` : ''}` },
          { value: 'claims', label: `My claims${claims.data ? ` (${claims.data.length})` : ''}` },
        ]}
        value={tab}
        onChange={setTab}
      />
      {current.error != null && <ErrorBanner message={getErrorMessage(current.error)} onRetry={current.refresh} />}
    </View>
  );

  const empty = current.loading ? (
    <LoadingView />
  ) : tab === 'posts' ? (
    <EmptyState icon="megaphone-outline" title="No posts yet" message="Items you post appear here." actionLabel="Post an item" onAction={() => navigation.navigate('Post')} />
  ) : (
    <EmptyState icon="hand-left-outline" title="No claims yet" message="When you claim an item, you can follow its status here." />
  );

  const refreshControl = (
    <RefreshControl refreshing={current.refreshing} onRefresh={current.refresh} tintColor={colors.primary} colors={[colors.primary]} />
  );

  return (
    <View style={styles.screen}>
      {tab === 'posts' ? (
        <FlatList
          data={posts.data ?? []}
          keyExtractor={(i) => i.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
          refreshControl={refreshControl}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              showStatus
              onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
              accessory={
                <Pressable onPress={() => openPostMenu(item)} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Options for ${item.title}`} style={styles.menuButton}>
                  <Ionicons name={Platform.OS === 'ios' ? 'ellipsis-horizontal-circle' : 'ellipsis-vertical'} size={24} color={colors.textMuted} />
                </Pressable>
              }
            />
          )}
        />
      ) : (
        <FlatList
          data={claims.data ?? []}
          keyExtractor={(c) => c.id}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
          refreshControl={refreshControl}
          renderItem={({ item }) => <ClaimRow claim={item} onPress={() => item.item && navigation.navigate('ItemDetails', { itemId: item.item.id })} />}
        />
      )}
    </View>
  );
}

function ClaimRow({ claim, onPress }: { claim: ClaimWithItem; onPress: () => void }) {
  const item = claim.item;
  return (
    <Pressable
      onPress={onPress}
      disabled={!item}
      android_ripple={{ color: colors.fill }}
      style={({ pressed }) => [styles.claimCard, Platform.OS === 'ios' && pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
    >
      {item?.photo_urls[0] ? (
        <Image source={{ uri: item.photo_urls[0] }} style={styles.claimThumb} contentFit="cover" />
      ) : (
        <View style={[styles.claimThumb, styles.claimThumbIcon]}>
          <Ionicons name={item ? CATEGORY_ICONS[item.category] : 'trash-outline'} size={24} color={colors.primary} />
        </View>
      )}
      <View style={styles.claimBody}>
        <View style={styles.claimBadges}>
          {item && <TypeBadge type={item.type} />}
          <ClaimStatusBadge status={claim.status} />
        </View>
        <Text style={styles.claimTitle} numberOfLines={1}>
          {item?.title ?? 'Post was deleted'}
        </Text>
        <Text style={styles.claimMeta}>
          Claimed {timeAgo(claim.created_at)}
          {claim.status === 'approved' ? ' · Tap to see contact details' : ''}
        </Text>
      </View>
      {item && Platform.OS === 'ios' && <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  menuButton: { padding: spacing.xs },
  claimCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...continuous,
    overflow: 'hidden',
  },
  claimThumb: { width: 56, height: 56, borderRadius: radius.md, ...continuous },
  claimThumbIcon: { backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  claimBody: { flex: 1, gap: 4 },
  claimBadges: { flexDirection: 'row', gap: spacing.xs + 2 },
  claimTitle: { ...typography.headline, color: colors.text },
  claimMeta: { ...typography.footnote, color: colors.textMuted },
});
