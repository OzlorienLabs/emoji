import type { EmojiCatalog } from '../data/catalog-types';

export const catalogFixture: EmojiCatalog = {
  source: 'test-fixture',
  emojiVersion: '17.0',
  cldrVersion: '48',
  locale: 'en',
  checksum: 'fixture',
  familyCount: 6,
  variantCount: 3,
  totalCount: 9,
  groups: [
    { id: 0, key: 'smileys-emotion', label: 'Smileys & emotion' },
    { id: 1, key: 'people-body', label: 'People & body' },
    { id: 3, key: 'animals-nature', label: 'Animals & nature' },
    { id: 6, key: 'activities', label: 'Activities' },
    { id: 7, key: 'objects', label: 'Objects' },
  ],
  subgroups: [
    { id: 0, key: 'face-smiling', label: 'Smiling', group: 0 },
    { id: 1, key: 'face-affection', label: 'Affectionate', group: 0 },
    { id: 30, key: 'person-role', label: 'Person role', group: 1 },
    { id: 31, key: 'person-activity', label: 'Person activity', group: 1 },
    { id: 40, key: 'cat-face', label: 'Cat face', group: 3 },
    { id: 60, key: 'event', label: 'Event', group: 6 },
    { id: 70, key: 'emotion', label: 'Emotion', group: 7 },
  ],
  emojis: [
    {
      id: '1F600', glyph: '😀', name: 'grinning face', order: 1, version: 1,
      shortcodes: ['grinning'], group: 0, subgroup: 0,
      keywords: ['happy', 'smile', 'joy'], variants: [],
    },
    {
      id: '1F63B', glyph: '😻', name: 'smiling cat with heart-eyes', order: 2, version: 0.6,
      shortcodes: ['heart_eyes_cat'], group: 3, subgroup: 40,
      keywords: ['cat', 'love', 'heart', 'happy'], variants: [],
    },
    {
      id: '1F469-200D-1F4BB', glyph: '👩‍💻', name: 'woman technologist', order: 3, version: 4,
      shortcodes: ['woman_technologist'], group: 1, subgroup: 30,
      keywords: ['coder', 'developer', 'computer', 'work'],
      variants: [
        {
          id: '1F469-1F3FF-200D-1F4BB', glyph: '👩🏿‍💻',
          name: 'woman technologist: dark skin tone', order: 4, version: 4,
          tone: 5, shortcodes: ['woman_technologist_tone5'],
        },
      ],
    },
    {
      id: '1F483', glyph: '💃', name: 'woman dancing', order: 5, version: 0.6,
      shortcodes: ['dancer'], group: 1, subgroup: 31,
      keywords: ['dance', 'happy', 'party'],
      variants: [
        {
          id: '1F483-1F3FF', glyph: '💃🏿', name: 'woman dancing: dark skin tone',
          order: 6, version: 1, tone: 5, shortcodes: ['dancer_tone5'],
        },
      ],
    },
    {
      id: '1F499', glyph: '💙', textGlyph: '💙︎', name: 'blue heart', order: 7, version: 0.6,
      shortcodes: ['blue_heart'], group: 7, subgroup: 70,
      keywords: ['blue', 'heart', 'love', 'affection'], variants: [],
    },
    {
      id: '1F389', glyph: '🎉', name: 'party popper', order: 8, version: 0.6,
      shortcodes: ['tada'], group: 6, subgroup: 60,
      keywords: ['party', 'celebration', 'congratulations'],
      variants: [
        {
          id: '1F389-FE0F', glyph: '🎉️', name: 'party popper fully qualified',
          order: 9, version: 0.6, shortcodes: ['party_popper'],
        },
      ],
    },
  ],
};
