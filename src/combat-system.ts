/**
 * CombatSystem — wooden spoon melee. Manages the swing animation state machine
 * and resolves a hit (range + arc) against the closest valid enemy at the swing
 * midpoint.
 *
 * Stories: US-05 (attack), US-06 (stun mechanic), US-16 (scoring on disperse)
 */
import {
  RECOVER_DURATION,
  SWING_DURATION,
  WEAPON_ARC,
  WEAPON_DAMAGE,
  WEAPON_RANGE,
} from "./constants";
import { EntitySystem } from "./entity-system";
import { distance, normalizeAngleSigned } from "./math-utils";
import type { PlayerState, WeaponState } from "./types";

export interface AttackResult {
  swung: boolean; // an attack animation started this call
  hit: boolean; // a target was struck
  targetId: string | null;
  dispersed: boolean;
  scoreAwarded: number;
}

export class CombatSystem {
  private weapon: WeaponState = {
    type: "woodenSpoon",
    animationPhase: "idle",
    timer: 0,
    frameIndex: 0,
  };
  private hitCheckDone = false;

  /** Begin a swing if the weapon is ready. Returns whether a swing started. */
  startAttack(): boolean {
    if (this.weapon.animationPhase !== "idle") return false;
    this.weapon.animationPhase = "swinging";
    this.weapon.timer = 0;
    this.weapon.frameIndex = 0;
    this.hitCheckDone = false;
    return true;
  }

  isReady(): boolean {
    return this.weapon.animationPhase === "idle";
  }

  getWeaponState(): WeaponState {
    return this.weapon;
  }

  /**
   * Advance the weapon animation. When the swing reaches its midpoint, perform
   * the hit check against entities. Returns the resolved attack outcome.
   */
  update(
    player: PlayerState,
    entities: EntitySystem,
    deltaTime: number,
  ): AttackResult {
    const result: AttackResult = {
      swung: false,
      hit: false,
      targetId: null,
      dispersed: false,
      scoreAwarded: 0,
    };

    this.weapon.timer += deltaTime;

    if (this.weapon.animationPhase === "swinging") {
      // 3 swing frames across the swing duration
      this.weapon.frameIndex = Math.min(
        2,
        Math.floor((this.weapon.timer / SWING_DURATION) * 3) + 1,
      );

      // Hit check at the swing midpoint.
      if (!this.hitCheckDone && this.weapon.timer >= SWING_DURATION * 0.5) {
        this.hitCheckDone = true;
        const hit = this.resolveHit(player, entities);
        result.swung = true;
        Object.assign(result, hit);
      }

      if (this.weapon.timer >= SWING_DURATION) {
        this.weapon.animationPhase = "recovering";
        this.weapon.timer = 0;
      }
    } else if (this.weapon.animationPhase === "recovering") {
      this.weapon.frameIndex = 0;
      if (this.weapon.timer >= RECOVER_DURATION) {
        this.weapon.animationPhase = "idle";
        this.weapon.timer = 0;
      }
    }

    return result;
  }

  private resolveHit(
    player: PlayerState,
    entities: EntitySystem,
  ): Pick<AttackResult, "hit" | "targetId" | "dispersed" | "scoreAwarded"> {
    let closest: { id: string; dist: number } | null = null;

    for (const enemy of entities.getActiveEnemies()) {
      const dist = distance(player.x, player.y, enemy.x, enemy.y);
      if (dist > WEAPON_RANGE) continue;

      const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const relative = normalizeAngleSigned(angleToEnemy - player.angle);
      if (Math.abs(relative) > WEAPON_ARC / 2) continue;

      if (!closest || dist < closest.dist) {
        closest = { id: enemy.id, dist };
      }
    }

    if (!closest) {
      return { hit: false, targetId: null, dispersed: false, scoreAwarded: 0 };
    }

    const target = entities
      .getActiveEnemies()
      .find((e) => e.id === closest!.id)!;
    const hitResult = entities.getAI().onHit(target, WEAPON_DAMAGE);

    return {
      hit: true,
      targetId: closest.id,
      dispersed: hitResult.dispersed,
      scoreAwarded: hitResult.scoreAwarded,
    };
  }
}
