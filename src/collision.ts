/**
 * Shared circle-vs-grid collision used by the player and enemies.
 */

import { isSolidAt } from './map/mapState';
import type { MapState } from './types';

/**
 * Is a circle of the given radius, centered at (x, y), overlapping any solid
 * tile? Checks the four extreme points of the circle against the grid.
 */
export function isBlocked(map: MapState, x: number, y: number, radius: number): boolean {
  return (
    isSolidAt(map, x - radius, y - radius) ||
    isSolidAt(map, x + radius, y - radius) ||
    isSolidAt(map, x - radius, y + radius) ||
    isSolidAt(map, x + radius, y + radius)
  );
}

/**
 * Attempt to move a circular body from (x, y) by (dx, dy), sliding along
 * walls by resolving each axis independently. Returns the resolved position.
 */
export function slideMove(
  map: MapState,
  x: number,
  y: number,
  dx: number,
  dy: number,
  radius: number,
): { x: number; y: number } {
  let nx = x;
  let ny = y;
  if (!isBlocked(map, x + dx, y, radius)) {
    nx = x + dx;
  }
  if (!isBlocked(map, nx, y + dy, radius)) {
    ny = y + dy;
  }
  return { x: nx, y: ny };
}
