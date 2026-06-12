import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildLevel0, validateMap } from '../src/map/mapData';
import type { MapJSON } from '../src/types';

/** Build a minimal structurally-valid map of the given size. */
function makeValidMap(width: number, height: number): MapJSON {
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
  it('accepts any structurally-valid generated map', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 24 }), fc.integer({ min: 2, max: 24 }), (w, h) => {
        const result = validateMap(makeValidMap(w, h));
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      }),
    );
  });

  it('never throws on arbitrary untrusted input', () => {
    fc.assert(
      fc.property(fc.anything(), (data) => {
        expect(() => validateMap(data)).not.toThrow();
        const r = validateMap(data);
        expect(typeof r.valid).toBe('boolean');
        expect(Array.isArray(r.errors)).toBe(true);
      }),
    );
  });

  it('rejects a grid whose row count mismatches height', () => {
    const m = makeValidMap(6, 6);
    m.grid.pop(); // now 5 rows but height = 6
    const r = validateMap(m);
    expect(r.valid).toBe(false);
  });

  it('rejects an out-of-bounds player spawn', () => {
    const m = makeValidMap(6, 6);
    m.playerSpawn = { x: 99, y: 1, angle: 0 };
    expect(validateMap(m).valid).toBe(false);
  });

  it('rejects negative or non-integer cell values', () => {
    const m = makeValidMap(5, 5);
    m.grid[2][2] = -3;
    expect(validateMap(m).valid).toBe(false);
  });

  it('rejects missing entity arrays', () => {
    const m = makeValidMap(5, 5) as unknown as Record<string, unknown>;
    delete m.enemies;
    expect(validateMap(m).valid).toBe(false);
  });
});

describe('buildLevel0', () => {
  const level = buildLevel0();

  it('produces a valid map', () => {
    expect(validateMap(level).valid).toBe(true);
  });

  it('has a solid border on all edges', () => {
    const { width, height, grid } = level;
    for (let x = 0; x < width; x++) {
      expect(grid[0][x]).toBeGreaterThan(0);
      expect(grid[height - 1][x]).toBeGreaterThan(0);
    }
    for (let y = 0; y < height; y++) {
      expect(grid[y][0]).toBeGreaterThan(0);
      expect(grid[y][width - 1]).toBeGreaterThan(0);
    }
  });

  it('spawns the player on an empty cell', () => {
    const { x, y } = level.playerSpawn;
    expect(level.grid[y][x]).toBe(0);
  });

  it('places every enemy on an empty cell', () => {
    for (const e of level.enemies) {
      expect(level.grid[e.y][e.x]).toBe(0);
    }
  });

  it('has at least one push-wall secret and several enemies', () => {
    expect(level.pushWalls.length).toBeGreaterThanOrEqual(1);
    expect(level.enemies.length).toBeGreaterThanOrEqual(10);
  });

  it('is deterministic across calls (same seed)', () => {
    const a = buildLevel0();
    const b = buildLevel0();
    expect(a.enemies).toEqual(b.enemies);
  });
});
