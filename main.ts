// main.ts — "The World Today": one image summing up world news of
// Thursday 26 November 2026. Node 22, standard library only.
// Draws a dense newspaper front page (1024x1024) with a tiny built-in
// 5x7 bitmap font, then writes a deterministic PNG to /output/entry.png.
// No network, no clock, no randomness outside a fixed-seed generator,
// so two runs produce byte-identical output.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;
const OUT = (process.env.MAKEFUN_OUTPUT_DIR || "/output") + "/entry.png";

// ---------------------------------------------------------------- canvas
type RGB = [number, number, number];
const img = new Uint8Array(W * H * 3);

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2];
}
function getPx(x: number, y: number): RGB {
  const i = (y * W + x) * 3;
  return [img[i], img[i + 1], img[i + 2]];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) {
      img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; i += 3;
    }
  }
}
function vGrad(x: number, y: number, w: number, h: number, top: RGB, bot: RGB): void {
  for (let yy = 0; yy < h; yy++) {
    const t = h <= 1 ? 0 : yy / (h - 1);
    const c: RGB = [
      Math.round(top[0] + (bot[0] - top[0]) * t),
      Math.round(top[1] + (bot[1] - top[1]) * t),
      Math.round(top[2] + (bot[2] - top[2]) * t),
    ];
    fillRect(x, y + yy, w, 1, c);
  }
}
function hGrad(x: number, y: number, w: number, h: number, left: RGB, right: RGB): void {
  for (let xx = 0; xx < w; xx++) {
    const t = w <= 1 ? 0 : xx / (w - 1);
    const c: RGB = [
      Math.round(left[0] + (right[0] - left[0]) * t),
      Math.round(left[1] + (right[1] - left[1]) * t),
      Math.round(left[2] + (right[2] - left[2]) * t),
    ];
    fillRect(x + xx, y, 1, h, c);
  }
}
function rectBorder(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (let n = 0; n < 4000; n++) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}
function thickLine(x0: number, y0: number, x1: number, y1: number, c: RGB, t: number): void {
  for (let a = -t; a <= t; a++) for (let b = -t; b <= t; b++) {
    if (a * a + b * b <= t * t) line(x0 + a, y0 + b, x1 + a, y1 + b, c);
  }
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
    fillRect(cx - half, cy + y, half * 2 + 1, 1, c);
  }
}
function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let y = -ry; y <= ry; y++) {
    const t = 1 - (y * y) / (ry * ry);
    const half = Math.floor(rx * Math.sqrt(Math.max(0, t)));
    fillRect(cx - half, cy + y, half * 2 + 1, 1, c);
  }
}
function ring(cx: number, cy: number, r: number, c: RGB, t = 2): void {
  for (let a = 0; a < 360; a += 1) {
    const rad = (a * Math.PI) / 180;
    for (let k = 0; k < t; k++) {
      px(Math.round(cx + (r - k) * Math.cos(rad)), Math.round(cy + (r - k) * Math.sin(rad)), c);
    }
  }
}
function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: RGB): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((x1 - x) * (y2 - y) - (y1 - y) * (x2 - x)) / d;
      const b = ((x2 - x) * (y0 - y) - (y2 - y) * (x0 - x)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) px(x, y, c);
    }
  }
}

