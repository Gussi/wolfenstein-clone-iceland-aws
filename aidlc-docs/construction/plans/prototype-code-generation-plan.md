# Code Generation Plan — "Pots & Parliament" Prototype (Rust/wasm)

> This plan is the **single source of truth** for Code Generation. Steps are executed in order; each is checked off as it completes. Generation follows the approved design artifacts exactly — no improvised logic.

## Unit Context

- **Unit**: `prototype` (single unit — see workflow plan; no decomposition)
- **Project type**: Greenfield, single unit → code at workspace root (`src/`, `tests/`, `assets/`)
- **Language/target**: Rust edition 2024 → `wasm32-unknown-unknown`, built with Trunk
- **Architecture**: Data-oriented — one owning `World`, pure system functions, browser side-effects behind traits (`Surface`/`InputSource`/`AudioSink`/`AssetSource`)
- **Dependencies**: None external to the unit (no backend, no other units)
- **Design sources**:
  - `construction/prototype/functional-design/` (domain-entities, business-logic-model, business-rules)
  - `inception/application-design/` (components, component-methods, services, component-dependency, application-design)
  - `construction/prototype/nfr-requirements/` (tech-stack-decisions, nfr-requirements)

> **Note on layers**: The standard API/Repository/Database/Frontend layers do **not** apply — this is a self-contained client-side game. The plan instead follows the game's layers: project scaffold → core (math/constants/domain) → pure systems → rendering → orchestration → browser platform → assets → tests → docs/deploy.

> **Note on tests**: Tests are generated here but **executed** in the Build & Test stage (per workflow). PBT scope per NFR decision = pure functions + serialization only.

> **Note on assets**: Binary art/audio assets cannot be authored in code. This step generates the **manifest, directory layout, the sample level JSON, and placeholder/programmatic stand-ins** so the build runs; final art/audio is a separate asset-production task flagged in the summary.

---

## Generation Steps

### Step 1: Project Structure Setup (greenfield)
- [x] `Cargo.toml` (deps: wasm-bindgen, wasm-bindgen-futures, js-sys, web-sys w/ features, serde, serde_json, thiserror; dev: proptest; release profile)
- [x] `rust-toolchain.toml` (stable + `wasm32-unknown-unknown`)
- [x] `Trunk.toml` and `index.html` (Trunk entry, `<canvas id="game">`, pixelated CSS)
- [x] `src/lib.rs` crate root with module declarations and `#[wasm_bindgen(start)]` stub
- [x] `.gitignore` (target/, dist/)
- **Stories**: foundation for all

### Step 2: Core — Math & Constants
- [x] `src/math.rs` — `Vec2` + ops (dot, length, normalized, from_angle), `#[cfg(test)]` unit tests
- [x] `src/constants.rs` — all balance constants from business-rules.md
- **Stories**: US-01, US-09 (math underpins movement + raycasting)

### Step 3: Core — Domain Types
- [x] `src/domain/mod.rs`
- [x] `player.rs`, `enemy.rs`, `pickup.rs`, `weapon.rs` (structs + enums + small inherent methods)
- [x] `src/world.rs` — `World` struct, `EntityId` allocation, `spawn_from_map`, query helpers, `Animation`, `Taunt`, `FaceExpression`
- **Stories**: US-13, US-15, US-16, US-24 (state these features read)

### Step 4: Map — serde format, parsing, validation, runtime model
- [x] `src/domain/map.rs` — `MapFile` (serde), `Map`, `Tile`, `TileKind`, `Door`, `PushWall`, `WallTexture` + `from_grid_id`, `MapError`
- [x] `parse_map(json) -> Result<Map, MapError>` with validation (dims, bounds)
- [x] `#[cfg(test)]` unit tests for parse happy-path + invalid cases
- **Stories**: US-11

### Step 5: System — Movement & Collision
- [x] `src/systems/mod.rs`
- [x] `src/systems/movement.rs` — `update_player`, `blocked` predicate, axis-independent sliding; inline unit tests
- **Stories**: US-01, US-02, US-04

### Step 6: System — Enemy AI
- [x] `src/systems/ai.rs` — `update_enemies`, `can_see_player` (DDA LOS), `apply_hit -> HitResult`, state machine (idle→alert→pursue→attack, stunned, dispersing), taunt trigger
- **Stories**: US-06, US-07, US-08, US-24

### Step 7: System — Combat
- [x] `src/systems/combat.rs` — `resolve_attack -> AttackOutcome`, `update_weapon`, range+arc cone test, closest-target selection
- **Stories**: US-05, US-06

### Step 8: System — Interactions (doors, push-walls, pickups)
- [x] `src/systems/interactions.rs` — `try_interact -> Option<Interaction>`, `collect_pickups -> u32`
- [x] `src/domain/map.rs` animation: `animate_map`, `open_door`, `activate_push_wall` (tile solidity flips)
- **Stories**: US-03, US-12, US-23

### Step 9: Rendering — Raycaster (walls)
- [x] `src/systems/raycaster.rs` — `Framebuffer`, `cast_walls` (DDA, perpendicular distance, textured strips, side shading, z-buffer fill); floor/ceiling fill
- **Stories**: US-09, US-25 (texture selection per wall)

### Step 10: Rendering — Sprites
- [x] `src/systems/sprites.rs` — `render_sprites` (camera transform, depth sort, z-buffer test, billboard, color-key transparency)
- **Stories**: US-10

