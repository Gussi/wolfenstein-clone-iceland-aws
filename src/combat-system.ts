// Weapon attacks: cone-based melee hit detection for the wooden spoon,
// weapon animation state, and hit resolution against the closest enemy.

import {
  RECOVER_DURATION,
  SWING_DURATION,
  WEAPON_ARC,
  WEAPON_DAMAGE,
  WEAPON_RANGE,
  WEAPON_SWING_FRAMES,
} from './constants';
import { EnemyAI } from './enemy-ai';
import { angleDifference, distance } from './math-utils';
import type { EntitySystem } from './entity-system';
import type { AttackResult, PlayerState, WeaponState } from './types';

export class CombatSystem {
  private weapon: WeaponState = {
    type: 'woodenSpoon',
    phase: 'idle',
    timer: 0,
    frameIndex: 0,
    hitTestedThisSwing: false,
  };

  constructor(private enemyAI: EnemyAI) {}

  /** True if the weapon can begin a new swing. */
  isReady(): boolean {
    return this.weapon.phase === 'idle';
  }

  /** Begin a swing if ready. */
  beginAttack(): boolean {
    if (!this.isReady()) return false;
    this.weapon.phase = 'swinging';
    this.weapon.timer = 0;
    this.weapon.frameIndex = 0;
    this.weapon.hitTestedThisSwing = false;
    return true;
  }

  /**
   * Advance the weapon animation. When the swing reaches its hit point,
   * perform the hit test once and return the result. Otherwise null.
   */
  update(
    deltaTime: number,
    player: PlayerState,
    entities: EntitySystem,
  ): AttackResult | null {
    const w = this.weapon;
    let result: AttackResult | null = null;

    if (w.phase === 'swinging') {
      w.timer += deltaTime;
      w.frameIndex = Math.min(
        Math.floor((w.timer / SWING_DURATION) * WEAPON_SWING_FRAMES),
        WEAPON_SWING_FRAMES - 1,
      );

      if (!w.hitTestedThisSwing && w.timer >= SWING_DURATION) {
        w.hitTestedThisSwing = true;
        result = this.performHitTest(player, entities);
        w.phase = 'recovering';
        w.timer = 0;
      }
    } else if (w.phase === 'recovering') {
      w.timer += deltaTime;
      if (w.timer >= RECOVER_DURATION) {
        w.phase = 'idle';
        w.timer = 0;
        w.frameIndex = 0;
      }
    }

    return result;
  }

  private performHitTest(
    player: PlayerState,
    entities: EntitySystem,
  ): AttackResult {
    let closestId: string | null = null;
    let closestDist = Infinity;

    for (const enemy of entities.getEnemies()) {
      if (!enemy.active || enemy.state === 'dispersed') continue;

      const dist = distance(player.x, player.y, enemy.x, enemy.y);
      if (dist > WEAPON_RANGE) continue;

      // Angle from player facing to the enemy.
      const angleToEnemy = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      const diff = Math.abs(angleDifference(player.angle, angleToEnemy));
      if (diff > WEAPON_ARC / 2) continue;

      if (dist < closestDist) {
        closestDist = dist;
        closestId = enemy.id;
      }
    }

    if (closestId === null) {
      return { hit: false, targetId: null, dispersed: false };
    }

    const target = entities.getEnemies().find((e) => e.id === closestId)!;
    const hitResult = this.enemyAI.onHit(target, WEAPON_DAMAGE);
    return {
      hit: true,
      targetId: closestId,
      dispersed: hitResult.dispersed,
    };
  }

  getWeaponState(): WeaponState {
    return this.weapon;
  }

  reset(): void {
    this.weapon.phase = 'idle';
    this.weapon.timer = 0;
    this.weapon.frameIndex = 0;
    this.weapon.hitTestedThisSwing = false;
  }
}
