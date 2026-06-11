// Shared type definitions for Pots & Parliament

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export type GameStatus =
  | 'loading'
  | 'intro'
  | 'playing'
  | 'paused'
  | 'gameOver'
  | 'victory';

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
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export interface InputState {
  moveForward: boolean;
  moveBackward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnDelta: number;
  interact: boolean;
  attack: boolean;
  pause: boolean;
}

// ---------------------------------------------------------------------------
// Entities
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
  health: number;
  active: boolean;
  animationFrame: number;
  animationTimer: number;
  hasTaunted: boolean;
  tauntText: string;
  tauntTimer: number;
  attackCooldown: number;
}

export type PickupType = 'coffee' | 'kleinur';

export interface PickupEntity {
  id: string;
  type: 'pickup';
  pickupType: PickupType;
  x: number;
  y: number;
  healAmount: number;
  active: boolean;
}

export interface DecorationEntity {
  id: string;
  type: 'decoration';
  spriteType: string;
  x: number;
  y: number;
  blocking: boolean;
  active: boolean;
}

// A renderable sprite computed each frame for the renderer.
export interface VisibleSprite {
  x: number;
  y: number;
  textureId: string;
  distance: number;
}

// ---------------------------------------------------------------------------
// Map
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

export type Orientation = 'horizontal' | 'vertical';
export type SlideDirection = 'north' | 'south' | 'east' | 'west';

export interface DoorDef {
  id: string;
  x: number;
  y: number;
  textureId: number;
  orientation: Orientation;
}

export interface PushWallDef {
  id: string;
  x: number;
  y: number;
  textureId: number;
  hintTextureId: number;
  slideDirection: SlideDirection;
}

export interface DecorationDef {
  spriteType: string;
  x: number;
  y: number;
  blocking: boolean;
}

export type DoorAnimState = 'closed' | 'opening' | 'open';

export interface DoorState {
  id: string;
  x: number;
  y: number;
  state: DoorAnimState;
  openAmount: number;
  textureId: number;
  orientation: Orientation;
}

export type PushWallAnimState = 'hidden' | 'sliding' | 'open';

export interface PushWallState {
  id: string;
  x: number;
  y: number;
  state: PushWallAnimState;
  offset: number;
  slideDirection: SlideDirection;
  textureId: number;
  hintTextureId: number;
}

// ---------------------------------------------------------------------------
// Combat / weapon
// ---------------------------------------------------------------------------

export type WeaponPhase = 'idle' | 'swinging' | 'recovering';

export interface WeaponState {
  type: 'woodenSpoon';
  phase: WeaponPhase;
  timer: number;
  frameIndex: number;
  hitTestedThisSwing: boolean;
}

export interface AttackResult {
  hit: boolean;
  targetId: string | null;
  dispersed: boolean;
}

export interface HitResult {
  stunned: boolean;
  dispersed: boolean;
  scoreAwarded: number;
}

// ---------------------------------------------------------------------------
// Scoring / stats
// ---------------------------------------------------------------------------

export interface LevelStats {
  enemiesDispersed: number;
  totalEnemies: number;
  secretsFound: number;
  totalSecrets: number;
  connections: number;
  timeSeconds: number;
}

export type FaceExpression = 'normal' | 'hurt' | 'critical' | 'victory';

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export interface AssetManifest {
  textures: Record<string, string>;
  sounds: Record<string, string>;
  maps: Record<string, string>;
}

// A texture stored as raw RGBA pixels for fast per-column sampling.
export interface Texture {
  width: number;
  height: number;
  data: Uint8ClampedArray; // RGBA, length = width * height * 4
}
