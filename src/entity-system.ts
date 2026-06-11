/**
 * EntitySystem — owns enemies, pickups, and decorations. Spawns them from map
 * data, ticks enemy AI each frame, handles automatic pickup collection, and
 * produces the VisibleEntity list (with resolved sprite texture ids) for the
 * renderer.
 *
 * Stories: US-08 (AI orchestration), US-10 (sprites), US-23 (pickups)
 */
import {
  COFFEE_HEAL,
  DISPERSE_DURATION,
  ENEMY_HEALTH,
  KLEINUR_HEAL,
  PICKUP_RADIUS,
  SPRITE_CULL_DISTANCE,
} from "./constants";
import { EnemyAI } from "./enemy-ai";
import { MapSystem } from "./map-system";
import { Player } from "./player";
import { distance, distanceSquared } from "./math-utils";
import type {
  DecorationEntity,
  EnemyEntity,
  MapJSON,
  PickupEntity,
  PlayerState,
  VisibleEntity,
} from "./types";

export interface EntityEvents {
  pickupsCollected: { type: string; healAmount: number }[];
  enemyAttacks: number; // total damage enemies dealt this frame
  alertsTriggered: number;
  newTaunts: { text: string; x: number; y: number }[];
}

export class EntitySystem {
  private enemies: EnemyEntity[] = [];
  private pickups: PickupEntity[] = [];
  private decorations: DecorationEntity[] = [];
  private ai = new EnemyAI();
  private totalEnemies = 0;
  private idCounter = 0;

  spawnFromMap(map: MapJSON): void {
    this.enemies = [];
    this.pickups = [];
    this.decorations = [];
    this.idCounter = 0;

    for (const e of map.enemies) {
      this.enemies.push({
        id: `enemy_${this.idCounter++}`,
        type: "redTape",
        x: e.x + 0.5,
        y: e.y + 0.5,
        state: "idle",
        stateTimer: 0,
        lastKnownPlayerX: 0,
        lastKnownPlayerY: 0,
        attackCooldown: 0,
        health: ENEMY_HEALTH,
        active: true,
        animationFrame: 0,
        animationTimer: 0,
        hasTaunted: false,
        tauntText: "",
        tauntTimer: 0,
      });
    }
    this.totalEnemies = this.enemies.length;

    for (const p of map.pickups) {
      this.pickups.push({
        id: `pickup_${this.idCounter++}`,
        type: p.type,
        x: p.x + 0.5,
        y: p.y + 0.5,
        healAmount: p.type === "coffee" ? COFFEE_HEAL : KLEINUR_HEAL,
        active: true,
      });
    }

    for (const d of map.decorations) {
      this.decorations.push({
        id: `deco_${this.idCounter++}`,
        type: d.type,
        x: d.x + 0.5,
        y: d.y + 0.5,
        blocking: d.blocking,
        active: true,
      });
    }
  }

  /** Tick all entities. Returns events for the game loop to react to. */
  update(player: Player, map: MapSystem, deltaTime: number): EntityEvents {
    const events: EntityEvents = {
      pickupsCollected: [],
      enemyAttacks: 0,
      alertsTriggered: 0,
      newTaunts: [],
    };
    const playerState = player.getState();

    // --- Enemies ---
    this.ai.setDelta(deltaTime);
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const tick = this.ai.update(enemy, playerState, map, deltaTime);
      if (tick.dealtDamage > 0) events.enemyAttacks += tick.dealtDamage;
      if (tick.startedAlert) events.alertsTriggered++;
      if (tick.taunt) {
        events.newTaunts.push({ text: tick.taunt, x: enemy.x, y: enemy.y });
      }
    }

    // --- Pickups (auto-collect within radius) ---
    for (const pickup of this.pickups) {
      if (!pickup.active) continue;
      if (
        distance(playerState.x, playerState.y, pickup.x, pickup.y) <=
        PICKUP_RADIUS
      ) {
        pickup.active = false;
        events.pickupsCollected.push({
          type: pickup.type,
          healAmount: pickup.healAmount,
        });
      }
    }

    return events;
  }

  getAI(): EnemyAI {
    return this.ai;
  }

  getEnemies(): EnemyEntity[] {
    return this.enemies;
  }

  getPickups(): PickupEntity[] {
    return this.pickups;
  }

  getAliveEnemyCount(): number {
    // An enemy "counts" until its disperse animation completes (active=false).
    return this.enemies.filter((e) => e.active && e.state !== "dispersed")
      .length;
  }

  getTotalEnemies(): number {
    return this.totalEnemies;
  }

  getEnemiesDispersed(): number {
    return this.enemies.filter((e) => !e.active || e.state === "dispersed")
      .length;
  }

  /** Enemies within weapon range/arc are queried by CombatSystem via this list. */
  getActiveEnemies(): EnemyEntity[] {
    return this.enemies.filter((e) => e.active && e.state !== "dispersed");
  }

  /**
   * Build the VisibleEntity list for the renderer: enemies, pickups, and
   * decorations, each with the correct sprite texture id and distance.
   * Culls anything beyond SPRITE_CULL_DISTANCE.
   */
  getVisibleEntities(playerState: PlayerState): VisibleEntity[] {
    const out: VisibleEntity[] = [];
    const cull = SPRITE_CULL_DISTANCE * SPRITE_CULL_DISTANCE;

    for (const e of this.enemies) {
      if (!e.active) continue;
      const d2 = distanceSquared(playerState.x, playerState.y, e.x, e.y);
      if (d2 > cull) continue;
      out.push({
        x: e.x,
        y: e.y,
        textureId: this.enemySpriteId(e),
        distance: Math.sqrt(d2),
        verticalOffset: 0,
      });
    }

    for (const p of this.pickups) {
      if (!p.active) continue;
      const d2 = distanceSquared(playerState.x, playerState.y, p.x, p.y);
      if (d2 > cull) continue;
      out.push({
        x: p.x,
        y: p.y,
        textureId: p.type,
        distance: Math.sqrt(d2),
        verticalOffset: 0.35, // sit lower, on the floor
      });
    }

    for (const d of this.decorations) {
      if (!d.active) continue;
      const d2 = distanceSquared(playerState.x, playerState.y, d.x, d.y);
      if (d2 > cull) continue;
      out.push({
        x: d.x,
        y: d.y,
        textureId: d.type,
        distance: Math.sqrt(d2),
        verticalOffset: 0.1,
      });
    }

    return out;
  }

  private enemySpriteId(e: EnemyEntity): string {
    switch (e.state) {
      case "idle":
        return `redTape_idle_${e.animationFrame % 2}`;
      case "alert":
      case "pursue":
        return `redTape_walk_${e.animationFrame % 4}`;
      case "attack":
        return `redTape_attack_${e.animationFrame % 2}`;
      case "stunned":
        return `redTape_stunned_${e.animationFrame % 2}`;
      case "dispersed": {
        // Advance through 3 disperse frames over the disperse duration.
        const frame = Math.min(
          2,
          Math.floor((e.stateTimer / DISPERSE_DURATION) * 3),
        );
        return `redTape_dispersed_${frame}`;
      }
      default:
        return "redTape_idle_0";
    }
  }
}
