import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isBlocked, slideMove } from '../src/collision';
import { createMapState, isSolidAt } from '../src/map/mapState';
import { COLLISION_RADIUS } from '../src/constants';
import type { MapJSON } from '../src/types';

/** A 10x10 room: solid border, open interior. */
function room(): MapJSON {
  const w = 10;
  const h = 10;
  const grid: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) {
      const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      row.push(border ? 1 : 0);
    }
    grid.push(row);
  }
  return {
    name: 'room',
    width: w,
    height: h,
    grid,
    playerSpawn: { x: 5, y: 5, angle: 0 },
    enemies: [],
    pickups: [],
    doors: [],
    pushWalls: [],
    decorations: [],
  };
}

const map = createMapState(room());
const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

describe('isSolidAt', () => {
  it('treats out-of-bounds as solid', () => {
    expect(isSolidAt(map, -1, 5)).toBe(true);
    expect(isSolidAt(map, 5, -1)).toBe(true);
    expect(isSolidAt(map, 100, 5)).toBe(true);
  });

  it('reports the open interior as non-solid', () => {
    expect(isSolidAt(map, 5.5, 5.5)).toBe(false);
  });

  it('reports the border as solid', () => {
    expect(isSolidAt(map, 0.5, 5.5)).toBe(true);
    expect(isSolidAt(map, 9.5, 5.5)).toBe(true);
  });
});

describe('slideMove', () => {
  it('never resolves into a blocked position when starting unblocked', () => {
    fc.assert(
      fc.property(
        finite(1.5, 8.5),
        finite(1.5, 8.5),
        finite(-2, 2),
        finite(-2, 2),
        (x, y, dx, dy) => {
          if (isBlocked(map, x, y, COLLISION_RADIUS)) return; // skip invalid starts
          const r = slideMove(map, x, y, dx, dy, COLLISION_RADIUS);
          expect(isBlocked(map, r.x, r.y, COLLISION_RADIUS)).toBe(false);
        },
      ),
    );
  });

  it('keeps the body within the interior (never crosses the border)', () => {
    fc.assert(
      fc.property(finite(2, 8), finite(2, 8), finite(-5, 5), finite(-5, 5), (x, y, dx, dy) => {
        if (isBlocked(map, x, y, COLLISION_RADIUS)) return;
        const r = slideMove(map, x, y, dx, dy, COLLISION_RADIUS);
        // Must remain strictly inside the open interior bounds [1,9].
        expect(r.x).toBeGreaterThan(1 - 1e-9);
        expect(r.x).toBeLessThan(9 + 1e-9);
        expect(r.y).toBeGreaterThan(1 - 1e-9);
        expect(r.y).toBeLessThan(9 + 1e-9);
      }),
    );
  });

  it('does not move when fully boxed against a wall into it', () => {
    // Stand near the west wall and push west: x should not decrease past the wall.
    const start = { x: 1.0 + COLLISION_RADIUS + 0.01, y: 5.5 };
    const r = slideMove(map, start.x, start.y, -1, 0, COLLISION_RADIUS);
    expect(r.x).toBeGreaterThanOrEqual(1 + COLLISION_RADIUS - 1e-6);
  });

  it('allows free movement in open space', () => {
    const r = slideMove(map, 5, 5, 0.3, 0.2, COLLISION_RADIUS);
    expect(r.x).toBeCloseTo(5.3, 6);
    expect(r.y).toBeCloseTo(5.2, 6);
  });
});
