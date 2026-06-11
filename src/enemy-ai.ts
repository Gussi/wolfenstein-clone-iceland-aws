// Red Tape enemy behavior: state machine (idle -> alert -> pursue -> attack),
// line-of-sight detection, grid-sliding pursuit, stun and disperse handling.

import {
  ALERT_DURATION,
  DETECTION_RANGE,
  DISPERSE_DURATION,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_ATTACK_RANGE,
  ENEMY_COLLISION_RADIUS,
  ENEMY_DAMAGE,
  ENEMY_DISPERSE_FRAME_TIME,
  ENEMY_SPEED,
  ENEMY_WALK_FRAME_TIME,
  SCORE_PER_ENEMY,
  STUN_DURATION,
  TAUNT_DURATION,
} from './constants';
import { distance, normalizeVector } from './math-utils';
import type { MapSystem } from './map-system';
import type { EnemyEntity, HitResult, PlayerState } from './types';

export interface EnemyUpdateContext {
  player: PlayerState;
  map: MapSystem;
  deltaTime: number;
}

export interface EnemyUpdateOutcome {
  dealtDamage: number; // damage to apply to player this frame
  startedTaunt: boolean;
}

export class EnemyAI {
  /**
   * Tick one enemy's behavior. Returns any damage it dealt to the player.
   */
  update(enemy: EnemyEntity, ctx: EnemyUpdateContext): EnemyUpdateOutcome {
    const outcome: EnemyUpdateOutcome = { dealtDamage: 0, startedTaunt: false };
    if (!enemy.active) return outcome;

    enemy.stateTimer += ctx.deltaTime;
    if (enemy.attackCooldown > 0) enemy.attackCooldown -= ctx.deltaTime;
    if (enemy.tauntTimer > 0) enemy.tauntTimer -= ctx.deltaTime;

    this.advanceAnimation(enemy, ctx.deltaTime);

    switch (enemy.state) {
      case 'idle':
        this.tickIdle(enemy, ctx, outcome);
        break;
      case 'alert':
        this.tickAlert(enemy, ctx);
        break;
      case 'pursue':
        this.tickPursue(enemy, ctx, outcome);
        break;
      case 'attack':
        this.tickAttack(enemy, ctx, outcome);
        break;
      case 'stunned':
        this.tickStunned(enemy);
        break;
      case 'dispersed':
        this.tickDispersed(enemy);
        break;
    }

    return outcome;
  }

  private tickIdle(
    enemy: EnemyEntity,
    ctx: EnemyUpdateContext,
    outcome: EnemyUpdateOutcome,
  ): void {
    if (this.canSeePlayer(enemy, ctx.player, ctx.map)) {
      this.transition(enemy, 'alert');
      if (!enemy.hasTaunted) {
        enemy.hasTaunted = true;
        enemy.tauntTimer = TAUNT_DURATION;
        outcome.startedTaunt = true;
      }
    }
  }

  private tickAlert(enemy: EnemyEntity, ctx: EnemyUpdateContext): void {
    enemy.lastKnownPlayerX = ctx.player.x;
    enemy.lastKnownPlayerY = ctx.player.y;
    if (enemy.stateTimer >= ALERT_DURATION) {
      this.transition(enemy, 'pursue');
    }
  }

  private tickPursue(
    enemy: EnemyEntity,
    ctx: EnemyUpdateContext,
    outcome: EnemyUpdateOutcome,
  ): void {
    const seePlayer = this.canSeePlayer(enemy, ctx.player, ctx.map);
    let targetX: number;
    let targetY: number;

    if (seePlayer) {
      enemy.lastKnownPlayerX = ctx.player.x;
      enemy.lastKnownPlayerY = ctx.player.y;
      targetX = ctx.player.x;
      targetY = ctx.player.y;

      const distToPlayer = distance(enemy.x, enemy.y, ctx.player.x, ctx.player.y);
      if (distToPlayer <= ENEMY_ATTACK_RANGE) {
        this.transition(enemy, 'attack');
        return;
      }
    } else {
      targetX = enemy.lastKnownPlayerX;
      targetY = enemy.lastKnownPlayerY;
      // Reached last known position with no sight -> give up.
      if (distance(enemy.x, enemy.y, targetX, targetY) < 0.3) {
        this.transition(enemy, 'idle');
        return;
      }
    }

    this.moveToward(enemy, targetX, targetY, ctx);
    // outcome unchanged; pursuit deals no direct damage.
    void outcome;
  }

