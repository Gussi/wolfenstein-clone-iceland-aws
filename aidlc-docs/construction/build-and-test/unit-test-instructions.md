# Unit Test Execution — "Pots & Parliament"

The pure game core is target-agnostic and runs on the native host. Property-based
tests (proptest) cover the NFR-defined scope: pure functions + serialization.

## Run all tests

```bash
cargo test
```

## Expected results (verified)

- **Total: 38 passed, 0 failed.**
  - `pots_and_parliament` (lib unit/integration tests): **28 passed**
  - `tests/math.rs` (proptest): **5 passed**
  - `tests/map_parsing.rs` (proptest): **4 passed**
  - `tests/collision.rs` (proptest): **1 passed**
  - doc-tests: 0
- Test reports: cargo prints per-binary `test result:` lines to stdout.

## Coverage focus

| Area | Where | Kind |
|------|-------|------|
| Vector / angle math | `tests/math.rs`, `src/math.rs` | proptest + unit |
| Map parse & validation (serde) | `tests/map_parsing.rs`, `src/domain/map.rs` | proptest + unit |
| Collision: never enter a wall | `tests/collision.rs` | proptest |
| Movement / sliding | `src/systems/movement.rs` | unit |
| Enemy AI (LOS, stun, disperse, pursue) | `src/systems/ai.rs` | unit |
| Combat (range/arc, closest target, phases) | `src/systems/combat.rs` | unit |
| Interactions (doors, pickups) | `src/systems/interactions.rs` | unit |
| Rendering smoke (no panics) | raycaster / sprites / hud | unit |
| World load / reset | `src/world.rs` | unit |

## Run a subset

```bash
cargo test --lib                       # library unit tests only
cargo test --test collision            # one integration/proptest file
cargo test movement                    # tests matching a name
```

## If tests fail
1. Read the failing `test result` / panic output.
2. For proptest failures, note the printed minimal counterexample (proptest
   shrinks inputs) — it is saved under `proptest-regressions/` for replay.
3. Fix the code, rerun `cargo test` until green.
