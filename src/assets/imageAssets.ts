/**
 * Image-based assets loaded from JPEG atlases in this directory.
 *
 * Unlike the procedural textures/sprites, these are sliced out of bitmap
 * atlases at load time and packed into the same {@link Texture} format
 * (size*size packed RGBA, canvas byte order) so the raycaster and sprite
 * renderer can consume them transparently:
 *
 *  - walls-atlas.jpg   5x2 grid of 64px wall tiles
 *  - doors-atlas.jpg   5x1 grid of 64px pass-through door / elevator tiles
 *  - clerk-faces.jpg   4x2 grid of 32px facial expressions for the Clerk enemy
 *  - frying-pan.jpg    single 128px weapon viewmodel (hand + pan)
 *
 * Sprite atlases (faces, pan) sit on a near-white background which is
 * color-keyed to transparency so the sprite renderer skips it.
 */

import { WALL } from '../map/mapData';
import type { Texture } from './textures';

import wallsUrl from './walls-atlas.jpg';
import doorsUrl from './doors-atlas.jpg';
import clerkFacesUrl from './clerk-faces.jpg';
import fryingPanUrl from './frying-pan.jpg';

/** Destination size for wall/door textures (matches TEXTURE_SIZE). */
const WALL_DEST = 128;
/** Destination size for composed sprites (matches spriteGfx SPRITE_SIZE). */
const SPRITE_SIZE = 128;
/** RGB channel threshold above which a near-white pixel is keyed transparent. */
const WHITE_KEY = 232;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

function makeCtx(w: number, h: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to acquire 2D context for image assets');
  return ctx;
}

/** Pack a square region of a context into a Texture (optionally white-keyed). */
function pack(ctx: CanvasRenderingContext2D, size: number, keyWhite: boolean): Texture {
  const img = ctx.getImageData(0, 0, size, size);
  if (keyWhite) {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > WHITE_KEY && d[i + 1] > WHITE_KEY && d[i + 2] > WHITE_KEY) d[i + 3] = 0;
    }
  }
  return { size, pixels: new Uint32Array(img.data.buffer.slice(0)) };
}

/** Slice a sub-rect of an atlas, scaled to destSize, into a packed Texture. */
function sliceTile(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  destSize: number,
  keyWhite: boolean,
): Texture {
  const ctx = makeCtx(destSize, destSize);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, destSize, destSize);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destSize, destSize);
  return pack(ctx, destSize, keyWhite);
}

/** Slice a sub-rect into a (possibly keyed) canvas, for compositing. */
function sliceCanvas(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  destW: number,
  destH: number,
  keyWhite: boolean,
): HTMLCanvasElement {
  const ctx = makeCtx(destW, destH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destW, destH);
  if (keyWhite) {
    const id = ctx.getImageData(0, 0, destW, destH);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] > WHITE_KEY && d[i + 1] > WHITE_KEY && d[i + 2] > WHITE_KEY) d[i + 3] = 0;
    }
    ctx.putImageData(id, 0, 0);
  }
  return ctx.canvas;
}

/** Pack a fully-composed sprite context (keeps its own transparency). */
function packSprite(ctx: CanvasRenderingContext2D, size: number): Texture {
  const img = ctx.getImageData(0, 0, size, size);
  return { size, pixels: new Uint32Array(img.data.buffer.slice(0)) };
}

// --- Clerk enemy: procedural suited body + bitmap facial expression --------

interface ClerkOpts {
  bob: number;
  tilt: number;
}

