# Code Generation Plan — "Pots & Parliament" Prototype

## Unit Context

- **Unit**: prototype (single unit — greenfield, single-player browser game)
- **Code Location**: Workspace root (`/`)
- **Project Type**: Greenfield, single unit (TypeScript + Vite)
- **Stories Covered**: US-01 through US-25 (all stories)

## Dependencies

- None (first and only unit)

## Existing Assets

- `assets/images/pan.png` — weapon sprite (to be moved to `assets/textures/hud/`)
- `music/Loftsöngur - 8bit.mp3` — background music (to be moved to `assets/audio/music/`)
- `prototypes/simple-raycast/index.html` — reference raycaster (not used at runtime)

---

## Code Generation Steps

### Step 1: Project Structure & Configuration

- [x] Create `package.json` with name, scripts, devDependencies (vite, typescript, vitest, fast-check)
- [x] Create `tsconfig.json` (strict mode, ES2020 target, bundler module resolution)
- [x] Create `vite.config.ts` (relative base, no asset inline, auto-open)
- [x] Create `vitest.config.ts` (globals, node environment)
- [x] Create `index.html` (canvas element, entry script, CSS for pixelated scaling)

**Stories**: US-09 (rendering foundation)

### Step 2: Type Definitions (`src/types.ts`)

- [x] Define all shared interfaces: PlayerState, EnemyEntity, PickupEntity, MapJSON, MapState, TileState, DoorState, PushWallState, WeaponState, ScoreState, LevelStats, GameWorldState, InputState, HUDState, RenderState, AssetManifest
- [x] Define all game constants in a separate `src/constants.ts`

**Stories**: All (foundation for every system)

### Step 3: Asset Loader (`src/asset-loader.ts`)

- [x] Implement AssetLoader: loads textures as ImageData arrays, audio as AudioBuffers, maps as JSON
- [x] Progress reporting callback
- [x] Graceful fallback: generate colored placeholder textures at runtime if PNG file fails to load
- [x] Create asset manifest defining all texture/audio/map paths

**Stories**: US-09, US-10, US-11, US-17, US-18, US-19

### Step 4: Map System (`src/map-system.ts`)

- [x] Implement MapSystem: loadMap, getTile, isSolid, getDoors, getPushWalls, getPlayerSpawn
- [x] Door state management (closed → opening → open) with animation timer
- [x] Push-wall state management (hidden → sliding → open) with 2-cell slide
- [x] update(dt) for animating doors and push-walls

**Stories**: US-03, US-11, US-12

### Step 5: Input System (`src/input-system.ts`)

- [x] Implement InputSystem: keyboard listeners (WASD, E, Space), mouse movement (pointer lock)
- [x] Normalize to InputState (movement booleans, turnDelta, one-shot interact/attack)
- [x] Pointer lock request on canvas click, handle exit gracefully
- [x] reset() clears one-shot flags each frame

**Stories**: US-01, US-02, US-03, US-05

### Step 6: Player (`src/player.ts`)

- [x] Implement Player: position, direction, camera plane, health
- [x] Movement with wall sliding collision (test X and Y independently, collision margin 0.2)
- [x] Mouse rotation (update dir and plane vectors)
- [x] takeDamage, heal, canInteract (range check)
- [x] Delta-time-based movement at MOVE_SPEED (3.0 cells/sec)

**Stories**: US-01, US-02, US-04, US-13

### Step 7: Renderer — Raycaster (`src/renderer.ts`)

- [x] Implement DDA raycasting for 640 columns
- [x] Textured wall strips with perpendicular distance correction
- [x] Side shading (0.7 factor on NS walls)
- [x] Solid color floor/ceiling (dark grey floor, dark blue-grey ceiling)
- [x] Z-buffer array for sprite occlusion
- [x] Offscreen canvas (640×400) scaled to main canvas

**Stories**: US-09

### Step 8: Renderer — Sprites (`src/renderer.ts` continued)

- [x] Sprite rendering: transform to camera space, sort far-to-near
- [x] Billboard drawing with z-buffer per-column occlusion
- [x] Transparent pixel skipping (alpha = 0)
- [x] Support animated sprites (frame index → texture lookup)

**Stories**: US-10

### Step 9: Entity System (`src/entity-system.ts`)

- [x] Implement EntitySystem: spawn enemies/pickups/decorations from map data
- [x] update(): tick all enemy AI, check pickup collection
- [x] getVisibleEntities(): return entities with distance for renderer
- [x] removeEntity(), getAliveEnemyCount()
- [x] Auto-collect pickups within PICKUP_RADIUS (0.5 units)

**Stories**: US-08, US-10, US-23

