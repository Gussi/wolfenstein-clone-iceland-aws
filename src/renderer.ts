// Raycaster renderer: DDA wall casting with textured vertical strips,
// floor/ceiling fill, and depth-sorted billboard sprite rendering.

import {
  MAX_SPRITE_DISTANCE,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TEXTURE_SIZE,
  WALL_SHADE_FACTOR,
} from './constants';
import type { AssetLoader } from './asset-loader';
import type { MapSystem } from './map-system';
import type { PlayerState, Texture, VisibleSprite } from './types';

// Wall texture id mapping (matches domain-entities.md texture atlas).
const WALL_TEXTURE_IDS: Record<number, string> = {
  1: 'wall-dolerite',
  2: 'wall-plaster',
  3: 'wall-wainscot',
  4: 'wall-door',
  5: 'wall-window',
  6: 'wall-portrait',
  7: 'wall-bookshelf',
  8: 'wall-arch',
  9: 'wall-sconce',
  10: 'wall-carpet',
};

const CEILING_COLOR = { r: 40, g: 38, b: 42 }; // dark plaster ceiling
const FLOOR_COLOR = { r: 60, g: 50, b: 40 }; // dark wood floor

export class Renderer {
  private buffer: ImageData;
  private bufferData: Uint8ClampedArray;
  private zBuffer: Float32Array;

  constructor(
    private ctx: CanvasRenderingContext2D,
    private assets: AssetLoader,
  ) {
    this.buffer = ctx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    this.bufferData = this.buffer.data;
    this.zBuffer = new Float32Array(SCREEN_WIDTH);
  }

  render(player: PlayerState, map: MapSystem, sprites: VisibleSprite[]): void {
    this.drawBackground();
    this.castWalls(player, map);
    this.drawSprites(player, sprites);
    this.ctx.putImageData(this.buffer, 0, 0);
  }

  private drawBackground(): void {
    const data = this.bufferData;
    const halfHeight = SCREEN_HEIGHT >> 1;
    // Ceiling (top half).
    for (let y = 0; y < halfHeight; y++) {
      for (let x = 0; x < SCREEN_WIDTH; x++) {
        const idx = (y * SCREEN_WIDTH + x) * 4;
        data[idx] = CEILING_COLOR.r;
        data[idx + 1] = CEILING_COLOR.g;
        data[idx + 2] = CEILING_COLOR.b;
        data[idx + 3] = 255;
      }
    }
    // Floor (bottom half).
    for (let y = halfHeight; y < SCREEN_HEIGHT; y++) {
      for (let x = 0; x < SCREEN_WIDTH; x++) {
        const idx = (y * SCREEN_WIDTH + x) * 4;
        data[idx] = FLOOR_COLOR.r;
        data[idx + 1] = FLOOR_COLOR.g;
        data[idx + 2] = FLOOR_COLOR.b;
        data[idx + 3] = 255;
      }
    }
  }

