import { INTENT_ALIASES } from '../data/intent-aliases';
import type {
  ContentType,
  SearchableEmoji,
  SearchableIcon,
  SearchableItem,
} from '../data/catalog-types';

interface IndexedItem {
  item: SearchableItem;
  kind: 'emoji' | 'icon';
  group: number | string;
  name: string;
  nameTokens: readonly string[];
  keywordPhrases: readonly string[];
  keywordTokens: readonly string[];
  shortcodePhrases: readonly string[];
  shortcodeTokens: readonly string[];
  allPhrases: readonly string[];
  allTokens: readonly string[];
}

export interface ItemSearchIndex {
  documents: readonly IndexedItem[];
}

export type EmojiSearchIndex = ItemSearchIndex;

export interface ItemSearchOptions {
  contentType?: ContentType;
  group?: number | string;
  includeVariants?: boolean;
  limit?: number;
}

export type EmojiSearchOptions = ItemSearchOptions;

export interface ItemSearchResult {
  item: SearchableItem;
  emoji: SearchableEmoji;
  score: number;
  matchedTerms: readonly string[];
}

export type EmojiSearchResult = ItemSearchResult;

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

function isIconItem(item: SearchableItem): item is SearchableIcon {
  return 'nodes' in item;
}

export function createSearchIndex(records: readonly SearchableItem[]): ItemSearchIndex {
  return {
    documents: records.map((item) => {
      const isIcon = isIconItem(item);
      const name = normalizeSearchText(item.name);
      const keywordPhrases = normalizedPhrases(isIcon ? item.tags : item.keywords);
      const shortcodePhrases = normalizedPhrases(isIcon ? [item.kebabName, item.pascalName] : item.shortcodes);
      const allPhrases = normalizedPhrases(item.searchTerms);
      const group = isIcon ? item.category : item.group;

      return {
        item,
        kind: isIcon ? 'icon' : 'emoji',
        group,
        name,
        nameTokens: tokensFrom([name, ...(isIcon ? [item.kebabName, item.pascalName] : [])]),
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

function exactTokenScore(document: IndexedItem, candidate: string): number {
  if (document.nameTokens.includes(candidate)) return 240;
  if (document.keywordTokens.includes(candidate)) return 210;
  if (document.shortcodeTokens.includes(candidate)) return 200;
  if (document.allTokens.includes(candidate)) return 175;
  return 0;
}

function prefixTokenScore(document: IndexedItem, candidate: string): number {
  if (candidate.length < 2) return 0;
  if (document.nameTokens.some((token) => token.startsWith(candidate))) return 165;
  if (document.keywordTokens.some((token) => token.startsWith(candidate))) return 150;
  if (document.shortcodeTokens.some((token) => token.startsWith(candidate))) return 140;
  if (document.allTokens.some((token) => token.startsWith(candidate))) return 120;
  return 0;
}

function substringTokenScore(document: IndexedItem, candidate: string): number {
  if (candidate.length < 3) return 0;
  if (document.nameTokens.some((token) => token.includes(candidate))) return 110;
  if (document.keywordTokens.some((token) => token.includes(candidate))) return 100;
  if (document.allTokens.some((token) => token.includes(candidate))) return 80;
  return 0;
}

function fuzzyTokenScore(document: IndexedItem, candidate: string): number {
  if (candidate.length < 4) return 0;
  const maximum = candidate.length >= 8 ? 2 : 1;
  const distance = document.allTokens.reduce(
    (best, token) => Math.min(best, boundedDistance(candidate, token, maximum)),
    maximum + 1,
  );

  return distance <= maximum ? 60 - distance * 10 : 0;
}

function alternativesFor(token: string): readonly string[] {
  return [...new Set(
    [token, ...(INTENT_ALIASES[token] ?? [])]
      .map(normalizeSearchText)
      .filter(Boolean),
  )];
}

function phraseAlternativeScore(document: IndexedItem, candidate: string): number {
  if (document.name === candidate) return 260;
  if (document.allPhrases.includes(candidate)) return 230;
  if (document.name.includes(candidate)) return 220;

  let weakest = Number.POSITIVE_INFINITY;
  for (const word of candidate.split(' ')) {
    const score = exactTokenScore(document, word) || prefixTokenScore(document, word);
    if (score === 0) return 0;
    weakest = Math.min(weakest, score);
  }

  return Number.isFinite(weakest) ? weakest : 0;
}

function directTokenScore(document: IndexedItem, candidate: string): number {
  if (candidate.includes(' ')) return phraseAlternativeScore(document, candidate);
  return (
    exactTokenScore(document, candidate) ||
    prefixTokenScore(document, candidate) ||
    substringTokenScore(document, candidate)
  );
}

function createTokenPlan(
  documents: readonly IndexedItem[],
  queryToken: string,
): QueryTokenPlan {
  const alternatives = alternativesFor(queryToken);
  const hasDirectMatch = documents.some((document) =>
    alternatives.some((candidate) => directTokenScore(document, candidate) > 0),
  );

  return { alternatives, allowFuzzy: !hasDirectMatch };
}

function matchToken(document: IndexedItem, plan: QueryTokenPlan): TokenMatch | undefined {
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

function phraseBoost(document: IndexedItem, query: string): number {
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

export function searchItems(
  index: ItemSearchIndex,
  rawQuery: string,
  options: ItemSearchOptions = {},
): ItemSearchResult[] {
  const trimmedQuery = rawQuery.trim();
  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const queryTokens = normalizedQuery ? normalizedQuery.split(' ') : [];

  const contentType = options.contentType ?? 'all';
  const groupFilter = options.group;

  const eligibleDocuments = index.documents.filter((doc) => {
    if (contentType === 'emoji' && doc.kind !== 'emoji') return false;
    if (contentType === 'icon' && doc.kind !== 'icon') return false;
    if (groupFilter !== undefined && doc.group !== groupFilter) return false;
    return true;
  });

  const exactGlyphMatches = eligibleDocuments.filter(
    ({ item }) => !isIconItem(item) && item.glyph === trimmedQuery,
  );

  if (exactGlyphMatches.length > 0) {
    return exactGlyphMatches.slice(0, options.limit ?? exactGlyphMatches.length).map(
      ({ item }) => ({
        item,
        emoji: item as SearchableEmoji,
        score: 2_000,
        matchedTerms: [trimmedQuery],
      }),
    );
  }

  if (queryTokens.length === 0) {
    return [];
  }

  const results: ItemSearchResult[] = [];
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
      item: document.item,
      emoji: document.item as SearchableEmoji,
      score:
        confirmedMatches.reduce((total, match) => total + match.score, 0) +
        phraseBoost(document, normalizedQuery),
      matchedTerms: confirmedMatches.map(({ term }) => term),
    });
  });

  results.sort(
    (left, right) =>
      right.score - left.score ||
      left.item.order - right.item.order ||
      left.item.id.localeCompare(right.item.id),
  );

  const keepVariants =
    options.includeVariants === true ||
    queryRequestsVariant(rawQuery, normalizedQuery) ||
    results.some(({ item }) => !isIconItem(item) && getNormalizedCodePoints(item.id) === normalizedQuery);

  const seenFamilies = new Set<string>();
  const filtered = keepVariants
    ? results
    : results.filter(({ item }) => {
        if (isIconItem(item)) return true;
        if (seenFamilies.has(item.familyId)) {
          return false;
        }
        seenFamilies.add(item.familyId);
        return true;
      });

  return filtered.slice(0, options.limit ?? filtered.length);
}

export const searchEmojis = searchItems;

function getNormalizedCodePoints(id: string): string {
  return normalizeSearchText(
    id
      .split('-')
      .map((codePoint) => `U+${codePoint}`)
      .join(' '),
  );
}
