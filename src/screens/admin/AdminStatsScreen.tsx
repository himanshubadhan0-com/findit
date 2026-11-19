/**
 * AdminStatsScreen: admin-only dashboard.
 *   - Totals, return rate, most common lost category + location (get_admin_stats)
 *   - Reported posts: view, delete the post, or dismiss the report
 * The database refuses these calls for non-admins, so the screen can't leak data.
 */
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ListRow, Section } from '../../components/Section';
import { EmptyState, ErrorBanner, LoadingView } from '../../components/Feedback';
import { useActionSheet } from '../../components/ActionSheet';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { dismissReport, fetchAdminStats, fetchReports } from '../../services/reports';
import { deleteItem, fetchItem } from '../../services/items';
import { getErrorMessage } from '../../utils/errors';
import { timeAgo } from '../../utils/dateHelpers';
import { haptics } from '../../utils/haptics';
import type { AppScreenProps } from '../../navigation/types';
import type { ReportWithItem } from '../../types';
import { colors, continuous, pick, radius, spacing, typography } from '../../constants/theme';

export default function AdminStatsScreen({ navigation }: AppScreenProps<'AdminStats'>) {
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const showActions = useActionSheet();

  const data = useAsyncData(
    async () => (isAdmin ? { stats: await fetchAdminStats(), reports: await fetchReports() } : null),
    [isAdmin],
  );

  if (!isAdmin) return <EmptyState icon="lock-closed-outline" title="Admins only" message="Ask an existing admin to grant you access." />;
  if (data.loading) return <LoadingView message="Loading dashboard…" />;

  const stats = data.data?.stats;
  const reports = data.data?.reports ?? [];

  const handleReport = (report: ReportWithItem) =>
    showActions({
      title: report.item?.title ?? 'Deleted post',
      message: report.reason,
      options: [
        ...(report.item ? [{ label: 'View post', icon: 'eye-outline' as const, onPress: () => navigation.navigate('ItemDetails', { itemId: report.item_id }) }] : []),
        {
          label: 'Dismiss report',
          icon: 'checkmark-outline',
          onPress: async () => {
            try {
              await dismissReport(report.id);
              data.reload();
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err));
            }
          },
        },
        ...(report.item
          ? [
              {
                label: 'Delete post',
                icon: 'trash-outline' as const,
                destructive: true,
                onPress: () =>
                  Alert.alert('Delete this post?', 'It is removed for everyone, along with its reports.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const item = await fetchItem(report.item_id);
                          await deleteItem(item ?? { id: report.item_id, photo_urls: [] });
                          haptics.success();
                          data.reload();
                        } catch (err) {
                          Alert.alert('Could not delete', getErrorMessage(err));
                        }
                      },
                    },
                  ]),
              },
            ]
          : []),
      ],
    });

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={data.refreshing} onRefresh={data.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {data.error != null && <ErrorBanner message={getErrorMessage(data.error)} onRetry={data.refresh} />}

      {stats && (
        <>
          <View style={styles.grid}>
            <Stat label="Total posts" value={stats.total_items} />
            <Stat label="Users" value={stats.total_users} />
            <Stat label="Lost" value={stats.lost_items} color={colors.lost} />
            <Stat label="Found" value={stats.found_items} color={colors.found} />
            <Stat label="Open" value={stats.open_items} />
            <Stat label="Returned" value={stats.returned_items} color={colors.success} />
          </View>

          <Section title="Return rate" padded footer="Returned posts ÷ all posts. Higher means more items get back to their owners.">
            <View style={styles.rateRow}>
              <Text style={styles.rateValue}>{stats.return_rate}%</Text>
              <Text style={styles.rateSub}>
                {stats.returned_items} of {stats.total_items} posts returned
              </Text>
            </View>
            <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: stats.return_rate }}>
              <View style={[styles.fill, { width: `${Math.min(100, stats.return_rate)}%` }]} />
            </View>
          </Section>

          <Section title="Moderation">
            <ListRow icon="albums" title="All posts" subtitle="Open, claimed and returned" value={String(stats.total_items)} onPress={() => navigation.navigate('AdminPosts')} />
          </Section>

          <Section title="Insights">
            <ListRow icon="pricetag" title="Most commonly lost" value={stats.top_lost_category ?? '—'} />
            <ListRow icon="location" iconColor={colors.warning} title="Lost most often at" value={stats.top_lost_location ?? '—'} />
            <ListRow icon="hourglass" iconColor={colors.textMuted} title="Claimed, awaiting return" value={String(stats.claimed_items)} />
          </Section>
        </>
      )}

      <Section title={`Reported posts (${reports.length})`} footer={reports.length ? 'Tap a report to view, dismiss, or delete the post.' : undefined}>
        {reports.length === 0
          ? [<ListRow key="none" icon="shield-checkmark" iconColor={colors.success} title="No open reports" />]
          : reports.map((r) => (
              <ListRow
                key={r.id}
                icon="flag"
                iconColor={colors.error}
                title={r.item?.title ?? 'Deleted post'}
                subtitle={`“${r.reason}” · by ${r.reporter?.name ?? 'a student'} · ${timeAgo(r.created_at)}`}
                onPress={() => handleReport(r)}
              />
            ))}
      </Section>
    </ScrollView>
  );
}

function Stat({ label, value, color = colors.text }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${label}: ${value}`}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, marginBottom: spacing.lg },
  stat: {
    flexGrow: 1,
    flexBasis: '30%',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...continuous,
  },
  statValue: { fontSize: pick({ ios: 28, android: 28 }), fontWeight: '700' },
  statLabel: { ...typography.footnote, color: colors.textMuted, marginTop: 2 },
  rateRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm + 2 },
  rateValue: { fontSize: 34, fontWeight: '700', color: colors.success },
  rateSub: { ...typography.subhead, color: colors.textMuted },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.fill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5, backgroundColor: colors.success },
});
