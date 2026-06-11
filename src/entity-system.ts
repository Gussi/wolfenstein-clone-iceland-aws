// Manages enemies, pickups, and decorations: spawning from map data,
// updates, and spatial/visibility queries.

import {
  COFFEE_HEAL,
  ENEMY_HEALTH,
  KLEINUR_HEAL,
  MAX_SPRITE_DISTANCE,
} from './constants';
import { distanceSquared } from './math-utils';
import { ENEMY_TAUNTS } from './constants';
import type {
  DecorationEntity,
  EnemyEntity,
  MapJSON,
  PickupEntity,
  VisibleSprite,
} from './types';

export class EntitySystem {
  private enemies: EnemyEntity[] = [];
  private pickups: PickupEntity[] = [];
  private decorations: DecorationEntity[] = [];
  private idCounter = 0;

  spawnFromMap(map: MapJSON): void {
    this.enemies = [];
    this.pickups = [];
    this.decorations = [];
    this.idCounter = 0;

    for (const spawn of map.enemies) {
      this.enemies.push({
        id: `enemy-${this.idCounter++}`,
        type: 'redTape',
        x: spawn.x + 0.5,
        y: spawn.y + 0.5,
        state: 'idle',
        stateTimer: 0,
        lastKnownPlayerX: 0,
        lastKnownPlayerY: 0,
        health: ENEMY_HEALTH,
        active: true,
        animationFrame: 0,
        animationTimer: 0,
        hasTaunted: false,
        tauntText: ENEMY_TAUNTS[this.idCounter % ENEMY_TAUNTS.length] ?? '',
        tauntTimer: 0,
        attackCooldown: 0,
      });
    }

    for (const spawn of map.pickups) {
      this.pickups.push({
        id: `pickup-${this.idCounter++}`,
        type: 'pickup',
        pickupType: spawn.type,
        x: spawn.x + 0.5,
        y: spawn.y + 0.5,
        healAmount: spawn.type === 'coffee' ? COFFEE_HEAL : KLEINUR_HEAL,
        active: true,
      });
    }

    for (const dec of map.decorations) {
      this.decorations.push({
        id: `dec-${this.idCounter++}`,
        type: 'decoration',
        spriteType: dec.spriteType,
        x: dec.x + 0.5,
        y: dec.y + 0.5,
        blocking: dec.blocking,
        active: true,
      });
    }
  }

  getEnemies(): EnemyEntity[] {
    return this.enemies;
  }

  getPickups(): PickupEntity[] {
    return this.pickups;
  }

  getDecorations(): DecorationEntity[] {
    return this.decorations;
  }

  getAliveEnemyCount(): number {
    let count = 0;
    for (const e of this.enemies) {
      // Enemies still "alive" until fully dispersed and removed.
      if (e.active && e.state !== 'dispersed') count++;
    }
    return count;
  }

  getTotalEnemyCount(): number {
    return this.enemies.length;
  }

  removeInactive(): void {
    this.enemies = this.enemies.filter((e) => e.active);
    this.pickups = this.pickups.filter((p) => p.active);
  }

  /** Pickups within radius of a point (squared distance compare). */
  getPickupsInRange(x: number, y: number, radius: number): PickupEntity[] {
    const r2 = radius * radius;
    return this.pickups.filter(
      (p) => p.active && distanceSquared(x, y, p.x, p.y) <= r2,
    );
  }

  /**
   * Build the list of sprites visible to the camera, sorted far-to-near.
   * Includes enemies (non-dispersed-removed), pickups, decorations.
   */
  getVisibleSprites(playerX: number, playerY: number): VisibleSprite[] {
    const sprites: VisibleSprite[] = [];
    const maxD2 = MAX_SPRITE_DISTANCE * MAX_SPRITE_DISTANCE;

    for (const e of this.enemies) {
      if (!e.active) continue;
      const d2 = distanceSquared(playerX, playerY, e.x, e.y);
      if (d2 > maxD2) continue;
      sprites.push({
        x: e.x,
        y: e.y,
        textureId: enemyTextureId(e),
        distance: Math.sqrt(d2),
      });
    }

    for (const p of this.pickups) {
      if (!p.active) continue;
      const d2 = distanceSquared(playerX, playerY, p.x, p.y);
      if (d2 > maxD2) continue;
      sprites.push({
        x: p.x,
        y: p.y,
        textureId: p.pickupType === 'coffee' ? 'sprite-coffee' : 'sprite-kleinur',
        distance: Math.sqrt(d2),
      });
    }

    for (const d of this.decorations) {
      if (!d.active) continue;
      const d2 = distanceSquared(playerX, playerY, d.x, d.y);
      if (d2 > maxD2) continue;
      sprites.push({
        x: d.x,
        y: d.y,
        textureId: `sprite-${d.spriteType}`,
        distance: Math.sqrt(d2),
      });
    }

    // Sort far to near (painter's algorithm).
    sprites.sort((a, b) => b.distance - a.distance);
    return sprites;
  }
}

function enemyTextureId(e: EnemyEntity): string {
  switch (e.state) {
    case 'stunned':
      return 'sprite-redTape-stunned';
    case 'dispersed':
      return `sprite-redTape-dispersed-${Math.min(e.animationFrame, 2)}`;
    case 'attack':
      return 'sprite-redTape-attack';
    case 'idle':
    case 'alert':
      return 'sprite-redTape-idle';
    case 'pursue':
    default:
      return `sprite-redTape-walk-${e.animationFrame % 4}`;
  }
}