/** Compose the Clerk billboard: a drawn civil-servant suit topped by a face. */
function paintClerk(
  ctx: CanvasRenderingContext2D,
  s: number,
  bust: HTMLCanvasElement,
  opts: ClerkOpts,
): void {
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  ctx.translate(s / 2, s * 0.62);
  ctx.rotate(opts.tilt);
  ctx.translate(-s / 2, -s * 0.62);

  const b = opts.bob;
  // Trousers.
  ctx.fillStyle = '#2a2c34';
  ctx.fillRect(s * 0.41, s * 0.74 + b, s * 0.07, s * 0.16);
  ctx.fillStyle = '#23252c';
  ctx.fillRect(s * 0.52, s * 0.74 + b, s * 0.07, s * 0.16);
  // Shoes.
  ctx.fillStyle = '#141418';
  ctx.fillRect(s * 0.38, s * 0.88 + b, s * 0.12, s * 0.05);
  ctx.fillRect(s * 0.5, s * 0.88 + b, s * 0.12, s * 0.05);
  // Suit jacket torso (drawn behind the bust).
  ctx.fillStyle = '#363944';
  ctx.beginPath();
  ctx.moveTo(s * 0.31, s * 0.6 + b);
  ctx.lineTo(s * 0.69, s * 0.6 + b);
  ctx.lineTo(s * 0.65, s * 0.8 + b);
  ctx.lineTo(s * 0.35, s * 0.8 + b);
  ctx.closePath();
  ctx.fill();
  // Tie.
  ctx.fillStyle = '#7a2a2a';
  ctx.fillRect(s * 0.485, s * 0.6 + b, s * 0.03, s * 0.16);

  // Bust (head + collar) from the atlas, scaled up over the shoulders.
  const bw = s * 0.5;
  const bh = s * 0.5;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bust, s * 0.5 - bw / 2, s * 0.16 + b, bw, bh);
  ctx.restore();
}

/** The bureaucrat "dissolves into a flurry of forms" when dispersed. */
function paintDisperse(ctx: CanvasRenderingContext2D, s: number, phase: number): void {
  ctx.clearRect(0, 0, s, s);
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + i;
    const r = phase * s * 0.46;
    const px = s / 2 + Math.cos(a) * r;
    const py = s * 0.5 + Math.sin(a) * r;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    ctx.fillStyle = `rgba(240,238,225,${1 - phase})`;
    ctx.fillRect(-5, -6, 10, 12);
    ctx.fillStyle = `rgba(170,60,60,${(1 - phase) * 0.8})`;
    ctx.fillRect(-3, -2, 6, 2);
    ctx.restore();
  }
}

// --- Frying-pan weapon viewmodel -------------------------------------------

/** Draw the frying pan held at a given swing amount (0 idle .. 1 full swing). */
function paintPan(
  ctx: CanvasRenderingContext2D,
  s: number,
  pan: HTMLCanvasElement,
  swing: number,
): void {
  ctx.clearRect(0, 0, s, s);
  ctx.save();
  // Pivot around the wrist (bottom-left) so the pan rises and arcs over.
  ctx.translate(s * 0.32, s * 0.86);
  ctx.rotate(-swing * 0.7);
  ctx.translate(-s * 0.32, -s * 0.86);
  ctx.translate(0, -swing * s * 0.06);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(pan, 0, 0, s, s);
  ctx.restore();
}

export interface ImageAssets {
  /** Wall + door textures keyed by WALL id (to merge into the TextureSet). */
  wallTextures: Map<number, Texture>;
  /** Sprites keyed by name (to merge into the SpriteRegistry). */
  sprites: Map<string, Texture>;
}

/**
 * Load all bitmap atlases and produce engine-ready textures/sprites. Must run
 * in a browser context (uses Image and canvas).
 */
