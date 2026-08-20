import { INTENT_ALIASES } from '../data/intent-aliases';
import type { SearchableEmoji } from '../data/catalog-types';

interface IndexedEmoji {
  emoji: SearchableEmoji;
  name: string;
  nameTokens: readonly string[];
  keywordPhrases: readonly string[];
  keywordTokens: readonly string[];
  shortcodePhrases: readonly string[];
  shortcodeTokens: readonly string[];
  allPhrases: readonly string[];
  allTokens: readonly string[];
}

export interface EmojiSearchIndex {
  documents: readonly IndexedEmoji[];
}

export interface EmojiSearchOptions {
  group?: number;
  includeVariants?: boolean;
  limit?: number;
}

export interface EmojiSearchResult {
  emoji: SearchableEmoji;
  score: number;
  matchedTerms: readonly string[];
}

interface TokenMatch {
  score: number;
  term: string;
}

interface QueryTokenPlan {
  alternatives: readonly string[];
  allowFuzzy: boolean;
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[_\-:]+/g, ' ')
    .replace(/[^\p{Letter}\p{Number}+]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizedPhrases(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeSearchText).filter(Boolean))];
}

function tokensFrom(phrases: readonly string[]): string[] {
  return [...new Set(phrases.flatMap((phrase) => phrase.split(' ')).filter(Boolean))];
}

export function createSearchIndex(records: readonly SearchableEmoji[]): EmojiSearchIndex {
  return {
    documents: records.map((emoji) => {
      const name = normalizeSearchText(emoji.name);
      const keywordPhrases = normalizedPhrases(emoji.keywords);
      const shortcodePhrases = normalizedPhrases(emoji.shortcodes);
      const allPhrases = normalizedPhrases(emoji.searchTerms);

      return {
        emoji,
        name,
        nameTokens: tokensFrom([name]),
        keywordPhrases,
        keywordTokens: tokensFrom(keywordPhrases),
        shortcodePhrases,
        shortcodeTokens: tokensFrom(shortcodePhrases),
        allPhrases,
        allTokens: tokensFrom(allPhrases),
      };
    }),
  };
}

function boundedDistance(left: string, right: string, maximum: number): number {
  if (Math.abs(left.length - right.length) > maximum) {
    return maximum + 1;
  }

  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1]! +
        (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      const value = Math.min(
        previous[rightIndex]! + 1,
        current[rightIndex - 1]! + 1,
        substitution,
      );
      current.push(value);
      rowMinimum = Math.min(rowMinimum, value);
    }

    if (rowMinimum > maximum) {
      return maximum + 1;
    }

    previous = current;
  }

  return previous[right.length] ?? maximum + 1;
}

function exactTokenScore(document: IndexedEmoji, candidate: string): number {
  if (document.nameTokens.includes(candidate)) return 240;
  if (document.keywordTokens.includes(candidate)) return 210;
  if (document.shortcodeTokens.includes(candidate)) return 200;
  if (document.allTokens.includes(candidate)) return 175;
  return 0;
}

function prefixTokenScore(document: IndexedEmoji, candidate: string): number {
  if (candidate.length < 2) return 0;
  if (document.nameTokens.some((token) => token.startsWith(candidate))) return 165;
  if (document.keywordTokens.some((token) => token.startsWith(candidate))) return 150;
  if (document.shortcodeTokens.some((token) => token.startsWith(candidate))) return 140;
  if (document.allTokens.some((token) => token.startsWith(candidate))) return 120;
  return 0;
}

function substringTokenScore(document: IndexedEmoji, candidate: string): number {
  if (candidate.length < 3) return 0;
  if (document.nameTokens.some((token) => token.includes(candidate))) return 110;
  if (document.keywordTokens.some((token) => token.includes(candidate))) return 100;
  if (document.allTokens.some((token) => token.includes(candidate))) return 80;
  return 0;
}

function fuzzyTokenScore(document: IndexedEmoji, candidate: string): number {
  if (candidate.length < 4) return 0;
  const maximum = candidate.length >= 8 ? 2 : 1;
  const distance = document.allTokens.reduce(
    (best, token) => Math.min(best, boundedDistance(candidate, token, maximum)),
    maximum + 1,
  );

  return distance <= maximum ? 60 - distance * 10 : 0;
}

function alternativesFor(token: string): readonly string[] {
  return [token, ...(INTENT_ALIASES[token] ?? [])].flatMap((value) => {
    const normalized = normalizeSearchText(value);
    return normalized ? normalized.split(' ') : [];
  });
}

