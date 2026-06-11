// Generates assets/maps/level1.json — the prototype level for Pots & Parliament.
// A 32x32 grid: parliament lobby (open, dolerite + windows + arches) transitioning
// into a committee wing (repeating plaster rooms + doors). 30+ Red Tape, pickups,
// doors, and one push-wall secret.
//
// Run with: node tools/generate-level.mjs
//
// Wall texture ids:
//  1 dolerite | 2 plaster | 3 wainscot | 5 window | 6 portrait(secret hint)
//  7 bookshelf | 8 arch | 9 sconce | 10 carpet

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 32;
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = `${__dirname}/../public/assets/maps/level1.json`;

// Start fully open interior, solid border.
const grid = [];
for (let y = 0; y < SIZE; y++) {
  const row = [];
  for (let x = 0; x < SIZE; x++) {
    const isBorder = x === 0 || y === 0 || x === SIZE - 1 || y === SIZE - 1;
    row.push(isBorder ? 1 : 0);
  }
  grid.push(row);
}

const set = (x, y, v) => {
  if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) grid[y][x] = v;
};
const hLine = (x0, x1, y, v) => {
  for (let x = x0; x <= x1; x++) set(x, y, v);
};
const vLine = (x, y0, y1, v) => {
  for (let y = y0; y <= y1; y++) set(x, y, v);
};

// --- Windows in the north wall (the volcano is always visible) ---
for (const x of [5, 6, 12, 13, 20, 21, 26, 27]) set(x, 0, 5);
// A few windows on the east wall too.
for (const y of [4, 5, 9, 10]) set(SIZE - 1, y, 5);

// --- Lobby decor: arch pillars (rows 1-11, cols 1-14) ---
for (const [px, py] of [
  [4, 4],
  [4, 8],
  [9, 4],
  [9, 8],
]) {
  set(px, py, 8); // arch pillar
}
// A couple of sconces and a portrait on lobby walls.
set(1, 3, 9);
set(1, 7, 9);
set(7, 0, 6); // portrait between windows (decorative)

// --- Wall dividing lobby (left) from right wing, col 15, rows 1-11 ---
vLine(15, 1, 11, 2);
// Door from lobby into right wing at (15,6).
// (grid stays 0 at door cell; door defined below)
set(15, 6, 0);

// --- Horizontal wall dividing the upper half (lobby/right wing) from the
//     committee wing below, at row 12, across cols 1-30 ---
hLine(1, 30, 12, 2);
// Two doorways down into the committee wing.
set(6, 12, 0);
set(23, 12, 0);

// --- Right wing (rows 1-11, cols 16-30): a meeting room with bookshelves ---
vLine(22, 1, 5, 7); // bookshelf wall
hLine(16, 22, 8, 2); // partition
set(19, 8, 0); // doorway within right wing

// --- Committee wing (rows 13-30): grid of small rooms via internal walls ---
// Vertical corridor walls.
for (const cx of [8, 16, 24]) {
  vLine(cx, 13, 30, 2);
}
// Horizontal room walls.
for (const cy of [17, 22, 27]) {
  hLine(1, 30, cy, 3); // wainscot internal walls
}

// Punch doorways through the committee grid so every room connects.
const doorCells = [
  // vertical wall gaps
  [8, 15],
  [8, 20],
  [8, 25],
  [8, 29],
  [16, 15],
  [16, 20],
  [16, 25],
  [16, 29],
  [24, 15],
  [24, 20],
  [24, 25],
  [24, 29],
  // horizontal wall gaps
  [4, 17],
  [12, 17],
  [20, 17],
  [28, 17],
  [4, 22],
  [12, 22],
  [20, 22],
  [28, 22],
  [4, 27],
  [12, 27],
  [20, 27],
  [28, 27],
];
for (const [x, y] of doorCells) set(x, y, 0);

