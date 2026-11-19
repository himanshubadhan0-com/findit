import { daysBetween, formatItemDate, isFutureDate, parseISODate, timeAgo, toISODate } from '../dateHelpers';

const today = new Date(2026, 10, 14, 23, 30); // 14 Nov 2026, 11:30 pm local

describe('toISODate / parseISODate', () => {
  it('formats in local time (late evening stays the same day)', () => {
    expect(toISODate(today)).toBe('2026-11-14');
  });
  it('round-trips', () => {
    expect(toISODate(parseISODate('2026-02-28')!)).toBe('2026-02-28');
  });
  it.each(['2026-02-31', '14-11-2026', '', '2026-13-01'])('rejects %p', (s) => {
    expect(parseISODate(s)).toBeNull();
  });
});

describe('daysBetween', () => {
  it('counts forward', () => expect(daysBetween('2026-11-01', '2026-11-08')).toBe(7));
  it('counts backward', () => expect(daysBetween('2026-11-08', '2026-11-01')).toBe(-7));
  it('crosses month and year boundaries', () => expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1));
  it('is NaN for bad input', () => expect(daysBetween('nope', '2026-01-01')).toBeNaN());
});

describe('isFutureDate', () => {
  it('today is not future', () => expect(isFutureDate('2026-11-14', today)).toBe(false));
  it('tomorrow is future', () => expect(isFutureDate('2026-11-15', today)).toBe(true));
});

describe('formatItemDate', () => {
  it('Today', () => expect(formatItemDate('2026-11-14', today)).toBe('Today'));
  it('Yesterday', () => expect(formatItemDate('2026-11-13', today)).toBe('Yesterday'));
  it('same year', () => expect(formatItemDate('2026-11-02', today)).toBe('2 Nov'));
  it('other year', () => expect(formatItemDate('2025-12-25', today)).toBe('25 Dec 2025'));
});

describe('timeAgo', () => {
  const now = new Date('2026-11-14T12:00:00Z');
  it('just now', () => expect(timeAgo('2026-11-14T11:59:30Z', now)).toBe('Just now'));
  it('minutes', () => expect(timeAgo('2026-11-14T11:55:00Z', now)).toBe('5m ago'));
  it('hours', () => expect(timeAgo('2026-11-14T09:00:00Z', now)).toBe('3h ago'));
  it('days', () => expect(timeAgo('2026-11-12T12:00:00Z', now)).toBe('2d ago'));
});
