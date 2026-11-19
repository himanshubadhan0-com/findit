/**
 * LoginScreen: email + password login.
 * Flow: validate locally → call signIn → on success AuthContext gets a session
 * and RootNavigator switches to the main tabs automatically.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import AppButton from '../../components/AppButton';
import { ErrorBanner } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import type { AuthScreenProps } from '../../navigation/types';
import { hasErrors, validateLoginForm, type FieldErrors, type LoginForm } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errors';
import { colors, spacing, typography } from '../../constants/theme';

export default function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signIn } = useAuth();
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginForm>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Update one field and clear its error as soon as the user starts fixing it.
  const update = (field: keyof LoginForm) => (value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const handleLogin = async () => {
    const found = validateLoginForm(form);
    setErrors(found);
    if (hasErrors(found)) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      await signIn(form.email, form.password);
      // No navigate() needed. RootNavigator reacts to the new session.
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to see what’s been lost and found on campus.</Text>

      {submitError && <ErrorBanner message={submitError} />}

      <TextField
        label="Email"
        placeholder="you@example.com"
        value={form.email}
        onChangeText={update('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
      />
      <TextField
        label="Password"
        placeholder="Your password"
        value={form.password}
        onChangeText={update('password')}
        error={errors.password}
        secureToggle
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleLogin}
      />

      <AppButton title="Log in" onPress={handleLogin} loading={submitting} style={styles.button} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>New to FindIt?</Text>
        <AppButton title="Create an account" variant="ghost" onPress={() => navigation.replace('SignUp')} />
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
});
