/**
 * Pure math utilities for raycasting, movement, and collision.
 * Kept side-effect-free so they can be property-tested (Vitest + fast-check).
 */
import { CAMERA_PLANE_LENGTH } from "./constants";

/** Normalize an angle to the range [0, 2π). */
export function normalizeAngle(angle: number): number {
  const twoPi = Math.PI * 2;
  return ((angle % twoPi) + twoPi) % twoPi;
}

/** Normalize an angle to the range (-π, π]. */
export function normalizeAngleSigned(angle: number): number {
  let a = normalizeAngle(angle);
  if (a > Math.PI) a -= Math.PI * 2;
  return a;
}

/** Direction vector from an angle (0 = +x/east). */
export function angleToDir(angle: number): { dirX: number; dirY: number } {
  return { dirX: Math.cos(angle), dirY: Math.sin(angle) };
}

/** Camera plane vector perpendicular to a direction, scaled to the FOV. */
export function dirToPlane(
  dirX: number,
  dirY: number,
): { planeX: number; planeY: number } {
  // plane is dir rotated +90° then scaled
  return {
    planeX: -dirY * CAMERA_PLANE_LENGTH,
    planeY: dirX * CAMERA_PLANE_LENGTH,
  };
}

/** Euclidean distance between two points. */
export function distance(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Squared distance (cheaper when only comparing). */
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

/** Clamp a value to [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * Cast a ray from (x0,y0) to (x1,y1) through a unit grid; returns true if any
 * cell flagged solid by `isSolid` lies strictly between the endpoints.
 * Used for enemy line-of-sight. Implements a DDA grid traversal.
 */
export function isLineBlocked(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  isSolid: (gx: number, gy: number) => boolean,
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return false;

  const stepX = dx / dist;
  const stepY = dy / dist;
  const samples = Math.ceil(dist / 0.05);

  for (let i = 1; i < samples; i++) {
    const t = i * 0.05;
    const gx = Math.floor(x0 + stepX * t);
    const gy = Math.floor(y0 + stepY * t);
    if (isSolid(gx, gy)) return true;
  }
  return false;
}

/**
 * Attempt to move from (x,y) by (moveX,moveY) with circular collision radius,
 * sliding along walls by testing each axis independently.
 * Returns the resolved position.
 */
export function resolveMovement(
  x: number,
  y: number,
  moveX: number,
  moveY: number,
  radius: number,
  isSolid: (gx: number, gy: number) => boolean,
): { x: number; y: number } {
  let nx = x;
  let ny = y;

  // X axis
  const targetX = x + moveX;
  const probeX = targetX + Math.sign(moveX) * radius;
  if (moveX !== 0 && !isSolid(Math.floor(probeX), Math.floor(y))) {
    nx = targetX;
  }

  // Y axis (use already-updated nx)
  const targetY = y + moveY;
  const probeY = targetY + Math.sign(moveY) * radius;
  if (moveY !== 0 && !isSolid(Math.floor(nx), Math.floor(probeY))) {
    ny = targetY;
  }

  return { x: nx, y: ny };
}
