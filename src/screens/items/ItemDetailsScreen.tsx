/**
 * ItemDetailsScreen: everything about one post.
 *
 * What you see depends on who you are:
 *   • Anyone      → photos, details, poster, status, Possible Matches, Report.
 *   • Not owner   → "This is mine" / "I found this" button (starts a claim),
 *                   or your claim's status (+ contact details once approved).
 *   • Owner       → the secret verification answer, every claim with the
 *                   claimer's answer + Approve / Reject, Mark as returned,
 *                   Edit, Delete.
 *   • Admin       → can delete any post.
 */
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import PhotoCarousel from '../../components/PhotoCarousel';
import { ClaimStatusBadge, StatusBadge, TypeBadge } from '../../components/Badge';
import { ListRow, Section } from '../../components/Section';
import AppButton from '../../components/AppButton';
import GlassSurface from '../../components/GlassSurface';
import ItemCard from '../../components/ItemCard';
import BottomSheet from '../../components/BottomSheet';
import TextField from '../../components/TextField';
import { EmptyState, ErrorBanner, InfoBanner, LoadingView } from '../../components/Feedback';
import { useActionSheet } from '../../components/ActionSheet';
import { useAuth } from '../../context/AuthContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { deleteItem, fetchItem, fetchMatches, getVerificationAnswer, markReturned, runMatching } from '../../services/items';
import { fetchClaimsForItem, fetchMyClaimForItem, getClaimContact, reviewClaim, withdrawClaim } from '../../services/claims';
import { REPORT_REASONS, reportItem } from '../../services/reports';
import { CATEGORY_ICONS } from '../../constants/categories';
import { LOCATION_ICONS } from '../../constants/locations';
import { formatItemDate, timeAgo } from '../../utils/dateHelpers';
import { getErrorMessage } from '../../utils/errors';
import { validateReportReason } from '../../utils/validators';
import { haptics } from '../../utils/haptics';
import type { AppScreenProps } from '../../navigation/types';
import type { ClaimContact, ClaimWithClaimer, ItemWithPoster } from '../../types';
import { colors, pick, spacing, typography } from '../../constants/theme';

