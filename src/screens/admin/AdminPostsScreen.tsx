/**
 * AdminPostsScreen: admins see EVERY post (including returned ones) and can
 * open or delete any of them. The database enforces this too: the RLS
 * policies only let admins read other students' returned posts and delete
 * posts they don't own.
 */
import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ItemCard from '../../components/ItemCard';
import { SegmentedControl } from '../../components/Controls';
import { EmptyState, ErrorBanner, LoadingView } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { deleteItem, fetchAllItems } from '../../services/items';
import { getErrorMessage } from '../../utils/errors';
import { haptics } from '../../utils/haptics';
import type { AppScreenProps } from '../../navigation/types';
import type { ItemStatus, ItemWithPoster } from '../../types';
import { colors, spacing } from '../../constants/theme';

type Filter = 'all' | ItemStatus;

export default function AdminPostsScreen({ navigation }: AppScreenProps<'AdminPosts'>) {
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const [filter, setFilter] = useState<Filter>('all');

  const posts = useAsyncData(
    () => (isAdmin ? fetchAllItems(filter === 'all' ? undefined : filter) : Promise.resolve([])),
    [isAdmin, filter],
  );

  if (!isAdmin) return <EmptyState icon="lock-closed-outline" title="Admins only" message="Ask an existing admin to grant you access." />;

  const confirmDelete = (item: ItemWithPoster) =>
    Alert.alert('Delete this post?', `“${item.title}” by ${item.poster?.name ?? 'a student'} is removed for everyone.`, [
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

  const header = (
    <View style={styles.header}>
      <SegmentedControl<Filter>
        accessibilityLabel="Filter posts by status"
        segments={[
          { value: 'all', label: 'All' },
          { value: 'open', label: 'Open' },
          { value: 'claimed', label: 'Claimed' },
          { value: 'returned', label: 'Returned' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      {posts.error != null && <ErrorBanner message={getErrorMessage(posts.error)} onRetry={posts.refresh} />}
    </View>
  );

  return (
    <FlatList
      style={styles.screen}
      data={posts.data ?? []}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={header}
      ListEmptyComponent={posts.loading ? <LoadingView /> : <EmptyState icon="albums-outline" title="No posts" message="Nothing matches this filter." />}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
      refreshControl={<RefreshControl refreshing={posts.refreshing} onRefresh={posts.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      renderItem={({ item }) => (
        <ItemCard
          item={item}
          showStatus
          onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })}
          accessory={
            <Pressable onPress={() => confirmDelete(item)} hitSlop={12} accessibilityRole="button" accessibilityLabel={`Delete ${item.title}`} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Pressable>
          }
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, paddingBottom: spacing.xxl, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  deleteButton: { padding: spacing.xs },
});
