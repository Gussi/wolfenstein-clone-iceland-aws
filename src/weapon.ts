/**
 * Wooden-spoon weapon: a small swing/recover state machine. The hit check
 * fires once at the swing midpoint (consumed by the combat module).
 */

import { RECOVER_DURATION, SWING_DURATION } from './constants';
import type { WeaponState } from './types';

export function createWeapon(): WeaponState {
  return {
    type: 'woodenSpoon',
    animationPhase: 'idle',
    timer: 0,
    frameIndex: 0,
    hitPending: false,
  };
}

/** Returns true if the weapon can start a new swing. */
export function canAttack(weapon: WeaponState): boolean {
  return weapon.animationPhase === 'idle';
}

/** Begin a swing if idle. */
export function startSwing(weapon: WeaponState): boolean {
  if (!canAttack(weapon)) return false;
  weapon.animationPhase = 'swinging';
  weapon.timer = 0;
  weapon.hitPending = false;
  return true;
}

/**
 * Advance the weapon animation. Sets `hitPending = true` exactly once, on the
 * frame the swing completes (the moment the spoon connects).
 */
export function updateWeapon(weapon: WeaponState, dt: number): void {
  weapon.hitPending = false;
  if (weapon.animationPhase === 'swinging') {
    weapon.timer += dt;
    // Frame index 0..2 across the swing for the viewmodel.
    weapon.frameIndex = Math.min(2, Math.floor((weapon.timer / SWING_DURATION) * 3));
    if (weapon.timer >= SWING_DURATION) {
      weapon.hitPending = true; // hit check fires now
      weapon.animationPhase = 'recovering';
      weapon.timer = 0;
    }
  } else if (weapon.animationPhase === 'recovering') {
    weapon.timer += dt;
    if (weapon.timer >= RECOVER_DURATION) {
      weapon.animationPhase = 'idle';
      weapon.timer = 0;
      weapon.frameIndex = 0;
    }
  }
}

/** Sprite key for the current weapon frame. */
export function weaponSpriteKey(weapon: WeaponState): string {
  if (weapon.animationPhase === 'swinging') return `pan_swing${weapon.frameIndex}`;
  if (weapon.animationPhase === 'recovering') return 'pan_swing2';
  return 'pan_idle';
}
