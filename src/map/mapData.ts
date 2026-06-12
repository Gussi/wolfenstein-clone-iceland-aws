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
  DoorOrientation,
  EnemySpawn,
  MapJSON,
  PickupSpawn,
  PushWallDef,
} from '../types';

/** Wall texture IDs (0 = empty). See domain-entities.md texture atlas. */
export const WALL = {
  EMPTY: 0,
  // Procedural walls (assets/textures.ts).
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
  // Bitmap walls sliced from walls-atlas.jpg (assets/imageAssets.ts), row-major.
  WOOD_PLAQUE: 11,
  WOOD_SCONCE2: 12,
  MARBLE: 13,
  BARRED_WINDOW: 14,
  BOOKSHELF_IMG: 15,
  CINDERBLOCK: 16,
  WINDOW_VOLCANO_IMG: 17,
  WOOD_LAMP: 18,
  WOOD_PLAQUE2: 19,
  ORNATE_GOLD: 20,
  // Bitmap pass-through doors / elevator sliced from doors-atlas.jpg.
  DOOR_OFFICE: 21,
  DOOR_ELEVATOR: 22,
  DOOR_VAULT: 23,
  DOOR_ORNATE: 24,
  DOOR_DARK: 25,
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

  // Scatter windows along the top border: the recurring erupting-volcano gag,
  // now using the bitmap window (with blinds) alongside the procedural one.
  for (let x = 3; x < size - 3; x += 5) {
    grid[0][x] = WALL.WINDOW_VOLCANO_IMG;
    grid[0][x + 1] = WALL.WINDOW_VOLCANO;
  }
  // Portraits and the odd boarded-up (barred) window along the bottom border.
  for (let x = 4; x < size - 4; x += 6) {
    grid[size - 1][x] = WALL.PORTRAIT_WALL;
    grid[size - 1][x + 2] = WALL.BARRED_WINDOW;
  }

  // Interior partition walls forming a grid of committee rooms, each clad in a
  // different material so the new wall textures are all on display.
  // Vertical partitions at x = 8, 16, 24 ; horizontal at y = 8, 16, 24.
  const partitionsX = [8, 16, 24];
  const partitionsY = [8, 16, 24];
  const vClad = [WALL.MARBLE, WALL.PLASTER_WAINSCOT, WALL.CINDERBLOCK];
  const hClad = [WALL.PLASTER_CREAM, WALL.MARBLE, WALL.CINDERBLOCK];
  partitionsX.forEach((px, i) => {
    for (let y = 1; y < size - 1; y++) setWall(px, y, vClad[i]);
  });
  partitionsY.forEach((py, i) => {
    for (let x = 1; x < size - 1; x++) setWall(x, py, hClad[i]);
  });

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

  // Decorative accents inside rooms (a tour of the wall atlas).
  setWall(2, 2, WALL.BOOKSHELF_IMG);
  setWall(3, 2, WALL.WOOD_PLAQUE);
  setWall(size - 3, 2, WALL.WOOD_SCONCE2);
  setWall(size - 4, 2, WALL.WOOD_LAMP);
  setWall(2, size - 3, WALL.WOOD_PLAQUE2);
  setWall(size - 3, size - 3, WALL.ORNATE_GOLD);
  setWall(14, 14, WALL.BOOKSHELF);
  setWall(18, 18, WALL.PLASTER_SCONCE);

  // --- Pass-through doors and an elevator on partition openings. ---
  // Each door cell is solid (its texture) until the player opens it with E.
  const doorDefs: Array<[string, number, number, number, DoorOrientation]> = [
    ['door-committee-1', 8, 12, WALL.COMMITTEE_DOOR, 'vertical'],
    ['door-office', 8, 4, WALL.DOOR_OFFICE, 'vertical'],
    ['door-elevator', 16, 20, WALL.DOOR_ELEVATOR, 'vertical'],
    ['door-vault', 24, 12, WALL.DOOR_VAULT, 'vertical'],
    ['door-ornate', 12, 8, WALL.DOOR_ORNATE, 'horizontal'],
    ['door-dark', 20, 16, WALL.DOOR_DARK, 'horizontal'],
  ];
  const doors: DoorDef[] = doorDefs.map(([id, x, y, textureId, orientation]) => {
    setWall(x, y, textureId);
    return { id, x, y, textureId, orientation };
  });

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

  // --- Enemies: scatter Red Tape and the new Committee Clerk in open cells. ---
  const enemies: EnemySpawn[] = [];
  const wantEnemies = 34;
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
    // Roughly every third spawn is a Clerk; the rest are Red Tape.
    const type = enemies.length % 3 === 0 ? 'clerk' : 'redTape';
    enemies.push({ type, x: ex, y: ey });
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
