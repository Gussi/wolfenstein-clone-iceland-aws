/**
 * Shared type definitions for "Pots & Parliament".
 * Sourced from aidlc-docs/construction/prototype/functional-design/domain-entities.md
 */

// ===========================================================================
// Game status
// ===========================================================================
export type GameStatus =
  | "loading"
  | "intro"
  | "playing"
  | "paused"
  | "gameOver"
  | "victory";

// ===========================================================================
// Player
// ===========================================================================
export interface PlayerState {
  // Position
  x: number;
  y: number;
  angle: number; // radians, 0 = East
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;

  // Stats
  health: number;
  maxHealth: number;
  alive: boolean;

  // Scoring
  connections: number;
  secretsFound: number;
  enemiesDispersed: number;
  levelStartTime: number;
}

// ===========================================================================
// Enemy
// ===========================================================================
export type EnemyState =
  | "idle"
  | "alert"
  | "pursue"
  | "attack"
  | "stunned"
  | "dispersed";

export interface EnemyEntity {
  id: string;
  type: "redTape";

  x: number;
  y: number;

  state: EnemyState;
  stateTimer: number;
  lastKnownPlayerX: number;
  lastKnownPlayerY: number;
  attackCooldown: number;

  health: number;
  active: boolean;

  animationFrame: number;
  animationTimer: number;
  hasTaunted: boolean;
  tauntText: string;
  tauntTimer: number;
}

// ===========================================================================
// Pickup
// ===========================================================================
export type PickupType = "coffee" | "kleinur";

export interface PickupEntity {
  id: string;
  type: PickupType;
  x: number;
  y: number;
  healAmount: number;
  active: boolean;
}

// ===========================================================================
// Decoration
// ===========================================================================
export interface DecorationEntity {
  id: string;
  type: string; // sprite type id (desk, plant, coat_of_arms, ...)
  x: number;
  y: number;
  blocking: boolean;
  active: boolean;
}

// ===========================================================================
// Map — JSON file format
// ===========================================================================
export interface MapJSON {
  name: string;
  width: number;
  height: number;
  grid: number[][]; // [y][x] wall type IDs, 0 = empty
  playerSpawn: {
    x: number;
    y: number;
    angle: number;
  };
  enemies: EnemySpawn[];
  pickups: PickupSpawn[];
  doors: DoorDef[];
  pushWalls: PushWallDef[];
  decorations: DecorationDef[];
}

export interface EnemySpawn {
  type: "redTape";
  x: number;
  y: number;
}

export interface PickupSpawn {
  type: PickupType;
  x: number;
  y: number;
}

export interface DoorDef {
  id: string;
  x: number;
  y: number;
  textureId: string;
  orientation: "horizontal" | "vertical";
}

export interface PushWallDef {
  id: string;
  x: number;
  y: number;
  textureId: string;
  hintTextureId: string;
  slideDirection: "north" | "south" | "east" | "west";
}

export interface DecorationDef {
  type: string;
  x: number;
  y: number;
  blocking: boolean;
}

// ===========================================================================
// Map — runtime state
// ===========================================================================
export interface TileState {
  wallType: number; // 0 = empty, 1+ = texture index
  solid: boolean;
  isDoor: boolean;
  isPushWall: boolean;
}

export interface DoorState {
  id: string;
  x: number;
  y: number;
  state: "closed" | "opening" | "open";
  openAmount: number; // 0..1
  textureId: string;
  orientation: "horizontal" | "vertical";
}

export interface PushWallState {
  id: string;
  x: number;
  y: number;
  state: "hidden" | "sliding" | "open";
  offset: number; // 0..PUSHWALL_SLIDE_CELLS
  slideDirection: "north" | "south" | "east" | "west";
  textureId: string;
  hintTextureId: string;
  originX: number;
  originY: number;
}

export interface MapState {
  name: string;
  width: number;
  height: number;
  grid: TileState[][];
  doors: DoorState[];
  pushWalls: PushWallState[];
}

// ===========================================================================
// Weapon
// ===========================================================================
export interface WeaponState {
  type: "woodenSpoon";
  animationPhase: "idle" | "swinging" | "recovering";
  timer: number;
  frameIndex: number;
}

// ===========================================================================
// Score & stats
// ===========================================================================
export interface ScoreState {
  connections: number;
}

export interface LevelStats {
  enemiesDispersed: number;
  totalEnemies: number;
  secretsFound: number;
  totalSecrets: number;
  connections: number;
  timeSeconds: number;
}

// ===========================================================================
// Input
// ===========================================================================
export interface InputState {
  moveForward: boolean;
  moveBackward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnDelta: number; // mouse X movement this frame
  interact: boolean; // one-shot
  attack: boolean; // one-shot
  dismiss: boolean; // one-shot — any key, used to dismiss intro/restart
}

// ===========================================================================
// Rendering
// ===========================================================================
export interface VisibleEntity {
  x: number;
  y: number;
  textureId: string;
  distance: number;
  verticalOffset: number; // 0 = centered; >0 sinks sprite toward floor
}

export type FaceExpression = "normal" | "hurt" | "critical" | "victory";

export interface HUDState {
  health: number;
  maxHealth: number;
  connections: number;
  weaponState: WeaponState;
  faceExpression: FaceExpression;
}

// ===========================================================================
// Asset manifest
// ===========================================================================
export interface AssetManifest {
  textures: Record<string, string>; // id -> path
  sounds: Record<string, string>; // id -> path
  maps: Record<string, string>; // id -> path
}

/** A texture decoded into a flat ABGR pixel array for fast sampling. */
export interface LoadedTexture {
  width: number;
  height: number;
  pixels: Uint32Array; // packed 0xAABBGGRR (little-endian)
}
