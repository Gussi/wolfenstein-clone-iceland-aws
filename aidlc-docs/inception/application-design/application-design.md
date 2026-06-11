# Application Design — Consolidated Overview (Rust)

## "Pots & Parliament" Prototype Architecture

> **Design note:** Revised from the original TypeScript design to idiomatic Rust compiled to WebAssembly. The shift is structural, not cosmetic: a single owning `World`, systems as free functions, strong enums over string unions, and browser side-effects isolated behind traits. See the NFR tech-stack decision in `aidlc-docs/construction/prototype/nfr-requirements/tech-stack-decisions.md`.

---

## Technical Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | Rust (stable, edition 2024) | Memory safety, performance, exhaustive enums, strong types |
| Target | `wasm32-unknown-unknown` | Runs in the browser as a WebAssembly module |
| Browser bindings | wasm-bindgen + web-sys + js-sys | FFI to Canvas, Web Audio, Pointer Lock, fetch |
| Rendering | Pure raycaster → RGBA `Framebuffer` → `putImageData` | Fastest per-pixel path; matches the 640×400 offscreen design |
| Build/dev | Trunk | Rust-first wasm bundler + hot-reload dev server |
| State | Single owning `World` + free-function systems | Data-oriented; explicit borrows; no inter-component references |
| Serialization | serde / serde_json | Map files |
| Errors | thiserror | Ergonomic `MapError` / `AssetError` enums |
| Testing | cargo test + proptest | Native unit + property tests on the pure core |
| Assets | Nested by type (`assets/textures/`, `audio/`, `maps/`) | Clean organization |

---

## Architecture Style

**Data-oriented sequential pipeline.** The `App` orchestrator owns one `World` and four boundary trait objects. Each frame it runs pure system functions over borrows of the `World` in a fixed order, then maps their returned outcomes to side effects through the boundary traits. No event bus, no ECS framework, no `Rc<RefCell>` graph between systems.

Boundaries (`Surface`, `InputSource`, `AudioSink`, `AssetSource`) are injected as generic type parameters (`App<S, A, I>`), so the entire game core compiles and tests on the native host with mock implementations.

---

## Module Summary

| # | Module | Kind |
|---|--------|------|
| 1 | `app` | Orchestrator (owns `World` + boundaries) |
| 2 | `raycaster` / `sprites` | Pure render → `Framebuffer`; `Surface` presents |
| 3 | `map` | Data + pure parse/animate functions |
| 4 | `input` | `InputSource` trait (web-sys events) |
| 5 | `movement` | Pure player system |
| 6 | `entities` | Data on `World` + query helpers |
| 7 | `ai` | Pure enemy system |
| 8 | `combat` | Pure weapon/hit system |
| 9 | `audio` | `AudioSink` trait (Web Audio) |
| 10 | `hud` | Pure HUD render |
| 11 | `assets` | `AssetSource` trait (async fetch) |

---

## Project Structure (Cargo + Trunk)

