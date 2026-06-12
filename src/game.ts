/**
 * Game world: state construction, per-frame update orchestration (player,
 * weapon/combat, enemies, pickups, doors/pushwalls, win/lose flow), and the
 * top-level render that composites world, weapon, HUD, and overlays.
 */

import type { SpriteRegistry } from './assets/spriteGfx';
import type { TextureSet } from './assets/textures';
import { AudioManager } from './audio';
import { resolveMelee } from './combat';
import {
  BLESSING_DURATION,
  COFFEE_HEAL,
  INTRO_DURATION,
  KLEINUR_HEAL,
  PICKUP_RADIUS,
  SCORE_LEVEL_COMPLETE,
  SCORE_PER_ENEMY,
  TAUNT_DISPLAY_TIME,
} from './constants';
import {
  aliveEnemyCount,
  createEnemy,
  enemySpriteKey,
  updateEnemies,
} from './enemies';
import {
  drawCenterOverlay,
  drawHud,
  drawTaunt,
  drawWeaponViewmodel,
} from './hud';
import type { InputManager } from './input';
import { createMapState, updateMapState } from './map/mapState';
import { distance } from './math/vector';
import { createPlayer, damagePlayer, healPlayer, interact, updatePlayer } from './player';
import { type Framebuffer, renderWalls } from './raycaster';
import { renderSprites } from './sprites';
import type {
  GameWorldState,
  MapJSON,
  PickupEntity,
  Renderable,
} from './types';
import { createWeapon, startSwing, updateWeapon, weaponSpriteKey } from './weapon';

let pickupCounter = 0;

/** Build a fresh game world from authored map data (status = 'blessing'). */
export function createGameWorld(mapJson: MapJSON): GameWorldState {
  const map = createMapState(mapJson);
  const player = createPlayer(mapJson.playerSpawn);
  const enemies = mapJson.enemies.map(createEnemy);
  const pickups: PickupEntity[] = mapJson.pickups.map((p) => ({
    id: `pickup-${pickupCounter++}`,
    type: p.type,
    x: p.x + 0.5,
    y: p.y + 0.5,
    healAmount: p.type === 'coffee' ? COFFEE_HEAL : KLEINUR_HEAL,
    active: true,
  }));

  return {
    gameStatus: 'blessing',
    player,
    map,
    enemies,
    pickups,
    decorations: mapJson.decorations,
    weapon: createWeapon(),
    score: { connections: 0 },
    levelStats: {
      enemiesDispersed: 0,
      totalEnemies: enemies.length,
      secretsFound: 0,
      totalSecrets: mapJson.pushWalls.length,
      connections: 0,
      timeSeconds: 0,
    },
    time: { elapsed: 0, deltaTime: 0 },
    blessingTimer: BLESSING_DURATION,
    introTimer: INTRO_DURATION,
    gameOverTimer: 0,
  };
}

function finalizeStats(state: GameWorldState): void {
  state.levelStats.enemiesDispersed = state.player.enemiesDispersed;
  state.levelStats.secretsFound = state.player.secretsFound;
  state.levelStats.connections = state.player.connections;
  state.levelStats.timeSeconds = state.time.elapsed;
}

/** Advance the whole world by dt seconds, applying input and audio cues. */
export function updateWorld(
  state: GameWorldState,
  input: InputManager,
  audio: AudioManager,
  dt: number,
): void {
  state.time.deltaTime = dt;

  // One-shot pause toggle.
  if (input.consumePause()) {
    if (state.gameStatus === 'playing') state.gameStatus = 'paused';
    else if (state.gameStatus === 'paused') state.gameStatus = 'playing';
  }

  switch (state.gameStatus) {
    case 'blessing': {
      state.blessingTimer -= dt;
      // The benediction lingers, then yields to the intro (skippable by input).
      if (state.blessingTimer <= 0 || input.consumeAttack() || input.consumeInteract()) {
        state.gameStatus = 'intro';
      }
      break;
    }
    case 'intro': {
      state.introTimer -= dt;
      // Any attack/interact press (or timeout) starts the level.
      if (state.introTimer <= 0 || input.consumeAttack() || input.consumeInteract()) {
        state.gameStatus = 'playing';
      }
      break;
    }
    case 'playing': {
      state.time.elapsed += dt;
      updatePlaying(state, input, audio, dt);
      break;
    }
    case 'gameOver': {
      state.gameOverTimer += dt;
      break;
    }
    case 'paused':
    case 'victory':
    case 'loading':
      break;
  }
}

