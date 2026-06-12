import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { applyStun, createEnemy } from '../src/enemies';
import { resolveMelee } from '../src/combat';
import { createWeapon, startSwing, updateWeapon } from '../src/weapon';
import { ENEMY_HEALTH, WEAPON_RANGE, SWING_DURATION } from '../src/constants';
import type { PlayerState } from '../src/types';

function makePlayer(angle = 0): PlayerState {
  return {
    x: 5,
    y: 5,
    angle,
    dirX: Math.cos(angle),
    dirY: Math.sin(angle),
    planeX: 0,
    planeY: 0,
    health: 100,
    maxHealth: 100,
    alive: true,
    connections: 0,
    secretsFound: 0,
    enemiesDispersed: 0,
    levelStartTime: 0,
  };
}

describe('applyStun', () => {
  it('disperses exactly after ENEMY_HEALTH points of damage', () => {
    const e = createEnemy({ type: 'redTape', x: 0, y: 0 });
    let dispersed = false;
    for (let i = 0; i < ENEMY_HEALTH; i++) {
      dispersed = applyStun(e, 1);
    }
    expect(dispersed).toBe(true);
    expect(e.state).toBe('dispersed');
  });

  it('never drives health below zero for arbitrary damage sequences', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 5 }), { maxLength: 20 }), (hits) => {
        const e = createEnemy({ type: 'redTape', x: 0, y: 0 });
        for (const d of hits) applyStun(e, d);
        expect(e.health).toBeGreaterThanOrEqual(0);
      }),
    );
  });
});

describe('resolveMelee', () => {
  it('hits an enemy directly in front within range', () => {
    const player = makePlayer(0); // facing +x
    const enemy = createEnemy({ type: 'redTape', x: 5 + WEAPON_RANGE - 0.5 - 0.5, y: 4 });
    enemy.x = 6; // ~1 unit ahead
    enemy.y = 5;
    const r = resolveMelee(player, [enemy]);
    expect(r.hitEnemy).toBe(enemy);
  });

  it('misses an enemy behind the player', () => {
    const player = makePlayer(0);
    const enemy = createEnemy({ type: 'redTape', x: 0, y: 0 });
    enemy.x = 4; // behind (player faces +x)
    enemy.y = 5;
    const r = resolveMelee(player, [enemy]);
    expect(r.hitEnemy).toBeNull();
  });

  it('misses an enemy out of range', () => {
    const player = makePlayer(0);
    const enemy = createEnemy({ type: 'redTape', x: 0, y: 0 });
    enemy.x = 5 + WEAPON_RANGE + 2;
    enemy.y = 5;
    const r = resolveMelee(player, [enemy]);
    expect(r.hitEnemy).toBeNull();
  });
});

describe('weapon state machine', () => {
  it('fires exactly one hit per swing', () => {
    const w = createWeapon();
    expect(startSwing(w)).toBe(true);
    // Cannot start another swing mid-swing.
    expect(startSwing(w)).toBe(false);

    let hits = 0;
    // Step through the full swing in small increments.
    for (let t = 0; t < SWING_DURATION + 0.05; t += 0.02) {
      updateWeapon(w, 0.02);
      if (w.hitPending) hits += 1;
    }
    expect(hits).toBe(1);
  });
});
