/**
 * EnemyAI — Red Tape behavior state machine:
 *   idle → alert → pursue → attack → (back to pursue)
 *   any → stunned (on hit) → pursue or dispersed
 *
 * Stories: US-07 (enemy attack), US-08 (enemy AI), US-24 (taunts)
 */
import {
  ALERT_DURATION,
  DETECTION_RANGE,
  DISPERSE_DURATION,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_ATTACK_RANGE,
  ENEMY_DAMAGE,
  ENEMY_SPEED,
  ENEMY_TAUNTS,
  COLLISION_RADIUS,
  SCORE_PER_ENEMY,
  STUN_DURATION,
  TAUNT_DURATION,
} from "./constants";
import { MapSystem } from "./map-system";
import { distance, isLineBlocked, resolveMovement } from "./math-utils";
import type { EnemyEntity, PlayerState } from "./types";

export interface HitResult {
  stunned: boolean;
  dispersed: boolean;
  scoreAwarded: number;
}

/** Result of an AI tick that the caller may act on (e.g. apply damage / play audio). */
export interface AITickResult {
  dealtDamage: number; // damage to apply to the player this tick
  startedAlert: boolean; // entered ALERT this tick (play alert sound)
  taunt: string | null; // taunt text to surface (HUD), if any
}

export class EnemyAI {
  /** Advance one enemy's state machine by deltaTime. */
  update(
    enemy: EnemyEntity,
    player: PlayerState,
    map: MapSystem,
    deltaTime: number,
  ): AITickResult {
    const result: AITickResult = {
      dealtDamage: 0,
      startedAlert: false,
      taunt: null,
    };

    if (!enemy.active) return result;

    enemy.stateTimer += deltaTime;
    enemy.animationTimer += deltaTime;
    if (enemy.attackCooldown > 0) enemy.attackCooldown -= deltaTime;
    if (enemy.tauntTimer > 0) enemy.tauntTimer -= deltaTime;

    // Simple 2-frame walk animation cadence
    if (enemy.animationTimer > 0.2) {
      enemy.animationTimer = 0;
      enemy.animationFrame = (enemy.animationFrame + 1) % 4;
    }

    switch (enemy.state) {
      case "idle":
        this.tickIdle(enemy, player, map, result);
        break;
      case "alert":
        this.tickAlert(enemy, player);
        break;
      case "pursue":
        this.tickPursue(enemy, player, map);
        break;
      case "attack":
        this.tickAttack(enemy, player, map, result);
        break;
      case "stunned":
        this.tickStunned(enemy);
        break;
      case "dispersed":
        this.tickDispersed(enemy);
        break;
    }

    return result;
  }

  private setState(enemy: EnemyEntity, state: EnemyEntity["state"]): void {
    enemy.state = state;
    enemy.stateTimer = 0;
  }

  private tickIdle(
    enemy: EnemyEntity,
    player: PlayerState,
    map: MapSystem,
    result: AITickResult,
  ): void {
    if (this.canSeePlayer(enemy, player, map)) {
      this.setState(enemy, "alert");
      result.startedAlert = true;
      enemy.lastKnownPlayerX = player.x;
      enemy.lastKnownPlayerY = player.y;
      // First detection → taunt once (US-24)
      if (!enemy.hasTaunted) {
        enemy.hasTaunted = true;
        enemy.tauntText =
          ENEMY_TAUNTS[Math.floor(Math.random() * ENEMY_TAUNTS.length)];
        enemy.tauntTimer = TAUNT_DURATION;
        result.taunt = enemy.tauntText;
      }
    }
  }

  private tickAlert(enemy: EnemyEntity, player: PlayerState): void {
    enemy.lastKnownPlayerX = player.x;
    enemy.lastKnownPlayerY = player.y;
    if (enemy.stateTimer >= ALERT_DURATION) {
      this.setState(enemy, "pursue");
    }
  }

  private tickPursue(
    enemy: EnemyEntity,
    player: PlayerState,
    map: MapSystem,
  ): void {
    const seen = this.canSeePlayer(enemy, player, map);
    if (seen) {
      enemy.lastKnownPlayerX = player.x;
      enemy.lastKnownPlayerY = player.y;
    }

    const distToPlayer = distance(enemy.x, enemy.y, player.x, player.y);
    if (seen && distToPlayer <= ENEMY_ATTACK_RANGE) {
      this.setState(enemy, "attack");
      return;
    }

    // Move toward last known player position.
    const targetX = enemy.lastKnownPlayerX;
    const targetY = enemy.lastKnownPlayerY;
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len < 0.1) {
      // Reached last known position and can't see player → give up.
      if (!seen) this.setState(enemy, "idle");
      return;
    }

    const move = ENEMY_SPEED * this.lastDelta;
    const moveX = (dx / len) * move;
    const moveY = (dy / len) * move;
    const resolved = resolveMovement(
      enemy.x,
      enemy.y,
      moveX,
      moveY,
      COLLISION_RADIUS,
      (gx, gy) => map.isSolid(gx, gy),
    );
    enemy.x = resolved.x;
    enemy.y = resolved.y;
  }

  private tickAttack(
    enemy: EnemyEntity,
    player: PlayerState,
    map: MapSystem,
    result: AITickResult,
  ): void {
    const distToPlayer = distance(enemy.x, enemy.y, player.x, player.y);
    if (
      distToPlayer > ENEMY_ATTACK_RANGE ||
      !this.canSeePlayer(enemy, player, map)
    ) {
      this.setState(enemy, "pursue");
      return;
    }
    if (enemy.attackCooldown <= 0) {
      result.dealtDamage = ENEMY_DAMAGE;
      enemy.attackCooldown = ENEMY_ATTACK_COOLDOWN;
    }
  }

  private tickStunned(enemy: EnemyEntity): void {
    if (enemy.stateTimer >= STUN_DURATION) {
      this.setState(enemy, "pursue");
    }
  }

  private tickDispersed(enemy: EnemyEntity): void {
    if (enemy.stateTimer >= DISPERSE_DURATION) {
      enemy.active = false;
    }
  }

  private lastDelta = 1 / 60;
  /** EntitySystem sets the frame delta before ticking enemies. */
  setDelta(dt: number): void {
    this.lastDelta = dt;
  }

  canSeePlayer(
    enemy: EnemyEntity,
    player: PlayerState,
    map: MapSystem,
  ): boolean {
    const dist = distance(enemy.x, enemy.y, player.x, player.y);
    if (dist > DETECTION_RANGE) return false;
    return !isLineBlocked(enemy.x, enemy.y, player.x, player.y, (gx, gy) =>
      map.isSolid(gx, gy),
    );
  }

  /** Apply a weapon hit; transitions to stunned or dispersed. */
  onHit(enemy: EnemyEntity, damage: number): HitResult {
    if (enemy.state === "dispersed" || !enemy.active) {
      return { stunned: false, dispersed: false, scoreAwarded: 0 };
    }
    enemy.health -= damage;
    if (enemy.health <= 0) {
      this.setState(enemy, "dispersed");
      return { stunned: false, dispersed: true, scoreAwarded: SCORE_PER_ENEMY };
    }
    this.setState(enemy, "stunned");
    return { stunned: true, dispersed: false, scoreAwarded: 0 };
  }
}