function updatePlaying(
  state: GameWorldState,
  input: InputManager,
  audio: AudioManager,
  dt: number,
): void {
  const { player, map, enemies, weapon } = state;

  // Player movement + facing.
  const movement = input.consumeMovement();
  updatePlayer(player, movement, map, dt);

  // Interaction (doors / push-walls).
  if (input.consumeInteract()) {
    const r = interact(player, map);
    if (r.openedDoor) audio.play('door');
    if (r.revealedSecret) {
      audio.play('secret');
      state.score.connections = player.connections;
    }
  }

  // Weapon: start a swing on click, advance animation, resolve hit at midpoint.
  if (input.consumeAttack() && startSwing(weapon)) {
    audio.play('swing');
  }
  updateWeapon(weapon, dt);
  if (weapon.hitPending) {
    const result = resolveMelee(player, enemies);
    if (result.hitEnemy) {
      audio.play(result.dispersed ? 'disperse' : 'hit');
      if (result.dispersed) {
        player.enemiesDispersed += 1;
        player.connections += SCORE_PER_ENEMY;
        state.score.connections = player.connections;
      }
    }
  }

  // Doors / push-walls animate.
  updateMapState(map, dt);

  // Enemies.
  const enemyResult = updateEnemies(enemies, player, map, dt);
  if (enemyResult.newlyAlerted.length > 0) audio.play('alert');
  if (enemyResult.playerDamage > 0) {
    const downed = damagePlayer(player, enemyResult.playerDamage);
    audio.play('hurt');
    if (downed) {
      state.gameStatus = 'gameOver';
      state.gameOverTimer = 0;
      finalizeStats(state);
      return;
    }
  }

  // Pickups (auto-collect within radius).
  for (const pk of state.pickups) {
    if (!pk.active) continue;
    if (distance(player.x, player.y, pk.x, pk.y) <= PICKUP_RADIUS) {
      healPlayer(player, pk.healAmount);
      pk.active = false;
      audio.play('pickup');
    }
  }

  // Win condition.
  if (aliveEnemyCount(enemies) === 0) {
    player.connections += SCORE_LEVEL_COMPLETE;
    state.score.connections = player.connections;
    state.gameStatus = 'victory';
    finalizeStats(state);
  }
}

/** Collect this frame's renderable billboards (enemies, pickups, decorations). */
function buildRenderables(state: GameWorldState): Renderable[] {
  const out: Renderable[] = [];
  for (const e of state.enemies) {
    if (!e.active) continue;
    out.push({ x: e.x, y: e.y, textureKey: enemySpriteKey(e), vMove: 0 });
  }
  for (const pk of state.pickups) {
    if (!pk.active) continue;
    out.push({ x: pk.x, y: pk.y, textureKey: pk.type, vMove: 0.22 });
  }
  for (const d of state.decorations) {
    out.push({ x: d.x + 0.5, y: d.y + 0.5, textureKey: d.type, vMove: 0.12 });
  }
  return out;
}

/** Project a world point to screen coords for the given view size. */
function projectToScreen(
  state: GameWorldState,
  wx: number,
  wy: number,
  viewW: number,
  viewH: number,
): { x: number; y: number; visible: boolean } {
  const p = state.player;
  const invDet = 1 / (p.planeX * p.dirY - p.dirX * p.planeY);
  const sx = wx - p.x;
  const sy = wy - p.y;
  const transformX = invDet * (p.dirY * sx - p.dirX * sy);
  const transformY = invDet * (-p.planeY * sx + p.planeX * sy);
  if (transformY <= 0.1) return { x: 0, y: 0, visible: false };
  const screenX = (viewW / 2) * (1 + transformX / transformY);
  const screenY = viewH / 2 - viewH / transformY / 3;
  return { x: screenX, y: screenY, visible: true };
}

