// Entry point: bootstrap canvases, load assets, generate placeholder
// textures, wire up systems, and start the game on first click.

import { SCREEN_HEIGHT, SCREEN_WIDTH } from './constants';
import { AssetLoader } from './asset-loader';
import { AudioSystem } from './audio-system';
import { GameLoop, type GameSystems } from './game-loop';
import { HUDRenderer } from './hud-renderer';
import { InputSystem } from './input-system';
import { Renderer } from './renderer';
import { generatePlaceholderTextures } from './placeholder-textures';
import type { AssetManifest } from './types';

const MANIFEST: AssetManifest = {
  // Textures are procedurally generated as placeholders (see
  // placeholder-textures.ts). Real PNGs can be added here later.
  textures: {},
  sounds: {
    'sfx-swing': 'assets/audio/sfx/swing.mp3',
    'sfx-hit': 'assets/audio/sfx/hit.mp3',
    'sfx-disperse': 'assets/audio/sfx/disperse.mp3',
    'sfx-player-hurt': 'assets/audio/sfx/player-hurt.mp3',
    'sfx-door': 'assets/audio/sfx/door.mp3',
    'sfx-secret': 'assets/audio/sfx/secret.mp3',
    'sfx-pickup': 'assets/audio/sfx/pickup.mp3',
    'sfx-victory': 'assets/audio/sfx/victory.mp3',
    'music-ambient': 'assets/audio/music/ambient.mp3',
  },
  maps: {
    level1: 'assets/maps/level1.json',
  },
};

async function bootstrap(): Promise<void> {
  const displayCanvas = document.getElementById(
    'game-canvas',
  ) as HTMLCanvasElement;
  const loadingEl = document.getElementById('loading')!;
  const loadingFill = document.getElementById('loading-bar-fill')!;
  const overlayEl = document.getElementById('overlay')!;

  // Size the display canvas to a 16:10 area fitting the window.
  resizeDisplayCanvas(displayCanvas);
  window.addEventListener('resize', () => resizeDisplayCanvas(displayCanvas));

  const mainCtx = displayCanvas.getContext('2d')!;

  // Offscreen canvas at the internal render resolution.
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = SCREEN_WIDTH;
  offscreenCanvas.height = SCREEN_HEIGHT;
  const offscreenCtx = offscreenCanvas.getContext('2d')!;

  // Systems.
  const assets = new AssetLoader();
  const audio = new AudioSystem(assets);
  const input = new InputSystem();

  assets.onProgress((loaded, total) => {
    const pct = total === 0 ? 100 : Math.floor((loaded / total) * 100);
    (loadingFill as HTMLElement).style.width = `${pct}%`;
  });

  // Audio context needs a user gesture; create it lazily but prepare loader.
  const audioContext = audio.getContext();

  // Generate placeholder art immediately (synchronous).
  generatePlaceholderTextures(assets);

  // Load sounds + maps (textures are placeholders, so manifest.textures empty).
  await assets.loadAll(MANIFEST, audioContext);

  const renderer = new Renderer(offscreenCtx, assets);
  const hud = new HUDRenderer(assets);

  input.init(displayCanvas);

  const systems: GameSystems = {
    assets,
    input,
    audio,
    renderer,
    hud,
    mainCtx,
    offscreenCanvas,
    displayCanvas,
  };

  const mapData = assets.getMap('level1');
  const game = new GameLoop(systems, mapData);
  game.bindRestartKey();

  // Hide loading, show "click to play".
  loadingEl.classList.add('hidden');
  overlayEl.classList.remove('hidden');

  const beginPlay = () => {
    overlayEl.classList.add('hidden');
    audio.init(); // resume audio context on gesture
    audio.playMusic('music-ambient');
    input.requestPointerLock();
    if (game.getStatus() === 'loading' || game.getStatus() === 'intro') {
      game.start();
    }
  };

  overlayEl.addEventListener('click', beginPlay);

  // Re-show overlay if pointer lock is lost during play.
  input.setPointerLockChangeHandler((locked) => {
    if (!locked && game.getStatus() === 'playing') {
      overlayEl.classList.remove('hidden');
      const prompt = overlayEl.querySelector('.prompt');
      if (prompt) prompt.textContent = 'CLICK TO RESUME';
    }
  });
}

function resizeDisplayCanvas(canvas: HTMLCanvasElement): void {
  const aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
  let w = window.innerWidth;
  let h = window.innerHeight;
  if (w / h > aspect) {
    w = h * aspect;
  } else {
    h = w / aspect;
  }
  canvas.width = Math.floor(w);
  canvas.height = Math.floor(h);
}

bootstrap().catch((err) => {
  console.error('Failed to start game:', err);
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.textContent = `Failed to load: ${err instanceof Error ? err.message : String(err)}`;
  }
});
