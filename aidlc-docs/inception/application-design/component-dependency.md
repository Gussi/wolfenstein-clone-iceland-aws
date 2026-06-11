# Component Dependencies — "Pots & Parliament" (Rust)

> **Design note:** In the Rust design, "dependencies" are mostly *data borrows*, not object references. The `App` owns the `World` and the four boundary trait objects. Pure systems are free functions that borrow slices of the `World`; they never store handles to one another. This sidesteps the borrow-checker pain that a direct port of the TypeScript "component holds a reference to MapSystem" pattern would cause.

---

## What each system reads / writes

| System (fn) | Borrows from `World` (read) | Mutates | Boundary used |
|-------------|------------------------------|---------|----------------|
| `App::tick` | — (owns everything) | whole `World`, framebuffer | `Surface`, `InputSource`, `AudioSink` |
| `cast_walls` / `render_sprites` | `player`, `map`, `enemies/pickups/decorations`, `TextureSet` | `Framebuffer`, z-buffer | (presented via `Surface`) |
| `update_player` | `map` | `player` | — |
| `update_enemies` | `player`, `map` | `enemies` | — |
| `resolve_attack` | `player` | `enemies`, `weapon` | — |
| `try_interact` / `collect_pickups` | `player` | `map`, `pickups`, `player.health` | — |
| `animate_map` | — | `map` (doors/push-walls, tile solidity) | — |
| `render_hud` | `player`, `score`, `weapon`, `stats` | `Framebuffer` | — |
| `parse_map` / asset loading | — | constructs `Map` / `TextureSet` | `AssetSource` |

Pure systems depend on **data shapes** (`Player`, `Map`, …) defined in `domain-entities.md`, never on each other.

---

## Ownership / data flow

```
                 #[wasm_bindgen(start)]  (owns the rAF Closure)
                          │ constructs
                          v
                     +---------+      owns       +--------------------+
                     |   App   |---------------- | World (game data)  |
                     +----+----+                 |  player, map,      |
                          | owns (trait objects) |  enemies, pickups, |
        +-----------------+--------+----------+  |  weapon, score,... |
        v                 v        v          v  +---------+----------+
   +---------+      +-----------+ +-------+ +-----------+    | borrowed by
   | Surface |      |InputSource| |Audio  | |AssetSource|    | pure systems
   | (canvas)|      | (events)  | |Sink   | | (fetch)   |    v
   +----+----+      +-----------+ +-------+ +-----------+  movement / ai /
        ^ present(&Framebuffer)                            combat / raycaster /
        |                                                  hud / map animation
   +----+--------------------+
   | Framebuffer (RGBA Vec)  |  ← written by raycaster + sprites + hud
   +-------------------------+
```

Boundaries flow *into* `App` at construction (dependency injection by generic type params `App<S, A, I>`), which makes them trivially swappable for test doubles.

---

## Communication patterns

### The `World` is the shared state
Every system reads/writes the one `World` the `App` owns. No event bus, no `Rc<RefCell<...>>` spaghetti between systems — the orchestrator passes borrows explicitly in a fixed order.

```rust
pub struct World {
    pub status: GameStatus,
    pub player: Player,
    pub map: Map,
    pub enemies: Vec<Enemy>,
    pub pickups: Vec<Pickup>,
    pub decorations: Vec<Decoration>,
    pub weapon: Weapon,
    pub score: Score,
    pub stats: LevelStats,
    pub timers: Timers,
    // next_id: u32 (private)
}
```

### Sequential, single-borrow update order
Input → Player → Enemies → Weapon → Map animation → Combat → Interactions → Conditions → Render → HUD. A fixed order means each step sees a consistent snapshot and no two `&mut` borrows of `World` overlap.

### Outcomes over callbacks
Pure systems return values (`AttackOutcome`, `HitResult`, `Interaction`, healed-HP) instead of invoking audio/score directly. The orchestrator maps outcomes to side effects through the boundary traits — keeping logic testable without a browser.

---

## Coupling assessment

| Relationship | Coupling | Notes |
|--------------|----------|-------|
| `App` → `World` + boundaries | High (by design) | The orchestrator is the single owner/coordinator |
| Pure systems → domain types | Low | Depend on data shapes, not on each other |
| Pure systems → boundary traits | None | Systems never touch the browser; orchestrator does |
| Boundary traits → game logic | None | Implemented with `web-sys`; injected as generics |

The trait-bounded `App<S, A, I>` plus free-function systems give low coupling and high testability: the entire game core compiles and tests on the native host target with mock boundaries.
