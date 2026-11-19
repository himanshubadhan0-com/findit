/**
 * validators.ts — pure functions that check form input.
 *
 * "Pure" means they don't touch the network or the UI. They take values and
 * return error messages, which makes them easy to unit test
 * (see __tests__/validators.test.ts).
 *
 * Convention: a validator returns `null` when the value is OK, or a
 * human-readable error string when it isn't.
 */
import { ALLOWED_EMAIL_DOMAINS } from '../constants/allowedEmailDomain';
import type { Category } from '../constants/categories';
import type { Location } from '../constants/locations';
import type { ItemType } from '../types';
import { daysBetween, isFutureDate, parseISODate, toISODate } from './dateHelpers';

/** Maps each form field to its error message (missing key = no error). */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

// Deliberately simple: something@something.something with no spaces.
// Supabase does the final, stricter check on the server.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

/** "User@Mail.Example.com" -> "mail.example.com" */
export function getEmailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).trim().toLowerCase();
}

/**
 * May this email sign up?
 *
 * If no domains are configured (empty list), every valid email is allowed.
 * Otherwise the domain must either BE an allowed domain, or END WITH "." + allowed domain:
 *   college.edu          -> allowed (exact match)
 *   student.college.edu  -> allowed (sub-domain)
 *   fakecollege.edu      -> rejected. A plain endsWith('college.edu') would wrongly allow it,
 *                           which is why we check for the dot.
 */
export function isAllowedEmail(
  email: string,
  allowedDomains: readonly string[] = ALLOWED_EMAIL_DOMAINS,
): boolean {
  if (!isValidEmail(email)) return false;
  if (allowedDomains.length === 0) return true; // no restriction configured
  const domain = getEmailDomain(email);
  return allowedDomains.some((allowed) => {
    const a = allowed.toLowerCase();
    return domain === a || domain.endsWith(`.${a}`);
  });
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required.';
  if (!isValidEmail(email)) return 'Enter a valid email address.';
  return null;
}

/** Email check for sign up: valid format, plus the domain rule if one is configured. */
export function validateSignUpEmail(
  email: string,
  allowedDomains: readonly string[] = ALLOWED_EMAIL_DOMAINS,
): string | null {
  const basic = validateEmail(email);
  if (basic) return basic;
  if (!isAllowedEmail(email, allowedDomains)) {
    const label = allowedDomains.map((d) => `@${d}`).join(' or ');
    return `Use an email ending in ${label}.`;
  }
  return null;
}

/** At least 8 characters, with at least one letter and one number. */
export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}

export function validateName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return 'Name is required.';
  if (trimmed.length < 2) return 'Name must be at least 2 characters.';
  if (trimmed.length > 80) return 'Name must be 80 characters or fewer.';
  return null;
}

/**
 * Phone is optional. If given, it may contain spaces, dashes or brackets
 * (we strip them) and must end up as 10–15 digits, with an optional leading +.
 */
export function validatePhone(phone: string): string | null {
  if (!phone.trim()) return null; // optional field
  const cleaned = phone.replace(/[\s\-()]/g, '');
  if (!/^\+?\d{10,15}$/.test(cleaned)) return 'Enter a valid phone number (10–15 digits).';
  return null;
}

// ---------- Whole-form validators (used by the screens) ----------

export interface LoginForm {
  email: string;
  password: string;
}

export function validateLoginForm(form: LoginForm): FieldErrors<LoginForm> {
  const errors: FieldErrors<LoginForm> = {};
  const email = validateEmail(form.email);
  if (email) errors.email = email;
  if (!form.password) errors.password = 'Password is required.';
  return errors;
}

export interface SignUpForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export function validateSignUpForm(form: SignUpForm): FieldErrors<SignUpForm> {
  const errors: FieldErrors<SignUpForm> = {};
  const name = validateName(form.name);
  const email = validateSignUpEmail(form.email);
  const phone = validatePhone(form.phone);
  const password = validatePassword(form.password);
  if (name) errors.name = name;
  if (email) errors.email = email;
  if (phone) errors.phone = phone;
  if (password) errors.password = password;
  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (form.confirmPassword !== form.password) errors.confirmPassword = 'Passwords do not match.';
  return errors;
}

// ---------- Item form (Post / Edit) ----------

export const MAX_PHOTOS = 3;

export interface ItemForm {
  type: ItemType | null;
  title: string;
  description: string;
  category: Category | null;
  location: Location | null;
  date: string; // YYYY-MM-DD
  photos: string[]; // local file URIs or already-uploaded URLs
  verificationQuestion: string;
  verificationAnswer: string;
}

export function validateItemForm(form: ItemForm, today: Date = new Date()): FieldErrors<ItemForm> {
  const errors: FieldErrors<ItemForm> = {};
  const title = form.title.trim();
  const description = form.description.trim();

  if (!form.type) errors.type = 'Choose Lost or Found.';

  if (!title) errors.title = 'Give your post a short title.';
  else if (title.length < 3) errors.title = 'Title must be at least 3 characters.';
  else if (title.length > 100) errors.title = 'Title must be 100 characters or fewer.';

  // A real description makes smart matching much more accurate.
  if (description.length < 10) errors.description = 'Describe the item in at least 10 characters (colour, brand, marks…).';
  else if (description.length > 1000) errors.description = 'Description must be 1000 characters or fewer.';

  if (!form.category) errors.category = 'Choose a category.';
  if (!form.location) errors.location = 'Choose where it was lost or found.';

  if (!parseISODate(form.date)) errors.date = 'Choose a date.';
  else if (isFutureDate(form.date, today)) errors.date = 'The date can’t be in the future.';
  else if (daysBetween(form.date, toISODate(today)) > 365) errors.date = 'The date must be within the last year.';

  if (form.photos.length > MAX_PHOTOS) errors.photos = `You can add up to ${MAX_PHOTOS} photos.`;

  // Verification is optional and only for Found items, but question + answer go together.
  if (form.type === 'found') {
    const q = form.verificationQuestion.trim();
    const a = form.verificationAnswer.trim();
    if (q && !a) errors.verificationAnswer = 'Add the answer only the real owner would know.';
    if (a && !q) errors.verificationQuestion = 'Add a question for the owner, or clear the answer.';
    if (q.length > 200) errors.verificationQuestion = 'Question must be 200 characters or fewer.';
    if (a.length > 200) errors.verificationAnswer = 'Answer must be 200 characters or fewer.';
  }
  return errors;
}

/** Claim answer: required when the item has a verification question. */
export function validateClaimAnswer(answer: string, required: boolean): string | null {
  const trimmed = answer.trim();
  if (required && !trimmed) return 'Answer the question so the finder can verify you.';
  if (trimmed.length > 300) return 'Keep your answer under 300 characters.';
  return null;
}

/** Report reason: 3–500 characters. */
export function validateReportReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < 3) return 'Tell us briefly what’s wrong.';
  if (trimmed.length > 500) return 'Keep it under 500 characters.';
  return null;
}

/** True if the errors object contains at least one message. */
export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
