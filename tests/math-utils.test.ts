import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  normalizeAngle,
  normalizeAngle2Pi,
  distance,
  distanceSquared,
  clamp,
  angleToDir,
  cameraPlane,
  angleDifference,
  normalizeVector,
  lerp,
} from '../src/math-utils';

const finite = (min = -1e6, max = 1e6) =>
  fc.double({ min, max, noNaN: true, noDefaultInfinity: true });

describe('normalizeAngle', () => {
  it('always returns a value in [-PI, PI]', () => {
    fc.assert(
      fc.property(finite(), (a) => {
        const n = normalizeAngle(a);
        expect(n).toBeGreaterThanOrEqual(-Math.PI - 1e-9);
        expect(n).toBeLessThanOrEqual(Math.PI + 1e-9);
      }),
    );
  });

  it('is equivalent to the input modulo 2*PI', () => {
    fc.assert(
      fc.property(finite(-1000, 1000), (a) => {
        const n = normalizeAngle(a);
        const diff = (a - n) / (2 * Math.PI);
        // difference must be (close to) an integer number of full turns
        expect(Math.abs(diff - Math.round(diff))).toBeLessThan(1e-6);
      }),
    );
  });
});

describe('normalizeAngle2Pi', () => {
  it('always returns a value in [0, 2*PI)', () => {
    fc.assert(
      fc.property(finite(), (a) => {
        const n = normalizeAngle2Pi(a);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThan(2 * Math.PI + 1e-9);
      }),
    );
  });
});

describe('distance / distanceSquared', () => {
  it('distance is non-negative', () => {
    fc.assert(
      fc.property(finite(), finite(), finite(), finite(), (ax, ay, bx, by) => {
        expect(distance(ax, ay, bx, by)).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('distance is symmetric', () => {
    fc.assert(
      fc.property(finite(), finite(), finite(), finite(), (ax, ay, bx, by) => {
        expect(distance(ax, ay, bx, by)).toBeCloseTo(
          distance(bx, by, ax, ay),
          6,
        );
      }),
    );
  });

  it('distanceSquared equals distance squared', () => {
    fc.assert(
      fc.property(
        finite(-1e3, 1e3),
        finite(-1e3, 1e3),
        finite(-1e3, 1e3),
        finite(-1e3, 1e3),
        (ax, ay, bx, by) => {
          const d = distance(ax, ay, bx, by);
          expect(distanceSquared(ax, ay, bx, by)).toBeCloseTo(d * d, 4);
        },
      ),
    );
  });

  it('distance to self is zero', () => {
    fc.assert(
      fc.property(finite(), finite(), (x, y) => {
        expect(distance(x, y, x, y)).toBe(0);
      }),
    );
  });
});

describe('clamp', () => {
  it('result is always within [min, max]', () => {
    fc.assert(
      fc.property(
        finite(),
        finite(),
        finite(),
        (value, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const c = clamp(value, min, max);
          expect(c).toBeGreaterThanOrEqual(min);
          expect(c).toBeLessThanOrEqual(max);
        },
      ),
    );
  });

  it('leaves in-range values unchanged', () => {
    fc.assert(
      fc.property(finite(-100, 100), (value) => {
        expect(clamp(value, -1000, 1000)).toBe(value);
      }),
    );
  });
});

describe('angleToDir', () => {
  it('always produces a unit vector', () => {
    fc.assert(
      fc.property(finite(), (a) => {
        const { x, y } = angleToDir(a);
        expect(Math.sqrt(x * x + y * y)).toBeCloseTo(1, 6);
      }),
    );
  });
});

describe('cameraPlane', () => {
  it('plane is perpendicular to direction (dot product ~ 0)', () => {
    fc.assert(
      fc.property(finite(), (a) => {
        const dir = angleToDir(a);
        const plane = cameraPlane(dir.x, dir.y);
        const dot = dir.x * plane.x + dir.y * plane.y;
        expect(Math.abs(dot)).toBeLessThan(1e-9);
      }),
    );
  });
});

describe('angleDifference', () => {
  it('is always within [-PI, PI]', () => {
    fc.assert(
      fc.property(finite(), finite(), (a, b) => {
        const diff = angleDifference(a, b);
        expect(diff).toBeGreaterThanOrEqual(-Math.PI - 1e-9);
        expect(diff).toBeLessThanOrEqual(Math.PI + 1e-9);
      }),
    );
  });

  it('difference with self is zero', () => {
    fc.assert(
      fc.property(finite(), (a) => {
        expect(angleDifference(a, a)).toBeCloseTo(0, 9);
      }),
    );
  });
});

describe('normalizeVector', () => {
  it('produces a unit vector for non-zero input', () => {
    fc.assert(
      fc.property(
        finite(-1e3, 1e3),
        finite(-1e3, 1e3),
        (x, y) => {
          fc.pre(Math.sqrt(x * x + y * y) > 1e-6);
          const v = normalizeVector(x, y);
          expect(Math.sqrt(v.x * v.x + v.y * v.y)).toBeCloseTo(1, 6);
        },
      ),
    );
  });

  it('returns zero vector for zero input', () => {
    const v = normalizeVector(0, 0);
    expect(v).toEqual({ x: 0, y: 0 });
  });
});

describe('lerp', () => {
  it('endpoints are exact', () => {
    fc.assert(
      fc.property(finite(), finite(), (a, b) => {
        expect(lerp(a, b, 0)).toBe(a);
        expect(lerp(a, b, 1)).toBeCloseTo(b, 6);
      }),
    );
  });

  it('result stays within [a, b] for t in [0,1]', () => {
    fc.assert(
      fc.property(
        finite(-1e3, 1e3),
        finite(-1e3, 1e3),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (a, b, t) => {
          const result = lerp(a, b, t);
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          expect(result).toBeGreaterThanOrEqual(min - 1e-6);
          expect(result).toBeLessThanOrEqual(max + 1e-6);
        },
      ),
    );
  });
});