export default function ItemDetailsScreen({ navigation, route }: AppScreenProps<'ItemDetails'>) {
  const { itemId, matchCount } = route.params;
  const { user, profile } = useAuth();
  const showActions = useActionSheet();
  const insets = useSafeAreaInsets();
  const [reporting, setReporting] = useState(false);

  const itemQuery = useAsyncData(() => fetchItem(itemId), [itemId]);
  const item = itemQuery.data;
  const isOwner = !!item && item.user_id === user?.id;
  const isAdmin = !!profile?.is_admin;

  // ---- Destructive / menu actions --------------------------------------
  const confirmDelete = useCallback(() => {
    if (!item) return;
    Alert.alert(isOwner ? 'Delete this post?' : 'Delete as admin?', 'This removes the post and its photos for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(item);
            haptics.success();
            navigation.goBack();
          } catch (err) {
            Alert.alert('Could not delete', getErrorMessage(err));
          }
        },
      },
    ]);
  }, [item, isOwner, navigation]);

  const doMarkReturned = useCallback(async () => {
    if (!item) return;
    try {
      await markReturned(item.id);
      haptics.success();
      itemQuery.reload();
    } catch (err) {
      Alert.alert('Could not update', getErrorMessage(err));
    }
  }, [item, itemQuery]);

  // Header ⋯ menu (glass button on iOS 26, overflow icon on Android).
  useLayoutEffect(() => {
    if (!item) return;
    const options = isOwner
      ? [
          { label: 'Edit post', icon: 'create-outline' as const, onPress: () => navigation.navigate('EditItem', { itemId: item.id }) },
          ...(item.status !== 'returned' ? [{ label: 'Mark as returned', icon: 'checkmark-done-outline' as const, onPress: doMarkReturned }] : []),
          { label: 'Delete post', icon: 'trash-outline' as const, destructive: true, onPress: confirmDelete },
        ]
      : [
          { label: 'Report post', icon: 'flag-outline' as const, onPress: () => setReporting(true) },
          ...(isAdmin ? [{ label: 'Delete post (admin)', icon: 'trash-outline' as const, destructive: true, onPress: confirmDelete }] : []),
        ];
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => showActions({ title: item.title, options })} hitSlop={10} accessibilityRole="button" accessibilityLabel="More options" style={styles.headerButton}>
          <Ionicons name={Platform.OS === 'ios' ? 'ellipsis-horizontal' : 'ellipsis-vertical'} size={22} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, item, isOwner, isAdmin, showActions, confirmDelete, doMarkReturned]);

  if (itemQuery.loading) return <LoadingView message="Loading item…" />;
  if (!item) {
    return (
      <View style={styles.screen}>
        {itemQuery.error != null ? (
          <View style={styles.content}>
            <ErrorBanner message={getErrorMessage(itemQuery.error)} onRetry={itemQuery.refresh} />
          </View>
        ) : (
          <EmptyState icon="eye-off-outline" title="Post not available" message="It may have been deleted or already returned." actionLabel="Go back" onAction={() => navigation.goBack()} />
        )}
      </View>
    );
  }

  const canClaim = !isOwner && item.status === 'open';

  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: 140 + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={itemQuery.refreshing} onRefresh={itemQuery.refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {matchCount !== undefined && isOwner && (
          <InfoBanner
            tone={matchCount > 0 ? 'success' : 'info'}
            icon={matchCount > 0 ? 'sparkles' : 'checkmark-circle'}
            message={
              matchCount > 0
                ? `Posted! We found ${matchCount} possible ${matchCount === 1 ? 'match' : 'matches'}. Both of you have been notified.`
                : 'Posted! No matches yet. We’ll notify you when a similar item is posted.'
            }
          />
        )}

        <PhotoCarousel photos={item.photo_urls} category={item.category} />

        <View style={styles.titleBlock}>
          <View style={styles.badges}>
            <TypeBadge type={item.type} />
            <StatusBadge status={item.status} />
          </View>
          <Text style={styles.title} accessibilityRole="header">
            {item.title}
          </Text>
          <Text style={styles.byline}>
            Posted by {isOwner ? 'you' : (item.poster?.name ?? 'a student')} · {timeAgo(item.created_at)}
          </Text>
        </View>

        <Section>
          <ListRow icon={CATEGORY_ICONS[item.category]} title="Category" value={item.category} />
          <ListRow icon={LOCATION_ICONS[item.location]} iconColor={colors.warning} title="Location" value={item.location} />
          <ListRow icon="calendar" iconColor={colors.success} title={item.type === 'lost' ? 'Date lost' : 'Date found'} value={formatItemDate(item.date)} />
        </Section>

        <Section title="Description" padded>
          <Text style={styles.description}>{item.description || 'No description.'}</Text>
        </Section>

        {item.verification_question && <VerificationSection itemId={item.id} question={item.verification_question} isOwner={isOwner} />}

        {isOwner ? (
          <OwnerClaimsSection item={item} onChanged={itemQuery.reload} />
        ) : (
          <MyClaimSection itemId={item.id} userId={user?.id ?? ''} itemType={item.type} />
        )}

        <MatchesSection item={item} isOwner={isOwner} onOpen={(id) => navigation.push('ItemDetails', { itemId: id })} />
      </ScrollView>

      {/* Floating action bar: Liquid Glass on iOS 26, elevated surface on Android */}
      {canClaim && <ClaimBar item={item} bottomInset={insets.bottom} onClaim={() => navigation.navigate('ClaimItem', { itemId: item.id })} />}

      <ReportSheet visible={reporting} itemId={item.id} onClose={() => setReporting(false)} />
    </View>
  );
}

// ---------------------------------------------------------------------------

