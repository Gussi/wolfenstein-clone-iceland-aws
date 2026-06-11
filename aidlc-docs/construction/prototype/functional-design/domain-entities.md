# Domain Entities — "Pots & Parliament" Prototype

## Core Data Structures

---

## Player Entity

```typescript
interface PlayerState {
  // Position
  x: number;              // World X position (float, grid units)
  y: number;              // World Y position (float, grid units)
  angle: number;          // Facing direction (radians, 0=East, PI/2=South)
  dirX: number;           // Direction vector X (cos(angle))
  dirY: number;           // Direction vector Y (sin(angle))
  planeX: number;         // Camera plane X (perpendicular to dir)
  planeY: number;         // Camera plane Y (perpendicular to dir)

  // Stats
  health: number;         // Current health (0-100)
  maxHealth: number;      // Maximum health (100)
  alive: boolean;         // Whether player is alive

  // Scoring
  connections: number;    // Score counter
  secretsFound: number;   // Secrets discovered this level
  enemiesDispersed: number; // Enemies defeated this level
  levelStartTime: number; // Timestamp for time tracking
}
```

---

## Enemy Entity

```typescript
interface EnemyEntity {
  id: string;             // Unique identifier
  type: 'redTape';        // Enemy type (only Red Tape in prototype)

  // Position
  x: number;             // World X (float)
  y: number;             // World Y (float)

  // State machine
  state: EnemyState;      // Current AI state
  stateTimer: number;     // Time in current state (seconds)
  lastKnownPlayerX: number; // Last position player was seen
  lastKnownPlayerY: number;

  // Combat
  health: number;         // Remaining stun threshold (starts at 3)
  active: boolean;        // Whether enemy is still in world

  // Visual
  animationFrame: number; // Current sprite frame
  hasTaunted: boolean;    // Whether this enemy has shown its taunt
  tauntText: string;      // Assigned taunt from pool
  tauntTimer: number;     // Remaining taunt display time
}

type EnemyState = 'idle' | 'alert' | 'pursue' | 'attack' | 'stunned' | 'dispersed';
```

---

## Pickup Entity

```typescript
interface PickupEntity {
  id: string;             // Unique identifier
  type: 'coffee' | 'kleinur'; // Pickup type
  x: number;             // World X (float, center of grid cell typically)
  y: number;             // World Y (float)
  healAmount: number;     // HP restored (15 for coffee, 30 for kleinur)
  active: boolean;        // Whether pickup is still in world
}
```

---

## Map Data Structures

### Map JSON Format (loaded from file)

```typescript
interface MapJSON {
  name: string;                    // Level name ("Parliament Lobby")
  width: number;                   // Grid width (32)
  height: number;                  // Grid height (32)
  grid: number[][];                // 2D array [y][x] of wall type IDs
                                   // 0 = empty space
                                   // 1+ = wall texture ID
  playerSpawn: {
    x: number;                     // Grid cell X (player placed at center: x + 0.5)
    y: number;                     // Grid cell Y
    angle: number;                 // Starting facing angle (radians)
  };
  enemies: EnemySpawn[];
  pickups: PickupSpawn[];
  doors: DoorDef[];
  pushWalls: PushWallDef[];
  decorations: DecorationDef[];    // Non-interactive sprites (furniture, etc.)
}

interface EnemySpawn {
  type: 'redTape';
  x: number;                       // Grid cell X
  y: number;                       // Grid cell Y
}

interface PickupSpawn {
  type: 'coffee' | 'kleinur';
  x: number;
  y: number;
}

interface DoorDef {
  id: string;
  x: number;                       // Grid cell X
  y: number;                       // Grid cell Y
  textureId: string;               // Door texture
  orientation: 'horizontal' | 'vertical'; // Slide direction
}

interface PushWallDef {
  id: string;
  x: number;
  y: number;
  textureId: string;               // Same as surrounding walls (camouflaged)
  hintTextureId: string;           // Slightly different texture (subtle hint)
  slideDirection: 'north' | 'south' | 'east' | 'west';
}

interface DecorationDef {
  type: string;                    // Sprite type (desk, plant, portrait, etc.)
  x: number;
  y: number;
  blocking: boolean;               // Whether this decoration blocks movement
}
```

### Runtime Map State

