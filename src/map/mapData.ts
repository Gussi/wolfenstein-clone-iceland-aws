/**
 * Map authoring format, validation, and the procedural level-0 generator.
 *
 * The validation function is a property-test target: it must accept any
 * structurally-valid MapJSON and reject malformed input without throwing.
 */

import { GRID_SIZE } from '../constants';
import type {
  DecorationDef,
  DoorDef,
  EnemySpawn,
  MapJSON,
  PickupSpawn,
  PushWallDef,
} from '../types';

/** Wall texture IDs (0 = empty). See domain-entities.md texture atlas. */
export const WALL = {
  EMPTY: 0,
  DOLERITE_DARK: 1,
  PLASTER_CREAM: 2,
  PLASTER_WAINSCOT: 3,
  COMMITTEE_DOOR: 4,
  WINDOW_VOLCANO: 5,
  PORTRAIT_WALL: 6,
  BOOKSHELF: 7,
  DOLERITE_ARCH: 8,
  PLASTER_SCONCE: 9,
  CARPET_BLUE: 10,
} as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Validate a parsed-but-untrusted value as a MapJSON.
 * Pure and total: never throws, returns a structured result.
 */
export function validateMap(data: unknown): ValidationResult {
  const errors: string[] = [];
  const push = (m: string) => errors.push(m);

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Map must be a non-null object'] };
  }
  const m = data as Record<string, unknown>;

  if (typeof m.name !== 'string') push('name must be a string');

  if (!isFiniteNumber(m.width) || m.width <= 0 || !Number.isInteger(m.width)) {
    push('width must be a positive integer');
  }
  if (!isFiniteNumber(m.height) || m.height <= 0 || !Number.isInteger(m.height)) {
    push('height must be a positive integer');
  }

  const width = m.width as number;
  const height = m.height as number;

  if (!Array.isArray(m.grid)) {
    push('grid must be an array');
  } else if (isFiniteNumber(height) && m.grid.length !== height) {
    push(`grid must have ${height} rows, found ${m.grid.length}`);
  } else {
    for (let y = 0; y < m.grid.length; y++) {
      const row = (m.grid as unknown[])[y];
      if (!Array.isArray(row)) {
        push(`grid row ${y} must be an array`);
        continue;
      }
      if (isFiniteNumber(width) && row.length !== width) {
        push(`grid row ${y} must have ${width} cells, found ${row.length}`);
      }
      for (let x = 0; x < row.length; x++) {
        const cell = (row as unknown[])[x];
        if (!isFiniteNumber(cell) || !Number.isInteger(cell) || cell < 0) {
          push(`grid cell [${y}][${x}] must be a non-negative integer`);
          break;
        }
      }
    }
  }

  const spawn = m.playerSpawn as Record<string, unknown> | undefined;
  if (typeof spawn !== 'object' || spawn === null) {
    push('playerSpawn must be an object');
  } else {
    if (!isFiniteNumber(spawn.x)) push('playerSpawn.x must be a number');
    if (!isFiniteNumber(spawn.y)) push('playerSpawn.y must be a number');
    if (!isFiniteNumber(spawn.angle)) push('playerSpawn.angle must be a number');
    if (
      isFiniteNumber(spawn.x) &&
      isFiniteNumber(spawn.y) &&
      isFiniteNumber(width) &&
      isFiniteNumber(height)
    ) {
      if (spawn.x < 0 || spawn.x >= width || spawn.y < 0 || spawn.y >= height) {
        push('playerSpawn must be within map bounds');
      }
    }
  }

  for (const key of ['enemies', 'pickups', 'doors', 'pushWalls', 'decorations']) {
    if (!Array.isArray(m[key])) push(`${key} must be an array`);
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Procedural level-0 generator: "Parliament Lobby"
// ---------------------------------------------------------------------------

/** Small deterministic PRNG (mulberry32) so levels are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build the prototype level: a 32x32 parliament-lobby maze with rooms,
 * a door, one push-wall secret, ~32 Red Tape enemies, and scattered pickups.
 */
export function buildLevel0(): MapJSON {
  return assembleLevel0(GRID_SIZE, mulberry32(12345));
}

function assembleLevel0(size: number, rand: () => number): MapJSON {
  // Start fully open, then add a solid border.
  const grid: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const border = x === 0 || y === 0 || x === size - 1 || y === size - 1;
      row.push(border ? WALL.DOLERITE_DARK : WALL.EMPTY);
    }
    grid.push(row);
  }

  const setWall = (x: number, y: number, t: number) => {
    if (x > 0 && y > 0 && x < size - 1 && y < size - 1) grid[y][x] = t;
  };

  // Scatter windows (with the recurring volcano gag) along the top border.
  for (let x = 3; x < size - 3; x += 5) {
    grid[0][x] = WALL.WINDOW_VOLCANO;
    grid[0][x + 1] = WALL.WINDOW_VOLCANO;
  }
  // Portraits along the bottom border.
  for (let x = 4; x < size - 4; x += 6) {
    grid[size - 1][x] = WALL.PORTRAIT_WALL;
  }

  // Interior partition walls forming a grid of committee rooms.
  // Vertical partitions at x = 8, 16, 24 ; horizontal at y = 8, 16, 24.
  const partitionsX = [8, 16, 24];
  const partitionsY = [8, 16, 24];
  for (const px of partitionsX) {
    for (let y = 1; y < size - 1; y++) setWall(px, y, WALL.PLASTER_WAINSCOT);
  }
  for (const py of partitionsY) {
    for (let x = 1; x < size - 1; x++) setWall(x, py, WALL.PLASTER_CREAM);
  }

  // Carve doorways through partitions so all rooms connect.
  const carve = (x: number, y: number) => setWall(x, y, WALL.EMPTY);
  // Openings in vertical partitions.
  for (const px of partitionsX) {
    carve(px, 4);
    carve(px, 12);
    carve(px, 20);
    carve(px, 28);
  }
  // Openings in horizontal partitions.
  for (const py of partitionsY) {
    carve(4, py);
    carve(12, py);
    carve(20, py);
    carve(28, py);
  }

  // A couple of decorative bookshelf / sconce accents inside rooms.
  setWall(2, 2, WALL.BOOKSHELF);
  setWall(size - 3, 2, WALL.PLASTER_SCONCE);
  setWall(2, size - 3, WALL.PLASTER_SCONCE);

  // --- Door: an interactive committee door on the x=8 partition at y=4. ---
  // Re-solidify a single cell as the door tile.
  const doorX = 8;
  const doorY = 12;
  setWall(doorX, doorY, WALL.COMMITTEE_DOOR);
  const doors: DoorDef[] = [
    {
      id: 'door-committee-1',
      x: doorX,
      y: doorY,
      textureId: WALL.COMMITTEE_DOOR,
      orientation: 'vertical',
    },
  ];

  // --- Push-wall secret: a hidden "cronyism back room" behind the SE wall. ---
  // Create a small sealed room in the bottom-right, with a camouflaged
  // push-wall that slides south to reveal it.
  const secretX = 28;
  const secretY = 26;
  // Seal a 2x2 pocket around the secret with plaster, leaving the push-wall.
  setWall(secretX, secretY, WALL.PLASTER_WAINSCOT); // push-wall cell
  const pushWalls: PushWallDef[] = [
    {
      id: 'pushwall-cronyism',
      x: secretX,
      y: secretY,
      textureId: WALL.PLASTER_WAINSCOT,
      hintTextureId: WALL.PLASTER_SCONCE,
      slideDirection: 'south',
    },
  ];

  // --- Player spawn: top-left room, facing east (into the building). ---
  const playerSpawn = { x: 3, y: 3, angle: 0 };

  // --- Enemies: scatter ~32 Red Tape in open cells away from spawn. ---
  const enemies: EnemySpawn[] = [];
  const wantEnemies = 32;
  let guard = 0;
  while (enemies.length < wantEnemies && guard < 5000) {
    guard++;
    const ex = 1 + Math.floor(rand() * (size - 2));
    const ey = 1 + Math.floor(rand() * (size - 2));
    if (grid[ey][ex] !== WALL.EMPTY) continue;
    // Keep a safe radius around the spawn.
    const dx = ex - playerSpawn.x;
    const dy = ey - playerSpawn.y;
    if (dx * dx + dy * dy < 25) continue; // 5-cell buffer
    enemies.push({ type: 'redTape', x: ex, y: ey });
  }

  // --- Pickups: coffee scattered, a couple of kleinur in deeper rooms. ---
  const pickups: PickupSpawn[] = [
    { type: 'coffee', x: 5, y: 13 },
    { type: 'coffee', x: 13, y: 5 },
    { type: 'coffee', x: 21, y: 13 },
    { type: 'coffee', x: 13, y: 21 },
    { type: 'coffee', x: 27, y: 21 },
    { type: 'kleinur', x: 21, y: 27 },
    { type: 'kleinur', x: 27, y: 27 }, // inside the secret room
  ];

  // --- Decorations: blocking desks and non-blocking plants. ---
  const decorations: DecorationDef[] = [
    { type: 'desk', x: 4, y: 4, blocking: true },
    { type: 'desk', x: 20, y: 4, blocking: true },
    { type: 'plant', x: 6, y: 6, blocking: false },
    { type: 'plant', x: 26, y: 6, blocking: false },
    { type: 'coat_of_arms', x: 12, y: 2, blocking: false },
  ];

  return {
    name: 'Parliament Lobby',
    width: size,
    height: size,
    grid,
    playerSpawn,
    enemies,
    pickups,
    doors,
    pushWalls,
    decorations,
  };
}
