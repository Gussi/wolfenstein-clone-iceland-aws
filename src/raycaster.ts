/**
 * Raycaster: textured wall rendering via DDA into a packed-pixel framebuffer,
 * plus floor/ceiling fill and a per-column depth buffer for sprite occlusion.
 */

import { SCREEN_HEIGHT, SCREEN_WIDTH, WALL_SHADE_FACTOR } from './constants';
import type { TextureSet } from './assets/textures';
import { isSolidAt } from './map/mapState';
import type { MapState, PlayerState } from './types';

export interface Framebuffer {
  width: number;
  height: number;
  /** width*height packed RGBA pixels (canvas byte order). */
  pixels: Uint32Array;
  /** Per-column perpendicular wall distance, for sprite depth testing. */
  zBuffer: Float32Array;
  imageData: ImageData;
}

/** Allocate a framebuffer sized to the internal render resolution. */
export function createFramebuffer(): Framebuffer {
  const width = SCREEN_WIDTH;
  const height = SCREEN_HEIGHT;
  const imageData = new ImageData(width, height);
  const pixels = new Uint32Array(imageData.data.buffer);
  return { width, height, pixels, zBuffer: new Float32Array(width), imageData };
}

/** Pack r,g,b,a (0-255) into the canvas byte order (little-endian RGBA). */
function packRGBA(r: number, g: number, b: number, a: number): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

/** Apply a brightness factor to a packed pixel (preserves alpha). */
function shade(color: number, factor: number): number {
  const r = (color & 0xff) * factor;
  const g = ((color >> 8) & 0xff) * factor;
  const b = ((color >> 16) & 0xff) * factor;
  const a = (color >> 24) & 0xff;
  return packRGBA(r & 0xff, g & 0xff, b & 0xff, a);
}

/** Fill ceiling (top half) and floor (bottom half) with flat colors. */
function drawBackground(fb: Framebuffer): void {
  const { width, height, pixels } = fb;
  const ceiling = packRGBA(40, 42, 50, 255); // dim institutional ceiling
  const floor = packRGBA(58, 48, 38, 255); // worn parquet
  const half = (height / 2) | 0;
  pixels.fill(ceiling, 0, half * width);
  pixels.fill(floor, half * width, width * height);
}

/**
 * Render all walls for the current player view into the framebuffer and
 * populate the z-buffer. Floor/ceiling are filled first.
 */
export function renderWalls(
  fb: Framebuffer,
  player: PlayerState,
  map: MapState,
  textures: TextureSet,
): void {
  drawBackground(fb);
  const { width, height, pixels, zBuffer } = fb;

  for (let x = 0; x < width; x++) {
    const cameraX = (2 * x) / width - 1;
    const rayDirX = player.dirX + player.planeX * cameraX;
    const rayDirY = player.dirY + player.planeY * cameraX;

    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    const deltaDistX = rayDirX === 0 ? Infinity : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? Infinity : Math.abs(1 / rayDirY);

    let stepX: number;
    let stepY: number;
    let sideDistX: number;
    let sideDistY: number;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - player.x) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - player.y) * deltaDistY;
    }

    // DDA.
    let hit = false;
    let side = 0; // 0 = x-side (vertical wall), 1 = y-side (horizontal wall)
    let wallType = 0;
    let guard = 0;
    while (!hit && guard++ < 256) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      if (isSolidAt(map, mapX + 0.5, mapY + 0.5)) {
        hit = true;
        wallType = map.grid[mapY]?.[mapX]?.wallType ?? 1;
      }
    }

    const perpDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
    const safeDist = perpDist <= 0 ? 0.0001 : perpDist;
    zBuffer[x] = safeDist;

    const lineHeight = Math.floor(height / safeDist);
    const drawStart = -lineHeight / 2 + height / 2;
    const drawEnd = lineHeight / 2 + height / 2;
    const clampedStart = Math.max(0, Math.floor(drawStart));
    const clampedEnd = Math.min(height - 1, Math.floor(drawEnd));

    const tex = textures.get(wallType) ?? textures.values().next().value;
    if (!tex) continue;
    const texSize = tex.size;

    // Where exactly the wall was hit (texture U coordinate).
    let wallX = side === 0 ? player.y + perpDist * rayDirY : player.x + perpDist * rayDirX;
    wallX -= Math.floor(wallX);
    let texX = Math.floor(wallX * texSize);
    if (side === 0 && rayDirX > 0) texX = texSize - texX - 1;
    if (side === 1 && rayDirY < 0) texX = texSize - texX - 1;
    texX = Math.max(0, Math.min(texSize - 1, texX));

    const step = texSize / lineHeight;
    let texPos = (clampedStart - height / 2 + lineHeight / 2) * step;

    for (let y = clampedStart; y <= clampedEnd; y++) {
      const texY = Math.max(0, Math.min(texSize - 1, texPos | 0));
      texPos += step;
      let color = tex.pixels[texY * texSize + texX];
      // Darken horizontal-facing walls and distant walls slightly.
      if (side === 1) color = shade(color, WALL_SHADE_FACTOR);
      const fog = Math.min(1, 4 / safeDist);
      if (fog < 1) color = shade(color, 0.35 + 0.65 * fog);
      pixels[y * width + x] = color;
    }
  }
}
