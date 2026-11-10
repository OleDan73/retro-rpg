// Generates the PWA icons in icons/ from a 16x16 pixel-art turnip drawn in the game's palette.
// No dependencies: a tiny PNG encoder using Node's zlib. Run: node tools/make-icons.mjs
import fs from 'fs';
import zlib from 'zlib';

const COLORS = {
  '.': null,       // transparent (shows the icon background)
  k: '#140c1c',    // outline / eyes
  d: '#346524',    // dark leaf
  g: '#6daa2c',    // leaf
  r: '#d04648',    // turnip top
  m: '#854c30',    // turnip top shade
  w: '#deeed6',    // turnip body
  p: '#d2aa99',    // body shade
  h: '#ffffff',    // glint
};
const ART = [
  '................',
  '.....kk...kk....',
  '....kggk.kggk...',
  '....kdggkggdk...',
  '.....kdgggdk....',
  '......kdggk.....',
  '.....kkrrkkk....',
  '....krrhrrrmk...',
  '...krrrrrrrrmk..',
  '...kwwwwwwwwpk..',
  '...kwwkwwwkwpk..',
  '...kwwwwwwwwpk..',
  '....kwwwrwwpk...',
  '.....kwwwwpk....',
  '......kkwpk.....',
  '........kk......',
];
const BG = '#140c1c', RING = '#30346d', RING2 = '#442434';

const hex = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

// size: output px; artScale: fraction of the icon the 16px art covers; ring: draw the game-frame border
function render(size, artScale, ring) {
  const px = new Uint8Array(size * size * 4);
  const set = (x, y, c) => { const i = (y * size + x) * 4; const [r, g, b] = hex(c); px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, BG);
  if (ring) {
    const t = Math.max(2, Math.round(size / 48));
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const e = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (e < t) set(x, y, RING); else if (e < 2 * t) set(x, y, BG); else if (e < 3 * t) set(x, y, RING2);
    }
  }
  const cell = Math.floor((size * artScale) / 16);
  const off = Math.floor((size - cell * 16) / 2);
  ART.forEach((row, y) => [...row].forEach((ch, x) => {
    const c = COLORS[ch];
    if (!c) return;
    for (let yy = 0; yy < cell; yy++) for (let xx = 0; xx < cell; xx++) set(off + x * cell + xx, off + y * cell + yy, c);
  }));
  return px;
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (buf) => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, px) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const out = new URL('../icons/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
const ICONS = [
  ['icon-192.png', 192, 0.75, true],        // purpose "any"
  ['icon-512.png', 512, 0.75, true],
  ['maskable-192.png', 192, 0.5, false],    // purpose "maskable": art kept inside the 80% safe zone
  ['maskable-512.png', 512, 0.5, false],
  ['apple-touch-icon.png', 180, 0.62, false], // iOS rounds the corners itself
  ['favicon-32.png', 32, 1, false],
];
for (const [name, size, scale, ring] of ICONS) {
  fs.writeFileSync(new URL(name, out), png(size, render(size, scale, ring)));
  console.log('wrote icons/' + name);
}