// Fixed-seed generator: every "random" choice is reproducible.
let seed = 20261126;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = (h ^ (h >> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
// Light paper grain over a region: tiny deterministic speckle that
// keeps flat areas from compressing to almost nothing.
function grain(x: number, y: number, w: number, h: number, amp: number): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const n = Math.floor(hash2(xx, yy) * (amp * 2 + 1)) - amp;
      if (n === 0) continue;
      const i = (yy * W + xx) * 3;
      for (let k = 0; k < 3; k++) {
        const v = img[i + k] + n;
        img[i + k] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph is 7 rows of 5 bits, top row first, bit 4 = leftmost pixel.
// Written out by hand for this image; uppercase letters, digits and
// the punctuation the headlines need.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x02, 0x04, 0x08, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x0e, 0x10, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x01, 0x0e],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "+": [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  $: [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "<": [0x02, 0x04, 0x08, 0x10, 0x08, 0x04, 0x02],
  ">": [0x08, 0x04, 0x02, 0x01, 0x02, 0x04, 0x08],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  "@": [0x0e, 0x11, 0x17, 0x15, 0x16, 0x10, 0x0e],
  "~": [0, 0, 0x0e, 0x15, 0x0e, 0, 0],
};
const CHAR_W = 6; // 5 px glyph + 1 px gap, times scale
function textWidth(s: string, scale: number): number {
  return s.length * CHAR_W * scale - scale;
}
function drawChar(ch: string, x: number, y: number, scale: number, c: RGB): void {
  const g = FONT[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row & (1 << (4 - col))) {
        fillRect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}
function drawText(s: string, x: number, y: number, scale: number, c: RGB): void {
  const up = s.toUpperCase();
  for (let i = 0; i < up.length; i++) {
    drawChar(up[i], x + i * CHAR_W * scale, y, scale, c);
  }
}
function drawTextCentered(s: string, cx: number, y: number, scale: number, c: RGB): void {
  drawText(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c);
}
// Greedy word wrap for a max pixel width; returns the lines.
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur ? cur + " " + w : w;
    if (textWidth(trial, scale) <= maxW || !cur) {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawPara(lines: string[], x: number, y: number, scale: number, c: RGB, lh: number): void {
  for (let i = 0; i < lines.length; i++) {
    drawText(lines[i], x, y + i * lh, scale, c);
  }
}
// Headline with a soft shadow so it reads over busy artwork.
function drawHeadline(s: string, x: number, y: number, scale: number, c: RGB, shadow: RGB): void {
  drawText(s, x + scale, y + scale, scale, shadow);
  drawText(s, x, y, scale, c);
}
function drawHeadlineCentered(s: string, cx: number, y: number, scale: number, c: RGB, shadow: RGB): void {
  drawHeadline(s, cx - Math.floor(textWidth(s, scale) / 2), y, scale, c, shadow);
}

// ---------------------------------------------------------------- palette
const PAPER: RGB = [247, 242, 231];
const INK: RGB = [22, 26, 34];
const NAVY: RGB = [18, 34, 58];
const NAVY2: RGB = [28, 52, 84];
const GOLD: RGB = [212, 175, 88];
const RED: RGB = [178, 44, 38];
const WHITE: RGB = [250, 250, 246];
const SKY: RGB = [52, 74, 104];
const SKY2: RGB = [24, 38, 60];
const CLOUD: RGB = [168, 178, 192];
const GREEN: RGB = [34, 120, 66];
const TEAL: RGB = [16, 110, 118];

// A storm cloud: overlapping grey ellipses with a darker base.
function cloud(cx: number, cy: number, s: number, dark: boolean): void {
  const base: RGB = dark ? [58, 66, 80] : [96, 104, 120];
  const top: RGB = dark ? [88, 96, 112] : [150, 158, 172];
  fillEllipse(cx, cy, 46 * s, 20 * s, base);
  fillEllipse(cx - 30 * s, cy + 4 * s, 30 * s, 15 * s, base);
  fillEllipse(cx + 32 * s, cy + 5 * s, 28 * s, 14 * s, base);
  fillEllipse(cx - 12 * s, cy - 10 * s, 26 * s, 14 * s, top);
  fillEllipse(cx + 14 * s, cy - 8 * s, 22 * s, 12 * s, top);
}
// Diagonal rain streaks inside a rectangle.
function rain(x: number, y: number, w: number, h: number, n: number, c: RGB): void {
  for (let i = 0; i < n; i++) {
    const rx = x + Math.floor(rnd() * w);
    const ry = y + Math.floor(rnd() * h);
    const len = 10 + Math.floor(rnd() * 14);
    line(rx, ry, rx - 4, ry + len, c);
  }
}
// A parade balloon, half-deflated and sagging on the ground.
function saggingBalloon(cx: number, cy: number, s: number, body: RGB, stripe: RGB): void {
  fillEllipse(cx, cy, 52 * s, 26 * s, body);
  fillEllipse(cx - 18 * s, cy - 6 * s, 30 * s, 12 * s, stripe);
  fillEllipse(cx + 22 * s, cy - 2 * s, 18 * s, 9 * s, stripe);
  // wrinkles
  line(cx - 40 * s, cy - 4 * s, cx - 10 * s, cy + 6 * s, stripe);
  line(cx + 5 * s, cy - 8 * s, cx + 30 * s, cy + 4 * s, stripe);
  line(cx - 20 * s, cy + 12 * s, cx + 8 * s, cy + 16 * s, stripe);
  // tethers lying loose
  line(cx - 48 * s, cy + 20 * s, cx - 70 * s, cy + 34 * s, [60, 60, 60]);
  line(cx + 44 * s, cy + 18 * s, cx + 66 * s, cy + 32 * s, [60, 60, 60]);
}
// A small round balloon floating, for contrast with the grounded ones.
function roundBalloon(cx: number, cy: number, r: number, body: RGB): void {
  fillCircle(cx, cy, r, body);
  fillCircle(cx - Math.floor(r * 0.35), cy - Math.floor(r * 0.35), Math.floor(r * 0.45), [255, 255, 255]);
  triangle(cx - 4, cy + r - 2, cx + 4, cy + r - 2, cx, cy + r + 8, body);
  line(cx, cy + r + 8, cx + 2, cy + r + 26, [70, 70, 70]);
}
// Rocket climbing, with flame and smoke puffs.
function rocket(cx: number, cy: number, s: number): void {
  fillRect(cx - 9 * s, cy - 34 * s, 18 * s, 52 * s, WHITE);
  triangle(cx - 9 * s, cy - 34 * s, cx + 9 * s, cy - 34 * s, cx, cy - 52 * s, RED);
  fillRect(cx - 9 * s, cy - 20 * s, 18 * s, 6 * s, RED);
  fillCircle(cx, cy - 8 * s, 5 * s, [120, 200, 235]);
  ring(cx, cy - 8 * s, 5 * s, NAVY, 2);
  triangle(cx - 9 * s, cy + 18 * s, cx - 20 * s, cy + 30 * s, cx - 9 * s, cy + 26 * s, RED);
  triangle(cx + 9 * s, cy + 18 * s, cx + 20 * s, cy + 30 * s, cx + 9 * s, cy + 26 * s, RED);
  triangle(cx - 6 * s, cy + 18 * s, cx + 6 * s, cy + 18 * s, cx, cy + 40 * s, [255, 170, 40]);
  triangle(cx - 3 * s, cy + 18 * s, cx + 3 * s, cy + 18 * s, cx, cy + 30 * s, [255, 230, 120]);
  fillCircle(cx - 24 * s, cy + 44 * s, 8 * s, [210, 210, 205]);
  fillCircle(cx + 22 * s, cy + 48 * s, 6 * s, [210, 210, 205]);
  fillCircle(cx, cy + 52 * s, 5 * s, [210, 210, 205]);
}
// A compact rocket that fits a story panel (about 55 px tall).
function miniRocket(cx: number, cy: number, s: number): void {
  fillRect(cx - 6 * s, cy - 16 * s, 12 * s, 30 * s, WHITE);
  triangle(cx - 6 * s, cy - 16 * s, cx + 6 * s, cy - 16 * s, cx, cy - 28 * s, RED);
  fillRect(cx - 6 * s, cy - 6 * s, 12 * s, 4 * s, RED);
  fillCircle(cx, cy - 2 * s, 3 * s, [120, 200, 235]);
  triangle(cx - 6 * s, cy + 14 * s, cx - 13 * s, cy + 20 * s, cx - 6 * s, cy + 18 * s, RED);
  triangle(cx + 6 * s, cy + 14 * s, cx + 13 * s, cy + 20 * s, cx + 6 * s, cy + 18 * s, RED);
  triangle(cx - 4 * s, cy + 14 * s, cx + 4 * s, cy + 14 * s, cx, cy + 27 * s, [255, 170, 40]);
  fillCircle(cx - 15 * s, cy + 26 * s, 4 * s, [210, 210, 205]);
  fillCircle(cx + 14 * s, cy + 28 * s, 3 * s, [210, 210, 205]);
}
// Cratered planet (Mercury) with a small probe dot and orbit ring.
function mercury(cx: number, cy: number, r: number): void {
  fillCircle(cx, cy, r, [176, 152, 128]);
  fillCircle(cx - Math.floor(r * 0.3), cy - Math.floor(r * 0.3), Math.floor(r * 0.7), [196, 172, 148]);
  const craters: [number, number, number][] = [
    [-0.35, 0.1, 0.16], [0.25, -0.35, 0.13], [0.4, 0.25, 0.18],
    [-0.05, 0.45, 0.11], [0.1, 0.05, 0.09], [-0.5, -0.4, 0.1],
  ];
  for (const [dx, dy, dr] of craters) {
    fillCircle(cx + Math.floor(dx * r), cy + Math.floor(dy * r), Math.max(2, Math.floor(dr * r)), [140, 118, 96]);
  }
  // orbit ellipse (drawn as a ring of dots)
  for (let a = 0; a < 360; a += 4) {
    const rad = (a * Math.PI) / 180;
    px(Math.round(cx + (r + 16) * Math.cos(rad)), Math.round(cy + (r + 16) * 0.42 * Math.sin(rad)), GOLD);
  }
  fillCircle(cx + r + 16, cy, 4, GOLD); // probe on the ring
}
// A computer chip.
function chip(cx: number, cy: number, s: number): void {
  const w = 44 * s, h = 44 * s;
  for (let i = 0; i < 5; i++) {
    fillRect(cx - w / 2 - 10 * s, cy - h / 2 + i * 11 * s, 10 * s, 4 * s, GOLD);
    fillRect(cx + w / 2, cy - h / 2 + i * 11 * s, 10 * s, 4 * s, GOLD);
    fillRect(cx - w / 2 + i * 11 * s, cy - h / 2 - 10 * s, 4 * s, 10 * s, GOLD);
    fillRect(cx - w / 2 + i * 11 * s, cy + h / 2, 4 * s, 10 * s, GOLD);
  }
  fillRect(cx - w / 2, cy - h / 2, w, h, [16, 90, 50]);
  rectBorder(cx - w / 2, cy - h / 2, w, h, [8, 50, 28], 3);
  fillRect(cx - w / 4, cy - h / 4, w / 2, h / 2, [120, 200, 90]);
  drawText("AI", cx - 11 * s, cy - 7 * s, s, INK);
}
// A small airliner seen from the side: slim fuselage, nose, tail fin,
// swept wing and a row of windows.
function plane(cx: number, cy: number, s: number, c: RGB): void {
  fillEllipse(cx, cy, 44 * s, 7 * s, c);
  triangle(cx + 40 * s, cy - 6 * s, cx + 52 * s, cy, cx + 40 * s, cy + 6 * s, c);
  triangle(cx - 38 * s, cy - 4 * s, cx - 30 * s, cy - 20 * s, cx - 24 * s, cy - 4 * s, c);
  triangle(cx - 6 * s, cy + 4 * s, cx + 6 * s, cy + 18 * s, cx + 14 * s, cy + 4 * s, c);
  triangle(cx - 34 * s, cy + 4 * s, cx - 28 * s, cy + 12 * s, cx - 22 * s, cy + 4 * s, c);
  for (let i = 0; i < 5; i++) {
    fillRect(cx - 20 * s + i * 8 * s, cy - 4 * s, 4 * s, 3 * s, [140, 200, 235]);
  }
}
// A white dove carrying an olive branch: slim body, raised narrow wing.
function dove(cx: number, cy: number, s: number): void {
  fillEllipse(cx, cy, 22 * s, 8 * s, WHITE);
  triangle(cx - 20 * s, cy - 2 * s, cx - 36 * s, cy - 10 * s, cx - 34 * s, cy + 2 * s, WHITE);
  triangle(cx - 20 * s, cy + 2 * s, cx - 36 * s, cy + 4 * s, cx - 32 * s, cy + 8 * s, WHITE);
  fillCircle(cx + 20 * s, cy - 7 * s, 7 * s, WHITE);
  triangle(cx + 26 * s, cy - 9 * s, cx + 34 * s, cy - 6 * s, cx + 26 * s, cy - 4 * s, [240, 180, 60]);
  fillCircle(cx + 22 * s, cy - 9 * s, 2, INK);
  triangle(cx - 8 * s, cy - 4 * s, cx + 2 * s, cy - 26 * s, cx + 8 * s, cy - 4 * s, [235, 235, 230]);
  line(cx - 4 * s, cy + 12 * s, cx + 16 * s, cy + 20 * s, GREEN);
  fillEllipse(cx + 4 * s, cy + 16 * s, 4 * s, 2 * s, GREEN);
  fillEllipse(cx + 12 * s, cy + 19 * s, 4 * s, 2 * s, GREEN);
}
// Indian flag: saffron, white with chakra, green.
function indiaFlag(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h / 3, [255, 153, 51]);
  fillRect(x, y + h / 3, w, h / 3, WHITE);
  fillRect(x, y + (2 * h) / 3, w, h / 3, [19, 136, 8]);
  const cx = x + w / 2, cy = y + h / 2, r = h / 6;
  ring(cx, cy, r, NAVY, 2);
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    line(cx, cy, Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), NAVY);
  }
  fillCircle(cx, cy, 2, NAVY);
  rectBorder(x, y, w, h, INK, 1);
}
// Chess board corner with a pawn.
function chessPanel(x: number, y: number, s: number): void {
  const sq = 13 * s;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      fillRect(x + c * sq, y + r * sq, sq, sq, (r + c) % 2 === 0 ? WHITE : INK);
    }
  }
  rectBorder(x, y, 4 * sq, 4 * sq, GOLD, 2);
  fillCircle(x + 2 * sq, y + 2 * sq - 4, 7 * s, [200, 40, 40]);
  fillRect(x + 2 * sq - 8 * s, y + 2 * sq + 2, 16 * s, 4 * s, [200, 40, 40]);
}
// Football (soccer ball) with pentagon patches.
function football(cx: number, cy: number, r: number): void {
  fillCircle(cx, cy, r, WHITE);
  ring(cx, cy, r, INK, 2);
  const pent = (px0: number, py0: number, pr: number): void => {
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 72 * Math.PI) / 180 - Math.PI / 2;
      const a2 = ((i + 1) * 72 * Math.PI) / 180 - Math.PI / 2;
      line(Math.round(px0 + pr * Math.cos(a1)), Math.round(py0 + pr * Math.sin(a1)),
        Math.round(px0 + pr * Math.cos(a2)), Math.round(py0 + pr * Math.sin(a2)), INK);
    }
    fillCircle(px0, py0, Math.floor(pr * 0.5), INK);
  };
  pent(cx, cy, Math.floor(r * 0.45));
  pent(cx - Math.floor(r * 0.75), cy - Math.floor(r * 0.55), Math.floor(r * 0.3));
  pent(cx + Math.floor(r * 0.7), cy + Math.floor(r * 0.6), Math.floor(r * 0.3));
}
// Storm wave for the coast panel.
function wave(x: number, y: number, w: number, amp: number, c: RGB): void {
  for (let xx = 0; xx < w; xx++) {
    const yy = y + Math.round(amp * Math.sin((xx / w) * Math.PI * 3));
    fillRect(x + xx, yy, 1, 5, c);
  }
}

