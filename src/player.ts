/**
 * Player — position, facing, movement with wall-sliding collision, and health.
 *
 * Stories: US-01 (movement), US-02 (mouse look), US-04 (wall collision), US-13 (health)
 */
import {
  COLLISION_RADIUS,
  INTERACTION_RANGE,
  MAX_HEALTH,
  MOVE_SPEED,
  ROTATION_SPEED,
} from "./constants";
import { MapSystem } from "./map-system";
import {
  angleToDir,
  dirToPlane,
  distance,
  resolveMovement,
} from "./math-utils";
import type { InputState, PlayerState } from "./types";

export class Player {
  private state: PlayerState;

  constructor() {
    this.state = this.createState(2.5, 2.5, 0);
  }

  private createState(x: number, y: number, angle: number): PlayerState {
    const { dirX, dirY } = angleToDir(angle);
    const { planeX, planeY } = dirToPlane(dirX, dirY);
    return {
      x,
      y,
      angle,
      dirX,
      dirY,
      planeX,
      planeY,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      alive: true,
      connections: 0,
      secretsFound: 0,
      enemiesDispersed: 0,
      levelStartTime: 0,
    };
  }

  /** Reset player to a spawn point with full health (used on level start/restart). */
  spawn(x: number, y: number, angle: number, startTime: number): void {
    this.state = this.createState(x, y, angle);
    this.state.levelStartTime = startTime;
  }

  getState(): PlayerState {
    return this.state;
  }

  update(input: InputState, map: MapSystem, deltaTime: number): void {
    if (!this.state.alive) return;

    // --- Rotation ---
    if (input.turnDelta !== 0) {
      this.rotate(input.turnDelta * ROTATION_SPEED);
    }

    // --- Movement vector from input ---
    const speed = MOVE_SPEED * deltaTime;
    let moveX = 0;
    let moveY = 0;
    const { dirX, dirY, planeX, planeY } = this.state;

    if (input.moveForward) {
      moveX += dirX * speed;
      moveY += dirY * speed;
    }
    if (input.moveBackward) {
      moveX -= dirX * speed;
      moveY -= dirY * speed;
    }
    // Strafe along the camera plane (perpendicular to facing)
    if (input.strafeRight) {
      moveX += planeX * speed;
      moveY += planeY * speed;
    }
    if (input.strafeLeft) {
      moveX -= planeX * speed;
      moveY -= planeY * speed;
    }

    // --- Collision-resolved movement (wall sliding) ---
    const resolved = resolveMovement(
      this.state.x,
      this.state.y,
      moveX,
      moveY,
      COLLISION_RADIUS,
      (gx, gy) => map.isSolid(gx, gy),
    );
    this.state.x = resolved.x;
    this.state.y = resolved.y;
  }

  private rotate(rot: number): void {
    this.state.angle += rot;
    const { dirX, dirY } = angleToDir(this.state.angle);
    const { planeX, planeY } = dirToPlane(dirX, dirY);
    this.state.dirX = dirX;
    this.state.dirY = dirY;
    this.state.planeX = planeX;
    this.state.planeY = planeY;
  }

  /** Returns true if the player is still alive after taking damage. */
  takeDamage(amount: number): boolean {
    this.state.health = Math.max(0, this.state.health - amount);
    if (this.state.health <= 0) {
      this.state.alive = false;
    }
    return this.state.alive;
  }

  heal(amount: number): void {
    this.state.health = Math.min(
      this.state.maxHealth,
      this.state.health + amount,
    );
  }

  addConnections(points: number): void {
    this.state.connections += points;
  }

  getHealth(): number {
    return this.state.health;
  }

  getMaxHealth(): number {
    return this.state.maxHealth;
  }

  isDead(): boolean {
    return !this.state.alive;
  }

  /** The grid cell the player is currently facing within interaction range. */
  getInteractionTarget(): { x: number; y: number } {
    const reach = INTERACTION_RANGE;
    return {
      x: Math.floor(this.state.x + this.state.dirX * reach),
      y: Math.floor(this.state.y + this.state.dirY * reach),
    };
  }

  canInteract(targetX: number, targetY: number): boolean {
    return (
      distance(this.state.x, this.state.y, targetX + 0.5, targetY + 0.5) <=
      INTERACTION_RANGE
    );
  }
}
