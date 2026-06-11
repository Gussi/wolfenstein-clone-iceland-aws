// Loads and manages level map data: grid access for raycasting/collision,
// plus door and push-wall state and animation.

import {
  DOOR_OPEN_DURATION,
  PUSHWALL_SLIDE_DISTANCE,
  PUSHWALL_SLIDE_DURATION,
} from './constants';
import type {
  DoorState,
  MapJSON,
  PushWallState,
  SlideDirection,
} from './types';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate a parsed map object. Returns a list of errors (empty = valid).
 * Exported for testing.
 */
export function validateMap(map: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof map !== 'object' || map === null) {
    return [{ field: 'root', message: 'Map must be an object' }];
  }
  const m = map as Partial<MapJSON>;

  if (typeof m.width !== 'number' || m.width <= 0) {
    errors.push({ field: 'width', message: 'width must be a positive number' });
  }
  if (typeof m.height !== 'number' || m.height <= 0) {
    errors.push({ field: 'height', message: 'height must be a positive number' });
  }
  if (!Array.isArray(m.grid)) {
    errors.push({ field: 'grid', message: 'grid must be a 2D array' });
  } else if (typeof m.height === 'number' && m.grid.length !== m.height) {
    errors.push({
      field: 'grid',
      message: `grid must have ${m.height} rows, found ${m.grid.length}`,
    });
  } else if (typeof m.width === 'number') {
    for (let row = 0; row < m.grid.length; row++) {
      const gridRow = m.grid[row];
      if (!Array.isArray(gridRow) || gridRow.length !== m.width) {
        errors.push({
          field: `grid[${row}]`,
          message: `row must have ${m.width} columns`,
        });
        break;
      }
    }
  }
  if (
    typeof m.playerSpawn !== 'object' ||
    m.playerSpawn === null ||
    typeof m.playerSpawn.x !== 'number' ||
    typeof m.playerSpawn.y !== 'number' ||
    typeof m.playerSpawn.angle !== 'number'
  ) {
    errors.push({
      field: 'playerSpawn',
      message: 'playerSpawn must have numeric x, y, angle',
    });
  }
  return errors;
}

export class MapSystem {
  private mapData!: MapJSON;
  private width = 0;
  private height = 0;
  // Working grid copy that can be mutated (push-walls move).
  private grid: number[][] = [];
  private doors: DoorState[] = [];
  private pushWalls: PushWallState[] = [];
  // Quick lookup: "x,y" -> door / pushwall
  private doorAt = new Map<string, DoorState>();
  private pushWallAt = new Map<string, PushWallState>();

  loadMap(map: MapJSON): void {
    const errors = validateMap(map);
    if (errors.length > 0) {
      throw new Error(
        `Invalid map: ${errors.map((e) => `${e.field}: ${e.message}`).join('; ')}`,
      );
    }
    this.mapData = map;
    this.width = map.width;
    this.height = map.height;
    // Deep copy grid so we never mutate the loaded asset.
    this.grid = map.grid.map((row) => [...row]);

    this.doors = map.doors.map((d) => ({
      id: d.id,
      x: d.x,
      y: d.y,
      state: 'closed',
      openAmount: 0,
      textureId: d.textureId,
      orientation: d.orientation,
    }));
    this.pushWalls = map.pushWalls.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      state: 'hidden',
      offset: 0,
      slideDirection: p.slideDirection,
      textureId: p.textureId,
      hintTextureId: p.hintTextureId,
    }));

    this.doorAt.clear();
    this.pushWallAt.clear();
    for (const door of this.doors) this.doorAt.set(key(door.x, door.y), door);
    for (const pw of this.pushWalls) this.pushWallAt.set(key(pw.x, pw.y), pw);
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getMapData(): MapJSON {
    return this.mapData;
  }

  /** The wall texture id at a grid cell (0 = empty). Out of bounds = wall (1). */
  getWallType(gridX: number, gridY: number): number {
    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return 1;
    }
    const row = this.grid[gridY];
    if (!row) return 1;
    return row[gridX] ?? 0;
  }

  /** Whether a cell blocks movement and rays. */
  isSolid(gridX: number, gridY: number): boolean {
    const door = this.doorAt.get(key(gridX, gridY));
    if (door) {
      // Open doors are passable; closed/animating doors block.
      return door.state !== 'open';
    }
    return this.getWallType(gridX, gridY) !== 0;
  }

  getDoors(): DoorState[] {
    return this.doors;
  }

  getPushWalls(): PushWallState[] {
    return this.pushWalls;
  }

  getDoorAt(gridX: number, gridY: number): DoorState | undefined {
    return this.doorAt.get(key(gridX, gridY));
  }

  getPushWallAt(gridX: number, gridY: number): PushWallState | undefined {
    return this.pushWallAt.get(key(gridX, gridY));
  }

  /** Begin opening a door. Returns true if a door was actually opened. */
  openDoor(door: DoorState): boolean {
    if (door.state === 'closed') {
      door.state = 'opening';
      return true;
    }
    return false;
  }

  /** Begin sliding a push-wall. Returns true if it was activated. */
  activatePushWall(pushWall: PushWallState): boolean {
    if (pushWall.state === 'hidden') {
      pushWall.state = 'sliding';
      return true;
    }
    return false;
  }

  update(deltaTime: number): void {
    // Animate doors.
    for (const door of this.doors) {
      if (door.state === 'opening') {
        door.openAmount += deltaTime / DOOR_OPEN_DURATION;
        if (door.openAmount >= 1) {
          door.openAmount = 1;
          door.state = 'open';
        }
      }
    }

    // Animate push-walls.
    for (const pw of this.pushWalls) {
      if (pw.state === 'sliding') {
        pw.offset += (deltaTime / PUSHWALL_SLIDE_DURATION) * PUSHWALL_SLIDE_DISTANCE;
        if (pw.offset >= PUSHWALL_SLIDE_DISTANCE) {
          pw.offset = PUSHWALL_SLIDE_DISTANCE;
          pw.state = 'open';
          this.finalizePushWall(pw);
        }
      }
    }
  }

  private finalizePushWall(pw: PushWallState): void {
    // Clear the original cell, set the destination cell to the wall texture.
    const { dx, dy } = slideOffset(pw.slideDirection);
    const destX = pw.x + dx * PUSHWALL_SLIDE_DISTANCE;
    const destY = pw.y + dy * PUSHWALL_SLIDE_DISTANCE;

    const origRow = this.grid[pw.y];
    if (origRow) origRow[pw.x] = 0;

    if (destY >= 0 && destY < this.height && destX >= 0 && destX < this.width) {
      const destRow = this.grid[destY];
      if (destRow) destRow[destX] = pw.textureId;
    }
    this.pushWallAt.delete(key(pw.x, pw.y));
  }
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}

export function slideOffset(dir: SlideDirection): { dx: number; dy: number } {
  switch (dir) {
    case 'north':
      return { dx: 0, dy: -1 };
    case 'south':
      return { dx: 0, dy: 1 };
    case 'east':
      return { dx: 1, dy: 0 };
    case 'west':
      return { dx: -1, dy: 0 };
  }
}
