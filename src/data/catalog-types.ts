export type SkinTone = 1 | 2 | 3 | 4 | 5;
export type EmojiTone = SkinTone | readonly SkinTone[];
export type EmojiSize = 'small' | 'medium' | 'large';
export type EmojiStyle = 'native' | 'text';

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
  familyId: string;
  group: number;
  subgroup: number;
  groupLabel: string;
  subgroupLabel: string;
  keywords: readonly string[];
  shortcodes: readonly string[];
  searchTerms: readonly string[];
}
