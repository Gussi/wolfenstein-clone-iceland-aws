/**
 * Red Tape enemy AI: a state machine (idle → alert → pursue → attack, with
 * stunned/dispersed branches), line-of-sight detection, pursuit movement with
 * wall sliding, and melee attacks against the player.
 */

import { slideMove } from './collision';
import {
  ALERT_DURATION,
  DETECTION_RANGE,
  DISPERSE_DURATION,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_ATTACK_RANGE,
  ENEMY_DAMAGE,
  ENEMY_HEALTH,
  ENEMY_RADIUS,
  ENEMY_SPEED,
  ENEMY_TAUNTS,
  STUN_DURATION,
  TAUNT_DISPLAY_TIME,
} from './constants';
import { distance, normalize } from './math/vector';
import { isSolidAt } from './map/mapState';
import type { EnemyEntity, EnemySpawn, MapState, PlayerState } from './types';

let enemyCounter = 0;

/** Create a runtime enemy from a spawn definition (placed at cell center). */
export function createEnemy(spawn: EnemySpawn): EnemyEntity {
  return {
    id: `enemy-${enemyCounter++}`,
    type: 'redTape',
    x: spawn.x + 0.5,
    y: spawn.y + 0.5,
    state: 'idle',
    stateTimer: 0,
    lastKnownPlayerX: 0,
    lastKnownPlayerY: 0,
    attackCooldown: 0,
    health: ENEMY_HEALTH,
    active: true,
    animationFrame: 0,
    animationTimer: 0,
    hasTaunted: false,
    tauntText: '',
    tauntTimer: 0,
  };
}

/**
 * Apply stun damage to an enemy. Transitions to 'stunned', or 'dispersed' if
 * its health is exhausted. Returns true if this hit dispersed it.
 */
export function applyStun(enemy: EnemyEntity, damage: number): boolean {
  if (!enemy.active || enemy.state === 'dispersed') return false;
  enemy.health -= damage;
  if (enemy.health <= 0) {
    enemy.health = 0;
    enemy.state = 'dispersed';
    enemy.stateTimer = 0;
    return true;
  }
  enemy.state = 'stunned';
  enemy.stateTimer = 0;
  return false;
}

/**
 * Line-of-sight check via DDA: returns true if no solid tile lies between the
 * enemy and the player and they are within DETECTION_RANGE.
 */
export function canSeePlayer(enemy: EnemyEntity, player: PlayerState, map: MapState): boolean {
  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  if (dist > DETECTION_RANGE) return false;

  const dir = normalize(player.x - enemy.x, player.y - enemy.y);
  if (dir.x === 0 && dir.y === 0) return true;

  // March in small steps; cheap and adequate for a 32x32 grid.
  const stepSize = 0.1;
  const steps = Math.floor(dist / stepSize);
  for (let i = 1; i < steps; i++) {
    const px = enemy.x + dir.x * stepSize * i;
    const py = enemy.y + dir.y * stepSize * i;
    if (isSolidAt(map, px, py)) return false;
  }
  return true;
}

export interface EnemyUpdateResult {
  /** Total damage dealt to the player this frame. */
  playerDamage: number;
  /** Enemies that newly entered 'alert' this frame (for taunt/SFX). */
  newlyAlerted: EnemyEntity[];
  /** Enemies that attacked this frame (for SFX). */
  attacked: EnemyEntity[];
}

function assignTaunt(enemy: EnemyEntity): void {
  if (enemy.hasTaunted) return;
  enemy.hasTaunted = true;
  enemy.tauntText = ENEMY_TAUNTS[Math.floor(Math.random() * ENEMY_TAUNTS.length)];
  enemy.tauntTimer = TAUNT_DISPLAY_TIME;
}

