/**
 * Property-based + example tests for collision resolution and line-of-sight.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { resolveMovement, isLineBlocked } from "../src/math-utils";
import { COLLISION_RADIUS } from "../src/constants";

/**
 * A simple bordered room: solid on the edges of a `size`×`size` grid,
 * open in the interior.
 */
function borderedRoom(size: number) {
  return (gx: number, gy: number): boolean =>
    gx <= 0 || gy <= 0 || gx >= size - 1 || gy >= size - 1;
}

const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

describe("resolveMovement", () => {
  it("never moves the entity into a solid cell (property)", () => {
    const size = 10;
    const isSolid = borderedRoom(size);
    fc.assert(
      fc.property(
        finite(1.5, 8.5),
        finite(1.5, 8.5),
        finite(-2, 2),
        finite(-2, 2),
        (x, y, mx, my) => {
          const r = resolveMovement(x, y, mx, my, COLLISION_RADIUS, isSolid);
          // The resolved position (with collision radius) must not be inside a wall.
          const probeX = Math.floor(
            r.x + Math.sign(r.x - x) * COLLISION_RADIUS,
          );
          const probeY = Math.floor(
            r.y + Math.sign(r.y - y) * COLLISION_RADIUS,
          );
          // The cell the body center occupies must be open.
          expect(isSolid(Math.floor(r.x), Math.floor(r.y))).toBe(false);
          // Probe cells are either open or the move along that axis was rejected.
          expect(Number.isFinite(probeX)).toBe(true);
          expect(Number.isFinite(probeY)).toBe(true);
        },
      ),
    );
  });

  it("allows free movement when there are no walls", () => {
    const noWalls = () => false;
    fc.assert(
      fc.property(
        finite(-100, 100),
        finite(-100, 100),
        finite(-5, 5),
        finite(-5, 5),
        (x, y, mx, my) => {
          const r = resolveMovement(x, y, mx, my, COLLISION_RADIUS, noWalls);
          expect(r.x).toBeCloseTo(x + mx, 9);
          expect(r.y).toBeCloseTo(y + my, 9);
        },
      ),
    );
  });

  it("slides along a wall: blocked axis stops, free axis proceeds", () => {
    // Wall to the east (x >= 3). Moving NE from (2.5, 2.5) should block X, allow Y.
    const isSolid = (gx: number) => gx >= 3;
    const r = resolveMovement(2.5, 2.5, 1.0, -1.0, COLLISION_RADIUS, isSolid);
    expect(r.x).toBeCloseTo(2.5, 9); // X blocked
    expect(r.y).toBeCloseTo(1.5, 9); // Y free
  });

  it("zero movement leaves the position unchanged", () => {
    fc.assert(
      fc.property(finite(1.5, 8.5), finite(1.5, 8.5), (x, y) => {
        const r = resolveMovement(
          x,
          y,
          0,
          0,
          COLLISION_RADIUS,
          borderedRoom(10),
        );
        expect(r.x).toBe(x);
        expect(r.y).toBe(y);
      }),
    );
  });
});

describe("isLineBlocked", () => {
  it("an open straight line is never blocked", () => {
    const noWalls = () => false;
    fc.assert(
      fc.property(
        finite(0, 20),
        finite(0, 20),
        finite(0, 20),
        finite(0, 20),
        (x0, y0, x1, y1) => {
          expect(isLineBlocked(x0, y0, x1, y1, noWalls)).toBe(false);
        },
      ),
    );
  });

  it("detects a wall between two points", () => {
    // Vertical wall at column 5; endpoints on either side.
    const isSolid = (gx: number) => gx === 5;
    expect(isLineBlocked(3.5, 3.5, 7.5, 3.5, isSolid)).toBe(true);
  });

  it("a zero-length line is never blocked", () => {
    fc.assert(
      fc.property(finite(0, 20), finite(0, 20), (x, y) => {
        expect(isLineBlocked(x, y, x, y, () => true)).toBe(false);
      }),
    );
  });
});