// Some committee rooms get a window or sconce for flavour.
set(SIZE - 1, 19, 5);
set(SIZE - 1, 25, 5);
set(0, 19, 9);
set(0, 25, 9);

// --- Secret push-wall ---
// In the bottom-right committee room, a "portrait" wall (texture 6) hides a
// small alcove with a kleinur. The push-wall is at (28,29), slides south is
// blocked by border, so it slides west into the room interior.
// Place it embedded in the wainscot wall row 27 won't work (that's a wall row);
// instead embed in the vertical wall at col 24, row 29.
const pushWall = {
  id: 'secret-1',
  x: 24,
  y: 29,
  textureId: 2, // becomes plaster after opening
  hintTextureId: 6, // portrait — subtle visual hint
  slideDirection: 'east',
};
// Mark the push-wall cell with its hint texture so it renders as a wall.
set(pushWall.x, pushWall.y, pushWall.hintTextureId);
// Ensure the cell it slides into is currently open.
set(26, 29, 0);
set(25, 29, 0);

// --- Doors (defined separately; their grid cells are 0) ---
const doors = [
  { id: 'door-lobby-rightwing', x: 15, y: 6, textureId: 4, orientation: 'vertical' },
  { id: 'door-lobby-committee-w', x: 6, y: 12, textureId: 4, orientation: 'horizontal' },
  { id: 'door-lobby-committee-e', x: 23, y: 12, textureId: 4, orientation: 'horizontal' },
];

// --- Player spawn: lobby, near the north-west, facing south-east into the room ---
const playerSpawn = { x: 2, y: 2, angle: Math.PI / 4 };

// --- Enemies: 32 Red Tape spread across lobby + committee wing ---
const enemyCells = [
  // Lobby
  [6, 3], [11, 3], [6, 6], [12, 6], [3, 9], [8, 10], [12, 9],
  // Right wing
  [18, 3], [20, 5], [25, 3], [28, 4], [18, 10], [26, 10],
  // Committee wing (lots — frantic)
  [3, 14], [6, 15], [11, 14], [14, 16], [19, 14], [22, 15], [27, 14],
  [3, 19], [12, 19], [20, 19], [28, 20],
  [4, 24], [10, 24], [18, 24], [26, 24],
  [4, 29], [11, 29], [19, 29], [27, 28],
];
const enemies = enemyCells.map(([x, y]) => ({ type: 'redTape', x, y }));

// --- Pickups: coffee scattered, kleinur in the secret + one tough spot ---
const pickups = [
  { type: 'coffee', x: 10, y: 5 },
  { type: 'coffee', x: 2, y: 10 },
  { type: 'coffee', x: 28, y: 2 },
  { type: 'coffee', x: 6, y: 20 },
  { type: 'coffee', x: 20, y: 25 },
  { type: 'coffee', x: 14, y: 29 },
  { type: 'kleinur', x: 26, y: 6 },
  { type: 'kleinur', x: 28, y: 29 }, // reward behind the secret push-wall
];

// --- Decorations (non-blocking flavour sprites) ---
const decorations = [
  { spriteType: 'desk', x: 3, y: 2, blocking: true },
  { spriteType: 'plant', x: 13, y: 1, blocking: false },
  { spriteType: 'plant', x: 1, y: 11, blocking: false },
  { spriteType: 'coat_of_arms', x: 7, y: 1, blocking: false },
  { spriteType: 'desk', x: 18, y: 2, blocking: true },
  { spriteType: 'plant', x: 25, y: 11, blocking: false },
];

const map = {
  name: 'Parliament Lobby & Committee Wing',
  width: SIZE,
  height: SIZE,
  grid,
  playerSpawn,
  enemies,
  pickups,
  doors,
  pushWalls: [pushWall],
  decorations,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(map, null, 2));
console.log(
  `Wrote ${OUT}: ${SIZE}x${SIZE}, ${enemies.length} enemies, ${pickups.length} pickups, ${doors.length} doors, ${map.pushWalls.length} secret.`,
);
