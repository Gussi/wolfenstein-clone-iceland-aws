/**
 * AssetLoader — loads textures (as ABGR pixel arrays), audio (as AudioBuffers),
 * and maps (as JSON). Provides graceful fallbacks: if a texture file fails to
 * load, a procedurally generated placeholder is substituted so the game still
 * runs. If audio fails, the sound is simply omitted.
 *
 * Stories: US-09, US-10, US-11, US-17, US-18, US-19
 */
import { TEXTURE_SIZE } from "./constants";
import type { AssetManifest, LoadedTexture, MapJSON } from "./types";
import { generatePlaceholderTexture } from "./placeholder-textures";
import { validateMapJSON } from "./map-validation";

type ProgressCallback = (loaded: number, total: number) => void;

/** Pack RGBA bytes into a little-endian 0xAABBGGRR 32-bit integer. */
export function packRGBA(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export class AssetLoader {
  private textures = new Map<string, LoadedTexture>();
  private sounds = new Map<string, AudioBuffer>();
  private maps = new Map<string, MapJSON>();
  private progressCb: ProgressCallback | null = null;
  private audioContext: AudioContext | null = null;

  /** Provide an AudioContext for decoding audio. Optional — without it audio is skipped. */
  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx;
  }

  onProgress(cb: ProgressCallback): void {
    this.progressCb = cb;
  }

  async loadAll(manifest: AssetManifest): Promise<void> {
    const textureIds = Object.keys(manifest.textures);
    const soundIds = Object.keys(manifest.sounds);
    const mapIds = Object.keys(manifest.maps);
    const total = textureIds.length + soundIds.length + mapIds.length;
    let loaded = 0;

    const tick = () => {
      loaded++;
      this.progressCb?.(loaded, total);
    };

    // Load textures (with placeholder fallback)
    await Promise.all(
      textureIds.map(async (id) => {
        try {
          this.textures.set(id, await this.loadTexture(manifest.textures[id]));
        } catch {
          console.warn(
            `[assets] texture "${id}" failed to load — using placeholder`,
          );
          this.textures.set(id, generatePlaceholderTexture(id));
        } finally {
          tick();
        }
      }),
    );

    // Load maps (no fallback — a missing map is fatal and surfaced to caller)
    await Promise.all(
      mapIds.map(async (id) => {
        try {
          this.maps.set(id, await this.loadMap(manifest.maps[id]));
        } finally {
          tick();
        }
      }),
    );

    // Load sounds (silent fallback)
    await Promise.all(
      soundIds.map(async (id) => {
        try {
          const buffer = await this.loadSound(manifest.sounds[id]);
          if (buffer) this.sounds.set(id, buffer);
        } catch {
          console.warn(
            `[assets] sound "${id}" failed to load — will play silently`,
          );
        } finally {
          tick();
        }
      }),
    );
  }

  private loadTexture(src: string): Promise<LoadedTexture> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const size = TEXTURE_SIZE;
        const off = document.createElement("canvas");
        off.width = size;
        off.height = size;
        const octx = off.getContext("2d");
        if (!octx) {
          reject(new Error("2D context unavailable"));
          return;
        }
        octx.imageSmoothingEnabled = false;
        octx.clearRect(0, 0, size, size);
        octx.drawImage(img, 0, 0, size, size);
        const data = octx.getImageData(0, 0, size, size).data;
        const pixels = new Uint32Array(size * size);
        for (let i = 0; i < pixels.length; i++) {
          pixels[i] = packRGBA(
            data[i * 4],
            data[i * 4 + 1],
            data[i * 4 + 2],
            data[i * 4 + 3],
          );
        }
        resolve({ width: size, height: size, pixels });
      };
      img.onerror = () => reject(new Error(`failed to load image: ${src}`));
      img.src = src;
    });
  }

  private async loadSound(src: string): Promise<AudioBuffer | null> {
    if (!this.audioContext) return null;
    const resp = await fetch(src);
    if (!resp.ok) throw new Error(`failed to fetch sound: ${src}`);
    const arrayBuffer = await resp.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  private async loadMap(src: string): Promise<MapJSON> {
    const resp = await fetch(src);
    if (!resp.ok) throw new Error(`failed to fetch map: ${src}`);
    const json = (await resp.json()) as MapJSON;
    validateMapJSON(json);
    return json;
  }

  getTexture(id: string): LoadedTexture {
    const tex = this.textures.get(id);
    if (!tex) {
      // Defensive: return a placeholder rather than crashing the render loop.
      const placeholder = generatePlaceholderTexture(id);
      this.textures.set(id, placeholder);
      return placeholder;
    }
    return tex;
  }

  hasTexture(id: string): boolean {
    return this.textures.has(id);
  }

  getSound(id: string): AudioBuffer | null {
    return this.sounds.get(id) ?? null;
  }

  getMap(id: string): MapJSON {
    const map = this.maps.get(id);
    if (!map) throw new Error(`map not loaded: ${id}`);
    return map;
  }
}