/** Advance a single enemy's state machine. */
function updateEnemy(
  enemy: EnemyEntity,
  player: PlayerState,
  map: MapState,
  dt: number,
  result: EnemyUpdateResult,
): void {
  enemy.stateTimer += dt;
  enemy.animationTimer += dt;
  if (enemy.attackCooldown > 0) enemy.attackCooldown -= dt;
  if (enemy.tauntTimer > 0) enemy.tauntTimer -= dt;

  // Walk animation cycles roughly every 0.25s.
  if (enemy.animationTimer >= 0.25) {
    enemy.animationTimer = 0;
    enemy.animationFrame ^= 1;
  }

  const dist = distance(enemy.x, enemy.y, player.x, player.y);
  const sees = player.alive && canSeePlayer(enemy, player, map);
  if (sees) {
    enemy.lastKnownPlayerX = player.x;
    enemy.lastKnownPlayerY = player.y;
  }

  switch (enemy.state) {
    case 'idle': {
      if (sees) {
        enemy.state = 'alert';
        enemy.stateTimer = 0;
        assignTaunt(enemy);
        result.newlyAlerted.push(enemy);
      }
      break;
    }
    case 'alert': {
      if (enemy.stateTimer >= ALERT_DURATION) {
        enemy.state = 'pursue';
        enemy.stateTimer = 0;
      }
      break;
    }
    case 'pursue': {
      if (dist <= ENEMY_ATTACK_RANGE && sees) {
        enemy.state = 'attack';
        enemy.stateTimer = 0;
        break;
      }
      // Move toward last known player position.
      const dir = normalize(enemy.lastKnownPlayerX - enemy.x, enemy.lastKnownPlayerY - enemy.y);
      const step = ENEMY_SPEED * dt;
      const moved = slideMove(map, enemy.x, enemy.y, dir.x * step, dir.y * step, ENEMY_RADIUS);
      enemy.x = moved.x;
      enemy.y = moved.y;
      // If we've reached the last known spot and can't see the player, give up.
      const reached = distance(enemy.x, enemy.y, enemy.lastKnownPlayerX, enemy.lastKnownPlayerY) < 0.4;
      if (reached && !sees) {
        enemy.state = 'idle';
        enemy.stateTimer = 0;
      }
      break;
    }
    case 'attack': {
      if (enemy.attackCooldown <= 0) {
        result.playerDamage += ENEMY_DAMAGE;
        result.attacked.push(enemy);
        enemy.attackCooldown = ENEMY_ATTACK_COOLDOWN;
      }
      // Leave attack once player steps out of range.
      if (dist > ENEMY_ATTACK_RANGE || !sees) {
        enemy.state = 'pursue';
        enemy.stateTimer = 0;
      }
      break;
    }
    case 'stunned': {
      if (enemy.stateTimer >= STUN_DURATION) {
        enemy.state = 'pursue';
        enemy.stateTimer = 0;
      }
      break;
    }
    case 'dispersed': {
      if (enemy.stateTimer >= DISPERSE_DURATION) {
        enemy.active = false;
      }
      break;
    }
  }
}

/** Update all enemies and aggregate their effects on the player. */
export function updateEnemies(
  enemies: EnemyEntity[],
  player: PlayerState,
  map: MapState,
  dt: number,
): EnemyUpdateResult {
  const result: EnemyUpdateResult = { playerDamage: 0, newlyAlerted: [], attacked: [] };
  for (const e of enemies) {
    if (!e.active) continue;
    updateEnemy(e, player, map, dt, result);
  }
  return result;
}

/** Count enemies still in play (not dispersed/removed). */
export function aliveEnemyCount(enemies: EnemyEntity[]): number {
  let n = 0;
  for (const e of enemies) {
    if (e.active && e.state !== 'dispersed') n++;
  }
  return n;
}

/** Sprite key for an enemy's current visual state. */
export function enemySpriteKey(enemy: EnemyEntity): string {
  switch (enemy.state) {
    case 'attack':
      return 'redTape_attack';
    case 'stunned':
      return 'redTape_stunned';
    case 'dispersed': {
      const phase = Math.min(2, Math.floor((enemy.stateTimer / DISPERSE_DURATION) * 3));
      return `redTape_dispersed${phase}`;
    }
    default:
      return enemy.animationFrame === 0 ? 'redTape_walk0' : 'redTape_walk1';
  }
}
