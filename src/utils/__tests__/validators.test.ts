import {
  getEmailDomain,
  hasErrors,
  isAllowedEmail,
  isValidEmail,
  validateLoginForm,
  validateName,
  validatePassword,
  validatePhone,
  validateSignUpEmail,
  validateSignUpForm,
  validateItemForm,
  validateClaimAnswer,
  validateReportReason,
} from '../validators';

describe('isValidEmail', () => {
  it.each(['a@b.co', 'test.user@example.com', '  padded@example.com  '])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(['', 'plainaddress', 'no-at.example.com', 'a@b', 'has space@example.com', '@example.com'])(
    'rejects %p',
    (email) => {
      expect(isValidEmail(email)).toBe(false);
    },
  );
});

describe('getEmailDomain', () => {
  it('returns the lower-cased domain', () => {
    expect(getEmailDomain('User@Mail.Example.COM')).toBe('mail.example.com');
  });
  it('returns empty string when there is no @', () => {
    expect(getEmailDomain('nope')).toBe('');
  });
});

describe('isAllowedEmail with no domain restriction (default)', () => {
  it.each(['user@gmail.com', 'user@example.com', 'user@college.edu'])('allows %s', (email) => {
    expect(isAllowedEmail(email, [])).toBe(true);
  });
  it('still rejects malformed emails', () => {
    expect(isAllowedEmail('not-an-email', [])).toBe(false);
  });
});

describe('isAllowedEmail with a domain restriction', () => {
  const allowed = ['college.edu'];

  it('accepts the exact domain', () => {
    expect(isAllowedEmail('user@college.edu', allowed)).toBe(true);
  });
  it('accepts a sub-domain', () => {
    expect(isAllowedEmail('user@student.college.edu', allowed)).toBe(true);
  });
  it('is case-insensitive', () => {
    expect(isAllowedEmail('USER@COLLEGE.EDU', allowed)).toBe(true);
  });
  it('rejects look-alike domains that merely end with the same text', () => {
    expect(isAllowedEmail('user@fakecollege.edu', allowed)).toBe(false);
  });
  it('rejects other domains', () => {
    expect(isAllowedEmail('user@gmail.com', allowed)).toBe(false);
  });
  it('rejects malformed emails', () => {
    expect(isAllowedEmail('college.edu', allowed)).toBe(false);
  });
  it('supports multiple allowed domains', () => {
    expect(isAllowedEmail('user@uni.ac.in', ['college.edu', 'uni.ac.in'])).toBe(true);
  });
});

describe('validateSignUpEmail', () => {
  it('requires a value', () => {
    expect(validateSignUpEmail('')).toMatch(/required/);
  });
  it('accepts any valid email by default', () => {
    expect(validateSignUpEmail('user@gmail.com')).toBeNull();
  });
  it('explains which domain is allowed when restricted', () => {
    expect(validateSignUpEmail('user@gmail.com', ['college.edu'])).toMatch(/@college\.edu/);
  });
  it('passes a matching domain when restricted', () => {
    expect(validateSignUpEmail('user@college.edu', ['college.edu'])).toBeNull();
  });
});

describe('validatePassword', () => {
  it('requires a value', () => expect(validatePassword('')).toMatch(/required/));
  it('requires 8+ characters', () => expect(validatePassword('ab12')).toMatch(/8 characters/));
  it('requires a number', () => expect(validatePassword('abcdefgh')).toMatch(/number/));
  it('requires a letter', () => expect(validatePassword('12345678')).toMatch(/letter/));
  it('accepts a good password', () => expect(validatePassword('findit2026')).toBeNull());
});

describe('validateName', () => {
  it('requires a value', () => expect(validateName('   ')).toMatch(/required/));
  it('requires 2+ characters', () => expect(validateName('A')).toMatch(/2 characters/));
  it('limits length', () => expect(validateName('x'.repeat(81))).toMatch(/80/));
  it('accepts a normal name', () => expect(validateName('Test User')).toBeNull());
});