function ClaimBar({ item, bottomInset, onClaim }: { item: ItemWithPoster; bottomInset: number; onClaim: () => void }) {
  const [claimed, setClaimed] = useState<boolean | null>(null);
  const { user } = useAuth();
  // Hide the bar if I already have a claim on this item.
  useEffect(() => {
    if (user) fetchMyClaimForItem(item.id, user.id).then((c) => setClaimed(!!c)).catch(() => setClaimed(false));
  }, [item.id, user]);
  if (claimed !== false) return null;

  return (
    <GlassSurface style={[styles.claimBar, { bottom: bottomInset + spacing.sm }]}>
      <View style={styles.claimBarText}>
        <Text style={styles.claimBarTitle}>{item.type === 'found' ? 'Is this yours?' : 'Did you find this?'}</Text>
        <Text style={styles.claimBarSub} numberOfLines={1}>
          {item.type === 'found' && item.verification_question ? 'You’ll answer a quick question' : 'The poster will review your claim'}
        </Text>
      </View>
      <AppButton title={item.type === 'found' ? 'This is mine' : 'I found this'} icon={item.type === 'found' ? 'hand-left' : 'search'} onPress={onClaim} size="small" />
    </GlassSurface>
  );
}

function VerificationSection({ itemId, question, isOwner }: { itemId: string; question: string; isOwner: boolean }) {
  const [answer, setAnswer] = useState<string | null>(null);
  useEffect(() => {
    if (isOwner) getVerificationAnswer(itemId).then(setAnswer).catch(() => setAnswer(null));
  }, [itemId, isOwner]);

  return (
    <Section
      title="Verification"
      footer={isOwner ? 'Only you can see the expected answer. Compare it with each claimer’s answer.' : 'You’ll need to answer this when you claim the item.'}
    >
      <ListRow icon="help-circle" title={question} subtitle="Question for the owner" />
      {isOwner && <ListRow icon="lock-closed" iconColor={colors.success} title={answer ?? '…'} subtitle="Expected answer (private)" />}
    </Section>
  );
}

/** Owner's view of every claim on the item. */
function OwnerClaimsSection({ item, onChanged }: { item: ItemWithPoster; onChanged: () => void }) {
  const claims = useAsyncData(() => fetchClaimsForItem(item.id), [item.id, item.status]);
  const [busy, setBusy] = useState<string | null>(null);

  const review = (claim: ClaimWithClaimer, approve: boolean) => {
    const doIt = async () => {
      setBusy(claim.id);
      try {
        await reviewClaim(claim.id, approve);
        haptics.success();
        claims.reload();
        onChanged();
      } catch (err) {
        Alert.alert('Could not update claim', getErrorMessage(err));
      } finally {
        setBusy(null);
      }
    };
    if (approve) {
      Alert.alert(
        `Approve ${claim.claimer?.name ?? 'this claim'}?`,
        'You’ll both see each other’s email and phone. Other pending claims will be declined.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Approve', onPress: doIt }],
      );
    } else doIt();
  };

  if (claims.loading) return null;
  const list = claims.data ?? [];

  return (
    <Section title={`Claims (${list.length})`} footer={list.length === 0 ? 'When someone claims this item, you’ll get a notification and see their answer here.' : undefined}>
      {list.length === 0
        ? [<ListRow key="none" icon="hourglass-outline" iconColor={colors.textMuted} title="No claims yet" />]
        : list.map((claim) => (
            <View key={claim.id} style={styles.claim}>
              <View style={styles.claimHeader}>
                <Text style={styles.claimName}>{claim.claimer?.name ?? 'Student'}</Text>
                <ClaimStatusBadge status={claim.status} />
              </View>
              <Text style={styles.claimMeta}>{timeAgo(claim.created_at)}</Text>
              {claim.answer_given ? (
                <Text style={styles.claimAnswer}>
                  {item.verification_question ? 'Answer: ' : 'Message: '}
                  <Text style={styles.claimAnswerValue}>“{claim.answer_given}”</Text>
                </Text>
              ) : null}
              {claim.status === 'pending' && item.status === 'open' && (
                <View style={styles.claimActions}>
                  <AppButton title="Reject" variant="outline" size="small" onPress={() => review(claim, false)} disabled={busy !== null} style={styles.flex} />
                  <AppButton title="Approve" size="small" icon="checkmark" onPress={() => review(claim, true)} loading={busy === claim.id} disabled={busy !== null} style={styles.flex} />
                </View>
              )}
              {claim.status === 'approved' && <ContactCard claimId={claim.id} label="Claimer’s contact" />}
            </View>
          ))}
    </Section>
  );
}

