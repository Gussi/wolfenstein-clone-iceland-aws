# NFR Requirements — Rust/wasm Migration Questions

You've asked to switch the prototype from **TypeScript** to **Rust compiled to WebAssembly**. The core direction is clear, but a few dependent decisions shape the tech stack and the downstream design artifacts (which currently use TypeScript interfaces). Please answer the questions below by filling in the letter after each `[Answer]:` tag. If none fit, choose **Other** and describe.

---

## Question 1
Which build/toolchain should we use to compile and serve the Rust → wasm app?

A) **Trunk** — Rust-first bundler purpose-built for wasm web apps; handles wasm-bindgen, asset hashing, and a dev server with hot reload (simplest all-Rust workflow)
B) **wasm-pack + Vite** — compile Rust to a wasm package with wasm-pack, keep Vite as the dev server/asset pipeline (familiar JS tooling, more moving parts)
C) **wasm-bindgen CLI + minimal script** — no bundler, hand-rolled build (smallest footprint, most manual)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2
How should the raycaster's rendered output reach the screen? (The current design renders the game world to a 640×400 offscreen buffer, then scales to the canvas.)

A) **Pixel buffer + putImageData** — Rust writes RGBA pixels into wasm linear memory; JS/wasm-bindgen wraps it as an `ImageData` and blits to the canvas (closest match to the existing offscreen-canvas design, fastest for per-pixel raycasting)
B) **Canvas 2D API via web-sys** — Rust calls Canvas 2D drawing methods directly through web-sys (more FFI calls per frame, slower for per-pixel work)
C) **WebGL texture upload** — Rust fills a buffer, uploaded each frame as a GL texture and drawn to a quad (more setup, GPU-accelerated scaling)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3
Where should the boundary between Rust and JavaScript glue sit?

A) **Rust owns nearly everything** — game loop, input, audio, rendering all driven from Rust via web-sys; only a tiny JS bootstrap to load the wasm module
B) **Rust owns game logic + rendering; thin JS shell** — JS handles asset fetching/decoding, Web Audio, and input event wiring, then hands data to Rust (clearer separation, less web-sys surface)
C) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
Which testing approach should replace Vitest + fast-check? (Recall the earlier decision: partial property-based testing for pure functions and serialization.)

A) **cargo test + proptest** — Rust's built-in test runner plus proptest for property-based tests (idiomatic, covers the PBT decision)
B) **cargo test + quickcheck** — built-in runner plus quickcheck for PBT (lighter API, less shrinking control)
C) **cargo test + proptest, plus wasm-bindgen-test** — adds in-browser/headless wasm integration tests on top of native unit/PBT tests
D) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5
Which Rust toolchain and edition should we target?

A) **Stable Rust, edition 2021** — broadest compatibility, well-documented
B) **Stable Rust, edition 2024** — newest language conveniences
C) Other (please describe after [Answer]: tag below)

[Answer]: B
