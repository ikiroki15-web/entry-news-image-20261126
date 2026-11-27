// THE WORLD TODAY — front page of Thursday 26 November 2026.
// Drawn from scratch in pure Node 22 (standard library only): a 5x7 bitmap
// font, a small vector canvas, and a hand-rolled PNG encoder (zlib + CRC32).
// No network, no dependencies, fully deterministic: two runs write the
// same bytes. Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------- 5x7 bitmap font ----------
// Each glyph: 7 rows, each row a 5-bit number (bit 4 = leftmost pixel).
const FONT: Record<string, number[]> = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [4, 4, 4, 4, 4, 0, 4],
  '"': [10, 10, 10, 0, 0, 0, 0],
  '#': [10, 10, 31, 10, 31, 10, 10],
  '$': [4, 15, 20, 14, 5, 30, 4],
  '%': [25, 26, 2, 4, 8, 11, 19],
  '&': [12, 18, 20, 8, 21, 18, 13],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],
  '*': [0, 4, 21, 14, 21, 4, 0],
  '+': [0, 4, 4, 31, 4, 4, 0],
  ',': [0, 0, 0, 0, 4, 4, 8],
  '-': [0, 0, 0, 14, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 12, 12],
  '/': [1, 2, 2, 4, 8, 8, 16],
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 6, 8, 16, 31],
  '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  ':': [0, 12, 12, 0, 12, 12, 0],
  ';': [0, 12, 12, 0, 12, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2],
  '=': [0, 0, 31, 0, 31, 0, 0],
  '>': [8, 4, 2, 1, 2, 4, 8],
  '?': [14, 17, 1, 6, 4, 0, 4],
  '@': [14, 17, 23, 21, 22, 16, 14],
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  '[': [14, 8, 8, 8, 8, 8, 14],
  '\\': [16, 8, 8, 4, 2, 2, 1],
  ']': [14, 2, 2, 2, 2, 2, 14],
  '^': [4, 10, 17, 0, 0, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 31],
  '`': [8, 4, 2, 0, 0, 0, 0],
  a: [0, 0, 14, 1, 15, 17, 15],
  b: [16, 16, 30, 17, 17, 17, 30],
  c: [0, 0, 14, 16, 16, 17, 14],
  d: [1, 1, 15, 17, 17, 17, 15],
  e: [0, 0, 14, 17, 31, 16, 14],
  f: [6, 9, 8, 30, 8, 8, 8],
  g: [0, 15, 17, 17, 15, 1, 14],
  h: [16, 16, 30, 17, 17, 17, 17],
  i: [4, 0, 12, 4, 4, 4, 14],
  j: [2, 0, 6, 2, 2, 2, 12],
  k: [16, 16, 18, 20, 24, 20, 18],
  l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 21, 21],
  n: [0, 0, 30, 17, 17, 17, 17],
  o: [0, 0, 14, 17, 17, 17, 14],
  p: [0, 0, 30, 17, 17, 30, 16],
  q: [0, 0, 15, 17, 17, 15, 1],
  r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30],
  t: [8, 8, 28, 8, 8, 9, 6],
  u: [0, 0, 17, 17, 17, 19, 13],
  v: [0, 0, 17, 17, 17, 10, 4],
  w: [0, 0, 17, 21, 21, 21, 10],
  x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 15, 1, 14],
  z: [0, 0, 31, 2, 4, 8, 31],
  '{': [2, 4, 4, 12, 4, 4, 2],
  '|': [4, 4, 4, 4, 4, 4, 4],
  '}': [8, 4, 4, 6, 4, 4, 8],
  '~': [0, 0, 9, 22, 0, 0, 0],
  '·': [0, 0, 0, 12, 12, 0, 0],
  '•': [0, 0, 12, 12, 12, 0, 0],
  '–': [0, 0, 0, 14, 0, 0, 0],
  '—': [0, 0, 0, 31, 0, 0, 0],
  '’': [4, 4, 8, 0, 0, 0, 0],
  '“': [10, 10, 4, 0, 0, 0, 0],
  '”': [10, 10, 4, 0, 0, 0, 0],
};

// ---------- canvas ----------
const px = new Uint8Array(W * H * 3);
type RGB = [number, number, number];
const PAPER: RGB = [247, 242, 231];
const INK: RGB = [22, 22, 22];
const RED: RGB = [178, 32, 44];
const BLUE: RGB = [26, 58, 107];
const GREY: RGB = [90, 86, 78];
const LIGHT: RGB = [233, 226, 210];
const SKY: RGB = [176, 203, 224];
const CLOUD: RGB = [120, 140, 165];
const GOLD: RGB = [196, 148, 44];

