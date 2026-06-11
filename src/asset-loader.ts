// Loads textures, sounds, and maps. Textures are converted to raw RGBA pixel
// arrays for fast per-column sampling during raycasting.

import type { AssetManifest, MapJSON, Texture } from './types';

type ProgressCallback = (loaded: number, total: number) => void;

export class AssetLoader {
  private textures = new Map<string, Texture>();
  private sounds = new Map<string, AudioBuffer>();
  private maps = new Map<string, MapJSON>();
  private progressCallback: ProgressCallback | null = null;

  onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  async loadAll(manifest: AssetManifest, audioContext: AudioContext): Promise<void> {
    const textureEntries = Object.entries(manifest.textures);
    const soundEntries = Object.entries(manifest.sounds);
    const mapEntries = Object.entries(manifest.maps);

    const total =
      textureEntries.length + soundEntries.length + mapEntries.length;
    let loaded = 0;

    const reportProgress = () => {
      loaded += 1;
      this.progressCallback?.(loaded, total);
    };

    const texturePromises = textureEntries.map(async ([id, path]) => {
      const texture = await loadTexture(path);
      this.textures.set(id, texture);
      reportProgress();
    });

    const soundPromises = soundEntries.map(async ([id, path]) => {
      try {
        const buffer = await loadSound(path, audioContext);
        this.sounds.set(id, buffer);
      } catch {
        // Audio is non-critical; continue without it.
        console.warn(`Failed to load sound: ${id} (${path})`);
      }
      reportProgress();
    });

    const mapPromises = mapEntries.map(async ([id, path]) => {
      const map = await loadMap(path);
      this.maps.set(id, map);
      reportProgress();
    });

    await Promise.all([...texturePromises, ...soundPromises, ...mapPromises]);
  }

  getTexture(id: string): Texture {
    const texture = this.textures.get(id);
    if (!texture) {
      throw new Error(`Texture not found: ${id}`);
    }
    return texture;
  }

  hasTexture(id: string): boolean {
    return this.textures.has(id);
  }

  getSound(id: string): AudioBuffer | undefined {
    return this.sounds.get(id);
  }

  getMap(id: string): MapJSON {
    const map = this.maps.get(id);
    if (!map) {
      throw new Error(`Map not found: ${id}`);
    }
    return map;
  }

  /** Register a texture directly (used for procedurally generated placeholders). */
  registerTexture(id: string, texture: Texture): void {
    this.textures.set(id, texture);
  }
}

async function loadTexture(path: string): Promise<Texture> {
  const img = new Image();
  img.src = path;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context for texture loading');
  }
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  return {
    width: img.width,
    height: img.height,
    data: imageData.data,
  };
}

async function loadSound(
  path: string,
  audioContext: AudioContext,
): Promise<AudioBuffer> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch sound: ${path}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

async function loadMap(path: string): Promise<MapJSON> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch map: ${path}`);
  }
  const json = await response.json();
  return json as MapJSON;
}
