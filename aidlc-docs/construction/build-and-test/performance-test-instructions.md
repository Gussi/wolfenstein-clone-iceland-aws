# Performance Test Instructions — "Pots & Parliament"

Performance is a client-side, single-frame-budget concern (no load/throughput
dimension). The target from `nfr-requirements.md` is **60fps** (16.67ms/frame),
with 30fps as the worst-case floor when many sprites are visible.

## Method (manual, in-browser)

1. `trunk serve --release` (release build — representative of shipped perf).
2. Open the browser devtools **Performance / FPS meter**.
3. Play the prototype level (30 enemies, sprites, raycasting at 640×400).

## What to measure

| Metric | Target | How |
|--------|--------|-----|
| Frame rate | ~60fps; ≥30fps worst case | Devtools FPS meter while fighting a crowd |
| Frame time | < 16.67ms typical | Performance timeline, scripting time per frame |
| Wasm size | < 250 KB gzipped (release) | `ls -l dist/*.wasm` then gzip; or devtools Network |

## Frame budget reference (design)

Raycasting (640 rays) is the dominant cost (~6ms budget); sprite rendering
(~3ms) and entity/AI updates (~2ms) follow. See `nfr-requirements.md` for the
full per-system budget table.

## If targets are missed

1. Profile in devtools to find the hot system (likely raycaster or sprites).
2. Candidate optimizations: reduce internal resolution, precompute texture
   column lookups, tighten sprite view-distance culling, switch release
   `opt-level` from `"s"` to `3` if CPU-bound.
3. Re-measure.

> Automated micro-benchmarks (e.g. `criterion` on `cast_walls`) are a possible
> future addition but are out of scope for the prototype.
