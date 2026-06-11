// Pure math utility functions for the raycaster and game logic.
// These are kept side-effect free so they can be property-tested.

import { CAMERA_PLANE_LENGTH } from './constants';

/**
 * Normalize an angle to the range [-PI, PI].
 */
export function normalizeAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * Normalize an angle to the range [0, 2*PI).
 */
export function normalizeAngle2Pi(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a < 0) a += 2 * Math.PI;
  return a;
}

/**
 * Euclidean distance between two points.
 */
export function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Squared distance (avoids sqrt — useful for comparisons).
 */
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

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Direction vector from an angle.
 */
export function angleToDir(angle: number): { x: number; y: number } {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/**
 * Compute the camera plane vector perpendicular to a direction vector,
 * scaled to the configured FOV.
 */
export function cameraPlane(
  dirX: number,
  dirY: number,
): { x: number; y: number } {
  // Plane is perpendicular to direction: rotate dir by -90 degrees, scale by tan(FOV/2)
  return {
    x: -dirY * CAMERA_PLANE_LENGTH,
    y: dirX * CAMERA_PLANE_LENGTH,
  };
}

/**
 * Signed smallest angular difference between two angles, in [-PI, PI].
 * Positive means `target` is counter-clockwise from `source`.
 */
export function angleDifference(source: number, target: number): number {
  return normalizeAngle(target - source);
}

/**
 * Normalize a 2D vector. Returns {0,0} for a zero-length input.
 */
export function normalizeVector(x: number, y: number): { x: number; y: number } {
  const len = Math.sqrt(x * x + y * y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

/**
 * Linear interpolation between a and b by t (t in [0,1]).
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
