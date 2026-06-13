# Integration & In-Browser Test Instructions — "Pots & Parliament"

This is a single-unit, client-side game: there are no services to integrate.
"Integration" here means (a) the cross-system tests that exercise the whole
`World` through several systems, and (b) manual in-browser verification of the
browser-only code (`platform/`, `entry`) that host tests cannot run.

## A. Cross-system tests (automated)

Already part of `cargo test`. These drive multiple systems together via the
owning `World`:

- `world::tests::loads_and_spawns`, `reset_restores_initial_state`
- `systems::ai::tests::enemy_detects_and_pursues` (movement + AI + player damage)
- `systems::combat::tests::*` (player + enemies + weapon)
- `tests/collision.rs` (movement + map over many random inputs)

```bash
cargo test
```

## B. In-browser smoke test (manual)

The browser layer (Canvas presentation, Pointer Lock input, Web Audio, fetch)
is validated by running the game. Host `cargo test` cannot exercise it.

### Setup
```bash
rustup target add wasm32-unknown-unknown   # if not already
cargo install trunk --locked               # if not already
trunk serve
```

### Checklist (maps to user stories)
| Check | Stories | Pass criteria |
|-------|---------|---------------|
| Page loads, intro banner shows | US-20 | Canvas renders, intro overlay visible |
| Click captures mouse | — | Pointer Lock engages |
| WASD moves; mouse turns | US-01, US-02 | Smooth movement, horizontal look |
| Cannot walk through walls | US-04 | Sliding along walls, no clipping |
| Left-click swings spoon; enemies react/disperse | US-05, US-06 | Hit feedback; enemy removed after 3 hits |
| Enemies detect, taunt, pursue, damage | US-07, US-08, US-24 | Pursuit + taunt banner + health drops |
| `E`/`Space` opens doors; push-wall secret | US-03, US-12 | Door opens; push-wall slides, reward reachable |
| Walk over coffee/kleinur heals | US-23 | Health increases, pickup vanishes |
| HUD: health, connections, weapon, face | US-13–16 | Values update live; face changes by health |
| Defeat all enemies → victory; death → game over | US-21, US-22 | Correct end states; any key restarts |
| Audio plays when sound files present | US-17–19 | SFX/music audible (silent if files absent) |

> Note: textures are programmatic placeholders and audio is optional until final
> assets are added (see `assets/README.md`); the checklist still validates
> behaviour, layout, and the browser bindings.

## Cleanup
Stop `trunk serve` with `Ctrl-C`.
