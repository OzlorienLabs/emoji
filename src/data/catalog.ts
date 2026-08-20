import type {
  EmojiCatalog,
  EmojiFamily,
  EmojiVariant,
  SearchableEmoji,
} from './catalog-types';

function normalizeTerm(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('en')
    .replace(/[_\-:]+/g, ' ')
    .replace(/[^\p{Letter}\p{Number}+]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function expandTerm(value: string): string[] {
  const normalized = normalizeTerm(value);

  if (!normalized) {
    return [];
  }

  return normalized.includes(' ') ? [normalized, ...normalized.split(' ')] : [normalized];
}

function buildSearchTerms(
  family: EmojiFamily,
  emoji: EmojiVariant,
  groupLabel: string,
  subgroupLabel: string,
): string[] {
  const toneLabel = emoji.name.includes(':') ? emoji.name.split(':').at(-1)! : '';
  const values = [
    emoji.glyph,
    emoji.name,
    family.name,
    ...family.keywords,
    ...family.shortcodes,
    ...emoji.shortcodes,
    groupLabel,
    subgroupLabel,
    toneLabel,
    emoji.id,
    getCodePointLabel(emoji.id),
    `emoji ${emoji.version}`,
  ];

  return [...new Set(values.flatMap(expandTerm).concat(emoji.glyph))];
}

export function getCodePointLabel(hexcode: string): string {
  return hexcode
    .split('-')
    .map((codePoint) => `U+${codePoint}`)
    .join(' ');
}

export function flattenCatalog(catalog: EmojiCatalog): SearchableEmoji[] {
  const groups = new Map(catalog.groups.map((group) => [group.id, group.label]));
  const subgroups = new Map(
    catalog.subgroups.map((subgroup) => [subgroup.id, subgroup.label]),
  );

  return catalog.emojis.flatMap((family) => {
    const groupLabel = groups.get(family.group) ?? 'Other';
    const subgroupLabel = subgroups.get(family.subgroup) ?? 'Other';
    const records: EmojiVariant[] = [family, ...family.variants];

    return records.map((emoji) => ({
      ...emoji,
      familyId: family.id,
      group: family.group,
      subgroup: family.subgroup,
      groupLabel,
      subgroupLabel,
      keywords: family.keywords,
      shortcodes: [...new Set([...family.shortcodes, ...emoji.shortcodes])],
      searchTerms: buildSearchTerms(family, emoji, groupLabel, subgroupLabel),
    }));
  }).sort((left, right) => left.order - right.order);
}

export function validateCatalog(catalog: EmojiCatalog): string[] {
  const issues: string[] = [];
  const records = flattenCatalog(catalog);
  const variantCount = catalog.emojis.reduce(
    (total, family) => total + family.variants.length,
    0,
  );
  const addIssue = (condition: boolean, message: string) => {
    if (condition) {
      issues.push(message);
    }
  };

  addIssue(
    catalog.familyCount !== catalog.emojis.length,
    'Family count does not match catalog metadata.',
  );
  addIssue(
    catalog.variantCount !== variantCount,
    'Variant count does not match catalog metadata.',
  );
  addIssue(
    catalog.totalCount !== records.length,
    'Total count does not match catalog metadata.',
  );
  addIssue(
    new Set(records.map(({ id }) => id)).size !== records.length,
    'Emoji IDs must be unique.',
  );
  addIssue(
    new Set(records.map(({ glyph }) => glyph)).size !== records.length,
    'Emoji glyphs must be unique.',
  );
  addIssue(records.some(({ name }) => !name.trim()), 'Every emoji needs a name.');
  addIssue(
    records.some(({ searchTerms }) => searchTerms.length < 3),
    'Every emoji needs at least three search terms.',
  );
  addIssue(
    records.some((record, index) => index > 0 && record.order <= records[index - 1]!.order),
    'Emoji records must follow strict Unicode order.',
  );

  return issues;
}
