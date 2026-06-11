# Code Generation Summary — "Pots & Parliament" Prototype

Generated unit: `prototype` (single unit). Language: Rust (edition 2024) →
`wasm32-unknown-unknown`, built with Trunk.

## Module map (created files)

### Project scaffold (workspace root)
- `Cargo.toml`, `rust-toolchain.toml`, `Trunk.toml`, `index.html`, `.gitignore`, `README.md`

### Core (target-agnostic, host-testable)
- `src/lib.rs` — crate root + module graph; platform/entry gated to wasm32
- `src/math.rs` — `Vec2`, `normalize_angle`
- `src/constants.rs` — all balance constants + taunt pool
- `src/world.rs` — owning `World`, `GameStatus`, `Score`, `LevelStats`, `Timers`, level (re)build
- `src/boundary.rs` — `Surface`/`InputSource`/`AudioSink`/`AssetSource` traits, `Sound`, `InputState`, `TextureSet` + procedural placeholders, sprite/HUD ids
- `src/domain/` — `player`, `enemy`, `pickup`, `weapon`, `map` (serde `MapFile`, runtime `Map`, `parse_map`, `MapError`, door/push-wall animation), plus `EntityId`, `Animation`, `FaceExpression`, `Decoration`
- `src/systems/` — `movement` (+ `damage_player`/`heal_player`), `ai`, `combat`, `interactions`, `raycaster` (+ `Framebuffer`), `sprites`, `hud`

### Orchestration + browser platform
- `src/app.rs` — `App<S,A,I>` frame pipeline, game-flow transitions
- `src/platform/` — `surface` (putImageData), `input` (events + Pointer Lock), `audio` (Web Audio), `assets` (fetch) — **wasm-only**
- `src/entry.rs` — `#[wasm_bindgen(start)]` bootstrap + rAF loop — **wasm-only**

### Assets
- `assets/maps/level1.json` — 32×32 lobby + committee wing, 30 enemies, 6 pickups, 4 doors, 1 push-wall secret, decorations
- `assets/README.md` — required final art/audio + wiring notes

### Tests
- `tests/math.rs`, `tests/map_parsing.rs`, `tests/collision.rs` — proptest
- Inline `#[cfg(test)]` unit tests across core modules

## Story coverage

US-01..US-25 implemented. Movement/look/collision (US-01,02,04) in `movement`;
doors/push-wall/pickups (US-03,12,23) in `interactions`+`map`; combat & enemy
behaviour (US-05–08) in `combat`+`ai`; rendering (US-09,10,25) in
`raycaster`+`sprites`+`TextureSet`; HUD (US-13–16,22) in `hud`; audio
(US-17–19) via `AudioSink`/platform `audio`; game flow (US-20–22) in `app`;
taunts (US-24) in `ai`+`hud`.

## Verification (run during generation)

- `cargo test` — **38 passed** (28 lib unit/integration + 5 math proptest + 4 map proptest + 1 collision proptest)
- `cargo clippy` — **clean** (0 warnings)
- `cargo fmt` — applied
- `cargo build --target wasm32-unknown-unknown` — **Finished** (platform + web-sys compile)

Note: the wasm-only browser code (`platform/`, `entry`) is compiled (validated)
but not exercised by host tests; in-browser behaviour is verified via
`trunk serve` in the Build & Test stage.

## Known stubs / follow-ups

- **Textures**: programmatic placeholders (`TextureSet::placeholder`). Real
  pixel art per `assets/README.md` is a follow-up; decode in `platform/assets.rs`.
- **Audio**: best-effort load; missing files are skipped (game runs silent).
- **HUD text**: overlays render as banners in the framebuffer; glyph text can
  be layered by the platform `Surface` (canvas text API) later.
- **Door/push-wall visuals**: rendered as solid walls while closed/hidden and
  cleared when open; the sliding visual offset is not yet drawn.