export async function loadImageAssets(): Promise<ImageAssets> {
  const [wallsImg, doorsImg, facesImg, panImg] = await Promise.all([
    loadImage(wallsUrl),
    loadImage(doorsUrl),
    loadImage(clerkFacesUrl),
    loadImage(fryingPanUrl),
  ]);

  const wallTextures = new Map<number, Texture>();

  // Walls: 5 columns x 2 rows of 64px tiles, row-major.
  const wallIds = [
    WALL.WOOD_PLAQUE,
    WALL.WOOD_SCONCE2,
    WALL.MARBLE,
    WALL.BARRED_WINDOW,
    WALL.BOOKSHELF_IMG,
    WALL.CINDERBLOCK,
    WALL.WINDOW_VOLCANO_IMG,
    WALL.WOOD_LAMP,
    WALL.WOOD_PLAQUE2,
    WALL.ORNATE_GOLD,
  ];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const id = wallIds[row * 5 + col];
      wallTextures.set(id, sliceTile(wallsImg, col * 64, row * 64, 64, 64, WALL_DEST, false));
    }
  }

  // Doors / elevator: 5 columns x 1 row of 64px tiles.
  const doorIds = [
    WALL.DOOR_OFFICE,
    WALL.DOOR_ELEVATOR,
    WALL.DOOR_VAULT,
    WALL.DOOR_ORNATE,
    WALL.DOOR_DARK,
  ];
  for (let col = 0; col < 5; col++) {
    wallTextures.set(doorIds[col], sliceTile(doorsImg, col * 64, 0, 64, 64, WALL_DEST, false));
  }

  const sprites = new Map<string, Texture>();
  const addSprite = (key: string, painter: (ctx: CanvasRenderingContext2D) => void) => {
    const ctx = makeCtx(SPRITE_SIZE, SPRITE_SIZE);
    painter(ctx);
    sprites.set(key, packSprite(ctx, SPRITE_SIZE));
  };

  // Clerk faces: 4 columns x 2 rows of 32px expressions (white background keyed).
  const bust = (idx: number): HTMLCanvasElement =>
    sliceCanvas(facesImg, (idx % 4) * 32, Math.floor(idx / 4) * 32, 32, 32, 64, 64, true);
  // Expression indices in the atlas (row-major):
  // 0 calm, 1 worried, 2 stern, 3 black-eye, 4 shocked, 5 bloodied, 6 angry, 7 neutral.
  const CALM = 0;
  const STERN = 2;
  const BLACK_EYE = 3;
  const SHOCKED = 4;
  const BLOODIED = 5;
  const ANGRY = 6;

  addSprite('clerk_walk0', (c) => paintClerk(c, SPRITE_SIZE, bust(CALM), { bob: 0, tilt: 0 }));
  addSprite('clerk_walk1', (c) => paintClerk(c, SPRITE_SIZE, bust(STERN), { bob: -4, tilt: 0.04 }));
  addSprite('clerk_alert', (c) => paintClerk(c, SPRITE_SIZE, bust(SHOCKED), { bob: -2, tilt: 0 }));
  addSprite('clerk_attack', (c) => paintClerk(c, SPRITE_SIZE, bust(ANGRY), { bob: -2, tilt: -0.05 }));
  addSprite('clerk_stunned', (c) => paintClerk(c, SPRITE_SIZE, bust(BLOODIED), { bob: 6, tilt: 0.22 }));
  addSprite('clerk_hurt', (c) => paintClerk(c, SPRITE_SIZE, bust(BLACK_EYE), { bob: 0, tilt: 0 }));
  addSprite('clerk_dispersed0', (c) => paintDisperse(c, SPRITE_SIZE, 0.33));
  addSprite('clerk_dispersed1', (c) => paintDisperse(c, SPRITE_SIZE, 0.66));
  addSprite('clerk_dispersed2', (c) => paintDisperse(c, SPRITE_SIZE, 0.95));

  // Frying-pan weapon viewmodel (white background keyed).
  const panKeyed = sliceCanvas(panImg, 0, 0, 128, 128, SPRITE_SIZE, SPRITE_SIZE, true);
  addSprite('pan_idle', (c) => paintPan(c, SPRITE_SIZE, panKeyed, 0));
  addSprite('pan_swing0', (c) => paintPan(c, SPRITE_SIZE, panKeyed, 0.4));
  addSprite('pan_swing1', (c) => paintPan(c, SPRITE_SIZE, panKeyed, 0.8));
  addSprite('pan_swing2', (c) => paintPan(c, SPRITE_SIZE, panKeyed, 1));

  return { wallTextures, sprites };
}
