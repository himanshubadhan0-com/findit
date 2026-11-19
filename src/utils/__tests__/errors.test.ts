import { getErrorMessage, isNetworkError } from '../errors';

describe('getErrorMessage', () => {
  it('turns network failures into a friendly offline message', () => {
    expect(getErrorMessage(new TypeError('Network request failed'))).toMatch(/internet connection/);
  });
  it('translates Supabase login errors', () => {
    expect(getErrorMessage({ message: 'Invalid login credentials' })).toBe('Incorrect email or password.');
  });
  it('passes through unknown messages', () => {
    expect(getErrorMessage(new Error('Item not found'))).toBe('Item not found');
  });
  it('uses the fallback for empty errors', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

describe('isNetworkError', () => {
  it('detects fetch failures', () => expect(isNetworkError('Failed to fetch')).toBe(true));
  it('ignores other errors', () => expect(isNetworkError(new Error('Bad input'))).toBe(false));
});
