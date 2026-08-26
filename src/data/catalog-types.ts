export type SkinTone = 1 | 2 | 3 | 4 | 5;
export type EmojiTone = SkinTone | readonly SkinTone[];
export type EmojiSize = 'small' | 'medium' | 'large';
export type EmojiStyle = 'native' | 'text';
export type ContentType = 'all' | 'emoji' | 'icon';
export type IconCopyFormat = 'svg' | 'jsx' | 'name' | 'html';

export interface EmojiVariant {
  id: string;
  glyph: string;
  textGlyph?: string;
  name: string;
  order: number;
  version: number;
  tone?: EmojiTone;
  shortcodes: readonly string[];
}

export interface EmojiFamily extends EmojiVariant {
  group: number;
  subgroup: number;
  keywords: readonly string[];
  variants: readonly EmojiVariant[];
}

export interface EmojiGroup {
  id: number;
  key: string;
  label: string;
}

export interface EmojiSubgroup {
  id: number;
  key: string;
  label: string;
  group: number;
}

export interface EmojiCatalog {
  source: string;
  emojiVersion: string;
  cldrVersion: string;
  locale: string;
  checksum: string;
  familyCount: number;
  variantCount: number;
  totalCount: number;
  groups: readonly EmojiGroup[];
  subgroups: readonly EmojiSubgroup[];
  emojis: readonly EmojiFamily[];
}

export interface SearchableEmoji extends EmojiVariant {
  kind?: 'emoji';
  familyId: string;
  group: number;
  subgroup: number;
  groupLabel: string;
  subgroupLabel: string;
  keywords: readonly string[];
  shortcodes: readonly string[];
  searchTerms: readonly string[];
}

export type IconNode = readonly [string, Readonly<Record<string, string>>];

export interface IconRecord {
  id: string;
  name: string;
  kebabName: string;
  pascalName: string;
  category: string;
  categoryLabel: string;
  tags: readonly string[];
  nodes: readonly IconNode[];
  order: number;
}

export interface IconCategory {
  id: string;
  label: string;
  icon: string;
  count?: number;
}

export interface IconCatalog {
  source: string;
  version: string;
  totalCount: number;
  checksum: string;
  categories: readonly IconCategory[];
  icons: readonly IconRecord[];
}

export interface SearchableIcon extends IconRecord {
  kind: 'icon';
  searchTerms: readonly string[];
}

export type SearchableItem = SearchableEmoji | SearchableIcon;
export type CatalogItem = EmojiFamily | SearchableEmoji | IconRecord | SearchableIcon;
