# Tech Stack Decisions — "Pots & Parliament" Prototype

> **Migration note (2026-06-11):** Switched from TypeScript/Vite/Vitest+fast-check to **Rust compiled to WebAssembly**. Rust owns the game loop, input, audio, and rendering via `web-sys`/`wasm-bindgen`; only a tiny JS bootstrap loads the wasm module.

---

## Final Technology Stack

| Category | Technology | Version | Rationale |
|----------|-----------|---------|-----------|
| Language | Rust | 1.80+ (stable), edition 2024 | Memory safety, performance close to native, strong type system, fearless concurrency (future) |
| Compile target | `wasm32-unknown-unknown` | N/A | WebAssembly module runs in the browser |
| Runtime | Browser (WebAssembly + Canvas 2D + Web Audio) | N/A | Pixel-buffer blit, Web Audio API, Pointer Lock via web-sys |
| JS/DOM bindings | wasm-bindgen + web-sys + js-sys | ~0.2.x | FFI bridge from Rust to browser APIs |
| Build Tool | Trunk | ~0.21+ | Rust-first wasm bundler; handles wasm-bindgen, asset hashing, dev server with hot reload |
| Test Framework | cargo test (built-in) | bundled with toolchain | Native unit/integration tests, fast |
| PBT Library | proptest | ~1.x | Property-based testing for pure functions + serialization |
| Package Manager | Cargo | bundled with Rust | Standard Rust dependency + build management |
| Toolchain manager | rustup | latest | Installs stable toolchain + `wasm32-unknown-unknown` target |

---

## Rust / Cargo Configuration

```toml
# Cargo.toml
[package]
name = "pots-and-parliament"
version = "0.1.0"
edition = "2024"

[lib]
crate-type = ["cdylib", "rlib"]   # cdylib for wasm output, rlib so native tests can link the logic

[dependencies]
wasm-bindgen = "0.2"
wasm-bindgen-futures = "0.4"   # async/await for fetch-based asset loading
js-sys = "0.3"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"                # ergonomic error enums for map/asset loading

[dependencies.web-sys]
version = "0.3"
features = [
  "Window",
  "Document",
  "Element",
  "HtmlCanvasElement",
  "CanvasRenderingContext2d",
  "ImageData",
  "AudioContext",
  "AudioBuffer",
  "AudioBufferSourceNode",
  "GainNode",
  "AudioDestinationNode",
  "KeyboardEvent",
  "MouseEvent",
  "PointerEvent",
  "Performance",
  "Response",
  "Request",
  "RequestInit",
]

[dev-dependencies]
proptest = "1"

# Optimize wasm size/speed for release builds
[profile.release]
opt-level = "s"     # optimize for size (good wasm default); switch to 3 if profiling shows need
lto = true
codegen-units = 1
panic = "abort"
```

### Toolchain pinning

```toml
# rust-toolchain.toml
[toolchain]
channel = "stable"
targets = ["wasm32-unknown-unknown"]
```

---

## Trunk Configuration

```toml
# Trunk.toml
[build]
target = "index.html"
dist = "dist"

[serve]
open = true            # auto-open browser on `trunk serve`
port = 8080
```

```html
<!-- index.html (Trunk entry point) -->
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Pots &amp; Parliament</title>
    <link data-trunk rel="rust" />
    <link data-trunk rel="copy-dir" href="assets" />
    <style>
      html, body { margin: 0; height: 100%; background: #000; }
      canvas { image-rendering: pixelated; display: block; margin: auto; }
    </style>
  </head>
  <body>
    <canvas id="game"></canvas>
  </body>
</html>
```

The Rust `#[wasm_bindgen(start)]` entry point bootstraps the game; no hand-written JS glue file is required (Trunk generates the loader).

---

## Testing Configuration

```text
cargo test            → Run native unit + integration + property-based tests
```

- **Unit/integration tests**: standard `#[test]` functions, in `#[cfg(test)] mod tests` blocks and/or a `tests/` directory.
- **Property-based tests** (proptest), per the partial-PBT decision, cover:
  - Raycaster math utilities (angle normalization, distance calculations)
  - Map parsing and validation (serialization round-trips)
  - Collision detection edge cases
  - Vector math operations
- Pure game-logic crates compile to the native host target for fast testing; browser-only code paths (web-sys calls) are isolated behind thin adapters so the testable core stays target-agnostic.

---

## Rendering Strategy

