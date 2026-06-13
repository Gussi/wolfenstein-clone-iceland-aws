# Build Instructions — "Pots & Parliament"

## Prerequisites
- **Toolchain**: Rust stable (edition 2024). Verified with cargo/rustc 1.96.0.
- **wasm target**: `wasm32-unknown-unknown`
- **Bundler**: [Trunk](https://trunkrs.dev) (`trunk`) — produces the browser bundle and runs wasm-bindgen
- **System**: any OS with Rust; this project was built/tested on Debian (WSL2)
- **No environment variables** required; no network services.

## One-time setup

```bash
rustup target add wasm32-unknown-unknown
cargo install trunk --locked
```

> Trunk automatically downloads the matching `wasm-bindgen` CLI and `wasm-opt`
> on first build, so they do not need separate installation.

## Build steps

### 1. Native build (game logic core)
```bash
cargo build
```
- Compiles only the target-agnostic core (browser code is gated behind
  `cfg(target_arch = "wasm32")`).

### 2. WebAssembly build (raw module)
```bash
cargo build --release --target wasm32-unknown-unknown
```
- **Expected**: `Finished \`release\` profile ... target(s)`.
- Artifact: `target/wasm32-unknown-unknown/release/pots_and_parliament.wasm`.
- This validates that all browser bindings (`web-sys`, `wasm-bindgen`) compile.

### 3. Browser bundle (Trunk)
```bash
trunk build --release      # production bundle → dist/
# or
trunk serve                # dev server with hot reload (auto-opens browser)
```
- **Expected output (`dist/`)**: `index.html`, hashed `*.wasm`, wasm-bindgen JS
  glue, and the copied `assets/` directory.

### 4. Verify build success
- `cargo build --release --target wasm32-unknown-unknown` ends with `Finished`.
- `trunk build --release` populates `dist/` with no errors.
- Acceptable warnings: none currently (clippy is clean).

## Quality gates

```bash
cargo fmt --check          # formatting
cargo clippy               # lints (expected: clean)
```

## Troubleshooting

### `error: target 'wasm32-unknown-unknown' not found`
- **Cause**: wasm target not installed.
- **Fix**: `rustup target add wasm32-unknown-unknown`.

### `trunk: command not found`
- **Cause**: Trunk not installed (as in some CI/sandbox environments).
- **Fix**: `cargo install trunk --locked`. The raw wasm build
  (`cargo build --target wasm32-unknown-unknown`) does not require Trunk and can
  be used to verify compilation when the bundler is unavailable.

### Browser shows a blank canvas / "magic word" or MIME error
- **Cause**: `.wasm` not served as `application/wasm`.
- **Fix**: use `trunk serve`, or a static host that sets the correct MIME type
  (see `aidlc-docs/construction/prototype/code/deployment.md`).
