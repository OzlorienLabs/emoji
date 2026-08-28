import type {
  EmojiCatalog,
  EmojiFamily,
  EmojiVariant,
  IconCatalog,
  IconRecord,
  SearchableEmoji,
  SearchableIcon,
} from './catalog-types';

export const EMPTY_ICON_CATALOG: IconCatalog = Object.freeze({
  source: 'empty',
  version: '1.34.0',
  totalCount: 0,
  checksum: '',
  categories: [],
  icons: [],
});

export const EMPTY_EMOJI_CATALOG: EmojiCatalog = Object.freeze({
  source: 'empty',
  emojiVersion: '17.0',
  cldrVersion: '48',
  locale: 'en',
  checksum: '',
  familyCount: 0,
  variantCount: 0,
  totalCount: 0,
  groups: [],
  subgroups: [],
  emojis: [],
});

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
      kind: 'emoji' as const,
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

function buildIconSearchTerms(icon: IconRecord): string[] {
  const values = [
    icon.name,
    icon.kebabName,
    icon.pascalName,
    icon.category,
    icon.categoryLabel,
    ...icon.tags,
    `icon ${icon.name}`,
  ];

  return [...new Set(values.flatMap(expandTerm))];
}

export function flattenIconCatalog(catalog: IconCatalog): SearchableIcon[] {
  return catalog.icons
    .map((icon) => ({
      ...icon,
      kind: 'icon' as const,
      searchTerms: buildIconSearchTerms(icon),
    }))
    .sort((left, right) => left.order - right.order);
}

export function validateIconCatalog(catalog: IconCatalog): string[] {
  const issues: string[] = [];
  const addIssue = (condition: boolean, message: string) => {
    if (condition) {
      issues.push(message);
    }
  };

  addIssue(
    catalog.totalCount !== catalog.icons.length,
    'Total count does not match icons list length.',
  );
  addIssue(
    new Set(catalog.icons.map(({ id }) => id)).size !== catalog.icons.length,
    'Icon IDs must be unique.',
  );
  addIssue(catalog.icons.some(({ name }) => !name.trim()), 'Every icon needs a name.');
  addIssue(
    catalog.icons.some(({ nodes }) => !nodes || nodes.length === 0),
    'Every icon needs at least one SVG node.',
  );
  addIssue(
    catalog.icons.some((record, index) => index > 0 && record.order <= catalog.icons[index - 1]!.order),
    'Icon records must follow strict numerical order.',
  );

  return issues;
}

export function getIconSvg(
  icon: IconRecord,
  options: { size?: number | string; strokeWidth?: number | string } = {},
): string {
  const size = options.size ?? 24;
  const strokeWidth = options.strokeWidth ?? 2;
  const innerNodes = icon.nodes
    .map(([tag, attrs]) => {
      const attributes = Object.entries(attrs)
        .map(([key, val]) => `${key}="${val}"`)
        .join(' ');
      return `<${tag} ${attributes} />`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${innerNodes}</svg>`;
}

export function getIconJsx(
  icon: IconRecord,
  options: { size?: number | string; strokeWidth?: number | string } = {},
): string {
  const size = options.size ? ` size={${options.size}}` : '';
  const strokeWidth = options.strokeWidth ? ` strokeWidth={${options.strokeWidth}}` : '';
  return `<${icon.pascalName}${size}${strokeWidth} />`;
}

export function getIconHtml(icon: IconRecord): string {
  return `<i data-lucide="${icon.kebabName}"></i>`;
}
