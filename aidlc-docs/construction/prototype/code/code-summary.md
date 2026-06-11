# Code Generation Summary — "Pots & Parliament" Prototype

## Overview

Single-unit greenfield browser game implemented in TypeScript (strict mode),
built with Vite, tested with Vitest + fast-check. Pure Canvas 2D raycaster — no
runtime libraries. All 25 user stories (US-01 … US-25) are implemented.

## Verification Status

- **Type-check** (`tsc --noEmit`): passing, no errors
- **Tests** (`vitest run`): 26 tests passing across 3 files
- **Production build** (`vite build`): succeeds — 37 KB JS (gzip 12.8 KB), under the < 50 KB target

## Architecture

Sequential pipeline driven by `GameLoop`. Systems communicate through explicit
state passed each frame: input → player → entities → combat → map → interactions
→ render → HUD → reset.

## Files Created

### Configuration (workspace root)

- `package.json` — scripts and devDependencies (vite, typescript, vitest, fast-check)
- `tsconfig.json` — strict TypeScript, ES2020, bundler resolution
- `vite.config.ts`, `vitest.config.ts`
- `index.html` — display canvas, loading bar, click-to-play overlay
- `.gitignore`

### Source (`src/`)

| File                      | Component                                     | Stories                           |
| ------------------------- | --------------------------------------------- | --------------------------------- |
| `constants.ts`            | Game balance constants                        | all                               |
| `types.ts`                | Shared interfaces                             | all                               |
| `math-utils.ts`           | Pure raycast/movement/LOS math                | US-01, US-02, US-04, US-08, US-09 |
| `asset-loader.ts`         | AssetLoader (textures/audio/maps + fallbacks) | US-09, US-10, US-11, US-17–19     |
| `placeholder-textures.ts` | Procedural Alþingishúsið-themed art           | US-09, US-10, US-25               |
| `map-validation.ts`       | Pure map validation + serialization           | US-11                             |
| `map-system.ts`           | MapSystem (grid, doors, push-walls)           | US-03, US-11, US-12               |
| `input-system.ts`         | InputSystem (WASD + pointer lock)             | US-01, US-02, US-03, US-05        |
| `player.ts`               | Player (movement, collision, health)          | US-01, US-02, US-04, US-13        |
| `renderer.ts`             | Raycaster + sprite rendering                  | US-09, US-10                      |
| `entity-system.ts`        | EntitySystem (enemies, pickups, decorations)  | US-08, US-10, US-23               |
| `enemy-ai.ts`             | EnemyAI state machine + taunts                | US-07, US-08, US-24               |
| `combat-system.ts`        | CombatSystem (wooden spoon melee)             | US-05, US-06, US-16               |
| `audio-system.ts`         | AudioSystem (Web Audio, silent fallback)      | US-17, US-18, US-19               |
| `hud-renderer.ts`         | HUDRenderer (bar, face, weapon, overlays)     | US-13–16, US-20, US-22, US-24     |
| `game-loop.ts`            | GameLoop (states, pipeline, win/lose)         | US-20, US-21, US-22               |
| `main.ts`                 | Entry point — wires systems, loads assets     | integration                       |

### Tests (`tests/`)

- `math.test.ts` — 12 property tests (angle normalization, vectors, distance)
- `map-loader.test.ts` — 7 tests (validation + JSON round-trip)
- `collision.test.ts` — 7 tests (movement resolution, wall sliding, LOS)

### Assets

- `assets/maps/level1.json` — 32×32 "Parliament Lobby": 33 enemies, 8 pickups, 2 doors, 1 push-wall secret
- `assets/textures/hud/pan.png` — provided pan art used for the weapon idle frame
- `assets/audio/music/loftsongur.mp3` — provided 8-bit Loftsöngur track
- `scripts/gen-level.mjs` — level generator (dev tool)
- `ASSETS.md` — documents every asset slot for drop-in replacement

## Asset Strategy

The game runs with zero real art: missing textures fall back to themed
procedural placeholders (dark dolerite, cream plaster, red-tape enemies, etc.),
and missing sounds play silently. Real PNG/MP3 files placed at the documented
paths are picked up automatically. Sprite sheets present in `assets/images/`
(doors/face/walls) are noted in ASSETS.md as a follow-up to slice into per-frame
files or support via a sheet-slicing loader extension.

## Known Follow-ups (post-prototype)

- Slice the provided sprite sheets into individual frames (or add sheet support)
- Add real SFX files (currently silent)
- Floor/ceiling are solid colors (floor-casting deferred per design)
