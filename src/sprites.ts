/**
 * Billboard sprite renderer. Projects each renderable into screen space,
 * sorts far-to-near, and draws per-column while respecting the wall z-buffer.
 * Transparent pixels (alpha below threshold) are skipped.
 */

import { SPRITE_CULL_DISTANCE } from './constants';
import type { SpriteRegistry } from './assets/spriteGfx';
import type { Framebuffer } from './raycaster';
import type { PlayerState, Renderable } from './types';

const ALPHA_THRESHOLD = 128;

/**
 * Render sprites into the framebuffer. Must be called after renderWalls so the
 * z-buffer is populated.
 */
export function renderSprites(
  fb: Framebuffer,
  player: PlayerState,
  renderables: Renderable[],
  sprites: SpriteRegistry,
): void {
  const { width, height, pixels, zBuffer } = fb;

  // Compute squared distances and sort far-to-near (painter's algorithm).
  const ordered = renderables
    .map((r) => ({
      r,
      dist2: (r.x - player.x) ** 2 + (r.y - player.y) ** 2,
    }))
    .filter((o) => o.dist2 <= SPRITE_CULL_DISTANCE * SPRITE_CULL_DISTANCE)
    .sort((a, b) => b.dist2 - a.dist2);

  const invDet = 1 / (player.planeX * player.dirY - player.dirX * player.planeY);

  for (const { r } of ordered) {
    const tex = sprites.get(r.textureKey);
    if (!tex) continue;
    const texSize = tex.size;

    const spriteX = r.x - player.x;
    const spriteY = r.y - player.y;

    const transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
    const transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);
    if (transformY <= 0.01) continue; // behind the camera

    const spriteScreenX = Math.floor((width / 2) * (1 + transformX / transformY));
    const spriteHeight = Math.abs(Math.floor(height / transformY));
    const spriteWidth = spriteHeight;

    // Vertical offset (for floating / floor-resting sprites).
    const vMoveScreen = Math.floor((r.vMove * height) / transformY);
    const drawStartY = Math.max(0, -spriteHeight / 2 + height / 2 + vMoveScreen);
    const drawEndY = Math.min(height - 1, spriteHeight / 2 + height / 2 + vMoveScreen);
    const drawStartX = Math.max(0, Math.floor(-spriteWidth / 2 + spriteScreenX));
    const drawEndX = Math.min(width - 1, Math.floor(spriteWidth / 2 + spriteScreenX));

    for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
      // Occlusion test against walls.
      if (transformY >= zBuffer[stripe]) continue;
      const texX =
        Math.floor(((stripe - (-spriteWidth / 2 + spriteScreenX)) * texSize) / spriteWidth);
      if (texX < 0 || texX >= texSize) continue;

      for (let y = Math.floor(drawStartY); y <= drawEndY; y++) {
        const d = y - vMoveScreen - height / 2 + spriteHeight / 2;
        const texY = Math.floor((d * texSize) / spriteHeight);
        if (texY < 0 || texY >= texSize) continue;
        const color = tex.pixels[texY * texSize + texX];
        const alpha = (color >> 24) & 0xff;
        if (alpha < ALPHA_THRESHOLD) continue;
        pixels[y * width + stripe] = color;
      }
    }
  }
}
