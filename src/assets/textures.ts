/**
 * Procedurally generated wall textures.
 *
 * Each texture is rendered once to an offscreen canvas, then packed into a
 * Uint32Array (one packed RGBA value per pixel) for fast per-column sampling
 * by the raycaster. No external image files are required.
 */

import { TEXTURE_SIZE } from '../constants';
import { WALL } from '../map/mapData';

export interface Texture {
  size: number;
  /** size*size packed pixels. Byte order matches canvas ImageData (RGBA LE). */
  pixels: Uint32Array;
}

export type TextureSet = Map<number, Texture>;

function makeCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to acquire 2D context for texture generation');
  return { canvas, ctx };
}

function pack(ctx: CanvasRenderingContext2D, size: number): Texture {
  const img = ctx.getImageData(0, 0, size, size);
  // The underlying buffer is RGBA bytes; a Uint32 view matches our packing.
  const pixels = new Uint32Array(img.data.buffer.slice(0));
  return { size, pixels };
}

/** Deterministic value noise helper for subtle texture grain. */
function grain(ctx: CanvasRenderingContext2D, size: number, amount: number, alpha: number): void {
  for (let i = 0; i < size * size * 0.5; i++) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const v = (Math.random() - 0.5) * amount;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${(Math.abs(v) / 255) * alpha})`;
    ctx.fillRect(x, y, 1, 1);
  }
}

function fill(ctx: CanvasRenderingContext2D, size: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
}

// --- Individual texture painters --------------------------------------------

function paintDolerite(ctx: CanvasRenderingContext2D, s: number, arch: boolean): void {
  fill(ctx, s, '#2b2d33');
  // Hewn basalt blocks.
  ctx.strokeStyle = '#16181c';
  ctx.lineWidth = 2;
  const bh = s / 4;
  for (let row = 0; row < 4; row++) {
    const yoff = row * bh;
    const offset = row % 2 === 0 ? 0 : s / 4;
    for (let bx = -1; bx < 4; bx++) {
      const x = bx * (s / 2) + offset;
      ctx.fillStyle = row % 2 === 0 ? '#33363d' : '#2f3137';
      ctx.fillRect(x + 1, yoff + 1, s / 2 - 2, bh - 2);
      ctx.strokeRect(x + 1, yoff + 1, s / 2 - 2, bh - 2);
    }
  }
  if (arch) {
    ctx.strokeStyle = '#4a4d55';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(s / 2, s, s / 2.4, Math.PI, 2 * Math.PI);
    ctx.stroke();
  }
  grain(ctx, s, 90, 0.5);
}

function paintPlaster(ctx: CanvasRenderingContext2D, s: number, wainscot: boolean, sconce: boolean): void {
  fill(ctx, s, '#d9cfb0');
  grain(ctx, s, 40, 0.4);
  if (wainscot) {
    // Dark wood wainscoting on lower third.
    ctx.fillStyle = '#5a3d28';
    ctx.fillRect(0, s * 0.62, s, s * 0.38);
    ctx.strokeStyle = '#3d2817';
    ctx.lineWidth = 2;
    for (let x = 0; x < s; x += s / 4) {
      ctx.strokeRect(x + 2, s * 0.62 + 2, s / 4 - 4, s * 0.38 - 4);
    }
    ctx.fillStyle = '#6b4a30';
    ctx.fillRect(0, s * 0.6, s, 4);
  }
  if (sconce) {
    // Brass wall sconce.
    ctx.fillStyle = '#b8902f';
    ctx.fillRect(s / 2 - 3, s * 0.25, 6, s * 0.2);
    ctx.beginPath();
    ctx.fillStyle = '#ffe28a';
    ctx.arc(s / 2, s * 0.25, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintCommitteeDoor(ctx: CanvasRenderingContext2D, s: number): void {
  fill(ctx, s, '#4a2f1c');
  ctx.fillStyle = '#5e3d24';
  ctx.fillRect(s * 0.12, s * 0.06, s * 0.76, s * 0.88);
  ctx.strokeStyle = '#2e1c10';
  ctx.lineWidth = 3;
  // Two panels.
  ctx.strokeRect(s * 0.2, s * 0.14, s * 0.6, s * 0.32);
  ctx.strokeRect(s * 0.2, s * 0.52, s * 0.6, s * 0.32);
  // Brass handle.
  ctx.fillStyle = '#d8b24a';
  ctx.beginPath();
  ctx.arc(s * 0.74, s * 0.5, 4, 0, Math.PI * 2);
  ctx.fill();
  grain(ctx, s, 50, 0.3);
}

function paintWindowVolcano(ctx: CanvasRenderingContext2D, s: number): void {
  // Sky.
  const sky = ctx.createLinearGradient(0, 0, 0, s);
  sky.addColorStop(0, '#3a4a66');
  sky.addColorStop(1, '#9a8c7a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, s, s);
  // Distant volcano (the recurring background gag).
  ctx.fillStyle = '#2a2622';
  ctx.beginPath();
  ctx.moveTo(s * 0.2, s * 0.85);
  ctx.lineTo(s * 0.5, s * 0.35);
  ctx.lineTo(s * 0.8, s * 0.85);
  ctx.closePath();
  ctx.fill();
  // Lava glow + plume.
  ctx.fillStyle = '#e2562a';
  ctx.beginPath();
  ctx.moveTo(s * 0.42, s * 0.4);
  ctx.lineTo(s * 0.5, s * 0.28);
  ctx.lineTo(s * 0.58, s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(80,70,70,0.7)';
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.22, s * 0.12, 0, Math.PI * 2);
  ctx.fill();
  // Window frame mullions.
  ctx.strokeStyle = '#3a2c1c';
  ctx.lineWidth = 5;
  ctx.strokeRect(2, 2, s - 4, s - 4);
  ctx.beginPath();
  ctx.moveTo(s / 2, 0);
  ctx.lineTo(s / 2, s);
  ctx.moveTo(0, s / 2);
  ctx.lineTo(s, s / 2);
  ctx.stroke();
}

function paintPortrait(ctx: CanvasRenderingContext2D, s: number): void {
  paintPlaster(ctx, s, false, false);
  // Gilded frame.
  ctx.fillStyle = '#c9a13b';
  ctx.fillRect(s * 0.22, s * 0.16, s * 0.56, s * 0.62);
  ctx.fillStyle = '#7a8a9a';
  ctx.fillRect(s * 0.27, s * 0.21, s * 0.46, s * 0.52);
  // A vague, anonymous official silhouette (no identifiable person).
  ctx.fillStyle = '#3c4654';
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.42, s * 0.1, 0, Math.PI * 2); // head
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(s * 0.32, s * 0.72);
  ctx.quadraticCurveTo(s * 0.5, s * 0.5, s * 0.68, s * 0.72);
  ctx.closePath();
  ctx.fill();
}

function paintBookshelf(ctx: CanvasRenderingContext2D, s: number): void {
  fill(ctx, s, '#3a2718');
  const shelfH = s / 4;
  for (let row = 0; row < 4; row++) {
    const y = row * shelfH;
    // Books of assorted muted colors.
    let x = 4;
    const colors = ['#6b3030', '#30506b', '#5a5a30', '#46306b', '#306b4a'];
    while (x < s - 6) {
      const w = 6 + Math.floor(Math.random() * 8);
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillRect(x, y + 4, w, shelfH - 8);
      x += w + 2;
    }
    ctx.fillStyle = '#1f140c';
    ctx.fillRect(0, y + shelfH - 3, s, 3);
  }
}

function paintCarpet(ctx: CanvasRenderingContext2D, s: number): void {
  fill(ctx, s, '#23467a');
  ctx.strokeStyle = '#2f5896';
  ctx.lineWidth = 2;
  for (let i = 0; i < s; i += 8) {
    ctx.strokeRect(i, i, s - 2 * i, s - 2 * i);
  }
  grain(ctx, s, 30, 0.3);
}

/** Generate the full wall texture set. Must be called in a browser context. */
export function generateTextures(): TextureSet {
  const s = TEXTURE_SIZE;
  const set: TextureSet = new Map();

  const add = (id: number, painter: (ctx: CanvasRenderingContext2D) => void) => {
    const { ctx } = makeCanvas(s);
    painter(ctx);
    set.set(id, pack(ctx, s));
  };

  add(WALL.DOLERITE_DARK, (ctx) => paintDolerite(ctx, s, false));
  add(WALL.PLASTER_CREAM, (ctx) => paintPlaster(ctx, s, false, false));
  add(WALL.PLASTER_WAINSCOT, (ctx) => paintPlaster(ctx, s, true, false));
  add(WALL.COMMITTEE_DOOR, (ctx) => paintCommitteeDoor(ctx, s));
  add(WALL.WINDOW_VOLCANO, (ctx) => paintWindowVolcano(ctx, s));
  add(WALL.PORTRAIT_WALL, (ctx) => paintPortrait(ctx, s));
  add(WALL.BOOKSHELF, (ctx) => paintBookshelf(ctx, s));
  add(WALL.DOLERITE_ARCH, (ctx) => paintDolerite(ctx, s, true));
  add(WALL.PLASTER_SCONCE, (ctx) => paintPlaster(ctx, s, false, true));
  add(WALL.CARPET_BLUE, (ctx) => paintCarpet(ctx, s));

  return set;
}
