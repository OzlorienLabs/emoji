import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import data from 'emojibase-data/en/data.json' with { type: 'json' };
import messages from 'emojibase-data/en/messages.json' with { type: 'json' };
import groupMetadata from 'emojibase-data/meta/groups.json' with { type: 'json' };
import shortcodes from 'emojibase-data/en/shortcodes/emojibase.json' with { type: 'json' };
import { EMOJI_KEYWORD_OVERLAYS } from './emoji-keyword-overlays.mjs';

const SOURCE_VERSION = '17.0.0';
const OUTPUT_PATH = resolve('public/data/emoji-en-17.0.json');

function sentenceCase(value) {
  return value ? `${value[0].toLocaleUpperCase('en')}${value.slice(1)}` : value;
}

function shortcodeList(hexcode) {
  const value = shortcodes[hexcode];
  return value ? (Array.isArray(value) ? value : [value]) : [];
}

function transformVariant(source) {
  return {
    id: source.hexcode,
    glyph: source.emoji,
    ...(source.text ? { textGlyph: source.text } : {}),
    name: source.label,
    order: source.order,
    version: source.version,
    ...(source.tone ? { tone: source.tone } : {}),
    shortcodes: shortcodeList(source.hexcode),
  };
}

const groupMessages = new Map(messages.groups.map((item) => [item.key, item.message]));
const subgroupMessages = new Map(
  messages.subgroups.map((item) => [item.key, item.message]),
);

const groups = Object.entries(groupMetadata.groups).map(([id, key]) => ({
  id: Number(id),
  key,
  label: sentenceCase(groupMessages.get(key) ?? key.replaceAll('-', ' ')),
}));

const subgroupToGroup = new Map(
  Object.entries(groupMetadata.hierarchy).flatMap(([group, subgroupIds]) =>
    subgroupIds.map((subgroup) => [subgroup, Number(group)]),
  ),
);

const subgroups = Object.entries(groupMetadata.subgroups).map(([id, key]) => ({
  id: Number(id),
  key,
  label: sentenceCase(subgroupMessages.get(key) ?? key.replaceAll('-', ' ')),
  group: subgroupToGroup.get(Number(id)),
}));

const emojis = data
  .filter((source) => Number.isFinite(source.order))
  .sort((left, right) => left.order - right.order)
  .map((source) => ({
    ...transformVariant(source),
    group: source.group,
    subgroup: source.subgroup,
    keywords: [
      ...new Set([...(source.tags ?? []), ...(EMOJI_KEYWORD_OVERLAYS[source.hexcode] ?? [])]),
    ],
    variants: (source.skins ?? [])
      .filter((variant) => Number.isFinite(variant.order))
      .sort((left, right) => left.order - right.order)
      .map(transformVariant),
  }));

const familyCount = emojis.length;
const variantCount = emojis.reduce((total, emoji) => total + emoji.variants.length, 0);
const payload = {
  source: `emojibase-data@${SOURCE_VERSION}`,
  emojiVersion: '17.0',
  cldrVersion: '48',
  locale: 'en',
  familyCount,
  variantCount,
  totalCount: familyCount + variantCount,
  groups,
  subgroups,
  emojis,
};
const checksum = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const catalog = { ...payload, checksum };

if (familyCount !== 1923 || variantCount !== 2030 || catalog.totalCount !== 3953) {
  throw new Error(
    `Emoji data integrity failed: ${familyCount} families + ${variantCount} variants = ${catalog.totalCount}.`,
  );
}

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog)}\n`, 'utf8');

console.log(
  `Generated ${catalog.totalCount} Emoji ${catalog.emojiVersion} records (${checksum.slice(0, 12)}…).`,
);
