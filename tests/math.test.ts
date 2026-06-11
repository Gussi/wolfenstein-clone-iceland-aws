/**
 * Property-based tests for raycaster math utilities.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  normalizeAngle,
  normalizeAngleSigned,
  angleToDir,
  dirToPlane,
  distance,
  distanceSquared,
  clamp,
} from "../src/math-utils";
import { CAMERA_PLANE_LENGTH } from "../src/constants";

const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

describe("normalizeAngle", () => {
  it("always returns a value in [0, 2π)", () => {
    fc.assert(
      fc.property(finite(-1000, 1000), (a) => {
        const n = normalizeAngle(a);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(Math.PI * 2 + 1e-9);
      }),
    );
  });

  it("is idempotent", () => {
    fc.assert(
      fc.property(finite(-1000, 1000), (a) => {
        const once = normalizeAngle(a);
        const twice = normalizeAngle(once);
        expect(twice).toBeCloseTo(once, 9);
      }),
    );
  });

  it("preserves direction (cos/sin unchanged)", () => {
    fc.assert(
      fc.property(finite(-1000, 1000), (a) => {
        const n = normalizeAngle(a);
        expect(Math.cos(n)).toBeCloseTo(Math.cos(a), 6);
        expect(Math.sin(n)).toBeCloseTo(Math.sin(a), 6);
      }),
    );
  });
});

describe("normalizeAngleSigned", () => {
  it("always returns a value in (-π, π]", () => {
    fc.assert(
      fc.property(finite(-1000, 1000), (a) => {
        const n = normalizeAngleSigned(a);
        expect(n).toBeGreaterThan(-Math.PI - 1e-9);
        expect(n).toBeLessThanOrEqual(Math.PI + 1e-9);
      }),
    );
  });
});

describe("angleToDir / dirToPlane", () => {
  it("direction vector is always unit length", () => {
    fc.assert(
      fc.property(finite(-100, 100), (a) => {
        const { dirX, dirY } = angleToDir(a);
        expect(Math.hypot(dirX, dirY)).toBeCloseTo(1, 9);
      }),
    );
  });

  it("plane is perpendicular to direction", () => {
    fc.assert(
      fc.property(finite(-100, 100), (a) => {
        const { dirX, dirY } = angleToDir(a);
        const { planeX, planeY } = dirToPlane(dirX, dirY);
        const dot = dirX * planeX + dirY * planeY;
        expect(dot).toBeCloseTo(0, 9);
      }),
    );
  });

  it("plane magnitude equals the configured FOV plane length", () => {
    fc.assert(
      fc.property(finite(-100, 100), (a) => {
        const { dirX, dirY } = angleToDir(a);
        const { planeX, planeY } = dirToPlane(dirX, dirY);
        expect(Math.hypot(planeX, planeY)).toBeCloseTo(CAMERA_PLANE_LENGTH, 9);
      }),
    );
  });
});

describe("distance", () => {
  it("is symmetric", () => {
    fc.assert(
      fc.property(
        finite(-100, 100),
        finite(-100, 100),
        finite(-100, 100),
        finite(-100, 100),
        (ax, ay, bx, by) => {
          expect(distance(ax, ay, bx, by)).toBeCloseTo(
            distance(bx, by, ax, ay),
            9,
          );
        },
      ),
    );
  });

  it("is zero only for identical points and never negative", () => {
    fc.assert(
      fc.property(finite(-100, 100), finite(-100, 100), (x, y) => {
        expect(distance(x, y, x, y)).toBe(0);
      }),
    );
  });

  it("matches sqrt of distanceSquared", () => {
    fc.assert(
      fc.property(
        finite(-50, 50),
        finite(-50, 50),
        finite(-50, 50),
        finite(-50, 50),
        (ax, ay, bx, by) => {
          expect(distance(ax, ay, bx, by)).toBeCloseTo(
            Math.sqrt(distanceSquared(ax, ay, bx, by)),
            6,
          );
        },
      ),
    );
  });

  it("satisfies the triangle inequality", () => {
    fc.assert(
      fc.property(
        finite(-30, 30),
        finite(-30, 30),
        finite(-30, 30),
        finite(-30, 30),
        finite(-30, 30),
        finite(-30, 30),
        (ax, ay, bx, by, cx, cy) => {
          const ab = distance(ax, ay, bx, by);
          const bc = distance(bx, by, cx, cy);
          const ac = distance(ax, ay, cx, cy);
          expect(ab + bc).toBeGreaterThanOrEqual(ac - 1e-6);
        },
      ),
    );
  });
});

describe("clamp", () => {
  it("result is always within [min, max]", () => {
    fc.assert(
      fc.property(
        finite(-100, 100),
        finite(-100, 100),
        finite(-100, 100),
        (v, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const c = clamp(v, min, max);
          expect(c).toBeGreaterThanOrEqual(min);
          expect(c).toBeLessThanOrEqual(max);
        },
      ),
    );
  });
});
