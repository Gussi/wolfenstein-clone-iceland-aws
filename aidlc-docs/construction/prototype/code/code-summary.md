# Code Generation Summary — "Pots & Parliament" Prototype

## Overview
The prototype is a fully playable Wolfenstein 3D-style raycaster implemented in
TypeScript, rendering on the Canvas 2D API with no game framework. Built and
served with Vite. All source lives in the workspace root (`src/`, `tests/`,
`public/assets/`, `tools/`).

## Verification Status
- **Type-check** (`tsc --noEmit`): PASS (strict mode)
- **Tests** (`vitest run`): PASS — 28 tests across 2 files (property-based)
- **Build** (`npm run build`): PASS — 37.65 kB JS bundle (12.65 kB gzipped)
- **Level playability** (`node tools/verify-level.mjs`): PASS — all 32 enemies
  and 8 pickups reachable from spawn

## Generated Files

### Build / Config (workspace root)
| File | Purpose |
|------|---------|
| `package.json` | Dependencies, scripts (dev/build/test/level tooling) |
| `tsconfig.json` | TypeScript strict config |
| `vite.config.ts` | Vite build config (relative base for static hosting) |
| `vitest.config.ts` | Test runner config |
| `index.html` | Canvas, loading screen, click-to-play overlay |
| `.gitignore` | Standard ignores |
| `README.md` | Run instructions and controls |

### Source (`src/`)
| File | Component | Stories |
|------|-----------|---------|
| `types.ts` | Shared type definitions | foundation |
| `constants.ts` | Balance constants | foundation |
| `math-utils.ts` | Pure math (angles, vectors, distance) | US-01, US-02, US-09 |
| `asset-loader.ts` | Texture/sound/map loading | US-09/10/11/17/23 |
| `map-system.ts` | Grid access, doors, push-walls | US-03/04/11/12 |
| `input-system.ts` | Keyboard + mouse + pointer lock | US-01/02/03/05 |
| `player.ts` | Movement, sliding collision, health | US-01/02/04/07/13 |
| `entity-system.ts` | Enemies, pickups, decorations, sprites | US-10, US-23 |
| `enemy-ai.ts` | Red Tape state machine, LOS, pursuit | US-07/08/24 |
| `combat-system.ts` | Cone melee hit detection, weapon anim | US-05, US-06 |
| `renderer.ts` | DDA raycaster, textured walls, sprites | US-09/10/25 |
| `audio-system.ts` | Web Audio SFX + music | US-17/18/19 |
| `hud-renderer.ts` | HUD bar, face, overlays, stats | US-13/14/15/16/20/21/22/24 |
| `placeholder-textures.ts` | Procedural Icelandic-palette textures | US-09/10/25 |
| `game-loop.ts` | Frame pipeline, states, win/lose, restart | US-20/21/22 + orchestration |
| `main.ts` | Bootstrap and entry point | foundation |

### Assets (`public/assets/`)
| File | Purpose |
|------|---------|
| `maps/level1.json` | 32x32 prototype level (lobby -> committee wing) |
| `textures/README.md` | Texture id reference + replacement guide |
| `audio/README.md` | Expected sound files (optional, graceful degradation) |

### Tools (`tools/`)
| File | Purpose |
|------|---------|
| `generate-level.mjs` | Generates `level1.json` (run `npm run level:generate`) |
| `verify-level.mjs` | Flood-fill playability check (`npm run level:verify`) |

### Tests (`tests/`)
| File | Coverage |
|------|----------|
| `math-utils.test.ts` | 17 property-based tests for math utilities |
| `map-loader.test.ts` | 11 tests for map validation, grid access, doors, push-walls |

## Architecture Notes
- **Sequential frame pipeline**: input -> player -> enemies -> combat -> map ->
  interactions -> win/lose -> render -> HUD. Matches the application design.
- **Dual-canvas rendering**: world rendered to a 640x400 offscreen canvas
  (retro resolution), scaled up to the display canvas with `pixelated`
  smoothing; HUD drawn at full resolution for crisp text.
- **Procedural placeholder art**: lets the game run with zero image assets while
  respecting the Icelandic parliament palette (dark dolerite, cream plaster,
  dark wood, brass, blue carpet). Real PNGs can override by id.

## Known Prototype Limitations
- Push-wall opening is instantaneous at the end of the slide timer; the renderer
  does not animate the wall sliding back (the cell becomes passable when the
  timer completes). Functionally complete; visual polish deferred.
- Floor and ceiling are solid colours (no floor-casting) to stay within the
  frame budget. Acceptable for the classic look.
- Audio files are not bundled; the game runs silently until real SFX are added
  to `public/assets/audio/` (loading failures are handled gracefully).
- Score for a dispersed enemy is awarded a flat +10 in the game loop; the
  enemy-AI hit result also computes a score value but the loop is the single
  source of truth to avoid double counting.