function directTokenScore(document: IndexedEmoji, candidate: string): number {
  return (
    exactTokenScore(document, candidate) ||
    prefixTokenScore(document, candidate) ||
    substringTokenScore(document, candidate)
  );
}

function createTokenPlan(
  documents: readonly IndexedEmoji[],
  queryToken: string,
): QueryTokenPlan {
  const alternatives = alternativesFor(queryToken);
  const hasDirectMatch = documents.some((document) =>
    alternatives.some((candidate) => directTokenScore(document, candidate) > 0),
  );

  return { alternatives, allowFuzzy: !hasDirectMatch };
}

function matchToken(document: IndexedEmoji, plan: QueryTokenPlan): TokenMatch | undefined {
  let best: TokenMatch | undefined;

  plan.alternatives.forEach((candidate, aliasIndex) => {
    const aliasPenalty = aliasIndex === 0 ? 0 : 18;
    const score =
      directTokenScore(document, candidate) ||
      (plan.allowFuzzy ? fuzzyTokenScore(document, candidate) : 0);
    const adjusted = score - aliasPenalty;

    if (adjusted > 0 && (!best || adjusted > best.score)) {
      best = { score: adjusted, term: candidate };
    }
  });

  return best;
}

function phraseBoost(document: IndexedEmoji, query: string): number {
  if (document.name === query) return 900;
  if (document.shortcodePhrases.includes(query)) return 700;
  if (document.keywordPhrases.includes(query)) return 600;
  if (document.name.startsWith(query)) return 450;
  if (document.allPhrases.includes(query)) return 350;
  return 0;
}

function queryRequestsVariant(rawQuery: string, normalizedQuery: string): boolean {
  return (
    /\b(?:skin|tone|light|medium|dark)\b/.test(normalizedQuery) ||
    /tone\d/i.test(rawQuery)
  );
}

export function searchEmojis(
  index: EmojiSearchIndex,
  rawQuery: string,
  options: EmojiSearchOptions = {},
): EmojiSearchResult[] {
  const trimmedQuery = rawQuery.trim();
  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const queryTokens = normalizedQuery ? normalizedQuery.split(' ') : [];
  const exactGlyphMatches = index.documents.filter(
    ({ emoji }) => emoji.glyph === trimmedQuery &&
      (options.group === undefined || emoji.group === options.group),
  );

  if (exactGlyphMatches.length > 0) {
    return exactGlyphMatches.slice(0, options.limit ?? exactGlyphMatches.length).map(
      ({ emoji }) => ({ emoji, score: 2_000, matchedTerms: [trimmedQuery] }),
    );
  }

  if (queryTokens.length === 0) {
    return [];
  }

  const results: EmojiSearchResult[] = [];
  const eligibleDocuments =
    options.group === undefined
      ? index.documents
      : index.documents.filter(({ emoji }) => emoji.group === options.group);
  const tokenPlans = queryTokens.map((token) => createTokenPlan(eligibleDocuments, token));

  eligibleDocuments.forEach((document) => {
    const confirmedMatches: TokenMatch[] = [];
    for (const plan of tokenPlans) {
      const match = matchToken(document, plan);
      if (!match) {
        return;
      }
      confirmedMatches.push(match);
    }

    results.push({
      emoji: document.emoji,
      score:
        confirmedMatches.reduce((total, match) => total + match.score, 0) +
        phraseBoost(document, normalizedQuery),
      matchedTerms: confirmedMatches.map(({ term }) => term),
    });
  });

  results.sort(
    (left, right) =>
      right.score - left.score ||
      left.emoji.order - right.emoji.order ||
      left.emoji.id.localeCompare(right.emoji.id),
  );

  const keepVariants =
    options.includeVariants === true ||
    queryRequestsVariant(rawQuery, normalizedQuery) ||
    results.some(({ emoji }) => getNormalizedCodePoints(emoji.id) === normalizedQuery);
  const seenFamilies = new Set<string>();
  const filtered = keepVariants
    ? results
    : results.filter(({ emoji }) => {
        if (seenFamilies.has(emoji.familyId)) {
          return false;
        }
        seenFamilies.add(emoji.familyId);
        return true;
      });

  return filtered.slice(0, options.limit ?? filtered.length);
}

function getNormalizedCodePoints(id: string): string {
  return normalizeSearchText(
    id
      .split('-')
      .map((codePoint) => `U+${codePoint}`)
      .join(' '),
  );
}