/** Non-owner: my claim's status, withdraw, and contact details after approval. */
function MyClaimSection({ itemId, userId, itemType }: { itemId: string; userId: string; itemType: 'lost' | 'found' }) {
  const claim = useAsyncData(() => fetchMyClaimForItem(itemId, userId), [itemId, userId]);
  if (!claim.data) return null;
  const c = claim.data;

  const withdraw = () =>
    Alert.alert('Withdraw your claim?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          try {
            await withdrawClaim(c.id);
            claim.setData(null);
          } catch (err) {
            Alert.alert('Could not withdraw', getErrorMessage(err));
          }
        },
      },
    ]);

  return (
    <Section title="Your claim">
      <View style={styles.claim}>
        <View style={styles.claimHeader}>
          <Text style={styles.claimName}>Sent {timeAgo(c.created_at)}</Text>
          <ClaimStatusBadge status={c.status} />
        </View>
        {c.status === 'pending' && (
          <>
            <Text style={styles.claimMeta}>The {itemType === 'found' ? 'finder' : 'owner'} will review your claim. You’ll get a notification.</Text>
            <AppButton title="Withdraw claim" variant="ghost" size="small" onPress={withdraw} style={styles.alignStart} />
          </>
        )}
        {c.status === 'rejected' && <Text style={styles.claimMeta}>Your claim wasn’t approved.</Text>}
        {c.status === 'approved' && <ContactCard claimId={c.id} label={itemType === 'found' ? 'Finder’s contact' : 'Owner’s contact'} />}
      </View>
    </Section>
  );
}

/** Contact details, fetched only after approval (the database enforces this). */
function ContactCard({ claimId, label }: { claimId: string; label: string }) {
  const [contact, setContact] = useState<ClaimContact | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getClaimContact(claimId).then(setContact).catch((e) => setError(getErrorMessage(e)));
  }, [claimId]);

  if (error) return <Text style={styles.claimMeta}>{error}</Text>;
  if (!contact) return <Text style={styles.claimMeta}>Loading contact…</Text>;

  const open = (url: string) => Linking.openURL(url).catch(() => Alert.alert('Cannot open', url));
  return (
    <View style={styles.contact}>
      <Text style={styles.contactLabel}>{label}</Text>
      <Text style={styles.contactName}>{contact.contact_name}</Text>
      <View style={styles.claimActions}>
        <AppButton title="Email" icon="mail" variant="secondary" size="small" onPress={() => open(`mailto:${contact.contact_email}?subject=${encodeURIComponent('FindIt: about your item')}`)} style={styles.flex} />
        {contact.contact_phone ? (
          <AppButton title="Call" icon="call" variant="secondary" size="small" onPress={() => open(`tel:${contact.contact_phone}`)} style={styles.flex} />
        ) : null}
      </View>
      <Text style={styles.claimMeta} selectable>
        {contact.contact_email}
        {contact.contact_phone ? ` · ${contact.contact_phone}` : ''}
      </Text>
    </View>
  );
}

/** Possible matches from the smart-matching table. The owner's visit re-runs matching. */
function MatchesSection({ item, isOwner, onOpen }: { item: ItemWithPoster; isOwner: boolean; onOpen: (id: string) => void }) {
  const matches = useAsyncData(async () => {
    // Re-running is safe: the database ignores duplicates and only notifies about new matches.
    if (isOwner && item.status === 'open') await runMatching(item).catch(() => undefined);
    return fetchMatches(item);
  }, [item.id, isOwner, item.status]);

  if (matches.loading || !matches.data?.length) return null;

  return (
    <View style={styles.matches}>
      <View style={styles.matchesHeader}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={styles.matchesTitle}>Possible matches</Text>
      </View>
      <Text style={styles.matchesSub}>Similar {item.type === 'lost' ? 'found' : 'lost'} posts, ranked by description, place and date.</Text>
      <View style={styles.matchesList}>
        {matches.data.map((m) => (
          <ItemCard
            key={m.id}
            item={m.item}
            onPress={() => onOpen(m.item.id)}
            accessory={
              <View style={styles.score} accessibilityLabel={`${Math.round(m.score * 100)} percent match`}>
                <Text style={styles.scoreValue}>{Math.round(m.score * 100)}%</Text>
                <Text style={styles.scoreLabel}>match</Text>
              </View>
            }
          />
        ))}
      </View>
    </View>
  );
}

