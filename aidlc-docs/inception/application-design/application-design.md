# Application Design — Consolidated Overview

## "Pots & Parliament" Prototype Architecture

---

## Technical Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript (strict mode) | Type safety, IDE support, catches errors early |
| Rendering | Canvas 2D API (raycaster) | Classic Wolf3D approach, no WebGL needed |
| Build | Vite | Fast dev server, native TS/ESM support, zero config |
| State | Simple shared state object | Easy to debug, explicit data flow, no magic |
| Libraries | None (pure TypeScript) | Maximum control, no framework overhead |
| Assets | Nested by type (textures/, audio/, maps/) | Clean organization, easy to find files |

---

## Architecture Style

**Sequential Pipeline** — A main game loop calls each system in a fixed order every frame. Systems communicate through a shared state object passed explicitly. No event bus, no dependency injection framework, no ECS.

This is the simplest architecture that works for a single-level prototype with ~11 components.

---

## Component Summary (11 components)

| # | Component | Responsibility |
|---|-----------|---------------|
| 1 | GameLoop | Orchestrates frame cycle, manages game states |
| 2 | Renderer | Raycasts and draws the 3D perspective view |
| 3 | MapSystem | Loads/stores grid data, doors, push-walls |
| 4 | InputSystem | Captures keyboard + mouse, normalizes to actions |
| 5 | Player | Position, movement, collision, health |
| 6 | EntitySystem | Manages enemies, pickups, decorations |
| 7 | EnemyAI | Red Tape behavior: patrol → alert → pursue → attack |
| 8 | CombatSystem | Weapon attacks, hit detection, stun application |
| 9 | AudioSystem | Sound effects and music playback (Web Audio API) |
| 10 | HUDRenderer | Wolf3D-style bottom bar + text overlays |
| 11 | AssetLoader | Loads textures, sounds, maps with progress |

---

## Project File Structure

```
pots-and-parliament/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts                  # Entry point, creates GameLoop
│   ├── game-loop.ts             # GameLoop component
│   ├── renderer.ts              # Raycaster renderer
│   ├── map-system.ts            # Map loading and grid access
│   ├── input-system.ts          # Keyboard + mouse input
│   ├── player.ts                # Player state and movement
│   ├── entity-system.ts         # Entity management
│   ├── enemy-ai.ts              # Enemy behavior logic
│   ├── combat-system.ts         # Weapon and hit detection
│   ├── audio-system.ts          # Sound playback
│   ├── hud-renderer.ts          # HUD drawing
│   ├── asset-loader.ts          # Asset loading and caching
│   └── types.ts                 # Shared type definitions
├── assets/
│   ├── textures/                # Wall, floor, sprite textures (128x128 / 256x256 PNG)
│   │   ├── walls/               # Wall textures (dolerite, plaster, doors, etc.)
│   │   ├── sprites/             # Enemy and pickup sprites
│   │   ├── hud/                 # HUD elements (face, weapon frames)
│   │   └── floors/              # Floor/ceiling textures
│   ├── audio/                   # Sound effects and music (MP3/OGG)
│   │   ├── sfx/                 # Sound effects
│   │   └── music/               # Background music
│   └── maps/                    # Level JSON files
│       └── level1.json          # Prototype level
└── tests/                       # Property-based tests
    ├── math.test.ts             # Raycaster math utilities
    └── map-loader.test.ts       # Map JSON parsing/serialization
```

---

## Frame Pipeline

```
┌─ FRAME START (requestAnimationFrame) ─────────────────────────┐
│                                                                 │
│  1. Calculate deltaTime                                         │
│  2. InputSystem.getInput()                                      │
│  3. Player.update(input, map, dt)          ← movement+collision │
│  4. EntitySystem.update(state, dt)         ← AI ticks           │
│  5. CombatSystem.update(dt)                ← weapon animation   │
│  6. MapSystem.update(dt)                   ← door/pushwall anim │
│  7. Handle interactions (doors, pickups)                        │
│  8. Check win/lose conditions                                   │
│  9. Renderer.render(state)                 ← raycaster draw     │
│ 10. HUDRenderer.render(hudState, ctx)      ← HUD overlay        │
│ 11. InputSystem.reset()                    ← clear one-shots    │
│                                                                 │
└─ FRAME END ────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

1. **No library**: Full control over the raycaster. No framework opinions to fight against.
2. **Canvas 2D**: Raycaster draws textured vertical strips directly. Simple, performant enough for Wolf3D-style rendering.
3. **Shared state over events**: Easier to reason about, debug, and test. Appropriate for single-developer prototype.
4. **Fixed update order**: Eliminates timing issues. Each system sees a consistent state snapshot.
5. **JSON maps**: Data-driven level design. Edit maps without touching code.
6. **Single HTML file entry**: Vite bundles everything. `index.html` has a `<canvas>` element and loads the TS bundle.

---

## Rendering Approach

The raycaster follows the classic DDA (Digital Differential Analyzer) algorithm:
1. For each vertical column of the screen, cast a ray from the player
2. Step through the grid until a wall is hit
3. Calculate perpendicular distance to avoid fisheye
4. Determine wall strip height based on distance
5. Sample the correct column from the wall texture
6. Draw the textured strip to the canvas
7. After walls, render sprites sorted by distance (painter's algorithm)

Floor/ceiling: Either solid color (simpler) or floor-casting (textured, more expensive).

---

## Detailed Design References

- **Components**: See `components.md` for full component descriptions
- **Methods**: See `component-methods.md` for TypeScript interfaces
- **Services**: See `services.md` for orchestration patterns
- **Dependencies**: See `component-dependency.md` for data flow and coupling
