/**
 * ClaimItemScreen: "This is mine" (found items) / "I found this" (lost items).
 * For found items with a verification question, the claimer must answer it.
 * The poster then sees the answer and approves or rejects.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import AppButton from '../../components/AppButton';
import { ErrorBanner, InfoBanner, LoadingView, EmptyState } from '../../components/Feedback';
import { Section, ListRow } from '../../components/Section';
import { TypeBadge } from '../../components/Badge';
import { useAsyncData } from '../../hooks/useAsyncData';
import { fetchItem } from '../../services/items';
import { createClaim } from '../../services/claims';
import { getErrorMessage } from '../../utils/errors';
import { validateClaimAnswer } from '../../utils/validators';
import { formatItemDate } from '../../utils/dateHelpers';
import { haptics } from '../../utils/haptics';
import type { AppScreenProps } from '../../navigation/types';
import { colors, spacing, typography } from '../../constants/theme';

export default function ClaimItemScreen({ navigation, route }: AppScreenProps<'ClaimItem'>) {
  const { itemId } = route.params;
  const itemQuery = useAsyncData(() => fetchItem(itemId), [itemId], { refreshOnFocus: false });
  const [answer, setAnswer] = useState('');
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const item = itemQuery.data;
  if (itemQuery.loading) return <LoadingView />;
  if (!item) {
    return itemQuery.error != null ? (
      <Screen scroll>
        <ErrorBanner message={getErrorMessage(itemQuery.error)} onRetry={itemQuery.refresh} />
      </Screen>
    ) : (
      <EmptyState icon="eye-off-outline" title="Item not available" actionLabel="Go back" onAction={() => navigation.goBack()} />
    );
  }

  const isFound = item.type === 'found';
  const required = isFound && !!item.verification_question;

  const submit = async () => {
    const invalid = validateClaimAnswer(answer, required);
    setAnswerError(invalid);
    if (invalid) return;
    setSending(true);
    setSubmitError(null);
    try {
      await createClaim(item.id, answer);
      haptics.success();
      navigation.goBack();
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      haptics.warning();
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen scroll>
      {submitError && <ErrorBanner message={submitError} />}

      <Section>
        <ListRow icon={isFound ? 'hand-left' : 'search'} iconColor={isFound ? colors.found : colors.lost} title={item.title} subtitle={`${item.location} · ${formatItemDate(item.date)}`} right={<TypeBadge type={item.type} />} />
      </Section>

      {required ? (
        <>
          <Section title="The finder asks">
            <ListRow icon="help-circle" title={item.verification_question!} />
          </Section>
          <TextField label="Your answer" placeholder="Only the real owner would know this" value={answer} onChangeText={(t) => { setAnswer(t); setAnswerError(null); }} error={answerError ?? undefined} maxLength={300} autoFocus />
        </>
      ) : (
        <TextField
          label={isFound ? 'Describe your item (optional)' : 'Where and when did you find it? (optional)'}
          placeholder={isFound ? 'Any detail that proves it’s yours' : 'e.g. On a bench outside the library, this morning'}
          value={answer}
          onChangeText={(t) => { setAnswer(t); setAnswerError(null); }}
          error={answerError ?? undefined}
          multiline
          maxLength={300}
        />
      )}

      <InfoBanner
        icon="shield-checkmark"
        message={`The ${isFound ? 'finder' : 'owner'} reviews your claim. If they approve it, you’ll both see each other’s email and phone. No chat needed.`}
      />

      <View style={styles.actions}>
        <AppButton title="Send claim" icon="paper-plane" onPress={submit} loading={sending} />
        <Text style={styles.footnote}>False claims can be reported to campus admins.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: spacing.sm },
  footnote: { ...typography.footnote, color: colors.textMuted, textAlign: 'center' },
});
