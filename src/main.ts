/**
 * Entry point: bootstraps the canvas, generates procedural assets, wires input
 * and audio, manages the click-to-play / pointer-lock overlay, and runs the
 * fixed-delta requestAnimationFrame game loop.
 */

import { generateSpriteRegistry } from './assets/spriteGfx';
import { generateTextures } from './assets/textures';
import { loadImageAssets } from './assets/imageAssets';
import { AudioManager } from './audio';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from './constants';
import {
  type RenderContext,
  createGameWorld,
  renderWorld,
  updateWorld,
} from './game';
import { InputManager } from './input';
import { buildLevel0, validateMap } from './map/mapData';
import { createFramebuffer } from './raycaster';
import type { GameWorldState } from './types';

const MUSIC_URL = encodeURI('music/Loftsöngur - 8bit.mp3');

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

function setupCanvasSize(canvas: HTMLCanvasElement): void {
  const aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
  const resize = () => {
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (w / h > aspect) w = Math.floor(h * aspect);
    else h = Math.floor(w / aspect);
    canvas.width = w;
    canvas.height = h;
  };
  resize();
  window.addEventListener('resize', resize);
}

async function main(): Promise<void> {
  const canvas = $('game-canvas') as HTMLCanvasElement;
  const overlay = $('overlay');
  const message = $('overlay-message');
  const button = $('overlay-button') as HTMLButtonElement;
  const loadingBar = $('loading-bar');
  const loadingFill = $('loading-fill');

  setupCanvasSize(canvas);

  const mainCtx = canvas.getContext('2d');
  if (!mainCtx) throw new Error('Canvas 2D context unavailable');

  // --- Generate assets (with a brief loading indicator). ---
  const setProgress = (p: number) => {
    loadingFill.style.width = `${Math.round(p * 100)}%`;
  };
  setProgress(0.1);
  await new Promise((r) => requestAnimationFrame(r));

  const textures = generateTextures();
  setProgress(0.5);
  await new Promise((r) => requestAnimationFrame(r));

  const sprites = generateSpriteRegistry();
  setProgress(0.8);
  await new Promise((r) => requestAnimationFrame(r));

  // Bitmap atlases (walls, doors/elevator, clerk faces, frying pan).
  const imageAssets = await loadImageAssets();
  for (const [id, tex] of imageAssets.wallTextures) textures.set(id, tex);
  for (const [key, tex] of imageAssets.sprites) sprites.set(key, tex);
  setProgress(0.9);
  await new Promise((r) => requestAnimationFrame(r));

  // --- Build and validate the level. ---
  const mapJson = buildLevel0();
  const validation = validateMap(mapJson);
  if (!validation.valid) {
    message.textContent = `Map error: ${validation.errors.join('; ')}`;
    loadingBar.style.display = 'none';
    return;
  }

  // --- Offscreen render target + framebuffer. ---
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = SCREEN_WIDTH;
  offscreenCanvas.height = SCREEN_HEIGHT;
  const offscreenCtx = offscreenCanvas.getContext('2d');
  if (!offscreenCtx) throw new Error('Offscreen 2D context unavailable');
  const fb = createFramebuffer();

  const rc: RenderContext = {
    mainCtx,
    offscreenCanvas,
    offscreenCtx,
    fb,
    textures,
    sprites,
  };

  // --- Game state, input, audio. ---
  let state: GameWorldState = createGameWorld(mapJson);
  const input = new InputManager(canvas);
  const audio = new AudioManager();
  void audio.loadMusic(MUSIC_URL);

  setProgress(1);

  // --- Overlay / pointer-lock management. ---
  const showOverlay = (msg: string) => {
    message.textContent = msg;
    loadingBar.style.display = 'none';
    button.style.display = 'inline-block';
    overlay.classList.remove('hidden');
  };
  const hideOverlay = () => overlay.classList.add('hidden');

  showOverlay('An ordinary citizen. One unfiled form. A bloating ministry.');

  button.addEventListener('click', () => {
    audio.resume();
    audio.startMusic();
    canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      hideOverlay();
      if (state.gameStatus === 'paused') state.gameStatus = 'playing';
    } else {
      // Lost pointer lock: pause an in-progress game.
      if (state.gameStatus === 'playing') state.gameStatus = 'paused';
      showOverlay('Paused. Click to return to the queue.');
    }
  });

  // --- Game loop. ---
  let last = performance.now();
  const frame = (now: number) => {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // clamp to avoid tunneling after tab switches

    if (input.consumeFullscreen()) {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
      else void document.exitFullscreen();
    }

    if (
      (state.gameStatus === 'gameOver' || state.gameStatus === 'victory') &&
      input.consumeRestart()
    ) {
      state = createGameWorld(mapJson);
      state.gameStatus = 'playing';
    }

    updateWorld(state, input, audio, dt);
    renderWorld(state, rc);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

main().catch((err) => {
  console.error(err);
  const message = document.getElementById('overlay-message');
  if (message) message.textContent = `Failed to start: ${(err as Error).message}`;
});
