/**
 * Melee combat resolution. A swing hits the single closest enemy that lies
 * within WEAPON_RANGE and inside the WEAPON_ARC cone in front of the player.
 */

import { WEAPON_ARC, WEAPON_DAMAGE, WEAPON_RANGE } from './constants';
import { angleDifference, distance } from './math/vector';
import { applyStun } from './enemies';
import type { EnemyEntity, PlayerState } from './types';

export interface MeleeResult {
  /** The enemy that was hit, if any. */
  hitEnemy: EnemyEntity | null;
  /** True if that hit dispersed (defeated) the enemy. */
  dispersed: boolean;
}

/**
 * Resolve a melee swing against the enemy list. Mutates the chosen enemy via
 * applyStun. Returns which enemy was hit and whether it was dispersed.
 */
export function resolveMelee(player: PlayerState, enemies: EnemyEntity[]): MeleeResult {
  let best: EnemyEntity | null = null;
  let bestDist = Infinity;

  for (const e of enemies) {
    if (!e.active || e.state === 'dispersed') continue;
    const dist = distance(player.x, player.y, e.x, e.y);
    if (dist > WEAPON_RANGE) continue;
    const angleToEnemy = Math.atan2(e.y - player.y, e.x - player.x);
    const diff = Math.abs(angleDifference(player.angle, angleToEnemy));
    if (diff > WEAPON_ARC / 2) continue;
    if (dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }

  if (!best) return { hitEnemy: null, dispersed: false };
  const dispersed = applyStun(best, WEAPON_DAMAGE);
  return { hitEnemy: best, dispersed };
}