// ---------------------------------------------------------------- layout
const M = 14; // outer margin
const CW = W - 2 * M; // content width = 996

function kicker(x: number, y: number, s: string, c: RGB, scale: number): void {
  drawText(s, x, y, scale, c);
}

// ---- masthead -----------------------------------------------------------
function masthead(): void {
  fillRect(M, M, CW, 104, NAVY);
  rectBorder(M, M, CW, 104, GOLD, 3);
  fillRect(M + 6, M + 96, CW - 12, 2, GOLD);
  drawTextCentered("THE WORLD TODAY", W / 2, M + 12, 6, WHITE);
  drawTextCentered("THURSDAY 26 NOVEMBER 2026", W / 2, M + 62, 3, GOLD);
  drawText("ONE DAY", M + 16, M + 16, 2, [150, 170, 200]);
  drawText("MAKE.FUN", W - M - 16 - textWidth("MAKE.FUN", 2), M + 16, 2, [150, 170, 200]);
  drawText("VOL. 1 - NO. 14", M + 16, M + 78, 2, [150, 170, 200]);
  drawText("PRICE: ONE DAY", W - M - 16 - textWidth("PRICE: ONE DAY", 2), M + 78, 2, [150, 170, 200]);
}

// ---- lead story: Macy's parade postponed --------------------------------
function lead(): void {
  const x = M, y = 128, w = CW, h = 324;
  vGrad(x, y, w, 208, SKY, SKY2);
  grain(x, y, w, 208, 3);
  // storm clouds
  cloud(x + 140, y + 40, 1, true);
  cloud(x + 880, y + 48, 2, true);
  cloud(x + 330, y + 100, 1, false);
  // rain
  rain(x + 8, y + 70, w - 16, 120, 130, [190, 205, 225]);
  // lightning, right of the headline
  thickLine(x + 770, y + 8, x + 762, y + 46, [255, 240, 140], 2);
  thickLine(x + 762, y + 46, x + 774, y + 46, [255, 240, 140], 2);
  thickLine(x + 774, y + 46, x + 758, y + 86, [255, 240, 140], 2);
  // a lone balloon still up, left of the headline
  roundBalloon(x + 120, y + 150, 16, [240, 200, 60]);
  // street band
  fillRect(x, y + 208, w, 44, [38, 40, 46]);
  fillRect(x, y + 208, w, 3, GOLD);
  for (let i = 0; i < 12; i++) {
    fillRect(x + 30 + i * 84, y + 234, 44, 4, [220, 190, 90]);
  }
  // grounded balloons on the street
  saggingBalloon(x + 830, y + 218, 1, [200, 60, 55], [150, 35, 35]);
  saggingBalloon(x + 620, y + 218, 1, [60, 120, 200], [35, 80, 160]);
  // a lone umbrella, blown sideways
  line(x + 430, y + 216, x + 448, y + 250, [30, 30, 34]);
  fillEllipse(x + 439, y + 216, 26, 12, RED);
  line(x + 439, y + 216, x + 413, y + 224, [30, 30, 34]);

  // headline block, over the sky
  drawHeadlineCentered("MACY'S PARADE", W / 2, y + 24, 6, WHITE, [10, 16, 28]);
  drawHeadlineCentered("POSTPONED", W / 2, y + 72, 6, GOLD, [10, 16, 28]);
  drawTextCentered("FIRST DELAY IN 100 YEARS", W / 2, y + 120, 3, [255, 230, 150]);

  // body strip, paper white
  fillRect(x, y + 252, w, 72, [250, 248, 240]);
  const body = [
    "NOR'EASTER SLAMS NEW YORK ON THANKSGIVING - WINDS 25-40 MPH,",
    "GUSTS TO 65 MPH. BALLOONS DEFLATED WEDNESDAY NIGHT AS THE",
    "100TH PARADE MOVES TO SATURDAY 28 NOV, 8:30 AM ET. NBC AIRS",
    "LAST YEAR'S PARADE INSTEAD. ONLY WORLD WAR II EVER STOPPED IT.",
  ];
  drawPara(body, x + 24, y + 260, 2, INK, 16);
  rectBorder(x, y, w, h, INK, 2);
}