function fill(r: number, g: number, b: number): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = r; px[i * 3 + 1] = g; px[i * 3 + 2] = b;
  }
}
function setPix(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setPix(i, j, c);
}
function hline(x: number, y: number, w: number, c: RGB, t = 1): void { rect(x, y, w, t, c); }
function vline(x: number, y: number, h: number, c: RGB, t = 1): void { rect(x, y, t, h, c); }
function box(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
  hline(x, y, w, c, t); hline(x, y + h - t, w, c, t);
  vline(x, y, h, c, t); vline(x + w - t, y, h, c, t);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    rect(x - ((t - 1) >> 1), y - ((t - 1) >> 1), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}
function circle(cx: number, cy: number, r: number, c: RGB, filled = true): void {
  for (let y = -r; y <= r; y++) {
    const span = Math.floor(Math.sqrt(r * r - y * y));
    if (filled) { for (let x = -span; x <= span; x++) setPix(cx + x, cy + y, c); }
    else {
      setPix(cx - span, cy + y, c); setPix(cx + span, cy + y, c);
      setPix(cx + y, cy - span, c); setPix(cx + y, cy + span, c);
    }
  }
}
function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    if (t < 0) continue;
    const span = Math.floor(rx * Math.sqrt(t));
    for (let x = -span; x <= span; x++) setPix(cx + x, cy + y, c);
  }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges: [number, number, number, number][] = [[x0, y0, x1, y1], [x1, y1, x2, y2], [x2, y2, x0, y0]];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
    }
    if (xs.length >= 2) {
      const a = Math.min(...xs), b = Math.max(...xs);
      for (let x = Math.ceil(a); x <= Math.floor(b); x++) setPix(x, y, c);
    }
  }
}

