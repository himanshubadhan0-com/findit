/**
 * SignUpScreen: create an account with an email and password.
 *
 * After sign up, one of two things happens (depending on Supabase settings):
 *   a) Email confirmation OFF → we get a session immediately and enter the app.
 *   b) Email confirmation ON  → no session yet; we show "check your inbox".
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import AppButton from '../../components/AppButton';
import { ErrorBanner } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import type { AuthScreenProps } from '../../navigation/types';
import { hasErrors, validateSignUpForm, type FieldErrors, type SignUpForm } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errors';
import { ALLOWED_DOMAINS_LABEL, IS_EMAIL_DOMAIN_RESTRICTED } from '../../constants/allowedEmailDomain';
import { colors, spacing, typography } from '../../constants/theme';

const EMPTY_FORM: SignUpForm = { name: '', email: '', phone: '', password: '', confirmPassword: '' };

export default function SignUpScreen({ navigation }: AuthScreenProps<'SignUp'>) {
  const { signUp } = useAuth();
  const [form, setForm] = useState<SignUpForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors<SignUpForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  const update = (field: keyof SignUpForm) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleSignUp = async () => {
    const found = validateSignUpForm(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const { needsEmailConfirmation } = await signUp(form);
      if (needsEmailConfirmation) {
        setConfirmationSentTo(form.email.trim().toLowerCase());
        setSubmitting(false);
      }
      // Otherwise we're logged in and RootNavigator switches to the app.
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  // ---- Success state: "check your inbox" ----
  if (confirmationSentTo) {
    return (
      <Screen contentStyle={styles.centered}>
        <Ionicons name="mail-unread-outline" size={64} color={colors.primary} />
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.centerText}>
          We sent a confirmation link to {confirmationSentTo}. Tap it, then come back and log in.
        </Text>
        <AppButton title="Go to login" onPress={() => navigation.replace('Login')} style={styles.fullWidth} />
      </Screen>
    );
  }

  // ---- The form ----
  return (
    <Screen scroll>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Join FindIt to post and claim lost items on campus.</Text>

      {submitError && <ErrorBanner message={submitError} />}

      <TextField
        label="Full name"
        placeholder="Your full name"
        value={form.name}
        onChangeText={update('name')}
        error={errors.name}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
      <TextField
        label="Email"
        placeholder="you@example.com"
        value={form.email}
        onChangeText={update('email')}
        error={errors.email}
        hint={IS_EMAIL_DOMAIN_RESTRICTED ? `Must end with ${ALLOWED_DOMAINS_LABEL}` : undefined}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Phone (optional)"
        placeholder="+91 98765 43210"
        value={form.phone}
        onChangeText={update('phone')}
        error={errors.phone}
        hint="Only shared with someone after you approve their claim."
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />
      <TextField
        label="Password"
        placeholder="At least 8 characters"
        value={form.password}
        onChangeText={update('password')}
        error={errors.password}
        hint="Use at least 8 characters, with a letter and a number."
        secureToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label="Confirm password"
        placeholder="Type it again"
        value={form.confirmPassword}
        onChangeText={update('confirmPassword')}
        error={errors.confirmPassword}
        secureToggle
        autoCapitalize="none"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={handleSignUp}
      />

      <AppButton title="Sign up" onPress={handleSignUp} loading={submitting} style={styles.button} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <AppButton title="Log in" variant="ghost" onPress={() => navigation.replace('Login')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.largeTitle, fontSize: 30, fontWeight: '700', color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  button: { marginTop: spacing.sm },
  footer: { alignItems: 'center', marginTop: spacing.lg },
  footerText: { color: colors.textMuted, ...typography.subhead },
  centered: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  centerText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch', marginTop: spacing.md },
});
