/**
 * Renderer — DDA raycaster for walls plus billboarded sprite rendering.
 * Renders the world into an offscreen 640x400 ImageData buffer, then scales it
 * up onto the visible canvas for the chunky retro look.
 *
 * Stories: US-09 (raycaster walls), US-10 (sprites)
 */
import {
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  TEXTURE_SIZE,
  WALL_SHADE_FACTOR,
} from "./constants";
import { AssetLoader } from "./asset-loader";
import { MapSystem } from "./map-system";
import type { PlayerState, VisibleEntity } from "./types";

// Solid floor / ceiling colors (packed 0xAABBGGRR)
function pack(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}
const CEILING_COLOR = pack(40, 38, 44); // dim plaster ceiling
const FLOOR_COLOR = pack(58, 46, 30); // dark parquet floor

export class Renderer {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private offscreen: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private imageData: ImageData;
  private buf: Uint32Array;
  private zBuffer: Float32Array;
  private assets: AssetLoader;

  constructor(assets: AssetLoader) {
    this.assets = assets;
    this.offscreen = document.createElement("canvas");
    this.offscreen.width = SCREEN_WIDTH;
    this.offscreen.height = SCREEN_HEIGHT;
    const offCtx = this.offscreen.getContext("2d");
    if (!offCtx) throw new Error("offscreen 2D context unavailable");
    this.offCtx = offCtx;
    this.imageData = this.offCtx.createImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    this.buf = new Uint32Array(this.imageData.data.buffer);
    this.zBuffer = new Float32Array(SCREEN_WIDTH);
  }

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2D context unavailable");
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
  }

  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /** Render one frame of the world (walls + sprites) to the visible canvas. */
  render(player: PlayerState, map: MapSystem, entities: VisibleEntity[]): void {
    this.drawBackground();
    this.castWalls(player, map);
    this.drawSprites(player, entities);
    this.offCtx.putImageData(this.imageData, 0, 0);
    // Scale the offscreen buffer up to the full display canvas.
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(
      this.offscreen,
      0,
      0,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
  }

  private drawBackground(): void {
    const half = SCREEN_WIDTH * (SCREEN_HEIGHT >> 1);
    this.buf.fill(CEILING_COLOR, 0, half);
    this.buf.fill(FLOOR_COLOR, half, SCREEN_WIDTH * SCREEN_HEIGHT);
  }

  private castWalls(player: PlayerState, map: MapSystem): void {
    const { x: posX, y: posY, dirX, dirY, planeX, planeY } = player;

    for (let x = 0; x < SCREEN_WIDTH; x++) {
      const cameraX = (2 * x) / SCREEN_WIDTH - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;

      let mapX = Math.floor(posX);
      let mapY = Math.floor(posY);

      const deltaDistX = rayDirX === 0 ? Infinity : Math.abs(1 / rayDirX);
      const deltaDistY = rayDirY === 0 ? Infinity : Math.abs(1 / rayDirY);

      let stepX: number;
      let stepY: number;
      let sideDistX: number;
      let sideDistY: number;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (posX - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1 - posX) * deltaDistX;
      }
      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (posY - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1 - posY) * deltaDistY;
      }

      // DDA
      let hit = false;
      let side = 0;
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
        if (map.isSolid(mapX, mapY)) hit = true;
      }

      const perpDist =
        side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
      this.zBuffer[x] = perpDist;

      const lineHeight = Math.floor(SCREEN_HEIGHT / perpDist);
      let drawStart = Math.floor(-lineHeight / 2 + SCREEN_HEIGHT / 2);
      let drawEnd = Math.floor(lineHeight / 2 + SCREEN_HEIGHT / 2);
      if (drawStart < 0) drawStart = 0;
      if (drawEnd >= SCREEN_HEIGHT) drawEnd = SCREEN_HEIGHT - 1;

      // Texture column
      let wallX =
        side === 0 ? posY + perpDist * rayDirY : posX + perpDist * rayDirX;
      wallX -= Math.floor(wallX);
      let texX = Math.floor(wallX * TEXTURE_SIZE);
      if (side === 0 && rayDirX > 0) texX = TEXTURE_SIZE - texX - 1;
      if (side === 1 && rayDirY < 0) texX = TEXTURE_SIZE - texX - 1;

      const texId = map.getWallTextureId(mapX, mapY);
      const tex = this.assets.getTexture(texId);
      const texPixels = tex.pixels;

      const step = TEXTURE_SIZE / lineHeight;
      let texPos = (drawStart - SCREEN_HEIGHT / 2 + lineHeight / 2) * step;
      const shade = side === 1;

      for (let y = drawStart; y <= drawEnd; y++) {
        const texY = Math.floor(texPos) & (TEXTURE_SIZE - 1);
        texPos += step;
        let color = texPixels[texY * TEXTURE_SIZE + texX];
        if (shade) {
          const r = (color & 0xff) * WALL_SHADE_FACTOR;
          const g = ((color >> 8) & 0xff) * WALL_SHADE_FACTOR;
          const b = ((color >> 16) & 0xff) * WALL_SHADE_FACTOR;
          color = pack(r, g, b);
        }
        this.buf[y * SCREEN_WIDTH + x] = color;
      }
    }
  }

  private drawSprites(player: PlayerState, entities: VisibleEntity[]): void {
    const { x: posX, y: posY, dirX, dirY, planeX, planeY } = player;

    // Sort far -> near (painter's algorithm) — entities already carry distance.
    const sorted = [...entities].sort((a, b) => b.distance - a.distance);

    const invDet = 1 / (planeX * dirY - dirX * planeY);

    for (const e of sorted) {
      const spriteX = e.x - posX;
      const spriteY = e.y - posY;

      const transformX = invDet * (dirY * spriteX - dirX * spriteY);
      const transformY = invDet * (-planeY * spriteX + planeX * spriteY);
      if (transformY <= 0.05) continue; // behind camera / too close

      const spriteScreenX = Math.floor(
        (SCREEN_WIDTH / 2) * (1 + transformX / transformY),
      );

      const spriteHeight = Math.abs(Math.floor(SCREEN_HEIGHT / transformY));
      const spriteWidth = spriteHeight;

      // Vertical offset sinks shorter sprites (pickups) toward the floor.
      const vMove = e.verticalOffset * (SCREEN_HEIGHT / transformY);

      let drawStartY = Math.floor(
        -spriteHeight / 2 + SCREEN_HEIGHT / 2 + vMove,
      );
      let drawEndY = Math.floor(spriteHeight / 2 + SCREEN_HEIGHT / 2 + vMove);
      if (drawStartY < 0) drawStartY = 0;
      if (drawEndY >= SCREEN_HEIGHT) drawEndY = SCREEN_HEIGHT - 1;

      let drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
      let drawEndX = Math.floor(spriteWidth / 2 + spriteScreenX);
      if (drawStartX < 0) drawStartX = 0;
      if (drawEndX >= SCREEN_WIDTH) drawEndX = SCREEN_WIDTH - 1;

      const tex = this.assets.getTexture(e.textureId);
      const texPixels = tex.pixels;

      for (let stripe = drawStartX; stripe <= drawEndX; stripe++) {
        // Occlusion: skip columns behind walls.
        if (transformY >= this.zBuffer[stripe]) continue;
        const texX = Math.floor(
          ((stripe - (-spriteWidth / 2 + spriteScreenX)) * TEXTURE_SIZE) /
            spriteWidth,
        );
        if (texX < 0 || texX >= TEXTURE_SIZE) continue;

        for (let y = drawStartY; y <= drawEndY; y++) {
          const d =
            (y - vMove - SCREEN_HEIGHT / 2 + spriteHeight / 2) *
            (TEXTURE_SIZE / spriteHeight);
          const texY = Math.floor(d);
          if (texY < 0 || texY >= TEXTURE_SIZE) continue;
          const color = texPixels[texY * TEXTURE_SIZE + texX];
          if (color >>> 24 === 0) continue; // transparent pixel
          this.buf[y * SCREEN_WIDTH + stripe] = color;
        }
      }
    }
  }
}