// ---------- text ----------
function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(s: string, x: number, y: number, scale: number, c: RGB, bold = false): void {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT[' '];
    for (let gy = 0; gy < 7; gy++) {
      const row = g[gy];
      for (let gx = 0; gx < 5; gx++) {
        if (row & (16 >> gx)) {
          rect(cx + gx * scale, y + gy * scale, scale, scale, c);
          if (bold) rect(cx + gx * scale + 1, y + gy * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawTextC(s: string, cx: number, y: number, scale: number, c: RGB, bold = false): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c, bold);
}
// Wrap text to lines that fit maxW pixels at the given scale.
function wrap(s: string, scale: number, maxW: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textWidth(t, scale) <= maxW || !cur) cur = t;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function para(s: string, x: number, y: number, scale: number, maxW: number, c: RGB, lh?: number): number {
  const lines = wrap(s, scale, maxW);
  const step = lh ?? (7 * scale + 4);
  lines.forEach((ln, i) => drawText(ln, x, y + i * step, scale, c));
  return y + lines.length * step;
}

// ---------- PNG encoder (deterministic) ----------
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- small pictogram icons (drawn in a 46x36 tile) ----------
function iconTile(x: number, y: number, bg: RGB): void { rect(x, y, 46, 36, bg); }
function iconBank(x: number, y: number): void { // ECB / central bank
  iconTile(x, y, BLUE);
  tri(x + 6, y + 9, x + 40, y + 9, x + 23, y + 3, [255, 255, 255]);
  rect(x + 8, y + 11, 30, 3, [255, 255, 255]);
  for (let i = 0; i < 4; i++) rect(x + 9 + i * 8, y + 15, 4, 13, [255, 255, 255]);
  rect(x + 7, y + 29, 32, 3, [255, 255, 255]);
}
function iconBallot(x: number, y: number): void { // elections
  iconTile(x, y, RED);
  rect(x + 10, y + 12, 26, 18, [255, 255, 255]);
  rect(x + 18, y + 8, 10, 4, [255, 255, 255]);
  line(x + 15, y + 21, x + 20, y + 26, INK, 2);
  line(x + 20, y + 26, x + 31, y + 15, INK, 2);
}
function iconTanker(x: number, y: number): void { // oil tanker / Hormuz
  iconTile(x, y, [40, 90, 120]);
  tri(x + 6, y + 24, x + 40, y + 24, x + 40, y + 14, [255, 255, 255]);
  rect(x + 6, y + 18, 34, 6, [255, 255, 255]);
  rect(x + 12, y + 10, 6, 8, [255, 255, 255]);
  rect(x + 22, y + 12, 5, 6, [255, 255, 255]);
  line(x + 4, y + 29, x + 42, y + 29, [255, 255, 255], 2);
  line(x + 8, y + 33, x + 38, y + 33, [255, 255, 255], 2);
}
function iconFlame(x: number, y: number): void { // fire / refinery blast
  iconTile(x, y, [200, 90, 20]);
  tri(x + 23, y + 4, x + 14, y + 22, x + 32, y + 22, [255, 210, 60]);
  tri(x + 23, y + 12, x + 16, y + 30, x + 30, y + 30, [255, 255, 255]);
  rect(x + 8, y + 30, 30, 3, [255, 255, 255]);
}
function iconMissile(x: number, y: number): void { // Ukraine strikes
  iconTile(x, y, [70, 70, 74]);
  tri(x + 34, y + 8, x + 42, y + 18, x + 34, y + 28, [255, 255, 255]);
  rect(x + 10, y + 14, 24, 8, [255, 255, 255]);
  tri(x + 10, y + 14, x + 4, y + 10, x + 4, y + 18, [255, 180, 60]);
  tri(x + 10, y + 22, x + 4, y + 18, x + 4, y + 26, [255, 180, 60]);
  circle(x + 30, y + 18, 3, RED);
}
function iconRadar(x: number, y: number): void { // NATO AWACS
  iconTile(x, y, [30, 110, 70]);
  circle(x + 23, y + 18, 13, [255, 255, 255], false);
  circle(x + 23, y + 18, 8, [255, 255, 255], false);
  line(x + 23, y + 18, x + 34, y + 8, [255, 255, 255], 2);
  circle(x + 23, y + 18, 2, [255, 255, 255]);
}
function iconStar(x: number, y: number): void { // North Korea
  iconTile(x, y, [120, 30, 40]);
  const cx = x + 23, cy = y + 18, r = 12;
  const pts: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    const a2 = a + Math.PI / 5;
    pts.push([cx + (r * 0.45) * Math.cos(a2), cy + (r * 0.45) * Math.sin(a2)]);
  }
  for (let i = 0; i < 10; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 10];
    line(Math.round(ax), Math.round(ay), Math.round(bx), Math.round(by), [255, 210, 60], 2);
  }
  circle(cx, cy, 4, [255, 210, 60]);
}
function iconBars(x: number, y: number): void { // tariffs / trade
  iconTile(x, y, GOLD);
  rect(x + 8, y + 22, 6, 9, [255, 255, 255]);
  rect(x + 17, y + 16, 6, 15, [255, 255, 255]);
  rect(x + 26, y + 10, 6, 21, [255, 255, 255]);
  rect(x + 35, y + 5, 6, 26, INK);
  line(x + 6, y + 31, x + 40, y + 31, [255, 255, 255], 2);
}
function iconPick(x: number, y: number): void { // mine
  iconTile(x, y, [90, 70, 40]);
  line(x + 10, y + 28, x + 36, y + 8, [255, 255, 255], 3);
  line(x + 36, y + 28, x + 10, y + 8, [255, 255, 255], 3);
  circle(x + 23, y + 18, 4, [255, 210, 60]);
}
function iconGlobe(x: number, y: number): void { // world / Gaza talks
  iconTile(x, y, [30, 100, 140]);
  circle(x + 23, y + 18, 13, [255, 255, 255], false);
  ellipse(x + 23, y + 18, 6, 13, [255, 255, 255]);
  hline(x + 10, y + 18, 26, [255, 255, 255], 1);
  circle(x + 18, y + 13, 3, [255, 255, 255]);
  circle(x + 29, y + 23, 3, [255, 255, 255]);
}

// ---------- story block ----------
// Draws icon + headline + deck inside column x..x+w, returns y after block.
function story(x: number, y: number, w: number, icon: (x: number, y: number) => void,
  kicker: string, head: string, deck: string, kc: RGB): number {
  icon(x, y);
  drawText(kicker, x + 54, y + 2, 1, kc, true);
  const headLines = wrap(head, 2, w - 54);
  let hy = y + 13;
  for (const ln of headLines) { drawText(ln, x + 54, hy, 2, INK, true); hy += 17; }
  const dy = Math.max(y + 38, hy + 1);
  const end = para(deck, x, dy, 2, w, [40, 40, 40], 16);
  return end + 4;
}
function sectionHead(x: number, y: number, w: number, label: string, c: RGB): number {
  rect(x, y, w, 22, c);
  drawText(label, x + 8, y + 4, 2, [255, 255, 255], true);
  return y + 30;
}

// ---------- lead illustration: parade balloon in the storm ----------
function leadArt(x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, SKY);
  // distant skyline
  rect(x, y + h - 58, w, 58, [96, 104, 122]);
  for (let i = 0; i < 9; i++) {
    const bx = x + 8 + i * 38;
    const bh = 26 + ((i * 37) % 30);
    rect(bx, y + h - 58 - bh + 26, 30, bh, [70, 78, 96]);
    for (let wy = 0; wy < 3; wy++) for (let wx = 0; wx < 2; wx++)
      rect(bx + 6 + wx * 12, y + h - 58 - bh + 34 + wy * 10, 5, 6, [255, 220, 120]);
  }
  // rain clouds
  circle(x + 60, y + 26, 26, CLOUD);
  circle(x + 96, y + 18, 30, CLOUD);
  circle(x + 140, y + 28, 24, CLOUD);
  rect(x + 40, y + 22, 120, 22, CLOUD);
  circle(x + 268, y + 30, 22, CLOUD);
  circle(x + 300, y + 22, 26, CLOUD);
  rect(x + 250, y + 26, 80, 20, CLOUD);
  // rain streaks
  for (let i = 0; i < 46; i++) {
    const rx = x + 12 + ((i * 53) % (w - 24));
    const ry = y + 60 + ((i * 97) % (h - 130));
    line(rx, ry, rx - 5, ry + 16, [220, 232, 244], 2);
  }
  // big parade balloon (round, red, with a smile) held low by ropes
  const bx = x + Math.floor(w * 0.52), by = y + 118;
  ellipse(bx, by, 78, 62, RED);
  ellipse(bx, by - 8, 60, 44, [205, 60, 70]);
  circle(bx - 26, by - 6, 7, INK);
  circle(bx + 26, by - 6, 7, INK);
  for (let i = -1; i <= 1; i++) {
    const mx = bx + i * 12;
    line(mx, by + 22, mx - 6, by + 44, [255, 255, 255], 3);
  }
  // ropes down to handlers
  line(bx - 44, by + 44, bx - 58, y + h - 62, INK, 2);
  line(bx + 44, by + 44, bx + 58, y + h - 62, INK, 2);
  // "100" badge
  circle(x + 52, y + 118, 34, GOLD);
  circle(x + 52, y + 118, 28, [255, 255, 255], false);
  drawText('100', x + 52 - 18, y + 118 - 7, 2, INK, true);
  // caption strip
  rect(x, y + h - 34, w, 34, INK);
  drawText('Balloons deflated as the storm closed in on New York.', x + 10, y + h - 24, 1, [255, 255, 255]);
  box(x, y, w, h, INK, 2);
}