// ---- story panel helper -------------------------------------------------
function panel(x: number, y: number, w: number, h: number, fill: RGB, tag: string, tagBg: RGB): void {
  fillRect(x, y, w, h, fill);
  rectBorder(x, y, w, h, INK, 2);
  fillRect(x + 2, y + 2, textWidth(tag, 2) + 16, 24, tagBg);
  drawText(tag, x + 10, y + 8, 2, WHITE);
  grain(x + 2, y + 28, w - 4, h - 30, 3);
}
function panelHead(x: number, y: number, w: number, lines: string[], c: RGB): void {
  drawPara(lines, x, y, 3, c, 26);
}
function panelBody(x: number, y: number, w: number, text: string, c: RGB): void {
  const ls = wrap(text, w, 2);
  drawPara(ls, x, y, 2, c, 19);
}

// ---- row 2: tech + space --------------------------------------------------
function row2(): void {
  const y = 462, h = 226, gap = 10;
  const w = Math.floor((CW - 2 * gap) / 3);
  const x0 = M, x1 = M + w + gap, x2 = M + 2 * (w + gap);

  // NVIDIA
  panel(x0, y, w, h, [14, 46, 30], "TECH", [16, 90, 50]);
  chip(x0 + 70, y + 118, 1);
  panelHead(x0 + 14, y + 34, w - 28, ["HUANG BACK AS", "NVIDIA CEO"], WHITE);
  panelBody(x0 + 14, y + 158, w - 28,
    "HUANG RETURNS AFTER 11 DAYS AWAY. SHARES ROSE 31.5% ON MONDAY.", [215, 230, 215]);

  // Shenzhou-24
  panel(x1, y, w, h, [10, 16, 34], "SPACE", [40, 70, 140]);
  for (let i = 0; i < 40; i++) {
    const sx = x1 + 8 + Math.floor(rnd() * (w - 16));
    const sy = y + 30 + Math.floor(rnd() * 90);
    px(sx, sy, [220, 220, 200]);
    if (i % 5 === 0) px(sx + 1, sy, [220, 220, 200]);
  }
  miniRocket(x1 + w - 70, y + 118, 1);
  panelHead(x1 + 14, y + 34, w - 28, ["SHENZHOU-24", "LAUNCHES"], WHITE);
  panelBody(x1 + 14, y + 158, w - 28,
    "PAKISTAN'S FIRST ASTRONAUT REACHES TIANGONG ON SHENZHOU-24.", [205, 215, 235]);

  // BepiColombo
  panel(x2, y, w, h, [40, 26, 18], "SPACE", [150, 90, 30]);
  mercury(x2 + w - 64, y + 122, 26);
  panelHead(x2 + 14, y + 34, w - 28, ["BEPICOLOMBO", "REACHES MERCURY"], WHITE);
  panelBody(x2 + 14, y + 158, w - 28,
    "ESA-JAXA PROBE ENTERS MERCURY ORBIT AFTER AN 8-YEAR VOYAGE.", [235, 220, 200]);
}

