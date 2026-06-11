# Unit Test Execution — "Pots & Parliament"

## Run Unit Tests

### 1. Execute All Unit Tests
```bash
npm run test        # vitest run (single pass)
# or during development:
npm run test:watch  # vitest watch mode
```

### 2. Review Test Results
- **Expected**: 28 tests pass, 0 failures (2 test files)
- **Test Files**:
  - `tests/math-utils.test.ts` — 17 property-based tests
  - `tests/map-loader.test.ts` — 11 tests
- **Test Report**: printed to stdout by Vitest

## What the Tests Cover

### `math-utils.test.ts` (property-based, fast-check)
- `normalizeAngle`: result always in [-PI, PI]; equivalent modulo 2*PI
- `normalizeAngle2Pi`: result always in [0, 2*PI)
- `distance` / `distanceSquared`: non-negative, symmetric, self-distance zero,
  squared relationship holds
- `clamp`: result always within [min, max]; in-range values unchanged
- `angleToDir`: always produces a unit vector
- `cameraPlane`: plane is perpendicular to direction (dot product ~ 0)
- `angleDifference`: always in [-PI, PI]; self-difference zero
- `normalizeVector`: unit vector for non-zero input; zero vector for zero input
- `lerp`: exact endpoints; result stays within bounds for t in [0,1]

### `map-loader.test.ts`
- `validateMap`: accepts well-formed maps of any size; rejects row/column
  mismatches, non-object input, missing playerSpawn
- `MapSystem`: correct dimensions after load; borders solid / interior open;
  out-of-bounds solid; closed door solid then passable after opening; source
  map grid not mutated when push-walls finalize
- `slideOffset`: returns unit cardinal vector for each direction

## Fix Failing Tests
If tests fail:
1. Read the Vitest output (it prints the failing property and a counterexample).
2. For property-based failures, fast-check prints the minimal shrunk input that
   breaks the property — fix the logic or the property assertion.
3. Rerun `npm run test` until green.
