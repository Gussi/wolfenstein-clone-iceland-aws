// Verifies the generated level is playable:
//  - player spawn is on an open cell
//  - every enemy and pickup sits on an open cell
//  - every enemy and pickup is reachable from the spawn via flood fill
//    (doors are treated as passable; the secret push-wall is treated as
//     openable, so its reward is reachable after activation)
//
// Run: node tools/verify-level.mjs   (exits non-zero on failure)

import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const map = JSON.parse(
  readFileSync(`${__dirname}/../public/assets/maps/level1.json`, 'utf8'),
);

const { width, height, grid } = map;

// Build a passability grid: true = walkable.
// Doors and the push-wall are walkable for reachability purposes (the player
// can open them).
const walkable = grid.map((row) => row.map((v) => v === 0));
for (const d of map.doors) walkable[d.y][d.x] = true;
for (const p of map.pushWalls) {
  walkable[p.y][p.x] = true;
  // The cell(s) the wall slides into become open too.
  const off = { north: [0, -1], south: [0, 1], east: [1, 0], west: [-1, 0] }[
    p.slideDirection
  ];
  for (let i = 1; i <= 2; i++) {
    const nx = p.x + off[0] * i;
    const ny = p.y + off[1] * i;
    if (nx >= 0 && nx < width && ny >= 0 && ny < height) walkable[ny][nx] = true;
  }
}

// Flood fill from player spawn.
const spawn = { x: Math.floor(map.playerSpawn.x), y: Math.floor(map.playerSpawn.y) };
const visited = grid.map((row) => row.map(() => false));
const errors = [];

if (!walkable[spawn.y]?.[spawn.x]) {
  errors.push(`Player spawn (${spawn.x},${spawn.y}) is not on an open cell.`);
}

const queue = [[spawn.x, spawn.y]];
visited[spawn.y][spawn.x] = true;
let reachableCount = 0;
while (queue.length > 0) {
  const [x, y] = queue.shift();
  reachableCount++;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
    if (visited[ny][nx]) continue;
    if (!walkable[ny][nx]) continue;
    visited[ny][nx] = true;
    queue.push([nx, ny]);
  }
}

function checkReachable(label, x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    errors.push(`${label} at (${x},${y}) is out of bounds.`);
    return;
  }
  if (grid[y][x] !== 0) {
    errors.push(`${label} at (${x},${y}) is inside a wall (grid=${grid[y][x]}).`);
    return;
  }
  if (!visited[y][x]) {
    errors.push(`${label} at (${x},${y}) is NOT reachable from spawn.`);
  }
}

map.enemies.forEach((e, i) => checkReachable(`Enemy[${i}]`, e.x, e.y));
map.pickups.forEach((p, i) =>
  checkReachable(`Pickup[${i}] (${p.type})`, p.x, p.y),
);

console.log(`Level: ${map.name}`);
console.log(`Reachable open cells from spawn: ${reachableCount}`);
console.log(`Enemies: ${map.enemies.length}, Pickups: ${map.pickups.length}`);

if (errors.length > 0) {
  console.error('\nPLAYABILITY ERRORS:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
} else {
  console.log('\nOK: spawn, all enemies, and all pickups are reachable.');
}
