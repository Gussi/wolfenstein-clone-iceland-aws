/**
 * Runtime map state: converts a MapJSON into a mutable grid with door and
 * push-wall state, and provides solidity queries + animation updates.
 */

import {
  DOOR_OPEN_DURATION,
  PUSHWALL_SLIDE_CELLS,
  PUSHWALL_SLIDE_DURATION,
} from '../constants';
import { clamp } from '../math/vector';
import type {
  DoorState,
  MapJSON,
  MapState,
  PushWallState,
  SlideDirection,
  TileState,
} from '../types';

/** Texture IDs that represent see-through window walls (still solid). */
export const DOOR_TEXTURE_ID = 4;

const SLIDE_VECTORS: Record<SlideDirection, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 },
};

/** Build mutable runtime state from authored map data. */
export function createMapState(map: MapJSON): MapState {
  const doorCells = new Map<string, true>();
  for (const d of map.doors) doorCells.set(`${d.x},${d.y}`, true);
  const pushCells = new Map<string, true>();
  for (const p of map.pushWalls) pushCells.set(`${p.x},${p.y}`, true);

  const grid: TileState[][] = [];
  for (let y = 0; y < map.height; y++) {
    const row: TileState[] = [];
    for (let x = 0; x < map.width; x++) {
      const wallType = map.grid[y][x];
      const isDoor = doorCells.has(`${x},${y}`);
      const isPushWall = pushCells.has(`${x},${y}`);
      row.push({
        wallType,
        // Doors start closed (solid); push-walls start solid; else solid if non-zero.
        solid: wallType !== 0,
        isDoor,
        isPushWall,
      });
    }
    grid.push(row);
  }

  const doors: DoorState[] = map.doors.map((d) => ({
    id: d.id,
    x: d.x,
    y: d.y,
    state: 'closed',
    openAmount: 0,
    textureId: d.textureId,
    orientation: d.orientation,
  }));

  const pushWalls: PushWallState[] = map.pushWalls.map((p) => ({
    id: p.id,
    x: p.x,
    y: p.y,
    state: 'hidden',
    offset: 0,
    slideDirection: p.slideDirection,
    textureId: p.textureId,
    hintTextureId: p.hintTextureId,
    counted: false,
  }));

  return { name: map.name, width: map.width, height: map.height, grid, doors, pushWalls };
}

/** Bounds check. */
export function inBounds(map: MapState, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

/** Is the cell at the given world coordinates solid (blocks movement)? */
export function isSolidAt(map: MapState, worldX: number, worldY: number): boolean {
  const gx = Math.floor(worldX);
  const gy = Math.floor(worldY);
  if (!inBounds(map, gx, gy)) return true; // out of bounds = wall
  return map.grid[gy][gx].solid;
}

/** Get the tile at world coordinates, or null if out of bounds. */
export function tileAt(map: MapState, worldX: number, worldY: number): TileState | null {
  const gx = Math.floor(worldX);
  const gy = Math.floor(worldY);
  if (!inBounds(map, gx, gy)) return null;
  return map.grid[gy][gx];
}

export function doorAtCell(map: MapState, gx: number, gy: number): DoorState | undefined {
  return map.doors.find((d) => d.x === gx && d.y === gy);
}

export function pushWallAtCell(
  map: MapState,
  gx: number,
  gy: number,
): PushWallState | undefined {
  return map.pushWalls.find((p) => p.x === gx && p.y === gy);
}

/** Begin opening a closed door. Returns true if it started opening. */
export function startOpenDoor(door: DoorState): boolean {
  if (door.state === 'closed') {
    door.state = 'opening';
    return true;
  }
  return false;
}

/**
 * Begin sliding a hidden push-wall. The wall slides in its authored
 * direction. Returns true if it started sliding.
 */
export function startPushWall(pw: PushWallState): boolean {
  if (pw.state === 'hidden') {
    pw.state = 'sliding';
    pw.offset = 0;
    return true;
  }
  return false;
}

/** Advance door and push-wall animations by dt seconds. */
export function updateMapState(map: MapState, dt: number): void {
  for (const door of map.doors) {
    if (door.state === 'opening') {
      door.openAmount = clamp(door.openAmount + dt / DOOR_OPEN_DURATION, 0, 1);
      if (door.openAmount >= 1) {
        door.state = 'open';
        door.openAmount = 1;
        // Door cell becomes passable.
        map.grid[door.y][door.x].solid = false;
      }
    }
  }

  for (const pw of map.pushWalls) {
    if (pw.state === 'sliding') {
      const speed = PUSHWALL_SLIDE_CELLS / PUSHWALL_SLIDE_DURATION;
      pw.offset = clamp(pw.offset + dt * speed, 0, PUSHWALL_SLIDE_CELLS);
      if (pw.offset >= PUSHWALL_SLIDE_CELLS) {
        pw.state = 'open';
        finalizePushWall(map, pw);
      }
    }
  }
}

/** When a push-wall finishes, the origin cell opens and destination becomes wall. */
function finalizePushWall(map: MapState, pw: PushWallState): void {
  const v = SLIDE_VECTORS[pw.slideDirection];
  const destX = pw.x + v.dx * PUSHWALL_SLIDE_CELLS;
  const destY = pw.y + v.dy * PUSHWALL_SLIDE_CELLS;
  // Origin opens up.
  map.grid[pw.y][pw.x].solid = false;
  map.grid[pw.y][pw.x].wallType = 0;
  map.grid[pw.y][pw.x].isPushWall = false;
  // Destination becomes a plain wall (the slid block comes to rest).
  if (inBounds(map, destX, destY)) {
    map.grid[destY][destX].solid = true;
    map.grid[destY][destX].wallType = pw.textureId;
  }
}
