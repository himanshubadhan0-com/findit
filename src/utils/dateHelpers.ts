/**
 * dateHelpers.ts: small, tested helpers for dates.
 *
 * Items store their date as a plain 'YYYY-MM-DD' string (no time, no time
 * zone), because "the day I lost it" doesn't have a time zone. These helpers
 * convert carefully using LOCAL time, so 11 pm doesn't become tomorrow.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Date → 'YYYY-MM-DD' in the phone's local time zone. */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → Date at local midnight. Returns null for invalid input. */
export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  // Reject impossible dates like 2026-02-31 (JS would roll them over to March).
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/**
 * Whole days from `from` to `to` (positive if `to` is later).
 * Uses UTC day numbers so daylight-saving changes can't produce 0.96 days.
 */
export function daysBetween(from: string, to: string): number {
  const a = parseISODate(from);
  const b = parseISODate(to);
  if (!a || !b) return NaN;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

/** Is this 'YYYY-MM-DD' after today? */
export function isFutureDate(iso: string, today: Date = new Date()): boolean {
  return daysBetween(toISODate(today), iso) > 0;
}

/** 'Today', 'Yesterday', '12 Nov', or '12 Nov 2025' (other years). */
export function formatItemDate(iso: string, today: Date = new Date()): string {
  const date = parseISODate(iso);
  if (!date) return iso;
  const diff = daysBetween(iso, toISODate(today));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const label = `${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? label : `${label} ${date.getFullYear()}`;
}

/** Timestamp → 'Just now', '5m ago', '3h ago', '2d ago', or a date. */
export function timeAgo(timestamp: string, now: Date = new Date()): string {
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '';
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatItemDate(toISODate(then), now);
}
