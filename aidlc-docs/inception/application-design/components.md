# Components — "Pots & Parliament" (Rust)

## Overview

> **Design note:** In Rust these are not 11 objects holding references to each other. They are **modules**: most are pure *systems* (free functions operating on data borrowed from the owning `World`); a few are *boundaries* expressed as **traits** (`Surface`, `InputSource`, `AudioSink`, `AssetSource`) with `web-sys` implementations. The orchestrator (`App`) owns the `World` and the trait objects and drives one frame per `requestAnimationFrame` callback. Call surfaces are in `component-methods.md`.

| # | Module | Kind | Replaces (TS) |
|---|--------|------|---------------|
| 1 | `app` | Orchestrator (owns `World` + boundaries) | GameLoop |
| 2 | `raycaster` + `sprites` | Pure system → `Framebuffer`; `Surface` trait presents | Renderer |
| 3 | `map` | Data + pure functions | MapSystem |
| 4 | `input` | `InputSource` trait | InputSystem |
| 5 | `movement` | Pure system over `Player` | Player |
| 6 | `entities` (data on `World`) | Data + query helpers | EntitySystem |
| 7 | `ai` | Pure system | EnemyAI |
| 8 | `combat` | Pure system | CombatSystem |
| 9 | `audio` | `AudioSink` trait | AudioSystem |
| 10 | `hud` | Pure system → `Framebuffer` | HUDRenderer |
| 11 | `assets` | `AssetSource` trait (async) | AssetLoader |

---

## 1. `app` — Orchestrator

**Purpose**: Owns the `World` and the platform boundaries; advances and renders one frame per rAF callback.

**Responsibilities:**
- Construct the `World` and boundary impls; hold the `Framebuffer`/z-buffer
- Compute delta time from rAF timestamps and run the per-frame system pipeline
- Manage `GameStatus` transitions (loading → intro → playing → paused → game over/victory)
- Forward resize events to the `Surface`

**Key surface:** `App::tick(now_ms)`, `set_status`, `status`. The rAF `Closure` lifecycle is owned by the wasm entry point, not the orchestrator.

---

## 2. `raycaster` + `sprites` — Rendering (pure) behind the `Surface` boundary

**Purpose**: Produce the 3D view by writing RGBA pixels into a `Framebuffer`; the `Surface` trait blits it to the canvas.

**Responsibilities:**
- DDA wall casting with perpendicular-distance correction; write textured vertical strips
- Fill a per-column z-buffer for sprite occlusion
- Depth-sort and draw sprites (enemies, pickups, decorations) back-to-front
- Distance-based shading; transparent color-key sprites
- `Surface` impl wraps the buffer as `ImageData`, `putImageData`s to a 640×400 offscreen canvas, and scales to the window

**Key surface:** `cast_walls(...)`, `render_sprites(...)` (pure); `Surface::present`, `Surface::resize`.

---

## 3. `map` — Level data

**Purpose**: Parse, store, and query level data; animate doors and push-walls.

**Responsibilities:**
- `serde` parse + validate JSON into a flat row-major `Map` (returns `Result<Map, MapError>`)
- Tile lookup and bounds-checked solidity queries for raycasting and collision
- Track and animate door (`Closed/Opening/Open`) and push-wall (`Hidden/Sliding/Open`) state, flipping tile solidity

**Key surface:** `parse_map(json) -> Result`, `Map::tile`, `Map::is_solid`, `animate_map`, `open_door`, `activate_push_wall`.

---

## 4. `input` — `InputSource` boundary

**Purpose**: Capture keyboard + mouse and normalize to an `InputState` snapshot.

**Responsibilities:**
- Register `web-sys` listeners (WASD, E/Space, mouse move, click) writing into shared state
- Request/track Pointer Lock
- Provide an edge-cleared snapshot per frame

**Key surface:** `InputSource::poll() -> InputState`, `pointer_locked()`.

---

## 5. `movement` — Player system (pure)

**Purpose**: Move the player from input with wall-sliding collision; manage health.

**Responsibilities:**
- Translate input into movement; rotate from mouse and recompute `dir`/`plane` from `angle`
- Axis-independent collision (slide along walls) via the `blocked` predicate
- `damage_player` (saturating) / `heal_player` (clamped); interaction-range checks

**Key surface:** `update_player`, `damage_player`, `heal_player`, `Player::can_interact`.

---

## 6. `entities` — Entity data on `World`

**Purpose**: Hold and query enemies, pickups, and decorations.

**Responsibilities:**
- Own `Vec<Enemy>`, `Vec<Pickup>`, `Vec<Decoration>` on `World`
- Spawn from map defs at level construction; allocate `EntityId`s
- Spatial queries (`enemies_in_range` as a lazy iterator); removal via `Vec::retain`

**Key surface:** `World::spawn_from_map`, `World::alive_enemy_count`, `World::enemies_in_range`.

---

## 7. `ai` — Enemy behavior (pure)

**Purpose**: Drive the Red Tape state machine (idle → alert → pursue → attack, plus stunned/dispersing).

**Responsibilities:**
- Per-enemy tick reading `world.player` + `world.map`, writing the enemy
- Line-of-sight detection (DDA) and simple grid pursuit (no A*)
- Attack timing/cooldown; stun handling; apply-hit resolution

**Key surface:** `update_enemies(world, dt)`, `can_see_player`, `apply_hit -> HitResult`.

---

## 8. `combat` — Weapon & hit detection (pure)

**Purpose**: Resolve wooden-spoon attacks against enemies.

**Responsibilities:**
- Gate on weapon readiness; advance swing/recover phases
- Range + arc cone test; hit the single closest valid enemy
- Report an `AttackOutcome` for the orchestrator to turn into sound/score

**Key surface:** `resolve_attack(world) -> AttackOutcome`, `update_weapon`, `Weapon::is_ready/frame`.

---

## 9. `audio` — `AudioSink` boundary

**Purpose**: Play sound effects (closed `Sound` enum) and looping music.

**Responsibilities:**
- Own the `AudioContext` and decoded `AudioBuffer`s keyed by `Sound`
- One-shot SFX via fresh `AudioBufferSourceNode`; looping music; volume/mute
- Lazy context init on first user gesture

**Key surface:** `AudioSink::play(Sound)`, `play_music`, `stop_music`, `set_volume`, `set_muted`.

---

## 10. `hud` — HUD rendering (pure)

**Purpose**: Draw the Wolf3D-style bottom bar and text overlays into the `Framebuffer`.

**Responsibilities:**
- Health, connections counter, weapon sprite, face portrait (`FaceExpression` by health band)
- Overlays: intro text, enemy taunts, game over, victory/stats

**Key surface:** `render_hud(view: &HudView, textures, fb)`.

---

## 11. `assets` — `AssetSource` boundary (async)

**Purpose**: Fetch textures, audio, and maps; report progress.

**Responsibilities:**
- `fetch` bytes/text via `web-sys` + `wasm-bindgen-futures`, returning `Result`
- Decode textures into RGBA `Vec<u8>` arrays held in a `TextureSet`
- Progress callback for the loading bar

**Key surface:** `AssetSource::load_bytes/load_text` (async), `on_progress`.