  private tickAttack(
    enemy: EnemyEntity,
    ctx: EnemyUpdateContext,
    outcome: EnemyUpdateOutcome,
  ): void {
    const distToPlayer = distance(enemy.x, enemy.y, ctx.player.x, ctx.player.y);
    if (distToPlayer > ENEMY_ATTACK_RANGE) {
      this.transition(enemy, 'pursue');
      return;
    }
    if (enemy.attackCooldown <= 0) {
      outcome.dealtDamage = ENEMY_DAMAGE;
      enemy.attackCooldown = ENEMY_ATTACK_COOLDOWN;
    }
  }

  private tickStunned(enemy: EnemyEntity): void {
    if (enemy.stateTimer >= STUN_DURATION) {
      this.transition(enemy, 'pursue');
    }
  }

  private tickDispersed(enemy: EnemyEntity): void {
    if (enemy.stateTimer >= DISPERSE_DURATION) {
      enemy.active = false;
    }
  }

  private moveToward(
    enemy: EnemyEntity,
    targetX: number,
    targetY: number,
    ctx: EnemyUpdateContext,
  ): void {
    const dir = normalizeVector(targetX - enemy.x, targetY - enemy.y);
    const dist = ENEMY_SPEED * ctx.deltaTime;
    const moveX = dir.x * dist;
    const moveY = dir.y * dist;

    // Axis-independent collision (sliding), like the player.
    const newX = enemy.x + moveX;
    const marginX = moveX > 0 ? ENEMY_COLLISION_RADIUS : -ENEMY_COLLISION_RADIUS;
    if (!ctx.map.isSolid(Math.floor(newX + marginX), Math.floor(enemy.y))) {
      enemy.x = newX;
    }
    const newY = enemy.y + moveY;
    const marginY = moveY > 0 ? ENEMY_COLLISION_RADIUS : -ENEMY_COLLISION_RADIUS;
    if (!ctx.map.isSolid(Math.floor(enemy.x), Math.floor(newY + marginY))) {
      enemy.y = newY;
    }
  }

  /**
   * Line of sight: step along the ray from enemy to player; if any solid cell
   * is crossed before reaching the player, sight is blocked.
   */
  canSeePlayer(
    enemy: EnemyEntity,
    player: PlayerState,
    map: MapSystem,
  ): boolean {
    const dist = distance(enemy.x, enemy.y, player.x, player.y);
    if (dist > DETECTION_RANGE) return false;
    if (dist < 0.0001) return true;

    const dirX = (player.x - enemy.x) / dist;
    const dirY = (player.y - enemy.y) / dist;

    const step = 0.1;
    for (let t = step; t < dist; t += step) {
      const cx = Math.floor(enemy.x + dirX * t);
      const cy = Math.floor(enemy.y + dirY * t);
      if (map.isSolid(cx, cy)) return false;
    }
    return true;
  }

  /**
   * Apply a hit to an enemy. Returns whether it was stunned/dispersed and
   * any score awarded.
   */
  onHit(enemy: EnemyEntity, damage: number): HitResult {
    if (
      !enemy.active ||
      enemy.state === 'dispersed' ||
      enemy.state === 'stunned'
    ) {
      return { stunned: false, dispersed: false, scoreAwarded: 0 };
    }

    enemy.health -= damage;
    if (enemy.health <= 0) {
      this.transition(enemy, 'dispersed');
      enemy.animationFrame = 0;
      return { stunned: false, dispersed: true, scoreAwarded: SCORE_PER_ENEMY };
    }

    this.transition(enemy, 'stunned');
    return { stunned: true, dispersed: false, scoreAwarded: 0 };
  }

  private transition(enemy: EnemyEntity, state: EnemyEntity['state']): void {
    enemy.state = state;
    enemy.stateTimer = 0;
  }

  private advanceAnimation(enemy: EnemyEntity, deltaTime: number): void {
    enemy.animationTimer += deltaTime;
    if (enemy.state === 'dispersed') {
      if (enemy.animationTimer >= ENEMY_DISPERSE_FRAME_TIME) {
        enemy.animationTimer = 0;
        enemy.animationFrame = Math.min(enemy.animationFrame + 1, 2);
      }
    } else if (enemy.state === 'pursue') {
      if (enemy.animationTimer >= ENEMY_WALK_FRAME_TIME) {
        enemy.animationTimer = 0;
        enemy.animationFrame = (enemy.animationFrame + 1) % 4;
      }
    }
  }
}
