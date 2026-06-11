/**
 * Property-based + example tests for map validation and serialization.
 */
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  validateMapJSON,
  isValidMapJSON,
  cloneMapViaJSON,
  MapValidationError,
} from "../src/map-validation";
import type { MapJSON } from "../src/types";

/** Build a minimal valid map of given dimensions. */
function makeValidMap(width: number, height: number): MapJSON {
  const grid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) =>
      x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0,
    ),
  );
  return {
    name: "test",
    width,
    height,
    grid,
    playerSpawn: { x: 1, y: 1, angle: 0 },
    enemies: [],
    pickups: [],
    doors: [],
    pushWalls: [],
    decorations: [],
  };
}

describe("validateMapJSON — valid maps", () => {
  it("accepts any well-formed grid (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 40 }),
        fc.integer({ min: 1, max: 40 }),
        (w, h) => {
          expect(() => validateMapJSON(makeValidMap(w, h))).not.toThrow();
        },
      ),
    );
  });
});

describe("validateMapJSON — invalid maps", () => {
  it("rejects a grid whose row count does not match height", () => {
    const map = makeValidMap(5, 5);
    map.grid.pop();
    expect(() => validateMapJSON(map)).toThrow(MapValidationError);
  });

  it("rejects a row whose length does not match width", () => {
    const map = makeValidMap(5, 5);
    map.grid[2] = [0, 0, 0];
    expect(() => validateMapJSON(map)).toThrow(MapValidationError);
  });

  it("rejects missing playerSpawn", () => {
    const map = makeValidMap(5, 5) as Partial<MapJSON>;
    delete map.playerSpawn;
    expect(() => validateMapJSON(map)).toThrow(/playerSpawn/);
  });

  it("rejects non-numeric / negative cells (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 2, max: 10 }),
        (w, h) => {
          const map = makeValidMap(w, h);
          map.grid[1][1] = -5;
          expect(isValidMapJSON(map)).toBe(false);
        },
      ),
    );
  });

  it("rejects non-object input", () => {
    expect(isValidMapJSON(null)).toBe(false);
    expect(isValidMapJSON(42)).toBe(false);
    expect(isValidMapJSON("nope")).toBe(false);
  });
});

describe("cloneMapViaJSON — serialization round-trip", () => {
  it("produces an identical map (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 30 }),
        (w, h) => {
          const original = makeValidMap(w, h);
          const clone = cloneMapViaJSON(original);
          expect(clone).toEqual(original);
          expect(isValidMapJSON(clone)).toBe(true);
        },
      ),
    );
  });
});
