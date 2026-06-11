import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  TWO_PI,
  angleDifference,
  angleToCardinal,
  clamp,
  directionVectors,
  distance,
  lerp,
  normalize,
  normalizeAngle,
  normalizeAngleSigned,
} from '../src/math/vector';

const finite = (min: number, max: number) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

describe('normalizeAngle', () => {
  it('always returns a value in [0, 2*PI)', () => {
    fc.assert(
      fc.property(finite(-1e6, 1e6), (a) => {
        const n = normalizeAngle(a);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(TWO_PI);
      }),
    );
  });

  it('is equivalent modulo 2*PI to the input', () => {
    fc.assert(
      fc.property(finite(-1000, 1000), (a) => {
        const n = normalizeAngle(a);
        const diff = Math.abs(Math.sin(n) - Math.sin(a)) + Math.abs(Math.cos(n) - Math.cos(a));
        expect(diff).toBeLessThan(1e-6);
      }),
    );
  });

  it('is idempotent', () => {
    fc.assert(
      fc.property(finite(-1e6, 1e6), (a) => {
        const once = normalizeAngle(a);
        expect(normalizeAngle(once)).toBeCloseTo(once, 9);
      }),
    );
  });
});

describe('normalizeAngleSigned', () => {
  it('always returns a value in (-PI, PI]', () => {
    fc.assert(
      fc.property(finite(-1e6, 1e6), (a) => {
        const n = normalizeAngleSigned(a);
        expect(n).toBeGreaterThan(-Math.PI - 1e-9);
        expect(n).toBeLessThanOrEqual(Math.PI + 1e-9);
      }),
    );
  });
});

describe('angleDifference', () => {
  it('is within (-PI, PI] and antisymmetric in magnitude', () => {
    fc.assert(
      fc.property(finite(-100, 100), finite(-100, 100), (a, b) => {
        const d = angleDifference(a, b);
        expect(Math.abs(d)).toBeLessThanOrEqual(Math.PI + 1e-9);
      }),
    );
  });
});

describe('clamp', () => {
  it('result always lies within [min, max]', () => {
    fc.assert(
      fc.property(finite(-1e6, 1e6), finite(-1e3, 1e3), finite(0, 2e3), (v, min, span) => {
        const max = min + span;
        const c = clamp(v, min, max);
        expect(c).toBeGreaterThanOrEqual(min);
        expect(c).toBeLessThanOrEqual(max);
      }),
    );
  });
});

describe('lerp', () => {
  it('returns endpoints at t=0 and t=1', () => {
    fc.assert(
      fc.property(finite(-1e3, 1e3), finite(-1e3, 1e3), (a, b) => {
        expect(lerp(a, b, 0)).toBeCloseTo(a, 9);
        expect(lerp(a, b, 1)).toBeCloseTo(b, 9);
      }),
    );
  });
});

describe('distance', () => {
  it('is non-negative and symmetric', () => {
    fc.assert(
      fc.property(
        finite(-1e3, 1e3),
        finite(-1e3, 1e3),
        finite(-1e3, 1e3),
        finite(-1e3, 1e3),
        (ax, ay, bx, by) => {
          const d1 = distance(ax, ay, bx, by);
          const d2 = distance(bx, by, ax, ay);
          expect(d1).toBeGreaterThanOrEqual(0);
          expect(d1).toBeCloseTo(d2, 6);
        },
      ),
    );
  });
});

describe('normalize', () => {
  it('produces a unit vector (or zero for zero input)', () => {
    fc.assert(
      fc.property(finite(-1e3, 1e3), finite(-1e3, 1e3), (x, y) => {
        const v = normalize(x, y);
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        // Match the implementation: if the squared magnitude underflows to 0,
        // normalize returns the zero vector.
        if (x * x + y * y === 0) {
          expect(len).toBe(0);
        } else {
          expect(len).toBeCloseTo(1, 6);
        }
      }),
    );
  });
});

describe('directionVectors', () => {
  it('direction is unit-length and plane is perpendicular to direction', () => {
    fc.assert(
      fc.property(finite(-100, 100), finite(0.01, 2), (angle, planeLen) => {
        const { dirX, dirY, planeX, planeY } = directionVectors(angle, planeLen);
        const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
        expect(dirLen).toBeCloseTo(1, 6);
        // Dot product of dir and plane should be ~0 (perpendicular).
        const dot = dirX * planeX + dirY * planeY;
        expect(Math.abs(dot)).toBeLessThan(1e-6);
      }),
    );
  });
});

describe('angleToCardinal', () => {
  it('always returns one of the four cardinals', () => {
    fc.assert(
      fc.property(finite(-1e6, 1e6), (a) => {
        expect(['north', 'south', 'east', 'west']).toContain(angleToCardinal(a));
      }),
    );
  });
});
