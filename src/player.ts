// Player state: movement with sliding collision, rotation, health, interaction.

import {
  COLLISION_RADIUS,
  MAX_HEALTH,
  MOVE_SPEED,
  ROTATION_SPEED,
} from './constants';
import { cameraPlane, clamp } from './math-utils';
import type { MapSystem } from './map-system';
import type { InputState, PlayerState } from './types';

export class Player {
  state: PlayerState;

  constructor(x: number, y: number, angle: number) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const plane = cameraPlane(dirX, dirY);
    this.state = {
      x,
      y,
      angle,
      dirX,
      dirY,
      planeX: plane.x,
      planeY: plane.y,
      health: MAX_HEALTH,
      maxHealth: MAX_HEALTH,
      alive: true,
    };
  }

  reset(x: number, y: number, angle: number): void {
    this.state.x = x;
    this.state.y = y;
    this.setAngle(angle);
    this.state.health = MAX_HEALTH;
    this.state.alive = true;
  }

  update(input: InputState, map: MapSystem, deltaTime: number): void {
    if (!this.state.alive) return;

    // Rotation from mouse.
    if (input.turnDelta !== 0) {
      this.setAngle(this.state.angle + input.turnDelta * ROTATION_SPEED);
    }

    // Movement vector.
    const s = this.state;
    let moveX = 0;
    let moveY = 0;
    const dist = MOVE_SPEED * deltaTime;

    if (input.moveForward) {
      moveX += s.dirX * dist;
      moveY += s.dirY * dist;
    }
    if (input.moveBackward) {
      moveX -= s.dirX * dist;
      moveY -= s.dirY * dist;
    }
    // Strafe: perpendicular to direction.
    if (input.strafeLeft) {
      moveX += s.dirY * dist;
      moveY -= s.dirX * dist;
    }
    if (input.strafeRight) {
      moveX -= s.dirY * dist;
      moveY += s.dirX * dist;
    }

    this.moveWithCollision(moveX, moveY, map);
  }

  private moveWithCollision(moveX: number, moveY: number, map: MapSystem): void {
    const s = this.state;

    // Test X axis independently (enables wall sliding).
    const newX = s.x + moveX;
    const marginX = moveX > 0 ? COLLISION_RADIUS : -COLLISION_RADIUS;
    if (!map.isSolid(Math.floor(newX + marginX), Math.floor(s.y))) {
      s.x = newX;
    }

    // Test Y axis independently.
    const newY = s.y + moveY;
    const marginY = moveY > 0 ? COLLISION_RADIUS : -COLLISION_RADIUS;
    if (!map.isSolid(Math.floor(s.x), Math.floor(newY + marginY))) {
      s.y = newY;
    }
  }

  setAngle(angle: number): void {
    const s = this.state;
    s.angle = angle;
    s.dirX = Math.cos(angle);
    s.dirY = Math.sin(angle);
    const plane = cameraPlane(s.dirX, s.dirY);
    s.planeX = plane.x;
    s.planeY = plane.y;
  }

  takeDamage(amount: number): boolean {
    const s = this.state;
    s.health = clamp(s.health - amount, 0, s.maxHealth);
    if (s.health <= 0) {
      s.alive = false;
    }
    return s.alive;
  }

  heal(amount: number): void {
    const s = this.state;
    s.health = clamp(s.health + amount, 0, s.maxHealth);
  }

  getPosition(): PlayerState {
    return this.state;
  }

  isDead(): boolean {
    return !this.state.alive;
  }
}
