# Deployment — "Pots & Parliament" Prototype

Fully client-side; no server, database, or cloud services.

## Build

```bash
trunk build --release
```

Outputs to `dist/`:
- `index.html` (Trunk-generated loader injected)
- a hashed `.wasm` module
- a hashed JS glue file (wasm-bindgen)
- copied `assets/` directory

The release profile (`Cargo.toml`) optimizes for size: `opt-level = "s"`,
`lto = true`, `codegen-units = 1`, `panic = "abort"`.

## Hosting

Serve the contents of `dist/` from any static host (Netlify, Vercel, S3 +
CloudFront, GitHub Pages, or a local static server).

### Critical: WASM MIME type

The server **must** serve `.wasm` files with `Content-Type: application/wasm`
so the browser can use `WebAssembly.instantiateStreaming`. Most modern static
hosts do this automatically; verify if you see a streaming-compile warning.

### Asset paths

Assets are referenced at runtime as `assets/maps/level1.json`,
`assets/audio/...`, etc. Trunk copies the `assets/` directory into `dist/`, so
relative paths resolve as long as the site is served from the deployment root.
If hosting under a sub-path, set Trunk's `--public-url` accordingly.

## Sizing

- Target wasm size: < 250 KB gzipped (release).
- Asset budget: < 10 MB total (textures + audio + maps).

## Local preview of a release build

```bash
trunk serve --release
# or serve dist/ with any static file server that sets the wasm MIME type
```