### Pixel-buffer blit (Rust → Canvas)
```
1. Rust owns a 640x400 RGBA framebuffer in wasm linear memory (Vec<u8>, length 640*400*4).
2. Each frame, in Rust:
   a. Clear the framebuffer
   b. Raycaster writes wall columns directly into the framebuffer
   c. Sprite renderer writes sprite pixels (with transparent color key) into the framebuffer
   d. HUD elements drawn into the framebuffer (or onto the main canvas after scaling)
3. Wrap the framebuffer slice as a web-sys `ImageData` (Clamped<&mut [u8]>).
4. putImageData onto a 640x400 offscreen canvas, then drawImage-scale to the main canvas.
5. CSS: main canvas uses image-rendering: pixelated for chunky retro pixels.
```

### Why a pixel buffer (Q2 = A)
- Per-pixel raycasting is fastest when Rust writes contiguous memory directly, with a single `putImageData` per frame, instead of many Canvas 2D FFI calls.
- Matches the original offscreen-canvas design intent: retro 640x400 internal resolution scaled up to the window.

### HUD Rendering Strategy
- HUD can be composited into the framebuffer, or drawn via `CanvasRenderingContext2d` text APIs on the main canvas after the scaled world blit for crisper text.
- Score counter and bars rendered each frame; weapon sprite and face portrait drawn as pre-scaled sprites.

---

## Rust ↔ Browser Boundary (Q3 = A)

Rust drives nearly everything through `web-sys`; the only JavaScript is the Trunk-generated wasm loader.

| Concern | Implementation |
|---------|----------------|
| Game loop | `requestAnimationFrame` driven from Rust via a `Closure<dyn FnMut(f64)>` |
| Input | `keydown`/`keyup`/`mousemove`/`click` listeners registered from Rust via `add_event_listener_with_callback`; Pointer Lock requested via web-sys |
| Rendering | `ImageData` + `putImageData` + `drawImage` via web-sys (see above) |
| Audio | `AudioContext`, `decodeAudioData`, `AudioBufferSourceNode`, `GainNode` via web-sys |
| Asset loading | `fetch` via web-sys / `js-sys` Promises (`wasm-bindgen-futures` for async/await) |

> Add `wasm-bindgen-futures = "0.4"` to dependencies for async asset loading with `.await`. (Declared in the Cargo.toml above.)

---

## Asset Pipeline

### Textures
- **Format**: PNG (128x128 pixels)
- **Loading**: `fetch` the PNG bytes; decode either via an `HtmlImageElement` drawn to an offscreen canvas (then `getImageData` for the pixel array) or via a Rust image-decoding crate.
- **Access**: Pixels stored as `Vec<u8>` (RGBA) per texture for fast per-column sampling during raycasting.
- **Optimization**: Decode once at load into RGBA arrays held in Rust memory.

### Audio
- **Format**: MP3 (broad compatibility) with OGG fallback (Firefox/open-source preference)
- **Loading**: `fetch` as `ArrayBuffer`, decode via `AudioContext.decode_audio_data` (web-sys)
- **Playback**: Create an `AudioBufferSourceNode` per play request (one-shot sounds)
- **Music**: Single `AudioBufferSourceNode` with `loop = true`

### Maps
- **Format**: JSON
- **Loading**: `fetch` text, parse with `serde` + `serde_json`
- **Validation**: Validate required fields (width, height, grid, playerSpawn) on load; serde rejects malformed structure (no `eval`, so no injection risk)

> Map parsing uses `serde` + `serde_json`; async asset loading uses `wasm-bindgen-futures`; error types use `thiserror` — all declared in `[dependencies]` above.

---

## Development Workflow

```
rustup target add wasm32-unknown-unknown   → One-time: install wasm target
cargo install trunk                        → One-time: install Trunk
trunk serve                                → Dev server with hot reload (auto-opens browser)
cargo test                                 → Run unit + property-based tests (native host target)
trunk build --release                      → Optimized production build to dist/
```

---

## Deployment (Prototype)

- **Output**: Static files in `dist/` (index.html + wasm + JS loader + hashed assets)
- **Hosting**: Any static file server (open `dist/index.html` via a local server, or deploy to Netlify/Vercel/S3 if desired)
- **MIME type note**: The host must serve `.wasm` with `application/wasm` for streaming compilation (`WebAssembly.instantiateStreaming`).
- **No server-side requirements**: Fully client-side
- **Bundle size target**: < 250KB wasm (gzipped, release build) before assets; assets < 10MB total
