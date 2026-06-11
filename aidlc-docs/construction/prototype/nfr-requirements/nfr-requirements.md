# NFR Requirements — "Pots & Parliament" Prototype

---

## Performance Requirements

### Frame Rate Target
- **Target**: Consistent 60fps (16.67ms per frame budget)
- **Minimum acceptable**: 30fps (33.33ms) in worst-case scenarios (many sprites visible)
- **Measurement**: `requestAnimationFrame` timestamp delta monitoring

### Frame Budget Allocation
| System | Budget | Notes |
|--------|--------|-------|
| Input processing | <0.5ms | Trivial, cached flags |
| Player update | <0.5ms | Movement + collision |
| Entity updates (30+ enemies) | <2ms | AI ticks, state machines |
| Combat resolution | <0.5ms | Single hit check |
| Map updates | <0.5ms | Door/pushwall animation |
| Raycasting (640 rays) | <6ms | Main rendering workload |
| Sprite rendering (30+ sprites) | <3ms | Sort + draw |
| HUD rendering | <1ms | 2D canvas overlay |
| **Total budget** | **<14ms** | Leaves 2.67ms headroom |

### Rendering Optimizations
- **Internal resolution**: 640x400, scaled up to display via CSS `image-rendering: pixelated`
- **Canvas scaling**: Use a small offscreen canvas (640x400) and let the browser scale to window size
- **Texture sampling**: Pre-compute texture column lookups where possible
- **Sprite culling**: Only process sprites within a reasonable view distance (e.g., 12 grid units)
- **Visibility check**: Skip sprites fully behind walls (z-buffer per column)
- **No per-pixel alpha**: Sprites use transparent color key, not alpha blending

### Memory Budget
- **Textures**: ~10 wall textures × 128×128 × 4 bytes = ~655KB
- **Sprites**: ~20 sprite frames × 128×128 × 4 bytes = ~1.3MB
- **Map grid**: 32×32 × ~20 bytes per cell = ~20KB
- **Audio buffers**: ~10 sounds × ~100KB = ~1MB
- **Total estimated**: < 5MB (trivial for modern browsers)

---

## Browser Compatibility

### Target Browsers
| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | Latest 2 versions | Primary development target |
| Firefox | Latest 2 versions | Full support |
| Safari | Latest 2 versions | Pointer Lock API support varies |
| Edge | Latest 2 versions | Chromium-based, same as Chrome |

### Required APIs
| API | Usage | Fallback |
|-----|-------|----------|
| WebAssembly (MVP) | Runs the Rust-compiled game module | None (required) |
| Canvas 2D (ImageData/putImageData) | Pixel-buffer blit of the game world | None (required) |
| Pointer Lock | Mouse look | Warn user, game less playable without it |
| Web Audio API | Sound effects + music | Silent mode (game still playable) |
| requestAnimationFrame | Game loop (driven from Rust via web-sys) | None (required) |
| Fetch API | Asset loading (via web-sys / wasm-bindgen-futures) | None (required) |

> All browser APIs are accessed from Rust through `wasm-bindgen` / `web-sys`. WebAssembly MVP is supported by all target browsers (latest 2 versions of Chrome, Firefox, Safari, Edge).

### Pointer Lock Handling
- Request pointer lock on canvas click
- Show "Click to play" overlay when pointer lock is not active
- Handle pointer lock exit gracefully (pause game, show overlay)
- Safari may require user gesture each time — handle re-request

---

## Usability Requirements

### Input
- **Desktop only** — keyboard + mouse
- **Controls**: WASD movement, mouse horizontal look, left-click attack, E/Space interact
- No mobile/touch support in prototype
- No gamepad support in prototype

### Display
- **Aspect ratio**: Game renders at 640x400 (16:10), displayed centered with letterboxing if window doesn't match
- **Fullscreen**: Support fullscreen toggle (F11 or button)
- **Scaling**: `image-rendering: pixelated` / `crisp-edges` for retro pixel look when scaled up

### Loading
- Show loading progress bar during asset loading
- Target: All assets loaded in < 3 seconds on broadband connection
- Total asset size target: < 10MB (textures + audio + maps)

---

## Reliability Requirements

### Error Handling
- **Asset loading failure**: Show error message, offer retry
- **Map parse failure**: Show error with details (invalid JSON format)
- **Audio context failure**: Continue without audio, show mute indicator
- **Frame rate drops**: No compensation beyond standard delta-time; accept visual slowdown

### State Consistency
- Game state updates are deterministic given same inputs
- No async operations during gameplay (all assets pre-loaded)
- Single-threaded execution (no Web Workers for prototype)

---

## Maintainability Requirements

### Code Quality
- Rust 2024 edition, idiomatic safe Rust (`#![forbid(unsafe_code)]` where practical; isolate any required `unsafe` in audited modules)
- `cargo clippy` clean (treat warnings as errors in CI-equivalent local checks)
- `cargo fmt` enforced formatting
- Modular structure (1 component = 1 module/file)
- Public APIs documented with `///` doc comments
- Strong typing via structs/enums; avoid stringly-typed state
- Browser-only code (web-sys calls) isolated behind thin adapters so the core logic stays target-agnostic and testable

### Testing
- Property-based tests (cargo test + proptest) for:
  - Raycaster math utilities (angle normalization, distance calculations)
  - Map JSON parsing and validation (serde round-trips)
  - Collision detection edge cases
  - Vector math operations
- Manual testing for visual correctness and game feel
- No E2E or integration test framework for prototype

### Build
- Single `trunk serve` for development (wasm dev server with hot reload)
- Single `trunk build --release` for production (outputs to `dist/`)
- `cargo test` for the test suite (native host target)
- No CI/CD pipeline for prototype (local build only)

---

## Security Requirements

- **Not enforced** (prototype-grade, per earlier decision)
- No user data collected
- No authentication
- No server-side components
- Assets served statically
- Only concern: Ensure safe map JSON parsing (parse with serde, validate structure; no `eval`/dynamic code, so no injection risk)

---

## Scalability

- **Not applicable** for prototype
- Single player, single browser tab, no network
- Future consideration: If adding leaderboards or multiplayer, reassess entirely
