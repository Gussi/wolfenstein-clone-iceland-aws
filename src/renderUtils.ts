/**
 * Helpers for turning packed-pixel textures into drawable canvases (cached),
 * used for the weapon viewmodel and HUD portraits.
 */

import type { Texture } from './assets/textures';

const cache = new WeakMap<Texture, HTMLCanvasElement>();

/** Convert a packed-pixel Texture into an HTMLCanvasElement (memoized). */
export function textureToCanvas(tex: Texture): HTMLCanvasElement {
  const existing = cache.get(tex);
  if (existing) return existing;

  const canvas = document.createElement('canvas');
  canvas.width = tex.size;
  canvas.height = tex.size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire 2D context for texture conversion');
  const img = ctx.createImageData(tex.size, tex.size);
  new Uint32Array(img.data.buffer).set(tex.pixels);
  ctx.putImageData(img, 0, 0);
  cache.set(tex, canvas);
  return canvas;
}
