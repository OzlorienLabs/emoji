/**
 * Generates an Open Graph social preview card (1200x630 PNG) without external image dependencies.
 * Follows the brand aesthetic of Emoji Compass: aurora glass backdrop, clay accent (#ff6f4d),
 * and the iconic compass mark.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) {
    const start = y * (width * 4 + 1);
    raw[start] = 0;
    pixels.copy(raw, start + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const WIDTH = 1200;
const HEIGHT = 630;
const pixels = Buffer.alloc(WIDTH * HEIGHT * 4);

// Palette
const BG_BASE = [14, 11, 22]; // #0e0b16 deep cosmic twilight
const CLAY = [255, 111, 77];  // #ff6f4d clay accent
const VIOLET = [138, 92, 246]; // aurora violet
const IVORY = [250, 249, 245]; // #faf9f5 brand ivory

// Draw background with subtle glowing aurora orbs
for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    // Distance to left glow (clay/amber near center-left)
    const distClay = Math.hypot(x - 380, y - 315);
    const glowClay = Math.max(0, 1 - distClay / 450);

    // Distance to right glow (aurora violet near center-right)
    const distViolet = Math.hypot(x - 820, y - 280);
    const glowViolet = Math.max(0, 1 - distViolet / 420);

    // Vignette
    const centerDist = Math.hypot((x - 600) / 600, (y - 315) / 315);
    const vignette = Math.max(0.5, 1 - centerDist * 0.45);

    let r = BG_BASE[0] * (1 - glowClay * 0.25 - glowViolet * 0.2) + CLAY[0] * (glowClay * 0.25) + VIOLET[0] * (glowViolet * 0.2);
    let g = BG_BASE[1] * (1 - glowClay * 0.25 - glowViolet * 0.2) + CLAY[1] * (glowClay * 0.25) + VIOLET[1] * (glowViolet * 0.2);
    let b = BG_BASE[2] * (1 - glowClay * 0.25 - glowViolet * 0.2) + CLAY[2] * (glowClay * 0.25) + VIOLET[2] * (glowViolet * 0.2);

    r *= vignette;
    g *= vignette;
    b *= vignette;

    const offset = (y * WIDTH + x) * 4;
    pixels[offset] = Math.min(255, Math.round(r));
    pixels[offset + 1] = Math.min(255, Math.round(g));
    pixels[offset + 2] = Math.min(255, Math.round(b));
    pixels[offset + 3] = 255;
  }
}

// Draw compass emblem centered at (600, 270)
const cx = 600;
const cy = 270;
const markRadius = 110;

for (let y = cy - markRadius - 20; y <= cy + markRadius + 20; y += 1) {
  for (let x = cx - markRadius - 20; x <= cx + markRadius + 20; x += 1) {
    if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) continue;

    const dx = (x - cx) / markRadius;
    const dy = (y - cy) / markRadius;
    const radius = Math.hypot(dx, dy);

    // Outer ring badge background
    if (radius <= 1.05) {
      const offset = (y * WIDTH + x) * 4;
      // Clay circle background
      let pr = CLAY[0];
      let pg = CLAY[1];
      let pb = CLAY[2];

      // Compass Ring
      if (radius <= 0.72 && radius >= 0.60) {
        pr = IVORY[0];
        pg = IVORY[1];
        pb = IVORY[2];
      }

      // Compass Needle: vertical diamond
      if (Math.abs(dx) / 0.22 + Math.abs(dy) / 0.52 <= 1) {
        pr = IVORY[0];
        pg = IVORY[1];
        pb = IVORY[2];
      }

      // Subtle shadow/edge anti-aliasing
      const edgeFade = radius > 1.0 ? (1.05 - radius) / 0.05 : 1.0;
      pixels[offset] = Math.round(pixels[offset] * (1 - edgeFade) + pr * edgeFade);
      pixels[offset + 1] = Math.round(pixels[offset + 1] * (1 - edgeFade) + pg * edgeFade);
      pixels[offset + 2] = Math.round(pixels[offset + 2] * (1 - edgeFade) + pb * edgeFade);
    }
  }
}

// Inner card border frame (glassmorphism outline)
for (let y = 30; y < HEIGHT - 30; y += 1) {
  for (let x = 30; x < WIDTH - 30; x += 1) {
    const onBorder = (x === 30 || x === WIDTH - 31 || y === 30 || y === HEIGHT - 31);
    if (onBorder) {
      const offset = (y * WIDTH + x) * 4;
      pixels[offset] = Math.min(255, pixels[offset] + 35);
      pixels[offset + 1] = Math.min(255, pixels[offset + 1] + 35);
      pixels[offset + 2] = Math.min(255, pixels[offset + 2] + 45);
    }
  }
}

const outputFile = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og-image.png');
writeFileSync(outputFile, encodePng(WIDTH, HEIGHT, pixels));
console.log(`Generated Open Graph image at ${outputFile} (${WIDTH}x${HEIGHT})`);
