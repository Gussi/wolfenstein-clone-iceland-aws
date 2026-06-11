/**
 * Domain entity types for "Pots & Parliament".
 * Mirrors the functional design (domain-entities.md).
 */

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
export interface PlayerState {
  x: number;
  y: number;
  angle: number;
  dirX: number;
  dirY: number;
  planeX: number;
  planeY: number;

  health: number;
  maxHealth: number;
  alive: boolean;

  connections: number;
  secretsFound: number;
  enemiesDispersed: number;
  levelStartTime: number;
}

// ---------------------------------------------------------------------------
// Enemy
// ---------------------------------------------------------------------------
export type EnemyState =
  | 'idle'
  | 'alert'
  | 'pursue'
  | 'attack'
  | 'stunned'
  | 'dispersed';

export interface EnemyEntity {
  id: string;
  type: 'redTape';

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

// ---------------------------------------------------------------------------
// Pickup
// ---------------------------------------------------------------------------
export type PickupType = 'coffee' | 'kleinur';

export interface PickupEntity {
  id: string;
  type: PickupType;
  x: number;
  y: number;
  healAmount: number;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Map JSON (authoring format)
// ---------------------------------------------------------------------------
export interface MapJSON {
  name: string;
  width: number;
  height: number;
  grid: number[][];
  playerSpawn: { x: number; y: number; angle: number };
  enemies: EnemySpawn[];
  pickups: PickupSpawn[];
  doors: DoorDef[];
  pushWalls: PushWallDef[];
  decorations: DecorationDef[];
}

export interface EnemySpawn {
  type: 'redTape';
  x: number;
  y: number;
}

export interface PickupSpawn {
  type: PickupType;
  x: number;
  y: number;
}

export type DoorOrientation = 'horizontal' | 'vertical';

export interface DoorDef {
  id: string;
  x: number;
  y: number;
  textureId: number;
  orientation: DoorOrientation;
}

export type SlideDirection = 'north' | 'south' | 'east' | 'west';

export interface PushWallDef {
  id: string;
  x: number;
  y: number;
  textureId: number;
  hintTextureId: number;
  slideDirection: SlideDirection;
}

export interface DecorationDef {
  type: string;
  x: number;
  y: number;
  blocking: boolean;
}

// ---------------------------------------------------------------------------
// Runtime map state
// ---------------------------------------------------------------------------
export interface TileState {
  wallType: number;
  solid: boolean;
  isDoor: boolean;
  isPushWall: boolean;
}

export type DoorRuntimeState = 'closed' | 'opening' | 'open';

export interface DoorState {
  id: string;
  x: number;
  y: number;
  state: DoorRuntimeState;
  openAmount: number;
  textureId: number;
  orientation: DoorOrientation;
}

export type PushWallRuntimeState = 'hidden' | 'sliding' | 'open';

export interface PushWallState {
  id: string;
  x: number;
  y: number;
  state: PushWallRuntimeState;
  offset: number;
  slideDirection: SlideDirection;
  textureId: number;
  hintTextureId: number;
  /** Whether this push-wall has already been credited as a found secret. */
  counted: boolean;
}

export interface MapState {
  name: string;
  width: number;
  height: number;
  grid: TileState[][];
  doors: DoorState[];
  pushWalls: PushWallState[];
}

// ---------------------------------------------------------------------------
// Weapon
// ---------------------------------------------------------------------------
export type WeaponPhase = 'idle' | 'swinging' | 'recovering';

export interface WeaponState {
  type: 'woodenSpoon';
  animationPhase: WeaponPhase;
  timer: number;
  frameIndex: number;
  /** Set true on the frame the hit check fires, consumed by combat. */
  hitPending: boolean;
}

// ---------------------------------------------------------------------------
// Score & level stats
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Game world container
// ---------------------------------------------------------------------------
export type GameStatus =
  | 'loading'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'gameOver'
  | 'victory';

export interface GameWorldState {
  gameStatus: GameStatus;
  player: PlayerState;
  map: MapState;
  enemies: EnemyEntity[];
  pickups: PickupEntity[];
  decorations: DecorationDef[];
  weapon: WeaponState;
  score: ScoreState;
  levelStats: LevelStats;
  time: { elapsed: number; deltaTime: number };
  introTimer: number;
  gameOverTimer: number;
}

/** A renderable billboard sprite, produced each frame for the sprite renderer. */
export interface Renderable {
  x: number;
  y: number;
  textureKey: string;
  /** Vertical screen offset in sprite-height fractions (for floating/decor). */
  vMove: number;
}
