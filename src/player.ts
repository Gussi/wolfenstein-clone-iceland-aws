/**
 * Player state creation and update: movement (with sliding collision),
 * mouse-look rotation, damage/heal, and door/push-wall interaction.
 */

import { slideMove } from './collision';
import {
  CAMERA_PLANE_LENGTH,
  COLLISION_RADIUS,
  INTERACTION_RANGE,
  KEYBOARD_TURN_SPEED,
  MAX_HEALTH,
  MOVE_SPEED,
  ROTATION_SPEED,
  SCORE_PER_SECRET,
} from './constants';
import { angleToCardinal, clamp, directionVectors, normalizeAngle } from './math/vector';
import {
  doorAtCell,
  pushWallAtCell,
  startOpenDoor,
  startPushWall,
} from './map/mapState';
import type { MapState, PlayerState } from './types';

export interface MovementInput {
  forward: boolean;
  backward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  /** Arrow-key view turning (keyboard look). */
  turnLeft: boolean;
  turnRight: boolean;
  /** Mouse horizontal delta (pixels) accumulated this frame. */
  mouseDeltaX: number;
}

/** Create a player at the given spawn cell (placed at cell center). */
export function createPlayer(spawn: { x: number; y: number; angle: number }): PlayerState {
  const angle = normalizeAngle(spawn.angle);
  const { dirX, dirY, planeX, planeY } = directionVectors(angle, CAMERA_PLANE_LENGTH);
  return {
    x: spawn.x + 0.5,
    y: spawn.y + 0.5,
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

/** Apply rotation from mouse movement, refreshing direction/plane vectors. */
export function rotatePlayer(player: PlayerState, mouseDeltaX: number): void {
  if (mouseDeltaX === 0) return;
  player.angle = normalizeAngle(player.angle + mouseDeltaX * ROTATION_SPEED);
  const { dirX, dirY, planeX, planeY } = directionVectors(player.angle, CAMERA_PLANE_LENGTH);
  player.dirX = dirX;
  player.dirY = dirY;
  player.planeX = planeX;
  player.planeY = planeY;
}

/** Update player position and facing for one frame. */
export function updatePlayer(
  player: PlayerState,
  input: MovementInput,
  map: MapState,
  dt: number,
): void {
  if (!player.alive) return;
  // Mouse-look plus arrow-key turning (converted into equivalent mouse pixels).
  const keyboardTurn = (input.turnRight ? 1 : 0) - (input.turnLeft ? 1 : 0);
  const turnPixels = (keyboardTurn * KEYBOARD_TURN_SPEED * dt) / ROTATION_SPEED;
  rotatePlayer(player, input.mouseDeltaX + turnPixels);

  let moveX = 0;
  let moveY = 0;
  const step = MOVE_SPEED * dt;
  if (input.forward) {
    moveX += player.dirX * step;
    moveY += player.dirY * step;
  }
  if (input.backward) {
    moveX -= player.dirX * step;
    moveY -= player.dirY * step;
  }
  // Strafe uses the plane (perpendicular) direction.
  if (input.strafeLeft) {
    moveX += player.dirY * step;
    moveY -= player.dirX * step;
  }
  if (input.strafeRight) {
    moveX -= player.dirY * step;
    moveY += player.dirX * step;
  }

  const resolved = slideMove(map, player.x, player.y, moveX, moveY, COLLISION_RADIUS);
  player.x = resolved.x;
  player.y = resolved.y;
}

/** Apply damage. Returns true if this hit killed (downed) the player. */
export function damagePlayer(player: PlayerState, amount: number): boolean {
  if (!player.alive) return false;
  player.health = clamp(player.health - amount, 0, player.maxHealth);
  if (player.health <= 0) {
    player.alive = false;
    return true;
  }
  return false;
}

/** Heal the player up to max. Returns the amount actually restored. */
export function healPlayer(player: PlayerState, amount: number): number {
  const before = player.health;
  player.health = clamp(player.health + amount, 0, player.maxHealth);
  return player.health - before;
}

export interface InteractionResult {
  acted: boolean;
  openedDoor: boolean;
  revealedSecret: boolean;
}

/**
 * Attempt to interact with whatever is directly in front of the player
 * (a door or a push-wall) within INTERACTION_RANGE.
 */
export function interact(player: PlayerState, map: MapState): InteractionResult {
  const result: InteractionResult = { acted: false, openedDoor: false, revealedSecret: false };
  // Probe a couple of points along the facing direction.
  for (let d = 0.5; d <= INTERACTION_RANGE; d += 0.5) {
    const tx = player.x + player.dirX * d;
    const ty = player.y + player.dirY * d;
    const gx = Math.floor(tx);
    const gy = Math.floor(ty);

    const door = doorAtCell(map, gx, gy);
    if (door) {
      if (startOpenDoor(door)) {
        result.acted = true;
        result.openedDoor = true;
      }
      return result;
    }

    const pw = pushWallAtCell(map, gx, gy);
    if (pw && pw.state === 'hidden') {
      // Slide the push-wall away from the player (cardinal of facing).
      pw.slideDirection = angleToCardinal(player.angle);
      if (startPushWall(pw)) {
        result.acted = true;
        result.revealedSecret = true;
        if (!pw.counted) {
          pw.counted = true;
          player.secretsFound += 1;
          player.connections += SCORE_PER_SECRET;
        }
      }
      return result;
    }
  }
  return result;
}
