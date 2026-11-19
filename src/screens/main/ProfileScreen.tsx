/**
 * ProfileScreen: your details (editable name + phone), the admin dashboard
 * link for admins, and log out.
 */
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';

import Screen from '../../components/Screen';
import { ListRow, Section } from '../../components/Section';
import BottomSheet from '../../components/BottomSheet';
import TextField from '../../components/TextField';
import { ErrorBanner } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { updateMyProfile } from '../../services/profiles';
import { getErrorMessage } from '../../utils/errors';
import { hasErrors, validateName, validatePhone } from '../../utils/validators';
import { haptics } from '../../utils/haptics';
import type { TabScreenProps } from '../../navigation/types';
import { colors, spacing, typography } from '../../constants/theme';

export default function ProfileScreen({ navigation }: TabScreenProps<'Profile'>) {
  const { user, profile, profileError, refreshProfile, signOut } = useAuth();
  const [editing, setEditing] = useState(false);

  const name = profile?.name ?? 'Student';
  const email = profile?.email ?? user?.email ?? '';

  const confirmSignOut = () =>
    Alert.alert('Log out?', 'You will need to log in again to post or claim items.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => signOut().catch((err) => Alert.alert('Could not log out', getErrorMessage(err))),
      },
    ]);

  return (
    <Screen scroll>
      {profileError != null && <ErrorBanner message={`Couldn't load your profile. ${getErrorMessage(profileError)}`} onRetry={refreshProfile} />}

      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
        {profile?.is_admin && <Text style={styles.admin}>Administrator</Text>}
      </View>

      <Section title="Account" footer="Your phone and email are shared only with someone whose claim you approve (or who approves yours).">
        <ListRow icon="person" title="Name" value={name} onPress={() => setEditing(true)} />
        <ListRow icon="call" iconColor={colors.success} title="Phone" value={profile?.phone || 'Add'} onPress={() => setEditing(true)} />
        <ListRow icon="mail" iconColor="#0A84FF" title="Email" value={email} />
      </Section>

      {profile?.is_admin && (
        <Section title="Admin">
          <ListRow icon="stats-chart" iconColor={colors.warning} title="Dashboard & reports" onPress={() => navigation.navigate('AdminStats')} />
        </Section>
      )}

      <Section>
        <ListRow icon="log-out" title="Log out" destructive onPress={confirmSignOut} chevron={false} />
      </Section>

      <Text style={styles.version}>FindIt {Constants.expoConfig?.version ?? ''}</Text>

      {profile && user && (
        <EditProfileSheet
          key={editing ? 'open' : 'closed'} // fresh values every time the sheet opens
          visible={editing}
          initialName={profile.name}
          initialPhone={profile.phone ?? ''}
          onClose={() => setEditing(false)}
          onSave={async (newName, newPhone) => {
            await updateMyProfile(user.id, { name: newName.trim(), phone: newPhone.trim() || null });
            await refreshProfile();
            haptics.success();
            setEditing(false);
          }}
        />
      )}
    </Screen>
  );
}

function EditProfileSheet({
  visible,
  initialName,
  initialPhone,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialName: string;
  initialPhone: string;
  onClose: () => void;
  onSave: (name: string, phone: string) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = async () => {
    const found = { name: validateName(name) ?? undefined, phone: validatePhone(phone) ?? undefined };
    setErrors(found);
    if (hasErrors(found)) return;
    try {
      setSaveError(null);
      await onSave(name, phone);
    } catch (err) {
      setSaveError(getErrorMessage(err));
    }
  };

  return (
    <BottomSheet visible={visible} title="Edit profile" onClose={onClose} doneLabel="Save" onDone={save}>
      {saveError && <ErrorBanner message={saveError} />}
      <TextField label="Full name" value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" maxLength={80} />
      <TextField label="Phone (optional)" value={phone} onChangeText={setPhone} error={errors.phone} keyboardType="phone-pad" hint="Shared only after an approved claim." />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '700', color: colors.onPrimary },
  name: { ...typography.title, color: colors.text, marginTop: spacing.md },
  email: { ...typography.subhead, color: colors.textMuted, marginTop: 2 },
  admin: { ...typography.caption, color: colors.primary, marginTop: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.6 },
  version: { ...typography.footnote, color: colors.textFaint, textAlign: 'center' },
});