function ReportSheet({ visible, itemId, onClose }: { visible: boolean; itemId: string; onClose: () => void }) {
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    const invalid = validateReportReason(reason);
    if (invalid) return setError(invalid);
    setSending(true);
    try {
      await reportItem(itemId, reason);
      haptics.success();
      onClose();
      setReason('');
      Alert.alert('Thanks for reporting', 'An admin will review this post.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <BottomSheet visible={visible} title="Report post" onClose={onClose} doneLabel={sending ? 'Sending…' : 'Send'} onDone={send}>
      <Section title="Why are you reporting this?">
        {REPORT_REASONS.map((r) => (
          <ListRow
            key={r}
            title={r}
            chevron={false}
            onPress={() => {
              haptics.selection();
              setReason(r);
              setError(null);
            }}
            right={reason === r ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
          />
        ))}
      </Section>
      <TextField label="Or describe the problem" value={REPORT_REASONS.includes(reason as never) ? '' : reason} onChangeText={(t) => { setReason(t); setError(null); }} error={error ?? undefined} multiline maxLength={500} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  flex: { flex: 1 },
  alignStart: { alignSelf: 'flex-start', paddingHorizontal: 0 },
  headerButton: { padding: spacing.xs },
  titleBlock: { marginVertical: spacing.md, gap: spacing.xs + 2, paddingHorizontal: spacing.xs },
  badges: { flexDirection: 'row', gap: spacing.xs + 2 },
  title: { ...typography.title, fontSize: pick({ ios: 26, android: 24 }), color: colors.text },
  byline: { ...typography.subhead, color: colors.textMuted },
  description: { ...typography.body, color: colors.text, lineHeight: pick({ ios: 24, android: 24 }) },
  claim: { padding: spacing.md, gap: spacing.xs + 2 },
  claimHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  claimName: { ...typography.headline, color: colors.text, flexShrink: 1 },
  claimMeta: { ...typography.footnote, color: colors.textMuted },
  claimAnswer: { ...typography.subhead, color: colors.textMuted },
  claimAnswerValue: { color: colors.text, fontWeight: '600' },
  claimActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs + 2 },
  contact: { marginTop: spacing.sm, padding: spacing.md, borderRadius: 16, backgroundColor: colors.successContainer, gap: 4 },
  contactLabel: { ...typography.caption, color: colors.success, textTransform: 'uppercase', letterSpacing: 0.5 },
  contactName: { ...typography.headline, color: colors.text },
  matches: { marginBottom: spacing.lg },
  matchesHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginLeft: spacing.xs },
  matchesTitle: { ...typography.title, fontSize: pick({ ios: 20, android: 20 }), color: colors.text },
  matchesSub: { ...typography.footnote, color: colors.textMuted, marginLeft: spacing.xs, marginTop: 2, marginBottom: spacing.sm + 2 },
  matchesList: { gap: spacing.sm + 2 },
  score: { alignItems: 'center', paddingHorizontal: spacing.xs },
  scoreValue: { ...typography.headline, color: colors.primary },
  scoreLabel: { ...typography.caption, color: colors.textMuted },
  claimBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm + 2,
    borderRadius: 999,
  },
  claimBarText: { flex: 1 },
  claimBarTitle: { ...typography.headline, color: colors.text },
  claimBarSub: { ...typography.footnote, color: colors.textMuted },
});
