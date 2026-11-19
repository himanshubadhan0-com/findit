/**
 * ItemForm: the shared form for "Post an item" and "Edit item".
 * It owns the field state + validation; the parent decides what "submit" does.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SegmentedControl } from './Controls';
import TextField from './TextField';
import { SelectField } from './SelectSheet';
import DateField from './DateField';
import PhotoPicker from './PhotoPicker';
import AppButton from './AppButton';
import { ErrorBanner, InfoBanner } from './Feedback';
import { Section } from './Section';
import { CATEGORY_OPTIONS } from '../constants/categories';
import { LOCATION_OPTIONS } from '../constants/locations';
import { colors, spacing, typography } from '../constants/theme';
import { hasErrors, validateItemForm, type FieldErrors, type ItemForm as Form } from '../utils/validators';
import { haptics } from '../utils/haptics';

interface Props {
  initial: Form;
  submitLabel: string;
  onSubmit: (form: Form) => Promise<void>;
  /** Editing can't change Lost ↔ Found (matching depends on it). */
  typeLocked?: boolean;
  /** Shown while submitting, e.g. "Uploading photos…" */
  submittingLabel?: string;
}

export default function ItemForm({ initial, submitLabel, onSubmit, typeLocked = false, submittingLabel }: Props) {
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<FieldErrors<Form>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Update one field and clear its error.
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    const found = validateItemForm(form);
    setErrors(found);
    if (hasErrors(found)) {
      haptics.warning();
      setSubmitError('Please fix the highlighted fields.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not save. Please try again.');
      haptics.warning();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      {submitError && <ErrorBanner message={submitError} />}

      <Section title="What happened?" padded>
        {typeLocked ? (
          <Text style={styles.locked}>
            This is a {form.type === 'lost' ? 'LOST' : 'FOUND'} item post. The type can’t be changed after posting.
          </Text>
        ) : (
          <SegmentedControl
            accessibilityLabel="Lost or found"
            segments={[
              { value: 'lost', label: 'I lost something', icon: 'search' },
              { value: 'found', label: 'I found something', icon: 'hand-left-outline' },
            ]}
            value={form.type}
            onChange={(type) => set('type', type)}
            colorFor={(v) =>
              v === 'lost' ? { fg: colors.lost, bg: colors.lostContainer } : { fg: colors.found, bg: colors.foundContainer }
            }
          />
        )}
        {errors.type && <Text style={styles.error}>{errors.type}</Text>}
      </Section>

      <Section title="Details" plain>
        <TextField
          label="Title"
          placeholder={form.type === 'found' ? 'e.g. Black Samsung phone' : 'e.g. Brown leather wallet'}
          value={form.title}
          onChangeText={(v) => set('title', v)}
          error={errors.title}
          maxLength={100}
          returnKeyType="next"
        />
        <TextField
          label="Description"
          placeholder="Colour, brand, stickers, what's inside… The more detail, the better the matching."
          value={form.description}
          onChangeText={(v) => set('description', v)}
          error={errors.description}
          multiline
          maxLength={1000}
        />
        <SelectField label="Category" placeholder="Choose a category" options={CATEGORY_OPTIONS} value={form.category} onChange={(v) => set('category', v)} error={errors.category} />
        <SelectField label="Campus location" placeholder="Where was it?" options={LOCATION_OPTIONS} value={form.location} onChange={(v) => set('location', v)} error={errors.location} />
        <DateField label={form.type === 'found' ? 'Date found' : 'Date lost'} value={form.date} onChange={(v) => set('date', v)} error={errors.date} />
      </Section>

      <Section title="Photos" padded>
        <PhotoPicker photos={form.photos} onChange={(p) => set('photos', p)} error={errors.photos} />
      </Section>

      {form.type === 'found' && (
        <Section
          title="Verification (optional)"
          footer="Ask something only the real owner would know. Claimers must answer it, and only you can see the answer below."
          plain
        >
          <TextField
            label="Question for the owner"
            placeholder="e.g. What is the lock screen wallpaper?"
            value={form.verificationQuestion}
            onChangeText={(v) => set('verificationQuestion', v)}
            error={errors.verificationQuestion}
            maxLength={200}
          />
          <TextField
            label="Expected answer (private)"
            placeholder="Only visible to you"
            value={form.verificationAnswer}
            onChangeText={(v) => set('verificationAnswer', v)}
            error={errors.verificationAnswer}
            maxLength={200}
          />
        </Section>
      )}

      {form.type === 'lost' && (
        <InfoBanner message="After posting, FindIt compares your item with Found posts and alerts you about likely matches." icon="sparkles" />
      )}

      <AppButton title={submitting && submittingLabel ? submittingLabel : submitLabel} onPress={submit} loading={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  locked: { ...typography.subhead, color: colors.textMuted },
  error: { color: colors.error, ...typography.footnote, marginTop: spacing.sm },
});
