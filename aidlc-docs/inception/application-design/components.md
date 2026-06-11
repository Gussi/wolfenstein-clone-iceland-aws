# Components — "Pots & Parliament"

## Component Overview

The game is structured as a set of cooperating systems coordinated by a main game loop. Each component has a clear responsibility and communicates through a shared game state object.

---

## Component 1: GameLoop

**Purpose**: Master orchestrator — runs the fixed-timestep game loop, coordinates all systems per frame.

**Responsibilities:**
- Initialize all other components
- Run the update/render cycle at 60fps using requestAnimationFrame
- Maintain delta time and fixed timestep for physics/logic
- Manage game states (loading, playing, paused, game-over, victory)
- Handle window resize events

**Key Interfaces:**
- `start()` — Begin the game loop
- `stop()` — Halt the game loop
- `setState(state)` — Transition between game states

---

## Component 2: Renderer (Raycaster)

**Purpose**: Renders the 3D perspective view using raycasting on a Canvas 2D context.

**Responsibilities:**
- Cast rays from player position to determine wall distances
- Draw textured vertical wall strips with perspective correction
- Render floor and ceiling (solid color or textured)
- Render sprites (enemies, pickups, decorations) with depth sorting
- Handle different wall texture types based on map data
- Scale render resolution for retro pixel effect

**Key Interfaces:**
- `render(state)` — Draw one frame based on current game state
- `resize(width, height)` — Handle viewport resize
- `setRenderScale(scale)` — Adjust internal render resolution

---

## Component 3: MapSystem

**Purpose**: Loads, stores, and provides access to level data.

**Responsibilities:**
- Parse JSON map files into internal grid representation
- Provide tile lookup by grid coordinates (wall type, floor type, entity)
- Track door states (open, closed, opening, closing)
- Track push-wall states and positions
- Provide raycasting-compatible grid access (is solid, get texture ID)

**Key Interfaces:**
- `loadMap(mapData)` — Parse and store map from JSON
- `getTile(x, y)` — Get tile data at grid position
- `isSolid(x, y)` — Check if tile blocks movement/rays
- `getDoors()` — Get all door entities with states
- `getPushWalls()` — Get all push-wall entities with states

---

## Component 4: InputSystem

**Purpose**: Captures and normalizes keyboard and mouse input.

**Responsibilities:**
- Listen for keyboard events (WASD, E/Space for interaction)
- Listen for mouse movement (pointer lock for rotation)
- Normalize input into action flags (moveForward, strafeLeft, interact, attack)
- Handle pointer lock request/release
- Provide frame-by-frame input state

**Key Interfaces:**
- `init(canvas)` — Attach event listeners, request pointer lock
- `getInput()` — Return current frame's input state
- `reset()` — Clear one-shot inputs (interact, attack) after processing

---

## Component 5: Player

**Purpose**: Manages player state, movement, and collision.

**Responsibilities:**
- Store player position (x, y), direction angle, and movement speed
- Process movement input with collision detection against map
- Handle wall sliding on diagonal collisions
- Manage player health (patience meter)
- Track current weapon state
- Handle interaction range checks (doors, push-walls, pickups)

**Key Interfaces:**
- `update(input, deltaTime)` — Move player based on input
- `takeDamage(amount)` — Reduce health, return alive status
- `heal(amount)` — Restore health up to max
- `getPosition()` — Return current x, y, angle
- `canInteract(target)` — Check if target is within interaction range

---

## Component 6: EntitySystem

**Purpose**: Manages all non-player entities (enemies, pickups, decorations).

**Responsibilities:**
- Store and update all entity instances
- Provide entity lookup by position (for rendering, collision)
- Remove entities when destroyed/collected
- Spawn entities from map data on level load
- Track entity visibility (for sprite rendering depth sort)

**Key Interfaces:**
- `spawnFromMap(mapData)` — Create all entities defined in map
- `update(state, deltaTime)` — Update all entities
- `getVisibleEntities(playerPos, playerAngle, fov)` — Get entities in view for rendering
- `removeEntity(id)` — Remove entity from world
- `getEntitiesAt(x, y, radius)` — Spatial query for collision

---

## Component 7: EnemyAI

**Purpose**: Controls enemy behavior — patrol, detection, pursuit, attack.

**Responsibilities:**
- Implement Red Tape enemy behavior state machine (idle → patrol → alert → pursue → attack)
- Line-of-sight detection to player
- Pathfinding toward player (simple grid-based, no complex A*)
- Attack timing and cooldown
- Stun state management (stun threshold, stun animation timer)

**Key Interfaces:**
- `update(enemy, state, deltaTime)` — Tick one enemy's AI
- `canSeePlayer(enemy, playerPos, map)` — Line-of-sight check
- `onHit(enemy, damage)` — Process hit, check if stunned/dispersed

---

## Component 8: CombatSystem

**Purpose**: Handles weapon attacks, hit detection, and damage application.

**Responsibilities:**
- Process attack input (check weapon cooldown, start attack animation)
- Determine hit: check if enemy is within weapon range and in front of player
- Apply stun damage to hit enemies
- Track weapon animation state (idle, swinging, recovering)
- Trigger hit feedback events (screen flash, sound cue)

**Key Interfaces:**
- `attack(player, entities)` — Execute attack, return hit results
- `getWeaponState()` — Return current weapon animation frame
- `isReady()` — Check if weapon can attack (cooldown elapsed)

---

## Component 9: AudioSystem

**Purpose**: Loads and plays sound effects and music.

**Responsibilities:**
- Preload audio assets (Web Audio API)
- Play one-shot sound effects (attack, hit, pickup, door, secret)
- Play looping ambient/music tracks
- Handle audio context initialization (requires user gesture)
- Volume control and muting

**Key Interfaces:**
- `init()` — Create audio context (on first user interaction)
- `loadSounds(manifest)` — Preload all audio files
- `play(soundId)` — Play a one-shot sound effect
- `playMusic(trackId)` — Start looping music
- `stopMusic()` — Stop current music

---

## Component 10: HUDRenderer

**Purpose**: Draws the Wolf3D-style bottom HUD bar and overlays.

**Responsibilities:**
- Render health bar/number
- Render weapon sprite and attack animation
- Render face portrait with expression states
- Render connections score counter
- Render text overlays (intro text, enemy taunts, game over, victory)
- Render level-complete stats screen

**Key Interfaces:**
- `render(state, canvas)` — Draw HUD over the game view
- `showText(text, duration)` — Display temporary text overlay
- `showStats(stats)` — Display end-of-level statistics

---

## Component 11: AssetLoader

**Purpose**: Loads and caches all game assets (textures, sprites, audio, maps).

**Responsibilities:**
- Load image files as ImageBitmap/HTMLImageElement for texture sampling
- Load JSON map files
- Load audio files as AudioBuffer
- Provide loading progress for a loading screen
- Cache loaded assets for reuse

**Key Interfaces:**
- `loadAll(manifest)` — Load all assets, report progress
- `getTexture(id)` — Retrieve loaded texture
- `getSound(id)` — Retrieve loaded audio buffer
- `getMap(id)` — Retrieve loaded map data
- `onProgress(callback)` — Progress reporting
