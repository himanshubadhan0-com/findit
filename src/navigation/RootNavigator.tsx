/**
 * RootNavigator: picks which part of the app to show.
 *   - still restoring the saved login → loading spinner
 *   - logged out                     → AuthNavigator (Welcome / Login / Sign Up)
 *   - logged in                      → AppNavigator (tabs + detail screens)
 * There is no manual "navigate to Home after login". When the session changes,
 * this component re-renders and swaps the navigator.
 */
import { useAuth } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import { LoadingView } from '../components/Feedback';

export default function RootNavigator() {
  const { session, initializing } = useAuth();

  if (initializing) return <LoadingView message="Starting FindIt…" />;
  return session ? <AppNavigator /> : <AuthNavigator />;
}
