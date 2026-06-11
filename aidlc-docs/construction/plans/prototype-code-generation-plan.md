# Code Generation Plan — "Pots & Parliament" Prototype

## Unit Context
- **Unit**: prototype (single unit — full playable level)
- **Project Type**: Greenfield, single unit
- **Code Location**: Workspace root (`src/`, `tests/`, `assets/`)
- **Tech Stack**: TypeScript + Vite + Canvas 2D, Vitest + fast-check for tests

## Story Coverage
This plan implements all 25 user stories (US-01 through US-25) across the 8 epics.

---

## Generation Steps

### Step 1: Project Scaffolding
- [x] Create `package.json` with dependencies and scripts
- [x] Create `tsconfig.json` (strict mode)
- [x] Create `vite.config.ts`
- [x] Create `vitest.config.ts`
- [x] Create `index.html` with canvas element and "click to play" overlay
- [x] Create `.gitignore`
- [x] Create `README.md` with run instructions
- **Stories**: Foundation for all

### Step 2: Type Definitions
- [x] Create `src/types.ts` — all shared interfaces (from domain-entities.md)
- [x] Create `src/constants.ts` — all balance constants (from business-rules.md)
- **Stories**: Foundation for all

### Step 3: Math Utilities (Pure Functions — testable)
- [x] Create `src/math-utils.ts` — angle normalization, vector ops, distance, FOV plane calc
- **Stories**: US-01, US-02, US-09 (rendering math foundation)

### Step 4: Asset Loader
- [x] Create `src/asset-loader.ts` — load textures (→ ImageData), audio (→ AudioBuffer), maps (→ JSON)
- **Stories**: US-09, US-10, US-11, US-17, US-23

### Step 5: Map System
- [x] Create `src/map-system.ts` — JSON parsing, grid access, door/pushwall state and animation
- **Stories**: US-03, US-04, US-11, US-12

### Step 6: Input System
- [x] Create `src/input-system.ts` — keyboard + mouse, pointer lock, action flags
- **Stories**: US-01, US-02, US-03, US-05

### Step 7: Player
- [x] Create `src/player.ts` — movement, collision (sliding), rotation, health, interaction
- **Stories**: US-01, US-02, US-04, US-07, US-13

### Step 8: Entity System
- [x] Create `src/entity-system.ts` — spawn from map, manage enemies/pickups, visibility queries
- **Stories**: US-10, US-23

### Step 9: Enemy AI
- [x] Create `src/enemy-ai.ts` — state machine, LOS, pursuit, attack, stun, taunts
- **Stories**: US-07, US-08, US-24

### Step 10: Combat System
- [x] Create `src/combat-system.ts` — attack cone detection, weapon animation, hit results
- **Stories**: US-05, US-06

### Step 11: Raycaster Renderer
- [x] Create `src/renderer.ts` — DDA raycasting, textured walls, floor/ceiling, sprite rendering with z-buffer
- **Stories**: US-09, US-10, US-25

### Step 12: Audio System
- [x] Create `src/audio-system.ts` — Web Audio init, SFX playback, music loop
- **Stories**: US-17, US-18, US-19

### Step 13: HUD Renderer
- [x] Create `src/hud-renderer.ts` — health bar, weapon, face portrait, connections, text overlays, stats screen
- **Stories**: US-13, US-14, US-15, US-16, US-20, US-21, US-22, US-24

### Step 14: Game Loop
- [x] Create `src/game-loop.ts` — frame pipeline, state machine, win/lose, interaction handling, restart
- **Stories**: US-20, US-21, US-22 + orchestrates all

### Step 15: Entry Point
- [x] Create `src/main.ts` — bootstrap: load assets, init systems, start loop
- **Stories**: Foundation

### Step 16: Prototype Level Map
- [x] Create `public/assets/maps/level1.json` — 32x32 level: lobby → committee corridors, 32 enemies, pickups, doors, 1 secret (generated + playability-verified)
- **Stories**: US-11, US-12, US-25

### Step 17: Placeholder Assets
- [x] Create procedurally-generated placeholder textures (`src/placeholder-textures.ts`) for walls, sprites, HUD
- [x] Document audio asset requirements (`public/assets/audio/README.md`) and texture replacement guide
- **Stories**: US-09, US-10, US-25

### Step 18: Property-Based Tests
- [x] Create `tests/math-utils.test.ts` — PBT for angle normalization, vector ops, distance (17 tests)
- [x] Create `tests/map-loader.test.ts` — PBT for map parsing/validation round-trips (11 tests)
- **Stories**: NFR (testing requirement)

### Step 19: Code Documentation
- [x] Create `aidlc-docs/construction/prototype/code/code-summary.md` — overview of generated files
- **Stories**: Documentation

---

## File Manifest (Application Code — Workspace Root)

```
package.json
tsconfig.json
vite.config.ts
vitest.config.ts
index.html
.gitignore
README.md
src/
├── main.ts
├── types.ts
├── constants.ts
├── math-utils.ts
├── asset-loader.ts
├── map-system.ts
├── input-system.ts
├── player.ts
├── entity-system.ts
├── enemy-ai.ts
├── combat-system.ts
├── renderer.ts
├── audio-system.ts
├── hud-renderer.ts
└── game-loop.ts
assets/
├── textures/ (placeholder generation)
├── audio/ (requirements documented)
└── maps/
    └── level1.json
tests/
├── math-utils.test.ts
└── map-loader.test.ts
```

---

## Notes on Placeholder Assets
Since this is a code-generation prototype without an artist, Step 17 will generate **procedural placeholder textures** at runtime (or as a build-time script) that respect the Icelandic parliament color palette (dark dolerite, cream plaster, dark wood, brass, blue carpet). This ensures the game is immediately playable. Final pixel-art assets can replace placeholders later without code changes (they load from `assets/textures/`).