// ---------- layout ----------
function factBox(x: number, y: number, w: number, big: string, l1: string, l2: string): void {
  box(x, y, w, 54, INK, 1);
  drawText(big, x + 10, y + 6, 3, RED, true);
  drawText(l1, x + 10, y + 31, 1, INK, true);
  drawText(l2, x + 10, y + 42, 1, GREY);
}

function main(): void {
  fill(PAPER[0], PAPER[1], PAPER[2]);
  box(8, 8, W - 16, H - 16, INK, 2);

  // top bar
  drawText('WORLD EDITION', 20, 20, 1, INK, true);
  const tr = 'ALL STORIES FIRST REPORTED 26 NOV 2026';
  drawText(tr, W - 20 - textWidth(tr, 1), 20, 1, INK, true);
  hline(20, 32, W - 40, INK, 1);

  // masthead
  drawTextC('THE WORLD TODAY', W / 2, 40, 8, INK, true);
  drawTextC('THURSDAY, 26 NOVEMBER 2026 — THE DAY’S WORLD NEWS IN ONE PAGE', W / 2, 102, 2, INK, true);
  hline(20, 124, W - 40, INK, 3);
  hline(20, 130, W - 40, INK, 1);

  // ---- lead: Macy's parade ----
  const LY = 140;
  drawText('NEW YORK · THANKSGIVING', 20, LY, 2, RED, true);
  drawText('MACY’S 100TH PARADE', 20, LY + 26, 5, INK, true);
  drawText('MOVED TO SATURDAY', 20, LY + 69, 5, INK, true);
  para('A powerful East Coast storm forces the first postponement in the parade’s 100-year history. Balloons were deflated on Wednesday; the 100th march will now step off at 8:30 a.m. on Saturday, Nov. 28, and NBC will air a repeat of the 2025 parade on Thursday.',
    20, LY + 118, 2, 620, [40, 40, 40], 18);
  factBox(20, LY + 220, 200, '100', 'YEARS — FIRST', 'POSTPONEMENT EVER');
  factBox(230, LY + 220, 200, '8:30', 'A.M. SATURDAY', 'NEW START TIME');
  factBox(440, LY + 220, 200, '97 KM/H', 'FORECAST GUSTS', 'IN NEW YORK');
  leadArt(664, LY, 340, 274);

  // storm strip
  para('THE STORM: Nearly 900,000 lose power across the East Coast; more than 2,000 flights delayed; New York declares a state of emergency.',
    20, LY + 288, 2, W - 40, RED, 18);
  hline(20, LY + 330, W - 40, INK, 2);

  // ---- middle grid: three columns ----
  const GY = LY + 336;
  const CW = 312;
  const colX = [20, 352, 684];

  // column 1 — EUROPE
  let y1 = sectionHead(colX[0], GY, CW, 'EUROPE', BLUE);
  y1 = story(colX[0], y1, CW, iconBank, 'EUROPE · FRANKFURT', 'DE COS CHOSEN TO LEAD THE ECB',
    'Eurozone leaders pick Spain’s ex-central bank chief Pablo Hernandez de Cos as the next ECB president.', BLUE);
  y1 = story(colX[0], y1, CW, iconBallot, 'SPAIN · MADRID', 'SPAIN TO VOTE ON SUNDAY',
    'Pedro Sanchez calls a snap election for Sunday, Nov. 29 — eight months early — after defeats over housing laws.', RED);
  y1 = story(colX[0], y1, CW, iconStar, 'NORTH KOREA · PYONGYANG', 'KIM VOWS MORE NUCLEAR ARMS',
    'North Korea’s leader says its nuclear status is “absolutely inviolable” and orders wider deployment of tactical weapons.', [120, 30, 40]);

  // column 2 — MIDDLE EAST
  let y2 = sectionHead(colX[1], GY, CW, 'MIDDLE EAST', RED);
  y2 = story(colX[1], y2, CW, iconTanker, 'GULF · STRAIT OF HORMUZ', 'TANKERS HIT BY MINES',
    'Iran’s Revolutionary Guards say two oil tankers exploded and caught fire after hitting sea mines near Oman’s Khasab port.', [40, 90, 120]);
  y2 = story(colX[1], y2, CW, iconFlame, 'SAUDI ARABIA · JAZAN', 'STRIKE ON REFINERY KILLS ONE',
    'A Houthi projectile hits the Jazan refinery; Britain sanctions the Houthis as attacks on Saudi ports grow.', [200, 90, 20]);
  y2 = story(colX[1], y2, CW, iconGlobe, 'GAZA · CEASEFIRE UNDER STRAIN', 'GAZA STRIKES KILL 8',
    'Israeli strikes hit Deir al-Balah for a third straight night as the minister threatens to displace one million Palestinians.', [30, 100, 140]);

  // column 3 — WAR & ASIA, then IN BRIEF
  let y3 = sectionHead(colX[2], GY, CW, 'WAR & ASIA', [70, 70, 74]);
  y3 = story(colX[2], y3, CW, iconMissile, 'UKRAINE · KYIV', 'RUSSIAN STRIKES KILL 3',
    'Missiles and 113 drones hit Kyiv and Kharkiv overnight; a shopping centre is struck in the capital.', [70, 70, 74]);
  y3 = story(colX[2], y3, CW, iconRadar, 'POLAND · NATO', 'NATO RADAR WATCHES POLAND',
    'NATO sends an AWACS radar plane to watch Polish airspace after three Russian cruise missiles crashed there on Nov. 20.', [30, 110, 70]);
  y3 += 2;
  drawText('IN BRIEF', colX[2], y3, 2, RED, true);
  y3 += 18;
  const briefs = [
    'Guinea-Bissau junta delays elections to 2028, two years on.',
    'Cairo tanker fire kills 31 on the Ring Road in Giza.',
    '13 dead as rain floods an illegal gold mine in Bogor.',
  ];
  for (const b of briefs) {
    drawText('•', colX[2], y3, 2, RED, true);
    y3 = para(b, colX[2] + 16, y3, 2, CW - 16, [40, 40, 40], 16);
    y3 += 3;
  }

  const bottom = Math.max(y1, y2, y3) + 8;
  hline(20, bottom, W - 40, INK, 2);

  // ---- also today ticker ----
  let ty = bottom + 10;
  drawText('ALSO TODAY: NFL — Bears 39, Lions 35 · Eagles 39, Cowboys 38', 20, ty, 2, INK, true);
  ty += 18;
  drawText('US tariffs hit 14 partners · Depardieu to stand trial · Bangkok blast injures 7', 20, ty, 2, INK);
  hline(20, ty + 20, W - 40, INK, 1);
  drawTextC('THE WORLD TODAY · THURSDAY 26 NOVEMBER 2026 · DRAWN FROM WIRE REPORTS', W / 2, ty + 26, 1, GREY);
}

main();
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), encodePNG());
