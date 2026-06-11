# Component Dependencies — "Pots & Parliament"

## Dependency Matrix

| Component | Depends On | Depended On By |
|-----------|-----------|----------------|
| GameLoop | All components | — (top-level orchestrator) |
| Renderer | MapSystem, EntitySystem, Player | GameLoop |
| MapSystem | AssetLoader (for map data) | Renderer, Player, EnemyAI, CombatSystem |
| InputSystem | — (browser events only) | GameLoop, Player |
| Player | MapSystem (collision), InputSystem | Renderer, CombatSystem, EntitySystem, HUDRenderer |
| EntitySystem | MapSystem (spawns) | Renderer, CombatSystem, EnemyAI |
| EnemyAI | MapSystem (LOS, pathfinding), Player (position) | EntitySystem |
| CombatSystem | Player (position), EntitySystem (targets) | GameLoop |
| AudioSystem | AssetLoader (sound buffers) | GameLoop (via service coordination) |
| HUDRenderer | Player (health), CombatSystem (weapon state) | GameLoop |
| AssetLoader | — (fetch API only) | MapSystem, AudioSystem, Renderer |

---

## Data Flow Diagram

```
+------------------+
|   AssetLoader    |  ← Loads textures, sounds, maps from /assets/
+--------+---------+
         |
         | provides loaded assets to:
         v
+--------+---------+     +----------+     +-----------+
|    MapSystem     |     |  Audio   |     | Renderer  |
| (map data/grid)  |     |  System  |     | (textures)|
+--------+---------+     +----------+     +-----------+
         |                     ^                 ^
         | grid data           | play()          | render state
         v                     |                 |
+--------+---------+     +-----+------+          |
|     Player       |     |  GameLoop  |----------+
| (position,health)|     | (orchestr) |
+--------+---------+     +-----+------+
         |                     |
         | player pos          | coordinates
         v                     v
+--------+---------+     +-----+------+
|   EntitySystem   |     | HUDRenderer|
| (enemies,pickups)|     | (UI layer) |
+--------+---------+     +------------+
         |
         | enemy data
         v
+--------+---------+     +------------+
|     EnemyAI      |     |   Combat   |
| (behavior logic) |     |   System   |
+------------------+     +------------+
```

---

## Communication Patterns

### Pattern: Shared State Object
All components read from and write to a simple shared state. No event bus or pub/sub — the GameLoop passes state explicitly to each system in order.

```typescript
interface SharedGameState {
  player: PlayerState;
  map: MapSystem;
  entities: EntitySystem;
  combat: CombatSystem;
  score: ScoreState;
  time: TimeState;
}
```

### Pattern: Sequential Update
Components update in a fixed order each frame. This eliminates race conditions and makes debugging straightforward:

1. **Input** (read hardware state)
2. **Player** (move based on input)
3. **Entities** (AI decisions based on player position)
4. **Combat** (resolve attacks)
5. **Map** (animate doors/pushwalls)
6. **Interactions** (pickups, door opens)
7. **Conditions** (win/lose checks)
8. **Render** (draw everything)
9. **HUD** (draw overlay)

### Pattern: One-Shot Events
For things that happen once per frame (player attacked, enemy dispersed, pickup collected), input flags and results are returned from methods rather than using callbacks or events.

```
attack pressed → CombatSystem.attack() → returns AttackResult
                                        → GameLoop reads result, plays sound, updates score
```

---

## Coupling Assessment

| Relationship | Coupling Level | Notes |
|-------------|----------------|-------|
| GameLoop → All | High (orchestrator) | Expected — this is the coordinator |
| Renderer → MapSystem | Medium | Needs grid data for raycasting |
| Renderer → EntitySystem | Medium | Needs entity positions for sprites |
| Player → MapSystem | Medium | Collision detection requires grid access |
| EnemyAI → MapSystem | Medium | LOS and pathfinding need grid |
| EnemyAI → Player | Low | Only reads player position |
| CombatSystem → EntitySystem | Medium | Hit detection queries entities |
| AudioSystem → others | None | Receives play() calls, no dependencies |
| HUDRenderer → others | Low | Only reads state values to display |

**Overall**: Coupling is manageable for a prototype. The shared state pattern keeps things simple and explicit.
