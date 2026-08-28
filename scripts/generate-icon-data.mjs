import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import iconNodes from 'lucide-static/icon-nodes.json' with { type: 'json' };
import tags from 'lucide-static/tags.json' with { type: 'json' };
import { ICON_TAG_OVERLAYS } from './icon-tag-overlays.mjs';

const SOURCE_VERSION = '1.34.0';
const OUTPUT_PATH = resolve('public/data/icons-1.34.json');

const ICON_CATEGORIES = [
  {
    id: 'arrows',
    label: 'Arrows & Navigation',
    icon: '➔',
    match: /(arrow|chevron|corner|move|navigation|compass|locate|route|undo|redo|replace|shrink|expand|maximize|minimize|step|skip|pointer|crosshair|wind|turn|trending)/i,
  },
  {
    id: 'communication',
    label: 'Communication & Social',
    icon: '💬',
    match: /(mail|message|chat|phone|send|inbox|share|at-sign|rss|megaphone|bell|contact|podcast|speech|thumbs|award|heart|smile|frown|user|users|person|group|social|handshake|vote|announcement)/i,
  },
  {
    id: 'media',
    label: 'Media & Audio',
    icon: '🎵',
    match: /(play|pause|stop|volume|music|video|camera|mic|image|film|disc|tv|speaker|cast|headphones|radio|equalizer|clapper|audio|sound|airplay|aperture|album|visual|captions|projector|forward|rewind)/i,
  },
  {
    id: 'devices',
    label: 'Devices & Hardware',
    icon: '💻',
    match: /(laptop|monitor|screen|phone|smartphone|tablet|cpu|hard-drive|keyboard|mouse|printer|server|battery|bluetooth|wifi|plug|cable|usb|watch|database|router|tv|display|hardware|chip|circuit|power|socket|antenna)/i,
  },
  {
    id: 'files',
    label: 'Files & Documents',
    icon: '📁',
    match: /(file|folder|archive|clipboard|copy|save|sheet|document|paperclip|book|bookmark|library|newspaper|notebook|table|case|contract|page|receipt|presentation|scroll|diff)/i,
  },
  {
    id: 'interface',
    label: 'Interface & Controls',
    icon: '🔲',
    match: /(menu|grid|list|sliders|settings|filter|search|check|x|plus|minus|slash|trash|loader|eye|help|info|alert|toggle|lock|unlock|key|layers|layout|sidebar|zoom|more|dots|circle|square|shield|flag|gauge|clock|timer|history|bookmark|pin|link|unlink|sort|cursor|grab)/i,
  },
  {
    id: 'design',
    label: 'Design & Editing',
    icon: '🎨',
    match: /(palette|pen|brush|edit|type|font|bold|italic|underline|align|crop|scissors|vector|ruler|wand|sparkles|dropper|eraser|highlighter|paint|splat|stamp|shape|blend|contrast|swatch|scale|canvas)/i,
  },
  {
    id: 'commerce',
    label: 'Commerce & Finance',
    icon: '💳',
    match: /(cart|bag|shopping|credit-card|wallet|dollar|euro|pound|bitcoin|coins|bank|receipt|tag|percent|badge-percent|calculator|store|gem|package|box|truck|price|money|finance|gift|vault|currency|barcode|qr-code)/i,
  },
  {
    id: 'weather',
    label: 'Weather & Nature',
    icon: '⛅',
    match: /(sun|moon|cloud|rain|snow|wind|umbrella|thermometer|flame|fire|zap|leaf|tree|flower|droplet|sunset|sunrise|rainbow|haze|tornado|waves|sprout|nature|eco|plant|tree|clover|globe|earth)/i,
  },
  {
    id: 'development',
    label: 'Code & Development',
    icon: '🛠️',
    match: /(code|terminal|git|branch|commit|pull-request|merge|bug|binary|brackets|regex|variable|webhook|workflow|box-select|container|command|console|fork|function|lambda|api|sitemap|database|webhook)/i,
  },
  {
    id: 'travel',
    label: 'Travel & Places',
    icon: '🚀',
    match: /(plane|car|bus|train|ship|bike|rocket|map|pin|landmark|hotel|tent|mountain|fuel|parking|luggage|ticket|flight|anchor|ferry|navigation|signpost|traffic)/i,
  },
  {
    id: 'health',
    label: 'Health & Lifestyle',
    icon: '🧬',
    match: /(activity|heart-pulse|pill|stethoscope|syringe|thermometer|dna|flask|atom|microscope|virus|hospital|cross|brain|apple|medical|bio|shield-alert|bandage|accessibility|dumbbell|weight|biceps)/i,
  },
  {
    id: 'food',
    label: 'Food & Beverage',
    icon: '🍔',
    match: /(banana|beer|beef|bean|bottle|cake|candy|carrot|coffee|cookie|cup|cup-soda|dessert|drink|egg|fish|fork|fruit|glass|grape|ice-cream|knife|lollipop|milk|nut|pizza|popcorn|salad|sandwich|soup|spoon|utensils|wine)/i,
  },
  {
    id: 'shapes',
    label: 'Shapes & Symbols',
    icon: '✦',
    match: /(shape|star|sparkle|triangle|diamond|hexagon|pentagon|octagon|badge|circle|square|asterisk|hash|infinity|cross|slash|shield|heart|gem)/i,
  },
  {
    id: 'objects',
    label: 'Objects & Home',
    icon: '💡',
    match: /.*/i,
  },
];

const categoryMap = new Map(ICON_CATEGORIES.map((cat) => [cat.id, cat]));

function categorizeIcon(name, iconTags) {
  const allText = [name, ...(iconTags || [])].join(' ');
  for (const cat of ICON_CATEGORIES) {
    if (cat.match.test(name) || cat.match.test(allText)) {
      return cat;
    }
  }
  return categoryMap.get('objects');
}

function toPascalCase(value) {
  return value
    .split('-')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : ''))
    .join('');
}

const sortedNames = Object.keys(iconNodes).sort((a, b) => a.localeCompare(b));

const icons = sortedNames.map((name, index) => {
  const baseTags = tags[name] ?? [];
  const category = categorizeIcon(name, baseTags);
  const overlay = ICON_TAG_OVERLAYS[name] ?? [];
  const iconTags = [...new Set([...baseTags, ...overlay])];
  const words = name.replace(/-/g, ' ');
  const pascalName = toPascalCase(name);

  return {
    id: name,
    name: words,
    kebabName: name,
    pascalName,
    category: category.id,
    categoryLabel: category.label,
    tags: iconTags,
    nodes: iconNodes[name],
    order: index + 1,
  };
});

const categories = ICON_CATEGORIES.map(({ id, label, icon }) => ({
  id,
  label,
  icon,
  count: icons.filter((item) => item.category === id).length,
})).filter((cat) => cat.count > 0);

const totalCount = icons.length;
const payload = {
  source: `lucide-static@${SOURCE_VERSION}`,
  version: SOURCE_VERSION,
  totalCount,
  categories,
  icons,
};

const checksum = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
const catalog = { ...payload, checksum };

if (totalCount !== 1777) {
  throw new Error(`Icon data integrity failed: expected 1777 icons, got ${totalCount}.`);
}

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(catalog)}\n`, 'utf8');

console.log(
  `Generated ${catalog.totalCount} Lucide icons across ${catalog.categories.length} categories (${checksum.slice(0, 12)}…).`,
);
