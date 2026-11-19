/**
 * HomeScreen: the feed of active Lost & Found posts.
 *   - Search: iOS uses the native search bar in the large-title header;
 *     Android shows a Material 3 search bar at the top of the list.
 *   - Filter chips: type, category, location, date range.
 *   - Pull to refresh, loading / empty / error states.
 */
import { useLayoutEffect, useState } from 'react';
import { FlatList, Platform, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ItemCard from '../../components/ItemCard';
import FilterBar, { countActiveFilters } from '../../components/FilterBar';
import { EmptyState, ErrorBanner, LoadingView } from '../../components/Feedback';
import { useAsyncData, useDebounced } from '../../hooks/useAsyncData';
import { fetchFeed } from '../../services/items';
import { getErrorMessage } from '../../utils/errors';
import type { TabScreenProps } from '../../navigation/types';
import type { ItemFilters } from '../../types';
import { colors, spacing, typography } from '../../constants/theme';

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const [filters, setFilters] = useState<ItemFilters>({});
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350); // don't query on every keystroke

  const feed = useAsyncData(() => fetchFeed({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);

  // iOS: native search bar inside the large-title header.
  useLayoutEffect(() => {
    if (Platform.OS !== 'ios') return;
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: 'Search phones, wallets, keys…',
        hideWhenScrolling: false,
        onChangeText: (e) => setSearch(e.nativeEvent.text),
        onCancelButtonPress: () => setSearch(''),
      },
    });
  }, [navigation]);

  const isFiltered = !!debouncedSearch || countActiveFilters(filters) > 0;

  const header = (
    <View>
      {Platform.OS !== 'ios' && <AndroidSearchBar value={search} onChange={setSearch} />}
      <FilterBar filters={filters} onChange={setFilters} />
      {feed.error != null && feed.data && (
        <View style={styles.padded}>
          <ErrorBanner message={getErrorMessage(feed.error)} onRetry={feed.refresh} />
        </View>
      )}
      {feed.data && feed.data.length > 0 && (
        <Text style={styles.count}>
          {feed.data.length} {feed.data.length === 1 ? 'post' : 'posts'}
          {isFiltered ? ' match your search' : ''}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={feed.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ItemCard item={item} onPress={() => navigation.navigate('ItemDetails', { itemId: item.id })} />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          feed.loading ? (
            <LoadingView message="Loading posts…" />
          ) : feed.error != null ? (
            <View style={styles.padded}>
              <ErrorBanner message={getErrorMessage(feed.error)} onRetry={feed.refresh} />
            </View>
          ) : isFiltered ? (
            <EmptyState icon="search-outline" title="No matching posts" message="Try a different word or clear some filters." />
          ) : (
            <EmptyState
              icon="sparkles-outline"
              title="Nothing posted yet"
              message="Lost something or found something? Post it and FindIt will look for matches."
              actionLabel="Post an item"
              onAction={() => navigation.navigate('Post')}
            />
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
        contentInsetAdjustmentBehavior="automatic" // scroll under the glass header + tab bar on iOS
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={feed.refreshing} onRefresh={feed.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      />
    </View>
  );
}

/** Material 3 search bar: a full-width pill at the top of the content. */
function AndroidSearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.searchBar}>
      <Ionicons name="search" size={22} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search phones, wallets, keys…"
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        returnKeyType="search"
        accessibilityLabel="Search posts"
        cursorColor={colors.primary}
      />
      {value.length > 0 && <Ionicons name="close" size={22} color={colors.textMuted} onPress={() => onChange('')} accessibilityLabel="Clear search" />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: spacing.xxl, flexGrow: 1 },
  cardWrap: { paddingHorizontal: spacing.md },
  padded: { paddingHorizontal: spacing.md },
  count: { ...typography.footnote, color: colors.textMuted, marginHorizontal: spacing.md + 4, marginBottom: spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 56,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 28,
    backgroundColor: colors.surfaceHigh,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text },
});