  private castWalls(player: PlayerState, map: MapSystem): void {
    for (let x = 0; x < SCREEN_WIDTH; x++) {
      // Ray direction for this column.
      const cameraX = (2 * x) / SCREEN_WIDTH - 1;
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

      // DDA loop.
      let hit = false;
      let side = 0; // 0 = vertical (NS wall), 1 = horizontal (EW wall)
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
        wallType = map.getWallType(mapX, mapY);
        // Treat closed/animating doors as solid for wall casting.
        const door = map.getDoorAt(mapX, mapY);
        if (door && door.state !== 'open') {
          wallType = door.textureId;
          hit = true;
        } else if (wallType !== 0 && !door) {
          hit = true;
        }
      }

      // Perpendicular distance (avoid fisheye).
      const perpDist =
        side === 0
          ? sideDistX - deltaDistX
          : sideDistY - deltaDistY;
      const safeDist = perpDist <= 0 ? 0.0001 : perpDist;
      this.zBuffer[x] = safeDist;

      const lineHeight = Math.floor(SCREEN_HEIGHT / safeDist);
      let drawStart = Math.floor(-lineHeight / 2 + SCREEN_HEIGHT / 2);
      let drawEnd = Math.floor(lineHeight / 2 + SCREEN_HEIGHT / 2);
      if (drawStart < 0) drawStart = 0;
      if (drawEnd >= SCREEN_HEIGHT) drawEnd = SCREEN_HEIGHT - 1;

      // Where on the wall the ray hit (texture U coordinate).
      let wallX: number;
      if (side === 0) {
        wallX = player.y + perpDist * rayDirY;
      } else {
        wallX = player.x + perpDist * rayDirX;
      }
      wallX -= Math.floor(wallX);

      const texture = this.getWallTexture(wallType);
      let texX = Math.floor(wallX * TEXTURE_SIZE);
      // Flip texture for correct orientation on certain sides.
      if (side === 0 && rayDirX > 0) texX = TEXTURE_SIZE - texX - 1;
      if (side === 1 && rayDirY < 0) texX = TEXTURE_SIZE - texX - 1;
      texX = Math.max(0, Math.min(TEXTURE_SIZE - 1, texX));

      const shade = side === 1 ? WALL_SHADE_FACTOR : 1;
      this.drawWallStrip(x, drawStart, drawEnd, lineHeight, texture, texX, shade);
    }
  }

  private drawWallStrip(
    x: number,
    drawStart: number,
    drawEnd: number,
    lineHeight: number,
    texture: Texture,
    texX: number,
    shade: number,
  ): void {
    const data = this.bufferData;
    const texData = texture.data;
    const step = TEXTURE_SIZE / lineHeight;
    let texPos = (drawStart - SCREEN_HEIGHT / 2 + lineHeight / 2) * step;

    for (let y = drawStart; y <= drawEnd; y++) {
      const texY = Math.max(0, Math.min(TEXTURE_SIZE - 1, Math.floor(texPos)));
      texPos += step;
      const texIdx = (texY * texture.width + texX) * 4;
      const screenIdx = (y * SCREEN_WIDTH + x) * 4;
      data[screenIdx] = (texData[texIdx] ?? 0) * shade;
      data[screenIdx + 1] = (texData[texIdx + 1] ?? 0) * shade;
      data[screenIdx + 2] = (texData[texIdx + 2] ?? 0) * shade;
      data[screenIdx + 3] = 255;
    }
  }

  private drawSprites(player: PlayerState, sprites: VisibleSprite[]): void {
    const data = this.bufferData;

    for (const sprite of sprites) {
      if (sprite.distance > MAX_SPRITE_DISTANCE) continue;
      const texture = this.assets.hasTexture(sprite.textureId)
        ? this.assets.getTexture(sprite.textureId)
        : null;
      if (!texture) continue;

      // Transform sprite to camera space.
      const spriteX = sprite.x - player.x;
      const spriteY = sprite.y - player.y;
      const invDet =
        1 / (player.planeX * player.dirY - player.dirX * player.planeY);
      const transformX =
        invDet * (player.dirY * spriteX - player.dirX * spriteY);
      const transformY =
        invDet * (-player.planeY * spriteX + player.planeX * spriteY);

      if (transformY <= 0.01) continue; // behind camera

      const spriteScreenX = Math.floor(
        (SCREEN_WIDTH / 2) * (1 + transformX / transformY),
      );
      const spriteHeight = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
      const spriteWidth = spriteHeight;

      let drawStartY = Math.floor(-spriteHeight / 2 + SCREEN_HEIGHT / 2);
      let drawEndY = Math.floor(spriteHeight / 2 + SCREEN_HEIGHT / 2);
      if (drawStartY < 0) drawStartY = 0;
      if (drawEndY >= SCREEN_HEIGHT) drawEndY = SCREEN_HEIGHT - 1;

      const drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
      const drawEndX = Math.floor(spriteWidth / 2 + spriteScreenX);

      for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
        if (stripe < 0 || stripe >= SCREEN_WIDTH) continue;
        // Depth test against wall z-buffer.
        if (transformY >= this.zBuffer[stripe]!) continue;

        const texXf =
          ((stripe - (-spriteWidth / 2 + spriteScreenX)) * texture.width) /
          spriteWidth;
        const texX = Math.max(0, Math.min(texture.width - 1, Math.floor(texXf)));

        for (let y = drawStartY; y <= drawEndY; y++) {
          const d = y - SCREEN_HEIGHT / 2 + spriteHeight / 2;
          const texY = Math.max(
            0,
            Math.min(
              texture.height - 1,
              Math.floor((d * texture.height) / spriteHeight),
            ),
          );
          const texIdx = (texY * texture.width + texX) * 4;
          const alpha = texture.data[texIdx + 3] ?? 0;
          if (alpha < 128) continue; // transparent pixel
          const screenIdx = (y * SCREEN_WIDTH + stripe) * 4;
          data[screenIdx] = texture.data[texIdx] ?? 0;
          data[screenIdx + 1] = texture.data[texIdx + 1] ?? 0;
          data[screenIdx + 2] = texture.data[texIdx + 2] ?? 0;
          data[screenIdx + 3] = 255;
        }
      }
    }
  }

  private getWallTexture(wallType: number): Texture {
    const id = WALL_TEXTURE_IDS[wallType] ?? 'wall-plaster';
    return this.assets.getTexture(id);
  }
}
