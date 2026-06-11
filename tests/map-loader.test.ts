import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MapSystem, validateMap, slideOffset } from '../src/map-system';
import type { MapJSON, SlideDirection } from '../src/types';

// Build a minimal valid map of a given size with all-empty interior.
function makeMap(width: number, height: number): MapJSON {
  const grid: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const border = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      row.push(border ? 1 : 0);
    }
    grid.push(row);
  }
  return {
    name: 'test',
    width,
    height,
    grid,
    playerSpawn: { x: 1, y: 1, angle: 0 },
    enemies: [],
    pickups: [],
    doors: [],
    pushWalls: [],
    decorations: [],
  };
}

describe('validateMap', () => {
  it('accepts well-formed maps of any reasonable size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 40 }),
        fc.integer({ min: 3, max: 40 }),
        (w, h) => {
          const errors = validateMap(makeMap(w, h));
          expect(errors).toEqual([]);
        },
      ),
    );
  });

  it('rejects maps whose grid row count mismatches height', () => {
    const map = makeMap(10, 10);
    map.grid.pop(); // now 9 rows but height says 10
    const errors = validateMap(map);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects maps with a malformed row width', () => {
    const map = makeMap(10, 10);
    map.grid[5] = map.grid[5]!.slice(0, 5); // short row
    const errors = validateMap(map);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-object input', () => {
    expect(validateMap(null).length).toBeGreaterThan(0);
    expect(validateMap(42).length).toBeGreaterThan(0);
    expect(validateMap('nope').length).toBeGreaterThan(0);
  });

  it('rejects missing playerSpawn', () => {
    const map = makeMap(10, 10) as Partial<MapJSON>;
    delete map.playerSpawn;
    expect(validateMap(map).length).toBeGreaterThan(0);
  });
});

describe('MapSystem loading and grid access', () => {
  it('reports the correct dimensions after load', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 40 }),
        fc.integer({ min: 3, max: 40 }),
        (w, h) => {
          const ms = new MapSystem();
          ms.loadMap(makeMap(w, h));
          expect(ms.getWidth()).toBe(w);
          expect(ms.getHeight()).toBe(h);
        },
      ),
    );
  });

  it('treats borders as solid and interior as empty', () => {
    const ms = new MapSystem();
    ms.loadMap(makeMap(12, 12));
    expect(ms.isSolid(0, 0)).toBe(true);
    expect(ms.isSolid(0, 5)).toBe(true);
    expect(ms.isSolid(11, 5)).toBe(true);
    expect(ms.isSolid(5, 5)).toBe(false);
  });

  it('treats out-of-bounds as solid', () => {
    const ms = new MapSystem();
    ms.loadMap(makeMap(12, 12));
    expect(ms.isSolid(-1, 5)).toBe(true);
    expect(ms.isSolid(100, 5)).toBe(true);
    expect(ms.isSolid(5, -3)).toBe(true);
  });

  it('does not mutate the source grid when push-walls finalize', () => {
    const map = makeMap(12, 12);
    map.grid[5]![5] = 6; // push-wall hint cell
    map.pushWalls.push({
      id: 'pw',
      x: 5,
      y: 5,
      textureId: 2,
      hintTextureId: 6,
      slideDirection: 'east',
    });
    const ms = new MapSystem();
    ms.loadMap(map);
    const pw = ms.getPushWalls()[0]!;
    ms.activatePushWall(pw);
    // Advance well past the slide duration.
    ms.update(10);
    // Source map grid must be unchanged.
    expect(map.grid[5]![5]).toBe(6);
  });

  it('a closed door is solid; an opened door becomes passable', () => {
    const map = makeMap(12, 12);
    map.doors.push({
      id: 'd',
      x: 6,
      y: 6,
      textureId: 4,
      orientation: 'vertical',
    });
    const ms = new MapSystem();
    ms.loadMap(map);
    const door = ms.getDoorAt(6, 6)!;
    expect(ms.isSolid(6, 6)).toBe(true);
    ms.openDoor(door);
    ms.update(10); // finish opening
    expect(ms.isSolid(6, 6)).toBe(false);
  });
});

describe('slideOffset', () => {
  it('returns a unit cardinal vector for every direction', () => {
    const dirs: SlideDirection[] = ['north', 'south', 'east', 'west'];
    for (const dir of dirs) {
      const { dx, dy } = slideOffset(dir);
      expect(Math.abs(dx) + Math.abs(dy)).toBe(1);
    }
  });
});
