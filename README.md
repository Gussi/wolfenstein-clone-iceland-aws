# Pots & Parliament

An Icelandic-flavoured Wolfenstein 3D-style raycaster prototype, written in
**Rust** and compiled to **WebAssembly**. You wander the halls of a thinly
fictionalised Alþingi, dispersing animate Red Tape with a wooden spoon while a
volcano erupts, ignored, through every window.

## Tech stack

- **Rust** (edition 2024) → `wasm32-unknown-unknown`
- **wasm-bindgen / web-sys / js-sys** for the browser bindings
- **Trunk** for building and the dev server
- **serde** for level files, **proptest** for property-based tests

The architecture is data-oriented: a single owning `World`, pure system
functions that borrow from it, and browser side-effects isolated behind traits
(`Surface`, `InputSource`, `AudioSink`, `AssetSource`). The entire game core
compiles and tests on the native host; only `src/platform/` and `src/entry.rs`
are browser-specific (gated behind `cfg(target_arch = "wasm32")`).

## Prerequisites

```bash
rustup target add wasm32-unknown-unknown   # one-time: wasm target
cargo install trunk                        # one-time: Trunk bundler
```

## Develop

```bash
trunk serve                 # dev server with hot reload (auto-opens the browser)
```

Then click the canvas to capture the mouse (Pointer Lock) and play.

## Test

```bash
cargo test                  # unit + property-based tests (native host target)
cargo clippy                # lints (clean)
cargo fmt                   # formatting
```

## Build (production)

```bash
trunk build --release       # outputs static files to dist/
```

Serve `dist/` from any static host. The host **must** serve `.wasm` with the
`application/wasm` MIME type for streaming compilation. See
`aidlc-docs/construction/prototype/code/deployment.md`.

## Controls

| Action | Input |
|--------|-------|
| Move | `W` / `A` / `S` / `D` |
| Look | Mouse (horizontal) |
| Attack (wooden spoon) | Left click |
| Interact (doors / push-walls) | `E` or `Space` |
| Pause | `Esc` |
| Dismiss intro / restart after game over | Any key |

## Assets

The game currently runs with **programmatic placeholder textures** and optional
audio. Final pixel art and sound are a follow-up task — see `assets/README.md`
for the required files and how to wire them in.

## Project layout

```
src/
├── lib.rs            # crate root + module graph
├── math.rs           # Vec2 + angle helpers
├── constants.rs      # balance constants
├── world.rs          # owning World + level (re)build
├── boundary.rs       # boundary traits + TextureSet
├── domain/           # data types (player, enemy, pickup, weapon, map)
├── systems/          # pure systems (movement, ai, combat, interactions,
│                     #   raycaster, sprites, hud)
├── app.rs            # orchestrator (frame pipeline)
├── platform/         # web-sys boundary impls (wasm-only)
└── entry.rs          # #[wasm_bindgen(start)] bootstrap (wasm-only)
tests/                # property-based tests (math, map parsing, collision)
assets/               # maps, textures, audio (+ asset README)
```

Design docs live under `aidlc-docs/`.
