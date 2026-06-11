# Business Logic Model — "Pots & Parliament" Prototype

> **Design note:** The algorithms below are language-neutral. In the Rust implementation each is a free function in a system module that borrows the data it needs from `World` (data-oriented), rather than a method on a component that holds references to other components. The Rust signatures for each algorithm are collected in the [System Function Signatures](#system-function-signatures-rust) section at the end. Pure math (raycasting, vector ops, collision predicates) lives in functions with no browser dependencies so they can be unit/property tested on the native target.

## Core Algorithms

---

## 1. Raycasting Algorithm (DDA)

### Overview
For each vertical column on the 640-pixel-wide screen, cast a ray from the player's position into the grid to find the nearest wall. Calculate the wall strip height based on perpendicular distance.

### Algorithm: Digital Differential Analyzer (DDA)

```
FOR each column x (0 to screenWidth-1):
  1. Calculate ray direction from player angle + column offset
     - cameraX = 2 * x / screenWidth - 1   (range: -1 to +1)
     - rayDirX = dirX + planeX * cameraX
     - rayDirY = dirY + planeY * cameraX

  2. Determine which grid cell we're in
     - mapX = floor(playerX)
     - mapY = floor(playerY)

  3. Calculate delta distances (distance ray travels to cross one grid line)
     - deltaDX = abs(1 / rayDirX)
     - deltaDY = abs(1 / rayDirY)

  4. Calculate step direction and initial side distances
     - IF rayDirX < 0: stepX = -1, sideDistX = (playerX - mapX) * deltaDX
     - ELSE: stepX = +1, sideDistX = (mapX + 1 - playerX) * deltaDX
     - Same for Y axis

  5. DDA loop: step through grid until wall hit
     WHILE not hit:
       IF sideDistX < sideDistY:
         sideDistX += deltaDX
         mapX += stepX
         side = 'vertical'   (hit a N/S facing wall)
       ELSE:
         sideDistY += deltaDY
         mapY += stepY
         side = 'horizontal' (hit an E/W facing wall)
       IF map[mapX][mapY] is solid:
         hit = true

  6. Calculate perpendicular distance (avoids fisheye)
     - IF side == 'vertical': perpDist = sideDistX - deltaDX
     - ELSE: perpDist = sideDistY - deltaDY

  7. Calculate wall strip height
     - lineHeight = screenHeight / perpDist

  8. Calculate texture X coordinate (where on the wall was hit)
     - IF side == 'vertical': wallX = playerY + perpDist * rayDirY
     - ELSE: wallX = playerX + perpDist * rayDirX
     - wallX = wallX - floor(wallX)  (fractional part = texture U coord)

  9. Draw textured vertical strip
     - Sample texture column at wallX * textureWidth
     - Draw strip from (screenHeight/2 - lineHeight/2) to (screenHeight/2 + lineHeight/2)
     - Apply distance-based shading on horizontal walls (darker = side hit)

  10. Store perpDist in z-buffer array for sprite depth sorting
```

### Camera Plane
- FOV is 66 degrees
- Plane vector perpendicular to direction: planeX = -dirY * tan(FOV/2), planeY = dirX * tan(FOV/2)
- For 66° FOV: plane magnitude ≈ 0.66

---

## 2. Sprite Rendering

### Algorithm
```
AFTER all walls are drawn:

1. Calculate distance from player to each visible entity
   - dist = sqrt((entityX - playerX)² + (entityY - playerY)²)

2. Sort entities by distance (far to near — painter's algorithm)

3. FOR each entity (far to near):
   a. Transform entity position relative to player camera
      - spriteX = entityX - playerX
      - spriteY = entityY - playerY
      - invDet = 1 / (planeX * dirY - dirX * planeY)
      - transformX = invDet * (dirY * spriteX - dirX * spriteY)
      - transformY = invDet * (-planeY * spriteX + planeX * spriteY)

   b. Skip if behind player (transformY <= 0)

   c. Calculate screen position and size
      - spriteScreenX = (screenWidth / 2) * (1 + transformX / transformY)
      - spriteHeight = abs(screenHeight / transformY)
      - spriteWidth = spriteHeight (square sprites)

   d. Draw sprite columns, checking z-buffer per column
      - Only draw column if transformY < zBuffer[column]
      - Sample texture from sprite sheet based on animation frame
```

---

## 3. Player Movement and Collision

### Movement Algorithm
```
ON each frame:
  1. Calculate desired movement vector from input
     - moveX = 0, moveY = 0
     - IF forward: moveX += dirX * MOVE_SPEED * dt, moveY += dirY * MOVE_SPEED * dt
     - IF backward: moveX -= dirX * MOVE_SPEED * dt, moveY -= dirY * MOVE_SPEED * dt
     - IF strafe left: moveX += dirY * MOVE_SPEED * dt, moveY -= dirX * MOVE_SPEED * dt
     - IF strafe right: moveX -= dirY * MOVE_SPEED * dt, moveY += dirX * MOVE_SPEED * dt

  2. Rotation from mouse
     - angle += turnDelta * ROTATION_SPEED
     - dirX = cos(angle), dirY = sin(angle)
     - Update plane vector accordingly

  3. Collision detection (sliding)
     - COLLISION_MARGIN = 0.2 (player radius from wall)
     - Try X movement: IF !isSolid(playerX + moveX + margin, playerY): playerX += moveX
     - Try Y movement: IF !isSolid(playerX, playerY + moveY + margin): playerY += moveY
     - (Axes tested independently → wall sliding behavior)
```

### Collision Margin
Player has a circular collision radius of 0.2 grid units. Check the grid cell at player position ± margin in each axis. This prevents clipping corners and allows smooth sliding along walls.

---

## 4. Enemy AI State Machine

### States and Transitions

```
                    ┌──────────┐
                    │   IDLE   │
                    └────┬─────┘
                         │ detect player (LOS + range)
                         v
                    ┌──────────┐
             ┌──────│  ALERT   │ (brief pause, play alert sound)
             │      └────┬─────┘
             │           │ after 0.5s
             │           v
             │      ┌──────────┐
             │      │  PURSUE  │ ← main movement state
             │      └────┬─────┘
             │           │ within attack range (0.8 units)
             │           v
             │      ┌──────────┐
             │      │  ATTACK  │ (deal damage, cooldown)
             │      └────┬─────┘
             │           │ after cooldown
             │           └──→ back to PURSUE
             │
    hit ─────┼───────────────────────────┐
             │                           v
             │                    ┌──────────┐
             │                    │ STUNNED  │ (brief stagger, 0.3s)
             │                    └────┬─────┘
             │                         │ if health > 0: back to PURSUE
             │                         │ if health <= 0:
             │                         v
             │                    ┌──────────┐
             │                    │DISPERSED │ (death animation, 0.5s, then remove)
             │                    └──────────┘
             │
    lose LOS ┼──→ continue toward last known position
             │    IF reach last known pos and no LOS: back to IDLE
```

### Pursuit Movement
```
ON PURSUE tick:
  1. Calculate direction to player: dx = playerX - enemyX, dy = playerY - enemyY
  2. Normalize: len = sqrt(dx² + dy²), dx /= len, dy /= len
  3. Move: enemyX += dx * ENEMY_SPEED * dt, enemyY += dy * ENEMY_SPEED * dt
  4. Collision with walls: same sliding logic as player
  5. No enemy-enemy collision (they can overlap — swarm feel)
```

### Line of Sight Check
```
canSeePlayer(enemy, player, map):
  Cast a ray from enemy to player using DDA
  IF any solid tile between them: return false
  IF distance > DETECTION_RANGE: return false
  return true
```

---

## 5. Combat Hit Detection

### Melee Weapon (Wooden Spoon)
```
ON attack:
  1. Check if weapon is ready (cooldown elapsed)
  2. Start swing animation
  3. At swing midpoint, perform hit check:
     - FOR each enemy in range:
       - distance = dist(player, enemy)
       - IF distance > WEAPON_RANGE: skip
       - angle to enemy = atan2(enemyY - playerY, enemyX - playerX) - playerAngle
       - Normalize angle to [-PI, PI]
       - IF abs(angle) > WEAPON_ARC / 2: skip
       - HIT! Apply damage to enemy
       - Only hit the CLOSEST valid enemy (single target melee)
  4. Return hit result
```

---

## 6. Door Animation

### Door States
```
CLOSED → OPENING → OPEN → (stays open)

ON interact with door:
  IF door.state == CLOSED:
    door.state = OPENING
    door.timer = 0

ON update:
  IF door.state == OPENING:
    door.timer += dt
    door.openAmount = door.timer / DOOR_OPEN_DURATION  (0 → 1)
    IF door.openAmount >= 1:
      door.state = OPEN
      door.openAmount = 1
      Mark grid cell as non-solid
```

Doors slide sideways (like Wolf3D) — the texture slides to one side during opening.

---

## 7. Push-Wall Animation

### Push-Wall Mechanic
```
ON interact with pushwall:
  IF pushwall.state == HIDDEN:
    pushwall.state = SLIDING
    pushwall.timer = 0
    pushwall.slideDirection = direction player is facing (snapped to N/S/E/W)

ON update:
  IF pushwall.state == SLIDING:
    pushwall.timer += dt
    pushwall.offset = pushwall.timer / PUSHWALL_SLIDE_DURATION * 2  (slides 2 cells back)
    IF pushwall.offset >= 2:
      pushwall.state = OPEN
      Update grid: original cell = empty, destination cell = wall
```

Push-wall slides 2 grid cells backward from the player's interaction direction, revealing the secret room behind it.

---

## 8. Game Flow Logic

### Win Condition
```
ON each frame during 'playing' state:
  IF world.alive_enemy_count() == 0:
    status = Victory
    Finalize level stats (apply SCORE_LEVEL_COMPLETE bonus)
    Show victory screen with stats
```

### Lose Condition
```
ON applying damage to the player (saturating_sub):
  IF player.health == 0:
    status = GameOver { elapsed: 0.0 }
    Drive the "give up and go home" animation (1.5s) via the variant's `elapsed`
    After animation: show restart prompt
```

### Level Restart
```
ON restart:
  Re-parse / re-instantiate the level into a fresh World:
    - player reset to spawn pose and MAX_HEALTH
    - enemies, pickups, decorations respawned from map defs
    - doors and push-walls reset to initial state
    - score, stats, and timers zeroed
  status = Intro { remaining: INTRO_DURATION }
```

> Restart rebuilds a fresh `World` from the parsed `MapFile` rather than mutating individual systems back to defaults — fewer places to forget to reset.

---

## System Function Signatures (Rust)

Each algorithm above maps to a function in a system module. Functions take the narrowest borrow that does the job, which keeps the borrow checker satisfied and makes the data dependencies explicit.

```rust
// raycaster.rs — pure: writes wall strips into the framebuffer, fills the z-buffer
pub fn cast_walls(player: &Player, map: &Map, textures: &TextureSet,
                  fb: &mut Framebuffer, zbuffer: &mut [f32]);

// sprites.rs — pure: draws entities back-to-front, respecting the z-buffer
pub fn render_sprites(world: &World, textures: &TextureSet,
                      fb: &mut Framebuffer, zbuffer: &[f32]);

// movement.rs — pure: input + collision; axis-independent sliding
pub fn update_player(player: &mut Player, map: &Map, input: &InputState, dt: f32);

// collision.rs — pure predicate, heavily property-tested
pub fn blocked(map: &Map, pos: Vec2, radius: f32) -> bool;

// ai.rs — borrows the whole world (enemies read player + map, write themselves)
pub fn update_enemies(world: &mut World, dt: f32);
pub fn can_see_player(from: Vec2, player: Vec2, map: &Map) -> bool; // pure LOS via DDA

// combat.rs — returns an outcome the orchestrator turns into sound/score effects
pub fn resolve_attack(world: &mut World) -> AttackOutcome;

pub struct AttackOutcome {
    pub hit: Option<EntityId>, // closest enemy struck, if any
    pub dispersed: bool,       // that hit dispersed the enemy
}

// map.rs — advances door/push-wall animations and flips tile solidity
pub fn animate_map(map: &mut Map, dt: f32);

// interactions.rs — doors/push-walls/pickups in front of / overlapping the player
pub fn try_interact(world: &mut World) -> Option<Interaction>;
pub fn collect_pickups(world: &mut World) -> u32; // returns HP healed

pub enum Interaction {
    OpenedDoor(DoorId),
    TriggeredPushWall(PushWallId),
}
```

> `AttackOutcome`/`Interaction` enums let the pure logic report *what happened* without reaching into audio or the HUD; the orchestrator (game loop) maps those outcomes to side effects. This keeps combat/interaction logic testable without a browser.
