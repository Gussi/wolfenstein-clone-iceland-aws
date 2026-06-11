# Domain Entities — "Pots & Parliament" Prototype (Rust)

> **Design note:** These types follow idiomatic Rust rather than a 1:1 port of the original TypeScript. String-union types become enums; nullable fields become `Option<T>`; the map grid is stored flat (row-major) for cache locality; serialized map types use `serde` derives; and all mutable game data is owned by a single `World` struct so systems can borrow it rather than holding references to one another.

## Conventions

- Floating-point world coordinates use `f32` (sufficient precision for a grid-based prototype, smaller in wasm).
- Counts/health use unsigned integers with saturating arithmetic.
- Angles are radians (`f32`), `0.0` = East, increasing clockwise toward South.
- Time/durations are seconds (`f32`).
- Entities are addressed by a lightweight `EntityId` newtype; collections are plain `Vec`s.

---

## Shared Math

```rust
/// 2D vector used for positions, directions, and the camera plane.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    pub fn dot(self, rhs: Self) -> f32 {
        self.x * rhs.x + self.y * rhs.y
    }

    pub fn length(self) -> f32 {
        self.dot(self).sqrt()
    }

    /// Returns the unit vector, or `Vec2::default()` if the length is ~0.
    pub fn normalized(self) -> Self {
        let len = self.length();
        if len > f32::EPSILON {
            Self::new(self.x / len, self.y / len)
        } else {
            Self::default()
        }
    }

    pub fn from_angle(radians: f32) -> Self {
        Self::new(radians.cos(), radians.sin())
    }
}

// std::ops::{Add, Sub, Mul<f32>} are implemented for ergonomic vector math.
```

---

## Entity Identity

```rust
/// Stable handle for an enemy/pickup/decoration within the current level.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct EntityId(pub u32);
```

---

## Player Entity

```rust
pub struct Player {
    // Pose
    pub pos: Vec2,      // world position in grid units
    pub angle: f32,     // facing direction (radians)
    pub dir: Vec2,      // facing unit vector (derived from angle)
    pub plane: Vec2,    // camera plane, perpendicular to `dir`

    // Stats
    pub health: u32,    // current patience (0..=MAX_HEALTH)
}

impl Player {
    pub fn is_alive(&self) -> bool {
        self.health > 0
    }
}
```

> `max_health`, `alive`, and the derived direction vectors no longer need to be stored redundantly: max health is a `const`, liveness is computed from `health`, and `dir`/`plane` are recomputed from `angle` whenever the player rotates.

---