### Step 10: Enemy AI (`src/enemy-ai.ts`)

- [x] State machine: idle → alert → pursue → attack → stunned → dispersed
- [x] Line-of-sight check via DDA ray to player
- [x] Pursuit: move toward player at ENEMY_SPEED (2.0), wall sliding collision
- [x] Attack: deal ENEMY_DAMAGE (5) when within ENEMY_ATTACK_RANGE (0.8)
- [x] Stun: pause for STUN_DURATION (0.3s) on hit
- [x] Dispersed: play animation for DISPERSE_DURATION (0.5s) then deactivate
- [x] Taunt system: assign random taunt on first alert, display for 1.5s

**Stories**: US-07, US-08, US-24

### Step 11: Combat System (`src/combat-system.ts`)

- [x] Weapon state machine: idle → swinging → recovering
- [x] Attack on left-click: check cooldown, start swing
- [x] Hit detection at swing midpoint: range check (1.5 units), arc check (±30°), closest enemy only
- [x] Apply WEAPON_DAMAGE (1) to hit enemy, trigger stun/disperse
- [x] Score awarding on enemy disperse (+10 connections)

**Stories**: US-05, US-06, US-16

### Step 12: Audio System (`src/audio-system.ts`)

- [x] Implement AudioSystem: Web Audio API context (created on first user gesture)
- [x] loadSounds(): decode audio files to AudioBuffers
- [x] play(soundId): one-shot sound effect playback
- [x] playMusic(trackId): looping background music
- [x] Graceful fallback: if audio files missing or context fails, continue silently
- [x] Volume/mute control

**Stories**: US-17, US-18, US-19

### Step 13: HUD Renderer (`src/hud-renderer.ts`)

- [x] Wolf3D-style bottom bar: health number/bar, connections score, face portrait area, weapon sprite
- [x] Face portrait expressions: normal (75-100%), hurt (40-74%), critical (1-39%), victory
- [x] Weapon animation frames (idle, swing frames)
- [x] Text overlays: intro text, enemy taunts (floating above), game over text, victory screen
- [x] Level stats display on victory
- [x] Draws directly on main (full-resolution) canvas

**Stories**: US-13, US-14, US-15, US-16, US-20, US-24

### Step 14: Game Loop (`src/game-loop.ts`)

- [x] Implement GameLoop: requestAnimationFrame cycle with delta time
- [x] Game state machine: loading → intro → playing → paused → gameOver → victory
- [x] Frame pipeline: input → player → entities → combat → map → interactions → render → HUD → reset
- [x] Win condition: all enemies dispersed
- [x] Lose condition: player health ≤ 0
- [x] Level restart logic
- [x] Intro state: show text for a few seconds or until keypress
- [x] Pause on pointer lock exit

**Stories**: US-20, US-21, US-22

### Step 15: Entry Point (`src/main.ts`)

- [x] Create and configure all systems
- [x] Define asset manifest (all texture/audio/map paths)
- [x] Show loading progress
- [x] Start game loop after assets loaded
- [x] Handle "click to play" overlay for pointer lock / audio context init

**Stories**: All (integration point)

### Step 16: Level Design (`assets/maps/level1.json`)

- [x] Design 32×32 grid level: lobby section + committee corridor wing
- [x] Place 30-35 Red Tape enemies across the level
- [x] Place health pickups (coffee, kleinur) strategically
- [x] Define 1 push-wall secret with hidden room
- [x] Place doors between sections
- [x] Place decorations (desks, plants, coat of arms)
- [x] Set player spawn point

**Stories**: US-11, US-12, US-20

### Step 17: Placeholder Assets

- [x] Move `assets/images/pan.png` → reference for weapon sprite
- [x] Move `music/Loftsöngur - 8bit.mp3` → `assets/audio/music/loftsongur.mp3`
- [x] Create programmatic placeholder textures (colored blocks) for all wall types in AssetLoader fallback
- [x] Document all expected asset filenames and dimensions in a `ASSETS.md` file

**Stories**: US-09, US-10, US-14, US-25

### Step 18: Property-Based Tests

- [x] `tests/math.test.ts`: angle normalization, vector rotation, DDA step calculations
- [x] `tests/map-loader.test.ts`: map JSON parsing, validation, round-trip serialization
- [x] `tests/collision.test.ts`: player collision edge cases (corners, margins)

**Stories**: NFR (testing requirements)

### Step 19: Code Summary Documentation

- [x] Create `aidlc-docs/construction/prototype/code/code-summary.md` with file listing and architecture notes

**Stories**: Documentation

---

## Total Steps: 19

## Estimated Scope: ~2500-3500 lines of TypeScript + config + 1 JSON map + documentation
