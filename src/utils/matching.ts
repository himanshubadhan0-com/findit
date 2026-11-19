/**
 * matching.ts: SMART MATCHING between Lost and Found posts.
 *
 * When someone posts an item, we compare it with every OPEN post of the
 * OPPOSITE type (Lost ↔ Found) in the SAME CATEGORY, and give each pair a
 * score between 0 and 1:
 *
 *     score = 0.60 × textSimilarity     (do the titles/descriptions talk about the same thing?)
 *           + 0.25 × locationScore      (was it lost/found in the same place?)
 *           + 0.15 × dateScore          (were the dates close together?)
 *
 * Pairs scoring ≥ MATCH_THRESHOLD (0.40) are "Possible Matches". They're
 * saved in the `matches` table and both students get a notification.
 *
 * ── 1. Text similarity: TF-IDF + cosine similarity ───────────────────────
 *   a) Tokenize: lowercase, drop punctuation and common words ("the",
 *      "my", "lost"…), and turn simple plurals into singular
 *      ("keys" → "key").
 *   b) TF (term frequency) = how often a word appears in THIS post
 *      ÷ the number of words in the post.
 *   c) IDF (inverse document frequency) = ln((1 + N) / (1 + df)) + 1,
 *      where N = posts being compared and df = posts containing the word.
 *      Rare words ("samsung") get a higher weight than words that are
 *      everywhere ("black").
 *   d) Each post becomes a vector of TF × IDF weights. Cosine similarity
 *      = (A · B) / (|A| × |B|): 1 means the same words in the same
 *      proportions, 0 means no words in common.
 *
 * ── 2. Location score ─────────────────────────────────────────────────────
 *   same place → 1, either one is "Other" → 0.5 (unknown), different → 0.
 *
 * ── 3. Date score ─────────────────────────────────────────────────────────
 *   1 − (days apart ÷ 14), never below 0. Same day = 1, a week apart = 0.5,
 *   two weeks or more = 0. Extra rule: an item can't be FOUND more than a
 *   day BEFORE it was LOST, so that case scores 0.
 *
 * The weights favour text, because the description is the strongest evidence.
 * Location and date break ties between similar-sounding items.
 */
import type { ItemStatus, ItemType } from '../types';
import { daysBetween } from './dateHelpers';

/** The fields matching needs (a subset of Item). */
export interface MatchableItem {
  id: string;
  user_id: string;
  type: ItemType;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string; // YYYY-MM-DD
  status: ItemStatus;
}

export interface MatchScore {
  score: number; // final weighted score, 0–1
  text: number; // 0–1
  location: number; // 0–1
  date: number; // 0–1
}

export interface MatchResult extends MatchScore {
  item: MatchableItem;
}

export const MATCH_WEIGHTS = { text: 0.6, location: 0.25, date: 0.15 } as const;
export const MATCH_THRESHOLD = 0.4;
export const DATE_WINDOW_DAYS = 14;

// Words that appear in almost every post and say nothing about the item.
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'i', 'in', 'inside',
  'is', 'it', 'its', 'me', 'my', 'near', 'of', 'on', 'or', 'out', 'some', 'that', 'the', 'there', 'this', 'to',
  'was', 'with', 'left', 'lost', 'found', 'someone', 'somewhere', 'probably', 'please', 'item', 'one', 'just',
]);

// ---------------------------------------------------------------------------
// Step 1: tokenizing
// ---------------------------------------------------------------------------

/** Very small "stemmer": phones → phone, keys → key, glasses → glass, cases → case. */
function singular(word: string): string {
  if (word.length > 4 && word.endsWith('sses')) return word.slice(0, -2); // glasses → glass
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** "My BLACK Samsung phones!" → ['black', 'samsung', 'phone'] */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // punctuation → spaces
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w))
    .map(singular);
}

function itemTokens(item: Pick<MatchableItem, 'title' | 'description'>): string[] {
  // The title is the best summary, so its words count twice.
  return [...tokenize(item.title), ...tokenize(item.title), ...tokenize(item.description)];
}