```typescript
interface MapState {
  width: number;
  height: number;
  grid: TileState[][];             // Runtime grid with dynamic state

  doors: DoorState[];
  pushWalls: PushWallState[];
}

interface TileState {
  wallType: number;                // 0 = empty, 1+ = wall texture index
  solid: boolean;                  // Blocks movement and rays
  isDoor: boolean;                 // Is this cell a door
  isPushWall: boolean;             // Is this cell a push-wall
}

interface DoorState {
  id: string;
  x: number;
  y: number;
  state: 'closed' | 'opening' | 'open';
  openAmount: number;              // 0 (closed) to 1 (open)
  textureId: string;
  orientation: 'horizontal' | 'vertical';
}

interface PushWallState {
  id: string;
  x: number;
  y: number;
  state: 'hidden' | 'sliding' | 'open';
  offset: number;                  // 0 (flush) to 2 (fully slid back)
  slideDirection: 'north' | 'south' | 'east' | 'west';
  textureId: string;
  hintTextureId: string;
}
```

---

## Weapon State

```typescript
interface WeaponState {
  type: 'woodenSpoon';
  animationPhase: 'idle' | 'swinging' | 'recovering';
  timer: number;                   // Time elapsed in current phase
  frameIndex: number;              // Current animation frame for rendering
}
```

---

## Score and Level Stats

```typescript
interface ScoreState {
  connections: number;             // Running score
}

interface LevelStats {
  enemiesDispersed: number;
  totalEnemies: number;
  secretsFound: number;
  totalSecrets: number;
  connections: number;
  timeSeconds: number;
}
```

---

## Game State Container

```typescript
interface GameWorldState {
  gameStatus: 'loading' | 'intro' | 'playing' | 'paused' | 'gameOver' | 'victory';
  player: PlayerState;
  map: MapState;
  enemies: EnemyEntity[];
  pickups: PickupEntity[];
  decorations: DecorationDef[];
  weapon: WeaponState;
  score: ScoreState;
  levelStats: LevelStats;
  time: {
    elapsed: number;               // Total time since level start (seconds)
    deltaTime: number;             // Last frame delta (seconds)
  };
  introTimer: number;              // Time remaining for intro text display
  gameOverTimer: number;           // Time elapsed in game over animation
}
```

---

## Texture Atlas Definitions

### Wall Texture IDs (in map grid)

| ID | Texture | Description |
|----|---------|-------------|
| 0 | (empty) | No wall — open space |
| 1 | dolerite_dark | Dark hewn Icelandic basalt (exterior/structural walls) |
| 2 | plaster_cream | Smooth cream plastered interior wall |
| 3 | plaster_wainscot | Cream plaster with dark wood wainscoting |
| 4 | committee_door | Dark wood paneled door (non-interactive decoration) |
| 5 | window_volcano | Tall window with erupting volcano visible outside |
| 6 | portrait_wall | Cream wall with portrait frame (satirical) |
| 7 | bookshelf | Built-in bookshelf texture |
| 8 | dolerite_arch | Dolerite with neoclassical arch detail |
| 9 | plaster_sconce | Cream wall with brass wall sconce |
| 10 | carpet_blue | Blue carpet section (Alþingi chamber floor) |

### Sprite Types

| Type | Frames | Description |
|------|--------|-------------|
| redTape_idle | 2 | Red Tape enemy idle animation |
| redTape_walk | 4 | Red Tape enemy movement |
| redTape_attack | 2 | Red Tape enemy attack animation |
| redTape_stunned | 2 | Red Tape stagger animation |
| redTape_dispersed | 3 | Red Tape disappear animation (poof) |
| coffee | 1 | Coffee cup pickup |
| kleinur | 1 | Kleinur pastry pickup |
| desk | 1 | Desk decoration (blocking) |
| plant | 1 | Potted plant decoration |
| coat_of_arms | 1 | Icelandic coat of arms decoration (wall) |

### HUD Sprites

| Asset | Frames | Description |
|-------|--------|-------------|
| face_normal | 1 | Protagonist face (75-100% health) |
| face_hurt | 1 | Protagonist face (40-74% health) |
| face_critical | 1 | Protagonist face (1-39% health) |
| face_victory | 1 | Protagonist face (level won) |
| spoon_idle | 1 | Wooden spoon resting position |
| spoon_swing | 3 | Wooden spoon attack animation |
