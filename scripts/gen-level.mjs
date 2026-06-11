/**
 * Level generator for level1.json — "Parliament Lobby".
 * Run with: node scripts/gen-level.mjs
 * Produces a 32x32 grid: a lobby hall on the left, a long committee corridor
 * with repeating rooms on the right, joined by a door, plus a push-wall secret.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const W = 32;
const H = 32;

// Wall IDs (see domain-entities.md):
// 1 dolerite_dark, 2 plaster_cream, 3 plaster_wainscot, 4 committee_door,
// 5 window_volcano, 6 portrait_wall, 7 bookshelf, 8 dolerite_arch,
// 9 plaster_sconce, 10 carpet_blue
const EMPTY = 0;
const DOLERITE = 1;
const PLASTER = 2;
const WAINSCOT = 3;
const WINDOW = 5;
const PORTRAIT = 6;
const SCONCE = 9;

// Start fully solid dolerite, then carve rooms.
const grid = Array.from({ length: H }, () =>
  Array.from({ length: W }, () => DOLERITE),
);

function carveRoom(x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) grid[y][x] = EMPTY;
}

function wallLine(x0, y0, x1, y1, id) {
  if (x0 === x1) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) grid[y][x0] = id;
  } else if (y0 === y1) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) grid[y0][x] = id;
  }
}

// ---- Lobby hall (left): big open neoclassical space ----
carveRoom(2, 2, 13, 20);
// Plaster interior walls around the lobby
wallLine(1, 1, 14, 1, PLASTER);
wallLine(1, 21, 14, 21, PLASTER);
wallLine(1, 1, 1, 21, DOLERITE);
// A couple of decorative wall features in the lobby
grid[1][4] = WINDOW;
grid[1][10] = WINDOW;
grid[21][7] = PORTRAIT;
grid[10][1] = SCONCE;

// Central pillars in the lobby (dolerite arches)
grid[8][6] = 8;
grid[8][10] = 8;
grid[14][6] = 8;
grid[14][10] = 8;

// ---- Committee corridor (right): long hall with repeating rooms ----
carveRoom(16, 2, 29, 29);
wallLine(30, 1, 30, 30, DOLERITE);
wallLine(15, 1, 15, 30, DOLERITE);

// Repeating committee rooms off the corridor (cells with wainscot walls + doors as decoration)
// Corridor runs vertically along x=17..18; rooms branch to the right.
for (let ry = 3; ry <= 25; ry += 6) {
  // room walls
  wallLine(20, ry, 29, ry, WAINSCOT);
  wallLine(20, ry + 4, 29, ry + 4, WAINSCOT);
  wallLine(20, ry, 20, ry + 4, WAINSCOT);
  // carve room interior
  carveRoom(21, ry + 1, 28, ry + 3);
  // doorway gap into the room
  grid[ry + 2][20] = EMPTY;
}

// Corridor separating wall between lobby and committee wing (with a door cell)
wallLine(14, 2, 14, 20, PLASTER);

// ---- Secret room (top-right corner), reached via push-wall ----
carveRoom(26, 2, 29, 5);

// Decorations along corridor walls
grid[12][30] = WINDOW;
grid[20][30] = WINDOW;

const map = {
  name: "Parliament Lobby",
  width: W,
  height: H,
  grid,
  playerSpawn: { x: 7, y: 18, angle: -Math.PI / 2 }, // facing north (up)
  doors: [
    // Door between lobby and committee corridor
    {
      id: "door_main",
      x: 14,
      y: 11,
      textureId: "committee_door",
      orientation: "vertical",
    },
    // Door into the first committee room
    {
      id: "door_room1",
      x: 20,
      y: 5,
      textureId: "committee_door",
      orientation: "vertical",
    },
  ],
  pushWalls: [
    // Secret push-wall in the top-right room; slides north into the secret room
    {
      id: "secret_1",
      x: 27,
      y: 6,
      textureId: "plaster_cream",
      hintTextureId: "plaster_sconce",
      slideDirection: "north",
    },
  ],
  enemies: [],
  pickups: [],
  decorations: [
    { type: "desk", x: 5, y: 5, blocking: true },
    { type: "plant", x: 12, y: 3, blocking: true },
    { type: "coat_of_arms", x: 7, y: 19, blocking: false },
    { type: "plant", x: 22, y: 8, blocking: true },
    { type: "desk", x: 25, y: 14, blocking: true },
    { type: "plant", x: 17, y: 27, blocking: true },
  ],
};

// Make door cells passable carve (doors sit in solid plaster wall — ensure neighbors open)
function ensureOpen(x, y) {
  grid[y][x] = EMPTY;
}
ensureOpen(13, 11); // lobby side of main door
ensureOpen(15, 11); // corridor side
ensureOpen(16, 11);
ensureOpen(19, 5); // approach to room1 door
ensureOpen(21, 5);

// ---- Populate enemies: spread 32 Red Tape across corridor + rooms ----
const enemyCells = [
  // committee corridor
  [17, 4],
  [18, 7],
  [17, 10],
  [18, 13],
  [17, 16],
  [18, 19],
  [17, 22],
  [18, 25],
  [17, 28],
  // committee rooms
  [23, 4],
  [26, 5],
  [22, 10],
  [27, 11],
  [24, 16],
  [28, 17],
  [23, 22],
  [26, 23],
  [25, 28],
  // lobby intruders
  [4, 8],
  [9, 8],
  [6, 12],
  [11, 14],
  [4, 16],
  [10, 18],
  [7, 6],
  [12, 10],
  [5, 19],
  [9, 4],
  [3, 11],
  [11, 6],
  [8, 16],
  [6, 9],
  [10, 12],
];
map.enemies = enemyCells
  .filter(([x, y]) => grid[y][x] === EMPTY)
  .map(([x, y]) => ({ type: "redTape", x, y }));

// ---- Pickups: coffee scattered, kleinur rarer (one in the secret room) ----
const coffeeCells = [
  [3, 3],
  [12, 19],
  [17, 13],
  [28, 27],
  [22, 16],
  [4, 19],
];
const kleinurCells = [
  [28, 3],
  [9, 16],
]; // 28,3 is in the secret room
map.pickups = [
  ...coffeeCells
    .filter(([x, y]) => grid[y][x] === EMPTY)
    .map(([x, y]) => ({ type: "coffee", x, y })),
  ...kleinurCells
    .filter(([x, y]) => grid[y][x] === EMPTY)
    .map(([x, y]) => ({ type: "kleinur", x, y })),
];

const outPath = "assets/maps/level1.json";
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(map, null, 2));
console.log(
  `Wrote ${outPath}: ${map.enemies.length} enemies, ${map.pickups.length} pickups, ` +
    `${map.doors.length} doors, ${map.pushWalls.length} secret(s).`,
);
