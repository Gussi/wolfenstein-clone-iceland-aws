# Services — "Pots & Parliament"

## Service Layer Overview

Since this is a single-page browser game with no backend, the "service layer" is the game loop orchestration and the interaction coordination between components. There are no remote services or APIs.

---

## Service 1: Game Orchestrator (GameLoop)

**Purpose**: The game loop IS the service layer — it coordinates all components each frame.

**Orchestration Pattern**: Sequential pipeline per frame

```
Each Frame:
  1. InputSystem.getInput()
  2. Player.update(input, map, dt)
  3. EntitySystem.update(state, dt)         — runs EnemyAI for each enemy
  4. CombatSystem.update(dt)                — advance weapon animations
  5. MapSystem.update(dt)                   — animate doors/pushwalls
  6. Check interactions (doors, pickups, pushwalls)
  7. Check win/lose conditions
  8. Renderer.render(state)                 — draw 3D view
  9. HUDRenderer.render(hudState, ctx)      — draw HUD overlay
 10. InputSystem.reset()                    — clear one-shot flags
```

---

## Service 2: Interaction Handler

**Purpose**: Coordinates player interactions with world objects (doors, pickups, push-walls).

**Orchestration Flow:**
```
On Player Interact:
  1. Get player position and facing direction
  2. Query MapSystem for interactable in range (door or pushwall ahead)
  3. IF door: MapSystem.openDoor(doorId) → AudioSystem.play('door-open')
  4. IF pushwall: MapSystem.activatePushWall(wallId) → AudioSystem.play('secret') → increment secrets found

On Player Overlap Pickup:
  1. EntitySystem.getEntitiesInRange(playerX, playerY, pickupRadius)
  2. For each pickup in range:
     - Player.heal(pickup.healAmount)
     - EntitySystem.removeEntity(pickup.id)
     - AudioSystem.play('pickup')
```

---

## Service 3: Combat Coordinator

**Purpose**: Bridges CombatSystem decisions with EntitySystem and AudioSystem feedback.

**Orchestration Flow:**
```
On Player Attack:
  1. IF CombatSystem.isReady():
     - result = CombatSystem.attack(player, entities)
     - AudioSystem.play('weapon-swing')
     - IF result.hit:
       - AudioSystem.play('enemy-hit')
       - HUDRenderer flash feedback
       - IF result.dispersed:
         - AudioSystem.play('enemy-dispersed')
         - Increment connections score
         - Check if all enemies dispersed (win condition)
```

---

## Service 4: State Transition Handler

**Purpose**: Manages transitions between game states (loading → intro → playing → gameOver/victory).

**State Transitions:**
```
loading:
  - AssetLoader.loadAll() complete → 'intro'

intro:
  - HUDRenderer.showText("You just need to file one form...")
  - After keypress or timeout → 'playing'

playing:
  - Player health ≤ 0 → 'gameOver'
  - All enemies dispersed → 'victory'
  - ESC key → 'paused'

paused:
  - ESC key → 'playing'

gameOver:
  - HUDRenderer.showText("You give up and go home...")
  - After animation → show restart prompt
  - Any key → restart level (back to 'intro')

victory:
  - HUDRenderer.showStats(levelStats)
  - Show completion screen
```

---

## No External Services

This prototype has no:
- Backend API calls
- User authentication
- Leaderboard services
- Analytics
- Save/load (play session is ephemeral)