```
pots-and-parliament/
├── Cargo.toml
├── rust-toolchain.toml          # stable + wasm32-unknown-unknown
├── Trunk.toml
├── index.html                   # Trunk entry: <link data-trunk rel="rust">, <canvas>
├── src/
│   ├── lib.rs                   # crate root; #[wasm_bindgen(start)] bootstrap
│   ├── app.rs                   # App orchestrator + frame pipeline
│   ├── world.rs                 # World struct + spawn/query helpers
│   ├── math.rs                  # Vec2 and vector ops
│   ├── constants.rs             # balance constants (see business-rules.md)
│   ├── domain/
│   │   ├── mod.rs
│   │   ├── player.rs            # Player type
│   │   ├── enemy.rs             # Enemy, EnemyState, EnemyKind
│   │   ├── pickup.rs            # Pickup, PickupKind
│   │   ├── weapon.rs            # Weapon, WeaponPhase
│   │   └── map.rs               # Map, Tile, Door, PushWall, MapFile (serde), MapError
│   ├── systems/
│   │   ├── mod.rs
│   │   ├── movement.rs          # update_player, collision predicate
│   │   ├── ai.rs                # update_enemies, can_see_player, apply_hit
│   │   ├── combat.rs            # resolve_attack, update_weapon
│   │   ├── interactions.rs      # try_interact, collect_pickups
│   │   ├── raycaster.rs         # cast_walls
│   │   ├── sprites.rs           # render_sprites
│   │   └── hud.rs               # render_hud
│   └── platform/                # browser boundary impls (web-sys)
│       ├── mod.rs
│       ├── surface.rs           # impl Surface (ImageData + putImageData + scale)
│       ├── input.rs             # impl InputSource (event listeners + Pointer Lock)
│       ├── audio.rs             # impl AudioSink (AudioContext)
│       └── assets.rs            # impl AssetSource (fetch + decode → TextureSet)
├── assets/
│   ├── textures/{walls,sprites,hud,floors}/
│   ├── audio/{sfx,music}/
│   └── maps/level1.json
└── tests/                       # native-target integration + property tests
    ├── map_parsing.rs           # proptest: serde round-trips, validation
    ├── math.rs                  # proptest: vector + angle math
    └── collision.rs             # proptest: sliding/solidity edge cases
```

Unit tests also live inline as `#[cfg(test)] mod tests` next to the code they cover; the pure `systems/` and `math.rs` carry the bulk of `proptest` coverage.

---

## Frame Pipeline

```
┌─ FRAME START (requestAnimationFrame → App::tick) ─────────────┐
│  1. dt = now_ms - last (seconds)                               │
│  2. input = InputSource::poll()                                │
│  3. update_player(&mut player, &map, &input, dt)               │
│  4. update_enemies(&mut world, dt)                             │
│  5. update_weapon(&mut weapon, dt)                             │
│  6. animate_map(&mut map, dt)                                  │
│  7. handle_attack(&input)        → AudioSink + score           │
│  8. handle_interactions(&input)  → AudioSink + score           │
│  9. check_end_conditions()       → GameStatus                  │
│ 10. cast_walls + render_sprites + render_hud → Framebuffer     │
│ 11. Surface::present(&framebuffer)                             │
└─ FRAME END ────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

1. **Single owning `World`.** All mutable game data lives in one struct; systems borrow it. Eliminates inter-component references and the borrow-checker fights a naive port would cause.
2. **Pure systems, side-effects at the edges.** Logic returns outcomes (`AttackOutcome`, `Interaction`); the orchestrator performs audio/score effects. The core tests on the native target.
3. **Traits only at the browser boundary.** `Surface`/`InputSource`/`AudioSink`/`AssetSource` are the sole abstractions, injected as generics for mockability.
4. **Strong enums.** `GameStatus`, `EnemyState`, `WallTexture`, `Sound`, `PickupKind` replace stringly-typed unions; the compiler enforces exhaustiveness.
5. **Pixel-buffer rendering.** The raycaster writes RGBA into a `Framebuffer`; a single `putImageData` per frame presents it — fewer FFI crossings than per-strip Canvas calls.
6. **Data-driven maps via serde.** Levels are JSON, parsed into a flat row-major grid with validation; no code changes to edit a level.

---

## Detailed Design References

- **Domain types**: `construction/prototype/functional-design/domain-entities.md` (Rust structs/enums)
- **Algorithms**: `construction/prototype/functional-design/business-logic-model.md`
- **Balance constants**: `construction/prototype/functional-design/business-rules.md` (`constants` module)
- **Call surfaces**: `component-methods.md`
- **Modules**: `components.md`
- **Orchestration**: `services.md`
- **Borrows & data flow**: `component-dependency.md`
- **Tech stack**: `construction/prototype/nfr-requirements/tech-stack-decisions.md`