describe('validatePhone', () => {
  it('is optional', () => expect(validatePhone('')).toBeNull());
  it('accepts formatted numbers', () => expect(validatePhone('+91 98765-43210')).toBeNull());
  it('accepts plain 10 digits', () => expect(validatePhone('9876543210')).toBeNull());
  it('rejects too short', () => expect(validatePhone('12345')).not.toBeNull());
  it('rejects letters', () => expect(validatePhone('98765abcde')).not.toBeNull());
});

describe('validateLoginForm', () => {
  it('flags both empty fields', () => {
    const errors = validateLoginForm({ email: '', password: '' });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(hasErrors(errors)).toBe(true);
  });
  it('accepts any valid email', () => {
    expect(hasErrors(validateLoginForm({ email: 'user@gmail.com', password: 'x' }))).toBe(false);
  });
});

describe('validateSignUpForm', () => {
  const good = {
    name: 'Test User',
    email: 'user@example.com',
    phone: '',
    password: 'findit2026',
    confirmPassword: 'findit2026',
  };

  it('passes a valid form', () => {
    expect(hasErrors(validateSignUpForm(good))).toBe(false);
  });
  it('accepts a non-college email', () => {
    expect(validateSignUpForm({ ...good, email: 'user@gmail.com' }).email).toBeUndefined();
  });
  it('catches mismatched passwords', () => {
    expect(validateSignUpForm({ ...good, confirmPassword: 'other2026' }).confirmPassword).toMatch(/match/);
  });
  it('requires confirm password', () => {
    expect(validateSignUpForm({ ...good, confirmPassword: '' }).confirmPassword).toMatch(/confirm/);
  });
  it('rejects an invalid email', () => {
    expect(validateSignUpForm({ ...good, email: 'not-an-email' }).email).toBeDefined();
  });
});

describe('validateItemForm', () => {
  const today = new Date(2026, 10, 14);
  const good = {
    type: 'found' as const,
    title: 'Black Samsung phone',
    description: 'Found near the library entrance, cracked corner.',
    category: 'Phone' as const,
    location: 'Library' as const,
    date: '2026-11-13',
    photos: [],
    verificationQuestion: '',
    verificationAnswer: '',
  };

  it('passes a valid form', () => expect(hasErrors(validateItemForm(good, today))).toBe(false));
  it('requires type, category and location', () => {
    const e = validateItemForm({ ...good, type: null, category: null, location: null }, today);
    expect(e.type && e.category && e.location).toBeTruthy();
  });
  it('requires a short title', () => expect(validateItemForm({ ...good, title: 'ab' }, today).title).toBeDefined());
  it('requires a useful description', () =>
    expect(validateItemForm({ ...good, description: 'phone' }, today).description).toBeDefined());
  it('rejects future dates', () => expect(validateItemForm({ ...good, date: '2026-11-15' }, today).date).toMatch(/future/));
  it('rejects dates older than a year', () =>
    expect(validateItemForm({ ...good, date: '2025-10-01' }, today).date).toMatch(/year/));
  it('limits photos to 3', () =>
    expect(validateItemForm({ ...good, photos: ['a', 'b', 'c', 'd'] }, today).photos).toBeDefined());
  it('question needs an answer', () =>
    expect(validateItemForm({ ...good, verificationQuestion: 'Wallpaper?' }, today).verificationAnswer).toBeDefined());
  it('answer needs a question', () =>
    expect(validateItemForm({ ...good, verificationAnswer: 'Sunset' }, today).verificationQuestion).toBeDefined());
  it('ignores verification fields on lost items', () =>
    expect(hasErrors(validateItemForm({ ...good, type: 'lost', verificationAnswer: 'x' }, today))).toBe(false));
});

describe('validateClaimAnswer', () => {
  it('required when the item has a question', () => expect(validateClaimAnswer(' ', true)).not.toBeNull());
  it('optional otherwise', () => expect(validateClaimAnswer('', false)).toBeNull());
});

describe('validateReportReason', () => {
  it('needs a few characters', () => expect(validateReportReason('x')).not.toBeNull());
  it('accepts a reason', () => expect(validateReportReason('Spam post')).toBeNull());
});