// ---------------------------------------------------------------------------
// Step 2: TF-IDF vectors and cosine similarity
// ---------------------------------------------------------------------------

/** IDF weight for every word in the corpus (a list of tokenized posts). */
export function buildIdf(documents: string[][]): Map<string, number> {
  const n = documents.length;
  const docFrequency = new Map<string, number>();
  for (const doc of documents) {
    for (const word of new Set(doc)) docFrequency.set(word, (docFrequency.get(word) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [word, df] of docFrequency) idf.set(word, Math.log((1 + n) / (1 + df)) + 1);
  return idf;
}

/** Tokens → { word: tf × idf } */
export function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  const vector = new Map<string, number>();
  for (const [word, count] of counts) vector.set(word, (count / tokens.length) * (idf.get(word) ?? 1));
  return vector;
}

/** cos(θ) = (A · B) / (|A| × |B|), between 0 and 1 for non-negative weights. */
export function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  for (const [word, weight] of a) dot += weight * (b.get(word) ?? 0);
  const magnitude = (v: Map<string, number>) => Math.sqrt([...v.values()].reduce((sum, x) => sum + x * x, 0));
  const denominator = magnitude(a) * magnitude(b);
  return denominator === 0 ? 0 : dot / denominator;
}

// ---------------------------------------------------------------------------
// Step 3: location and date
// ---------------------------------------------------------------------------

export function locationScore(a: string, b: string): number {
  if (a === 'Other' || b === 'Other') return 0.5;
  return a === b ? 1 : 0;
}

/** lostDate/foundDate are YYYY-MM-DD. */
export function dateScore(lostDate: string, foundDate: string): number {
  const days = daysBetween(lostDate, foundDate); // positive = found after lost
  if (Number.isNaN(days)) return 0;
  if (days < -1) return 0; // found 2+ days BEFORE it was lost: impossible
  return Math.max(0, 1 - Math.abs(days) / DATE_WINDOW_DAYS);
}

// ---------------------------------------------------------------------------
// Step 4: put it together
// ---------------------------------------------------------------------------

/** Can `other` be a match for `item` at all? (hard rules, checked before scoring) */
export function isCandidate(item: MatchableItem, other: MatchableItem): boolean {
  return (
    other.id !== item.id &&
    other.type !== item.type && // Lost ↔ Found only
    other.category === item.category && // same category
    other.status === 'open' && // not already claimed/returned
    other.user_id !== item.user_id // not your own post
  );
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/** Score one pair. `idf` should come from the same comparison batch (see findMatches). */
export function scorePair(item: MatchableItem, other: MatchableItem, idf: Map<string, number>): MatchScore {
  const text = cosineSimilarity(tfidfVector(itemTokens(item), idf), tfidfVector(itemTokens(other), idf));
  const location = locationScore(item.location, other.location);
  const [lost, found] = item.type === 'lost' ? [item, other] : [other, item];
  const date = dateScore(lost.date, found.date);
  const score = MATCH_WEIGHTS.text * text + MATCH_WEIGHTS.location * location + MATCH_WEIGHTS.date * date;
  return { score: round3(score), text: round3(text), location, date: round3(date) };
}

/**
 * Compare `item` against `candidates` and return the best matches,
 * highest score first.
 */
export function findMatches(
  item: MatchableItem,
  candidates: MatchableItem[],
  { threshold = MATCH_THRESHOLD, limit = 5 }: { threshold?: number; limit?: number } = {},
): MatchResult[] {
  const valid = candidates.filter((c) => isCandidate(item, c));
  if (valid.length === 0) return [];

  // IDF is computed over this batch (the new post + its candidates).
  const idf = buildIdf([item, ...valid].map(itemTokens));

  return valid
    .map((other) => ({ item: other, ...scorePair(item, other, idf) }))
    .filter((m) => m.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
