/**
 * errors.ts — turns raw errors (from Supabase, fetch, etc.) into friendly
 * sentences we can show to students.
 */

const NETWORK_PATTERN = /network request failed|failed to fetch|fetch failed|networkerror|network error|timed? ?out/i;

/** True if the error looks like "no internet / server unreachable". */
export function isNetworkError(error: unknown): boolean {
  return NETWORK_PATTERN.test(rawMessage(error));
}

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  const message = rawMessage(error);

  if (NETWORK_PATTERN.test(message)) {
    return "Can't reach the server. Check your internet connection and try again.";
  }
  if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/email not confirmed/i.test(message)) {
    return 'Please confirm your email first. Check your inbox for the link.';
  }
  if (/user already registered/i.test(message)) {
    return 'An account with this email already exists. Try logging in.';
  }
  if (/rate limit/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';

  return message || fallback;
}

/** Pull a message string out of anything that might have been thrown. */
function rawMessage(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return '';
}