export interface RenderContext {
  mainCtx: CanvasRenderingContext2D;
  offscreenCanvas: HTMLCanvasElement;
  offscreenCtx: CanvasRenderingContext2D;
  fb: Framebuffer;
  textures: TextureSet;
  sprites: SpriteRegistry;
}

const INTRO_LINES = [
  'You only wanted to file one form.',
  'Then the Hrun happened, and the building grew new wings.',
  'Climb to the top office. Bring kitchenware.',
  '',
  'WASD move - Mouse / Arrow keys look - Click: pan - E: open/interact',
  '',
  '(A volcano is erupting outside. Everyone is ignoring it.)',
];

/** Composite the full frame to the main canvas. */
export function renderWorld(state: GameWorldState, rc: RenderContext): void {
  const { mainCtx, offscreenCanvas, offscreenCtx, fb, textures, sprites } = rc;
  const w = mainCtx.canvas.width;
  const h = mainCtx.canvas.height;
  const barH = Math.max(64, Math.floor(h * 0.16));
  const viewH = h; // world fills the canvas; HUD overlays the bottom

  // World: walls then sprites into the framebuffer.
  renderWalls(fb, state.player, state.map, textures);
  renderSprites(fb, state.player, buildRenderables(state), sprites);
  offscreenCtx.putImageData(fb.imageData, 0, 0);

  // Blit scaled (pixelated) to the main canvas.
  mainCtx.imageSmoothingEnabled = false;
  mainCtx.drawImage(offscreenCanvas, 0, 0, fb.width, fb.height, 0, 0, w, viewH);

  // Enemy taunts (project to screen).
  for (const e of state.enemies) {
    if (!e.active || e.tauntTimer <= 0 || !e.tauntText) continue;
    const proj = projectToScreen(state, e.x, e.y, w, viewH);
    if (!proj.visible) continue;
    drawTaunt(mainCtx, e.tauntText, proj.x, proj.y, e.tauntTimer / TAUNT_DISPLAY_TIME);
  }

  // Weapon viewmodel (sits just above the HUD bar).
  if (state.gameStatus === 'playing' || state.gameStatus === 'paused') {
    drawWeaponViewmodel(mainCtx, weaponSpriteKey(state.weapon), sprites, w, h - barH);
  }

  // HUD bar.
  if (
    state.gameStatus !== 'blessing' &&
    state.gameStatus !== 'intro' &&
    state.gameStatus !== 'loading'
  ) {
    drawHud(mainCtx, state, sprites, w, h);
  }

  // Status overlays.
  if (state.gameStatus === 'blessing') {
    // A solemn benediction screen before the intro briefing.
    mainCtx.fillStyle = '#0a0a0c';
    mainCtx.fillRect(0, 0, w, h);
    drawCenterOverlay(
      mainCtx,
      w,
      h,
      'Guð Blessi Ísland',
      ['God bless Iceland.', '', '...and may it bless this paperwork.'],
      false,
    );
  } else if (state.gameStatus === 'intro') {
    drawCenterOverlay(mainCtx, w, h, 'Pots & Parliament', INTRO_LINES);
  } else if (state.gameStatus === 'paused') {
    drawCenterOverlay(mainCtx, w, h, 'Paused', ['Press Esc to resume']);
  } else if (state.gameStatus === 'gameOver') {
    drawCenterOverlay(mainCtx, w, h, 'You Gave Up and Went Home', [
      'The form remains unfiled.',
      `Connections: ${state.levelStats.connections}`,
      '',
      'Press R to try again',
    ]);
  } else if (state.gameStatus === 'victory') {
    drawCenterOverlay(mainCtx, w, h, 'Reckoning Achieved', [
      `Enemies dispersed: ${state.levelStats.enemiesDispersed}/${state.levelStats.totalEnemies}`,
      `Secrets found: ${state.levelStats.secretsFound}/${state.levelStats.totalSecrets}`,
      `Connections: ${state.levelStats.connections}  (vs. everyone's cousins)`,
      `Time: ${state.levelStats.timeSeconds.toFixed(1)}s`,
      '',
      'Press R to play again',
    ]);
  }
}
