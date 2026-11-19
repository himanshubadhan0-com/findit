import {
  MATCH_THRESHOLD,
  buildIdf,
  cosineSimilarity,
  dateScore,
  findMatches,
  isCandidate,
  locationScore,
  tfidfVector,
  tokenize,
  type MatchableItem,
} from '../matching';

/** Build a test item with sensible defaults. */
function item(overrides: Partial<MatchableItem>): MatchableItem {
  return {
    id: Math.random().toString(36).slice(2),
    user_id: 'user-a',
    type: 'lost',
    title: '',
    description: '',
    category: 'Phone',
    location: 'Library',
    date: '2026-11-10',
    status: 'open',
    ...overrides,
  };
}

// Mirrors supabase/seed.sql so the README's worked example matches the demo data.
const lostSamsung = item({
  id: 'lost-samsung',
  title: 'Black Samsung Galaxy phone',
  description: 'Black Samsung Galaxy S23 with a cracked corner and a clear back cover. Lost near the reading hall.',
  date: '2026-11-12',
});
const foundSamsung = item({
  id: 'found-samsung',
  user_id: 'user-b',
  type: 'found',
  title: 'Samsung phone with clear cover',
  description: 'Found a black Samsung phone on a table on the first floor of the library. Screen corner is cracked.',
  date: '2026-11-13',
});
const lostIphone = item({
  id: 'lost-iphone',
  user_id: 'user-c',
  title: 'Blue iPhone 13',
  description: 'Blue iPhone 13 in a red silicone case. Probably left on a bench at the ground after football practice.',
  location: 'Ground',
  date: '2026-11-08',
});

describe('tokenize', () => {
  it('lowercases, strips punctuation and stop words', () => {
    expect(tokenize('My BLACK Samsung phone!')).toEqual(['black', 'samsung', 'phone']);
  });
  it('turns simple plurals into singular', () => {
    expect(tokenize('keys phones glasses')).toEqual(['key', 'phone', 'glass']);
  });
  it('drops one-letter words', () => {
    expect(tokenize('a b cd')).toEqual(['cd']);
  });
  it('handles empty text', () => {
    expect(tokenize('')).toEqual([]);
  });
});

describe('TF-IDF + cosine similarity', () => {
  it('identical documents score 1', () => {
    const doc = ['red', 'wallet'];
    const idf = buildIdf([doc, doc]);
    expect(cosineSimilarity(tfidfVector(doc, idf), tfidfVector(doc, idf))).toBeCloseTo(1);
  });
  it('documents with no shared words score 0', () => {
    const a = ['red', 'wallet'];
    const b = ['blue', 'phone'];
    const idf = buildIdf([a, b]);
    expect(cosineSimilarity(tfidfVector(a, idf), tfidfVector(b, idf))).toBe(0);
  });
  it('rare words get a higher IDF than common ones', () => {
    const idf = buildIdf([['black', 'samsung'], ['black', 'wallet'], ['black', 'key']]);
    expect(idf.get('samsung')!).toBeGreaterThan(idf.get('black')!);
  });
  it('empty vectors score 0 instead of dividing by zero', () => {
    expect(cosineSimilarity(new Map(), new Map())).toBe(0);
  });
});

describe('locationScore', () => {
  it('same place = 1', () => expect(locationScore('Library', 'Library')).toBe(1));
  it('different place = 0', () => expect(locationScore('Library', 'Canteen')).toBe(0));
  it('"Other" is unknown = 0.5', () => expect(locationScore('Other', 'Canteen')).toBe(0.5));
});

describe('dateScore', () => {
  it('same day = 1', () => expect(dateScore('2026-11-10', '2026-11-10')).toBe(1));
  it('7 days apart = 0.5', () => expect(dateScore('2026-11-01', '2026-11-08')).toBe(0.5));
  it('14+ days apart = 0', () => expect(dateScore('2026-10-01', '2026-11-10')).toBe(0));
  it('found one day before lost is tolerated (time zones / late posts)', () => {
    expect(dateScore('2026-11-10', '2026-11-09')).toBeCloseTo(1 - 1 / 14);
  });
  it('found 2+ days BEFORE it was lost is impossible = 0', () => {
    expect(dateScore('2026-11-10', '2026-11-05')).toBe(0);
  });
});

describe('isCandidate (hard rules)', () => {
  it('accepts opposite type, same category, open, other user', () => {
    expect(isCandidate(lostSamsung, foundSamsung)).toBe(true);
  });
  it('rejects the same type', () => {
    expect(isCandidate(lostSamsung, lostIphone)).toBe(false);
  });
  it('rejects a different category', () => {
    expect(isCandidate(lostSamsung, { ...foundSamsung, category: 'Wallet' })).toBe(false);
  });
  it('rejects claimed / returned items', () => {
    expect(isCandidate(lostSamsung, { ...foundSamsung, status: 'claimed' })).toBe(false);
  });
  it('rejects your own posts', () => {
    expect(isCandidate(lostSamsung, { ...foundSamsung, user_id: lostSamsung.user_id })).toBe(false);
  });
});

describe('findMatches', () => {
  it('worked example: the Samsung pair is a strong match', () => {
    const [match] = findMatches(foundSamsung, [lostSamsung, lostIphone]);
    expect(match.item.id).toBe('lost-samsung');
    expect(match.location).toBe(1);
    expect(match.date).toBeCloseTo(0.929, 3); // 1 day apart: 1 - 1/14
    expect(match.score).toBeGreaterThanOrEqual(0.7);
  });

  it('a different phone in a different place is NOT a match', () => {
    const results = findMatches(foundSamsung, [lostIphone], { threshold: 0 });
    expect(results[0].score).toBeLessThan(MATCH_THRESHOLD);
    expect(findMatches(foundSamsung, [lostIphone])).toEqual([]);
  });

  it('sorts best first and respects the limit', () => {
    const weaker = { ...lostSamsung, id: 'weaker', user_id: 'user-d', location: 'Canteen' };
    const results = findMatches(foundSamsung, [weaker, lostSamsung], { threshold: 0, limit: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].item.id).toBe('lost-samsung');
  });

  it('keys example from the seed data matches', () => {
    const lostKeys = item({
      type: 'lost', category: 'Keys', location: 'Hostel', date: '2026-11-10',
      title: 'Hostel room keys with red keychain',
      description: 'Two keys on a red bottle-opener keychain. Room keys for Hostel B.',
    });
    const foundKeys = item({
      user_id: 'user-b', type: 'found', category: 'Keys', location: 'Hostel', date: '2026-11-11',
      title: 'Keys with red keychain',
      description: 'Found a bunch of two keys with a red keychain in the hostel common room.',
    });
    expect(findMatches(lostKeys, [foundKeys])[0]?.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
  });

  it('returns [] when there are no valid candidates', () => {
    expect(findMatches(lostSamsung, [])).toEqual([]);
  });
});