## Enemy Entity

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EnemyKind {
    RedTape, // only enemy in the prototype
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum EnemyState {
    Idle,
    Alert,
    Pursue,
    Attack,
    Stunned,
    Dispersing, // playing the "poof" animation, removed when it finishes
}

pub struct Enemy {
    pub id: EntityId,
    pub kind: EnemyKind,
    pub pos: Vec2,

    // AI
    pub state: EnemyState,
    pub state_timer: f32,             // seconds spent in current state
    pub last_seen_player: Option<Vec2>, // None until the player is spotted

    // Combat
    pub stun_remaining: u32,          // hits left before dispersing (starts at ENEMY_HEALTH)

    // Presentation
    pub anim: Animation,
    pub taunt: Option<Taunt>,         // Some while a taunt is being displayed
}
```

> `active: bool` is gone — a dispersed enemy is removed from the `Vec` once its `Dispersing` animation completes, so there is no "inactive but present" state to track. The taunt's `hasTaunted`/`tauntText`/`tauntTimer` trio collapses into a single `Option<Taunt>` plus an `EnemyState::Alert` having already fired (tracked by the AI).

---

## Pickup Entity

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PickupKind {
    Coffee,
    Kleinur,
}

impl PickupKind {
    /// HP restored when collected.
    pub const fn heal_amount(self) -> u32 {
        match self {
            PickupKind::Coffee => 15,
            PickupKind::Kleinur => 30,
        }
    }
}

pub struct Pickup {
    pub id: EntityId,
    pub kind: PickupKind,
    pub pos: Vec2,
}
```

> `healAmount` is derived from `kind` instead of stored, and `active` is dropped (collected pickups are removed from the `Vec`).

---

## Decoration Entity

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DecorationKind {
    Desk,
    Plant,
    CoatOfArms,
}

impl DecorationKind {
    pub const fn blocks_movement(self) -> bool {
        matches!(self, DecorationKind::Desk)
    }
}

pub struct Decoration {
    pub kind: DecorationKind,
    pub pos: Vec2,
}
```

---

## Weapon State

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WeaponPhase {
    Idle,
    Swinging,
    Recovering,
}

pub struct Weapon {
    pub phase: WeaponPhase,
    pub timer: f32,        // seconds elapsed in current phase
}

impl Weapon {
    /// The wooden spoon is the only weapon; readiness is derived from phase.
    pub fn is_ready(&self) -> bool {
        matches!(self.phase, WeaponPhase::Idle)
    }
}
```

---

## Animation Helper

```rust
/// Generic frame ticker shared by enemies and the weapon.
#[derive(Clone, Copy, Debug, Default)]
pub struct Animation {
    pub frame: u32,
    pub elapsed: f32,
}
```

---

## Taunt

```rust
pub struct Taunt {
    pub text: &'static str, // chosen from a static pool (see business-rules.md)
    pub remaining: f32,     // seconds left on screen
}
```

---

## Map: Serialized Format (`serde`)

The on-disk JSON keeps its original camelCase shape; `serde` maps it to snake_case Rust fields.

```rust
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MapFile {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub grid: Vec<Vec<u8>>, // [y][x] wall-type ids; 0 = empty
    pub player_spawn: SpawnPoint,
    #[serde(default)]
    pub enemies: Vec<EnemySpawn>,
    #[serde(default)]
    pub pickups: Vec<PickupSpawn>,
    #[serde(default)]
    pub doors: Vec<DoorDef>,
    #[serde(default)]
    pub push_walls: Vec<PushWallDef>,
    #[serde(default)]
    pub decorations: Vec<DecorationDef>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpawnPoint {
    pub x: u32,
    pub y: u32,
    pub angle: f32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnemySpawn {
    pub kind: EnemyKind, // serde derives on EnemyKind/PickupKind/etc. with rename_all
    pub x: u32,
    pub y: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PickupSpawn {
    pub kind: PickupKind,
    pub x: u32,
    pub y: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DoorDef {
    pub x: u32,
    pub y: u32,
    pub texture: WallTexture,
    pub orientation: Orientation,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PushWallDef {
    pub x: u32,
    pub y: u32,
    pub texture: WallTexture,
    pub hint_texture: WallTexture,
    pub slide_direction: Direction,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DecorationDef {
    pub kind: DecorationKind,
    pub x: u32,
    pub y: u32,
}

#[derive(Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Orientation {
    Horizontal,
    Vertical,
}

#[derive(Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    North,
    South,
    East,
    West,
}
```

> Door/push-wall `id: string` fields are gone. At load time the parsed defs are placed into `Vec`s; their index in the `Vec` (wrapped as `DoorId(usize)` / `PushWallId(usize)`) is the identity, and the corresponding tile stores that index. This removes string lookups from the hot path.

### Map load error type

```rust
#[derive(Debug, thiserror::Error)]
pub enum MapError {
    #[error("malformed map JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("invalid map: {0}")]
    Invalid(String), // e.g. grid dimensions don't match width/height, spawn out of bounds
}

/// Parse + validate. Pure function — unit/property tested on the native target.
pub fn parse_map(json: &str) -> Result<Map, MapError> { /* ... */ }
```

---

## Map: Runtime State

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DoorId(pub usize);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PushWallId(pub usize);

/// What occupies a single grid cell.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TileKind {
    Empty,
    Wall(WallTexture),
    Door(DoorId),
    PushWall(PushWallId),
}

#[derive(Clone, Copy, Debug)]
pub struct Tile {
    pub kind: TileKind,
    pub solid: bool, // mutated when doors open / push-walls move
}

pub struct Map {
    pub width: usize,
    pub height: usize,
    tiles: Vec<Tile>, // row-major: index = y * width + x
    pub doors: Vec<Door>,
    pub push_walls: Vec<PushWall>,
}

impl Map {
    pub fn tile(&self, x: usize, y: usize) -> Tile {
        self.tiles[y * self.width + x]
    }

    /// Bounds-checked solidity query (out-of-bounds counts as solid).
    pub fn is_solid(&self, x: i32, y: i32) -> bool {
        if x < 0 || y < 0 || x as usize >= self.width || y as usize >= self.height {
            return true;
        }
        self.tiles[y as usize * self.width + x as usize].solid
    }
}
```

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DoorState {
    Closed,
    Opening,
    Open,
}

pub struct Door {
    pub pos: (usize, usize),
    pub state: DoorState,
    pub open_amount: f32, // 0.0 closed .. 1.0 open
    pub texture: WallTexture,
    pub orientation: Orientation,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PushWallState {
    Hidden,
    Sliding,
    Open,
}

pub struct PushWall {
    pub pos: (usize, usize),
    pub state: PushWallState,
    pub offset: f32, // 0.0 flush .. 2.0 fully slid back
    pub slide_direction: Direction,
    pub texture: WallTexture,
    pub hint_texture: WallTexture,
}
```