// ---- row 3: travel, peace, India -----------------------------------------
function row3(): void {
  const y = 698, h = 226, gap = 10;
  const w = Math.floor((CW - 2 * gap) / 3);
  const x0 = M, x1 = M + w + gap, x2 = M + 2 * (w + gap);

  // Thanksgiving travel
  panel(x0, y, w, h, [52, 52, 66], "USA", [120, 60, 60]);
  plane(x0 + 90, y + 124, 2, [235, 235, 230]);
  wave(x0 + 8, y + 142, w - 16, 5, [140, 200, 235]);
  wave(x0 + 8, y + 152, w - 16, 5, [110, 170, 215]);
  panelHead(x0 + 14, y + 34, w - 28, ["81.5M TRAVEL", "FOR THANKSGIVING"], WHITE);
  panelBody(x0 + 14, y + 158, w - 28,
    "RECORD HOLIDAY TRAVEL MEETS THE STORM: KING TIDES, SNOW IN ST. LOUIS.", [225, 225, 230]);

  // Colombia peace
  panel(x1, y, w, h, [24, 60, 44], "LATIN AMERICA", [24, 90, 60]);
  dove(x1 + w - 80, y + 114, 1);
  panelHead(x1 + 14, y + 34, w - 28, ["COLOMBIA: 10", "YEARS OF PEACE"], WHITE);
  panelBody(x1 + 14, y + 158, w - 28,
    "A DECADE ON, THE UN WARNS PEACE PROMISES ARE UNFINISHED.", [215, 235, 220]);

  // India
  panel(x2, y, w, h, [250, 246, 238], "INDIA", [200, 90, 30]);
  indiaFlag(x2 + w - 108, y + 88, 92, 56);
  panelHead(x2 + 14, y + 34, w - 28, ["INDIA MARKS", "CONSTITUTION DAY"], INK);
  panelBody(x2 + 14, y + 158, w - 28,
    "INDIA URGES HUMAN CONTROL OF MILITARY AI.", [40, 40, 40]);
}