### Step 11: Rendering — HUD
- [x] `src/systems/hud.rs` — `HudView`, `Overlay`, `render_hud` (health, connections, weapon frame, face portrait, overlays/taunts/stats)
- **Stories**: US-13, US-14, US-15, US-16, US-22, US-24

### Step 12: Orchestration — App, boundary traits, game flow
- [x] `src/boundary.rs` — `Surface`, `InputSource`, `AudioSink` (+ `Sound` enum), `AssetSource` (+ `AssetError`, `AssetManifest`, `TextureSet`) trait definitions
- [x] `src/app.rs` — `App<S,A,I>`, `tick` pipeline, `handle_attack`, `handle_interactions`, `check_end_conditions`, `advance_timed_state`, `GameStatus` transitions, level (re)build/restart
- **Stories**: US-20, US-21, US-22 (game flow); orchestrates all systems

### Step 13: Platform — browser boundary impls (web-sys)
- [x] `src/platform/mod.rs`
- [x] `surface.rs` — `ImageData` + `putImageData` + scale to canvas; resize
- [x] `input.rs` — keyboard/mouse listeners + Pointer Lock, shared `InputState`
- [x] `audio.rs` — `AudioContext`, decode + play SFX/music, volume/mute
- [x] `assets.rs` — async `fetch` bytes/text, decode textures → `TextureSet`, progress
- **Stories**: US-01..US-03 (input), US-17..US-19 (audio), US-09/US-10 (presentation), US-11 (asset/map load)

### Step 14: wasm Entry Point
- [x] `src/lib.rs` — `#[wasm_bindgen(start)]`: get canvas, construct platform impls, load assets (async), build `World` from level1, create `App`, retain rAF `Closure`
- **Stories**: US-20 (boot → intro)

### Step 15: Assets — manifest, sample level, placeholders
- [x] `assets/maps/level1.json` — 32×32 level: lobby + committee corridor, 1 push-wall secret w/ reward, ~30 enemies, pickups, doors, decorations, spawn (US-09/US-11/US-12/US-25)
- [x] Asset manifest wiring in code (texture keys, sound keys → urls)
- [x] Placeholder generation strategy for missing PNG/audio (programmatic solid-color/checker textures + silent audio fallback) so the build runs without final art
- [x] `assets/README.md` listing required final art/audio (walls per `WallTexture`, sprites, HUD, sfx, music) with the existing `music/Loftsöngur - 8bit.mp3`
- **Stories**: US-09, US-10, US-11, US-12, US-25; audio US-17..US-19

### Step 16: Tests — unit + property-based
- [x] `tests/math.rs` — proptest: angle normalization, normalized() invariants, vector ops
- [x] `tests/map_parsing.rs` — proptest: valid map round-trips/parse; invalid maps rejected with `MapError`
- [x] `tests/collision.rs` — proptest: `blocked`/sliding never lets player enter solid tiles; bounds
- [x] Confirm inline `#[cfg(test)]` modules from Steps 2/4/5 compile under host target
- **Stories**: cross-cutting (NFR-03 PBT scope)

### Step 17: Documentation
- [x] `README.md` (workspace root) — overview, prerequisites (rustup target, trunk), `trunk serve` / `cargo test` / `trunk build --release`, controls
- [x] `aidlc-docs/construction/prototype/code/code-summary.md` — module map, story coverage, what's stubbed (assets)
- **Stories**: developer-facing

### Step 18: Deployment Artifacts
- [x] Confirm `Trunk.toml` release output + `.wasm` MIME note in README
- [x] `aidlc-docs/construction/prototype/code/deployment.md` — static hosting steps, MIME requirement, bundle-size note
- **Stories**: deployment readiness

---

## Story Coverage Matrix

| Story | Step(s) |
|-------|---------|
| US-01 Movement | 2, 5, 13 |
| US-02 Mouse look | 5, 13 |
| US-03 Door interaction | 8, 13 |
| US-04 Wall collision | 5 |
| US-05 Weapon attack | 7, 11 |
| US-06 Enemy stun | 6, 7 |
| US-07 Enemy attack | 6 |
| US-08 Enemy AI | 6 |
| US-09 Raycaster | 9, 15 |
| US-10 Sprites | 10, 15 |
| US-11 Level JSON | 4, 13, 15 |
| US-12 Push-wall secret | 8, 15 |
| US-13 Health display | 3, 11 |
| US-14 Weapon display | 11 |
| US-15 Face portrait | 3, 11 |
| US-16 Connections counter | 3, 11 |
| US-17 Weapon SFX | 13, 15 |
| US-18 Enemy SFX | 13, 15 |
| US-19 Environmental audio | 13, 15 |
| US-20 Level start | 12, 14 |
| US-21 Death/game over | 12 |
| US-22 Level complete | 11, 12 |
| US-23 Health pickup | 8, 15 |
| US-24 Enemy taunts | 3, 6, 11 |
| US-25 Architectural textures | 9, 15 |

---

## Scope & Approach Summary

- **18 steps**, ~25 source files + 1 level JSON + 3 test files + docs.
- **Order**: scaffold → pure core (math/domain/map) → pure systems (movement/AI/combat/interactions) → rendering (walls/sprites/HUD) → orchestration → browser platform → assets → tests → docs/deploy. Pure, testable code first; browser-coupled code last.
- **Testability**: the entire logic core compiles for the native host; `proptest` covers math, map serialization, and collision per the NFR PBT decision.
- **Asset honesty**: code + sample level + placeholders are generated so `trunk build` and `trunk serve` work; final pixel-art textures and audio are a flagged follow-up (programmatic placeholders in the interim).
- **Verification**: tests run in the Build & Test stage that follows.