---

## Score & Level Stats

```rust
#[derive(Clone, Copy, Debug, Default)]
pub struct Score {
    pub connections: u32,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct LevelStats {
    pub enemies_dispersed: u32,
    pub total_enemies: u32,
    pub secrets_found: u32,
    pub total_secrets: u32,
    pub time_seconds: f32,
}
```

> The standalone `ScoreState` and the duplicated counters previously living on `PlayerState` are unified here; the player no longer carries score/secret/enemy tallies.

---

## Game Status & Timers

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GameStatus {
    Loading,
    Intro { remaining: f32 },
    Playing,
    Paused,
    GameOver { elapsed: f32 }, // drives the "give up and go home" animation
    Victory,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Timers {
    pub level_elapsed: f32, // total seconds since level start
    pub delta: f32,         // last frame delta (seconds)
}
```

> Modeling `Intro`/`GameOver` timers as data carried *inside* the enum variants is more idiomatic than separate `introTimer`/`gameOverTimer` fields that are only meaningful in certain states.

---

## The World (single source of truth)

```rust
/// Owns all mutable game state for the current level. Systems take `&mut World`
/// (or finer-grained borrows of its fields) rather than referencing each other.
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
    next_id: u32, // allocates EntityIds on spawn
}

impl World {
    pub fn alive_enemy_count(&self) -> usize {
        self.enemies
            .iter()
            .filter(|e| e.state != EnemyState::Dispersing)
            .count()
    }
}
```

---

## Texture Atlas Definitions

### Wall textures

```rust
#[derive(Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum WallTexture {
    DoleriteDark,     // dark hewn Icelandic basalt (exterior/structural)
    PlasterCream,     // smooth cream plastered interior wall
    PlasterWainscot,  // cream plaster with dark wood wainscoting
    CommitteeDoor,    // dark wood paneled door (decorative)
    WindowVolcano,    // tall window with erupting volcano outside
    PortraitWall,     // cream wall with satirical portrait frame
    Bookshelf,        // built-in bookshelf
    DoleriteArch,     // dolerite with neoclassical arch detail
    PlasterSconce,    // cream wall with brass wall sconce
    CarpetBlue,       // blue carpet (Alþingi chamber floor)
}

/// Map the raw grid id (0 = empty) to a wall texture.
impl WallTexture {
    pub fn from_grid_id(id: u8) -> Option<Self> {
        Some(match id {
            1 => WallTexture::DoleriteDark,
            2 => WallTexture::PlasterCream,
            3 => WallTexture::PlasterWainscot,
            4 => WallTexture::CommitteeDoor,
            5 => WallTexture::WindowVolcano,
            6 => WallTexture::PortraitWall,
            7 => WallTexture::Bookshelf,
            8 => WallTexture::DoleriteArch,
            9 => WallTexture::PlasterSconce,
            10 => WallTexture::CarpetBlue,
            _ => return None, // 0 (empty) or unknown
        })
    }
}
```

### Sprite frame counts

| Sprite | Frames | Description |
|--------|--------|-------------|
| `redTape_idle` | 2 | Red Tape idle |
| `redTape_walk` | 4 | Red Tape movement |
| `redTape_attack` | 2 | Red Tape attack |
| `redTape_stunned` | 2 | Red Tape stagger |
| `redTape_dispersed` | 3 | Red Tape "poof" |
| `coffee` | 1 | Coffee pickup |
| `kleinur` | 1 | Kleinur pickup |
| `desk` / `plant` / `coat_of_arms` | 1 | Decorations |

### HUD sprites

| Asset | Frames | Description |
|-------|--------|-------------|
| `face_normal` / `face_hurt` / `face_critical` / `face_victory` | 1 each | Protagonist face by health band |
| `spoon_idle` | 1 | Wooden spoon at rest |
| `spoon_swing` | 3 | Wooden spoon attack |

> At load time, sprite art is decoded into RGBA byte arrays held in Rust (`Vec<u8>` per frame) for fast per-column sampling during raycasting. A `FaceExpression` enum (`Normal`/`Hurt`/`Critical`/`Victory`) selects the HUD face from the current health band.
