/**
 * Pure vector / angle math utilities.
 *
 * These functions are deliberately side-effect free so they can be
 * exhaustively property-tested with fast-check (see tests/vector.test.ts).
 */

export const TWO_PI = Math.PI * 2;

/**
 * Normalize an angle (radians) into the half-open range [0, 2*PI).
 * Handles arbitrarily large positive or negative inputs.
 */
export function normalizeAngle(angle: number): number {
  let a = angle % TWO_PI;
  if (a < 0) a += TWO_PI;
  // Guard against a == TWO_PI from floating point rounding of -0 etc.
  if (a >= TWO_PI) a -= TWO_PI;
  return a;
}

/**
 * Normalize an angle (radians) into the range (-PI, PI].
 * Useful for "shortest signed difference" calculations (e.g. weapon arc).
 */
export function normalizeAngleSigned(angle: number): number {
  let a = (angle + Math.PI) % TWO_PI;
  if (a < 0) a += TWO_PI;
  return a - Math.PI;
}

/** Smallest signed angular difference from `a` to `b`, in (-PI, PI]. */
export function angleDifference(a: number, b: number): number {
  return normalizeAngleSigned(b - a);
}

/** Euclidean distance between two points. */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared Euclidean distance (cheaper, for comparisons). */
export function distanceSquared(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** Return a unit-length vector in the same direction, or {0,0} if zero-length. */
export function normalize(x: number, y: number): Vec2 {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/** Clamp `value` into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Linear interpolation between a and b by t (t typically in [0,1]). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Direction and camera-plane vectors for a given facing angle and FOV.
 * planeLength = tan(FOV / 2).
 */
export function directionVectors(
  angle: number,
  planeLength: number,
): { dirX: number; dirY: number; planeX: number; planeY: number } {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  // Camera plane is perpendicular to direction.
  const planeX = -dirY * planeLength;
  const planeY = dirX * planeLength;
  return { dirX, dirY, planeX, planeY };
}

/** Snap an arbitrary angle to the nearest cardinal direction string. */
export function angleToCardinal(
  angle: number,
): 'east' | 'south' | 'west' | 'north' {
  const a = normalizeAngle(angle);
  // 0 = east, PI/2 = south, PI = west, 3PI/2 = north (y grows downward).
  if (a < Math.PI / 4 || a >= (7 * Math.PI) / 4) return 'east';
  if (a < (3 * Math.PI) / 4) return 'south';
  if (a < (5 * Math.PI) / 4) return 'west';
  return 'north';
}
