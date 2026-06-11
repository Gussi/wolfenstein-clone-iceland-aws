/**
 * Pure map validation + serialization helpers. Side-effect free so they can be
 * property-tested without a DOM or network.
 *
 * Stories: US-11 (level loading + clear errors on invalid maps)
 */
import type { MapJSON } from "./types";

export class MapValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MapValidationError";
  }
}

/** Validate the structural integrity of a parsed map. Throws on failure. */
export function validateMapJSON(map: unknown): asserts map is MapJSON {
  if (typeof map !== "object" || map === null) {
    throw new MapValidationError("Map must be an object");
  }
  const m = map as Record<string, unknown>;

  if (typeof m.width !== "number" || typeof m.height !== "number") {
    throw new MapValidationError("width/height must be numbers");
  }
  if (m.width <= 0 || m.height <= 0) {
    throw new MapValidationError("width/height must be positive");
  }
  if (!Array.isArray(m.grid) || m.grid.length !== m.height) {
    throw new MapValidationError(`grid must have ${m.height} rows`);
  }
  for (let y = 0; y < m.grid.length; y++) {
    const row = m.grid[y];
    if (!Array.isArray(row) || row.length !== m.width) {
      throw new MapValidationError(`row ${y} must have ${m.width} columns`);
    }
    for (let x = 0; x < row.length; x++) {
      if (typeof row[x] !== "number" || row[x] < 0) {
        throw new MapValidationError(
          `grid[${y}][${x}] must be a non-negative number`,
        );
      }
    }
  }

  const spawn = m.playerSpawn as Record<string, unknown> | undefined;
  if (!spawn || typeof spawn.x !== "number" || typeof spawn.y !== "number") {
    throw new MapValidationError("playerSpawn must define numeric x and y");
  }

  // Optional arrays default to empty but, if present, must be arrays.
  for (const key of [
    "enemies",
    "pickups",
    "doors",
    "pushWalls",
    "decorations",
  ]) {
    if (m[key] !== undefined && !Array.isArray(m[key])) {
      throw new MapValidationError(`${key} must be an array if present`);
    }
  }
}

/**
 * Returns true if the map is valid, false otherwise (non-throwing variant).
 */
export function isValidMapJSON(map: unknown): boolean {
  try {
    validateMapJSON(map);
    return true;
  } catch {
    return false;
  }
}

/** Round-trip a map through JSON to confirm serialization stability. */
export function cloneMapViaJSON(map: MapJSON): MapJSON {
  return JSON.parse(JSON.stringify(map)) as MapJSON;
}