// ---- bottom ticker: more of the day ---------------------------------------
function ticker(): void {
  const y = 934, h = 76;
  fillRect(M, y, CW, h, INK);
  rectBorder(M, y, CW, h, GOLD, 2);
  drawText("ALSO TODAY", M + 14, y + 10, 2, GOLD);
  const line1 = "CHESS: GUKESH v SINDAROV  -  REAL MADRID ROUT PSV  -  BANGLADESH PAY UP 36%";
  const line2 = "AUSTRALIA INFLATION 4.9%  -  TURKEYS PARDONED  -  RUSSIA TOLL NEARS 500,000";
  drawText(line1, M + 14, y + 32, 2, WHITE);
  drawText(line2, M + 14, y + 52, 2, [200, 205, 215]);
}

// ---------------------------------------------------------------- PNG out
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(img.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- main
function main(): void {
  fillRect(0, 0, W, H, PAPER);
  grain(0, 0, W, H, 4);
  masthead();
  lead();
  row2();
  row3();
  ticker();
  rectBorder(6, 6, W - 12, H - 12, INK, 2);
  const png = encodePng();
  mkdirSync(process.env.MAKEFUN_OUTPUT_DIR || "/output", { recursive: true });
  writeFileSync(OUT, png);
  console.log(`wrote ${OUT} (${png.length} bytes)`);
}
main();
