import type { EmojiCatalog, IconCatalog } from '../data/catalog-types';

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

export const iconCatalogFixture: IconCatalog = {
  source: 'test-fixture',
  version: '1.34.0',
  totalCount: 6,
  checksum: 'icon-fixture',
  categories: [
    { id: 'arrows', label: 'Arrows & Navigation', icon: '➔', count: 2 },
    { id: 'communication', label: 'Communication & Social', icon: '💬', count: 1 },
    { id: 'interface', label: 'Interface & Controls', icon: '🔲', count: 1 },
    { id: 'development', label: 'Code & Development', icon: '🛠️', count: 1 },
    { id: 'files', label: 'Files & Documents', icon: '📁', count: 1 },
  ],
  icons: [
    {
      id: 'arrow-right',
      name: 'arrow right',
      kebabName: 'arrow-right',
      pascalName: 'ArrowRight',
      category: 'arrows',
      categoryLabel: 'Arrows & Navigation',
      tags: ['forward', 'next', 'direction', 'east'],
      nodes: [
        ['path', { d: 'M5 12h14' }],
        ['path', { d: 'm12 5 7 7-7 7' }],
      ],
      order: 1,
    },
    {
      id: 'arrow-left',
      name: 'arrow left',
      kebabName: 'arrow-left',
      pascalName: 'ArrowLeft',
      category: 'arrows',
      categoryLabel: 'Arrows & Navigation',
      tags: ['back', 'previous', 'direction', 'west'],
      nodes: [
        ['path', { d: 'm12 19-7-7 7-7' }],
        ['path', { d: 'M19 12H5' }],
      ],
      order: 2,
    },
    {
      id: 'code',
      name: 'code',
      kebabName: 'code',
      pascalName: 'Code',
      category: 'development',
      categoryLabel: 'Code & Development',
      tags: ['developer', 'syntax', 'programming', 'source'],
      nodes: [
        ['polyline', { points: '16 18 22 12 16 6' }],
        ['polyline', { points: '8 6 2 12 8 18' }],
      ],
      order: 3,
    },
    {
      id: 'download',
      name: 'download',
      kebabName: 'download',
      pascalName: 'Download',
      category: 'files',
      categoryLabel: 'Files & Documents',
      tags: ['save', 'export', 'arrow'],
      nodes: [
        ['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }],
        ['polyline', { points: '7 10 12 15 17 10' }],
        ['line', { x1: '12', x2: '12', y1: '15', y2: '3' }],
      ],
      order: 4,
    },
    {
      id: 'heart',
      name: 'heart',
      kebabName: 'heart',
      pascalName: 'Heart',
      category: 'communication',
      categoryLabel: 'Communication & Social',
      tags: ['love', 'like', 'emotion', 'favorite'],
      nodes: [
        ['path', { d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' }],
      ],
      order: 5,
    },
    {
      id: 'settings',
      name: 'settings',
      kebabName: 'settings',
      pascalName: 'Settings',
      category: 'interface',
      categoryLabel: 'Interface & Controls',
      tags: ['gear', 'cog', 'preferences', 'options'],
      nodes: [
        ['path', { d: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' }],
        ['circle', { cx: '12', cy: '12', r: '3' }],
      ],
      order: 6,
    },
  ],
};
