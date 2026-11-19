/**
 * AuthContext — keeps track of "who is logged in" for the whole app.
 *
 * How it works:
 *   1. On startup we ask Supabase for a saved session (persistent login).
 *   2. We subscribe to onAuthStateChange, so logging in or out anywhere
 *      updates `session` here, and the navigator switches screens automatically.
 *   3. Whenever the user changes, we load their row from the `profiles` table.
 *
 * Any component can call `useAuth()` to read the user or call signIn/signOut.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../services/supabase';
import { fetchMyProfile } from '../services/profiles';
import { unregisterPush } from '../services/notifications';
import type { Profile } from '../types';

interface SignUpParams {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True only while we restore a saved session at app launch. */
  initializing: boolean;
  /** Set if the profile row couldn't be loaded (e.g. migrations not run yet). */
  profileError: unknown;
  signIn: (email: string, password: string) => Promise<void>;
  /** Resolves with needsEmailConfirmation = true when Supabase emailed a confirmation link. */
  signUp: (params: SignUpParams) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<unknown>(null);
  const [initializing, setInitializing] = useState(true);

  // 1 + 2: restore the saved session, then listen for login/logout events.
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setInitializing(false));

    // Keep this callback tiny. Supabase recommends not calling other Supabase
    // methods inside it, so the profile is loaded in the separate effect below.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;

  // Load the profile row. State is only updated inside the promise callbacks.
  const loadProfile = useCallback(
    () =>
      fetchMyProfile().then(
        async (p) => {
          if (!p) {
            // Logged in, but the account no longer exists (deleted by an admin or a
            // database reset). Clear the stale session so the user can sign in again.
            await supabase.auth.signOut({ scope: 'local' });
            return;
          }
          setProfile(p);
          setProfileError(null);
        },
        (err) => {
          console.warn('[auth] could not load profile', err);
          setProfileError(err);
        },
      ),
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(); // logged out: `profile` below is already null
  }, [userId, loadProfile]);

  // 3: reload the profile whenever a different user logs in.
  useEffect(() => {
    if (userId) loadProfile();
  }, [userId, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async ({ name, email, phone, password }: SignUpParams) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      // This metadata is copied into the `profiles` table by a database trigger.
      options: { data: { name: name.trim(), phone: phone.trim() || null } },
    });
    if (error) throw error;

    // If email confirmation is on and the address is already registered, Supabase
    // returns a "fake" user with no identities instead of an error, so attackers
    // can't find out which emails exist. We still want to tell our user.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('User already registered');
    }
    // No session means Supabase sent a confirmation email instead of logging in.
    return { needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    // Stop push alerts to this phone before the session disappears.
    if (userId) await unregisterPush(userId);
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, [userId]);

  // useMemo stops every consumer re-rendering unless something actually changed.
  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      // Only expose a profile that belongs to the logged-in user (null after logout).
      profile: profile && profile.id === userId ? profile : null,
      initializing,
      profileError,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, userId, profile, initializing, profileError, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
