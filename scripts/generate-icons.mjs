/**
 * Generates the PWA icon set as PNGs with no image dependencies.
 *
 * The mark is an original compass rose: an ivory ring and needle on the clay
 * accent, drawn with 4x4 supersampling for smooth edges. Everything stays
 * inside the maskable safe zone (a circle of 80% of the icon's width), so one
 * file can serve both the "any" and "maskable" purposes.
 *
 * Run with `npm run generate:icons`. Output is committed, so a normal build
 * never has to redraw it.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const CLAY = [0xd9, 0x77, 0x57];
const IVORY = [0xfa, 0xf9, 0xf5];

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

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // truecolour with alpha
  // Each scanline is prefixed with filter type 0 (none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    const start = y * (size * 4 + 1);
    raw[start] = 0;
    pixels.copy(raw, start + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Signed distance-ish coverage of the compass mark at a unit-space point. */
function markCoverage(x, y) {
  const radius = Math.hypot(x, y);
  // Ring.
  if (radius <= 0.36 && radius >= 0.3) return true;
  // Needle: a vertical diamond, so it reads as a compass at 16px.
  if (Math.abs(x) / 0.11 + Math.abs(y) / 0.26 <= 1) return true;
  return false;
}

function drawIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const samples = 4;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const unitX = (x + (sx + 0.5) / samples) / size - 0.5;
          const unitY = (y + (sy + 0.5) / samples) / size - 0.5;
          if (markCoverage(unitX, unitY)) hits += 1;
        }
      }

      const coverage = hits / (samples * samples);
      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        pixels[offset + channel] = Math.round(
          CLAY[channel] * (1 - coverage) + IVORY[channel] * coverage,
        );
      }
      pixels[offset + 3] = 255;
    }
  }

  return encodePng(size, pixels);
}

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
for (const size of [180, 192, 512]) {
  const file = resolve(publicDir, `icon-${size}.png`);
  writeFileSync(file, drawIcon(size));
  console.log(`Wrote ${file}`);
}
