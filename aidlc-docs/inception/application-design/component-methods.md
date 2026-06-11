# Component Methods — "Pots & Parliament"

## Method Signatures by Component

Note: Detailed business rules and algorithms will be defined in Functional Design (CONSTRUCTION phase). This document defines interfaces and contracts.

---

## GameLoop

```typescript
interface GameLoop {
  start(): void;
  stop(): void;
  setState(state: GameState): void;
  getState(): GameState;
}

type GameState = 'loading' | 'intro' | 'playing' | 'paused' | 'gameOver' | 'victory';
```

---

## Renderer (Raycaster)

```typescript
interface Renderer {
  init(canvas: HTMLCanvasElement, textures: TextureAtlas): void;
  render(state: RenderState): void;
  resize(width: number, height: number): void;
  setRenderScale(scale: number): void;
}

interface RenderState {
  player: PlayerState;
  map: MapData;
  entities: VisibleEntity[];
  doors: DoorState[];
}

interface VisibleEntity {
  x: number;
  y: number;
  textureId: string;
  animationFrame: number;
  distance: number;
}
```

---

## MapSystem

```typescript
interface MapSystem {
  loadMap(json: MapJSON): void;
  getTile(gridX: number, gridY: number): Tile;
  isSolid(gridX: number, gridY: number): boolean;
  getDoors(): Door[];
  getPushWalls(): PushWall[];
  getPlayerSpawn(): { x: number; y: number; angle: number };
  getEntitySpawns(): EntitySpawn[];
  openDoor(doorId: string): void;
  activatePushWall(wallId: string): void;
  update(deltaTime: number): void; // animate doors/pushwalls
}

interface Tile {
  type: 'empty' | 'wall' | 'door' | 'pushWall';
  textureId: string;
  solid: boolean;
}

interface MapJSON {
  width: number;
  height: number;
  grid: number[][];         // wall type IDs (0 = empty)
  entities: EntitySpawn[];
  doors: DoorDef[];
  pushWalls: PushWallDef[];
  playerSpawn: { x: number; y: number; angle: number };
}
```

---

## InputSystem

```typescript
interface InputSystem {
  init(canvas: HTMLCanvasElement): void;
  getInput(): InputState;
  reset(): void;
  isPointerLocked(): boolean;
}

interface InputState {
  moveForward: boolean;
  moveBackward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  turnDelta: number;      // mouse X movement this frame
  interact: boolean;      // one-shot: E or Space pressed
  attack: boolean;        // one-shot: left mouse clicked
}
```

---

## Player

```typescript
interface Player {
  update(input: InputState, map: MapSystem, deltaTime: number): void;
  takeDamage(amount: number): boolean;  // returns true if still alive
  heal(amount: number): void;
  getPosition(): PlayerPosition;
  getHealth(): number;
  getMaxHealth(): number;
  isDead(): boolean;
  canInteract(targetX: number, targetY: number): boolean;
}

interface PlayerPosition {
  x: number;
  y: number;
  angle: number;       // radians, 0 = east, PI/2 = north
  dirX: number;        // direction vector X
  dirY: number;        // direction vector Y
}

// Constants (defined in Functional Design):
// MOVE_SPEED, ROTATION_SPEED, INTERACTION_RANGE, MAX_HEALTH
```

---

## EntitySystem

```typescript
interface EntitySystem {
  spawnFromMap(spawns: EntitySpawn[]): void;
  update(state: GameWorldState, deltaTime: number): void;
  getVisibleEntities(playerPos: PlayerPosition, fov: number): VisibleEntity[];
  removeEntity(id: string): void;
  getEntitiesInRange(x: number, y: number, radius: number): Entity[];
  getEnemies(): Enemy[];
  getPickups(): Pickup[];
  getAliveEnemyCount(): number;
}

interface Entity {
  id: string;
  type: 'enemy' | 'pickup' | 'decoration';
  x: number;
  y: number;
  active: boolean;
}

interface Enemy extends Entity {
  type: 'enemy';
  enemyType: 'redTape';
  health: number;         // stun threshold remaining
  state: EnemyState;
  stateTimer: number;
}

interface Pickup extends Entity {
  type: 'pickup';
  pickupType: 'coffee' | 'kleinur';
  healAmount: number;
}

type EnemyState = 'idle' | 'patrol' | 'alert' | 'pursue' | 'attack' | 'stunned' | 'dispersed';
```

---

## EnemyAI

```typescript
interface EnemyAI {
  update(enemy: Enemy, state: GameWorldState, deltaTime: number): void;
  canSeePlayer(enemy: Enemy, playerPos: PlayerPosition, map: MapSystem): boolean;
  onHit(enemy: Enemy, damage: number): HitResult;
}

interface HitResult {
  stunned: boolean;       // enemy entered stun state
  dispersed: boolean;     // enemy fully defeated
  scoreAwarded: number;   // connections points earned
}

interface GameWorldState {
  player: PlayerPosition;
  map: MapSystem;
  deltaTime: number;
}
```

---

## CombatSystem

```typescript
interface CombatSystem {
  attack(player: PlayerPosition, entities: EntitySystem): AttackResult;
  getWeaponState(): WeaponState;
  isReady(): boolean;
  update(deltaTime: number): void;  // advance animation timers
}

interface AttackResult {
  hit: boolean;
  targetId: string | null;
  dispersed: boolean;
}

interface WeaponState {
  animationPhase: 'idle' | 'swinging' | 'recovering';
  frameIndex: number;     // current animation frame (0-N)
}

// Constants (defined in Functional Design):
// WEAPON_RANGE, WEAPON_ARC, WEAPON_DAMAGE, SWING_DURATION, RECOVER_DURATION
```

---

## AudioSystem

```typescript
interface AudioSystem {
  init(): Promise<void>;
  loadSounds(manifest: SoundManifest): Promise<void>;
  play(soundId: string): void;
  playMusic(trackId: string): void;
  stopMusic(): void;
  setVolume(volume: number): void;
  mute(): void;
  unmute(): void;
}

type SoundManifest = Record<string, string>;  // id -> file path
```

---

## HUDRenderer

```typescript
interface HUDRenderer {
  render(state: HUDState, ctx: CanvasRenderingContext2D): void;
  showText(text: string, durationMs: number): void;
  showStats(stats: LevelStats): void;
  showTaunt(text: string): void;
}

interface HUDState {
  health: number;
  maxHealth: number;
  connections: number;
  weaponState: WeaponState;
  faceExpression: 'normal' | 'hurt' | 'critical' | 'victory';
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

## AssetLoader

```typescript
interface AssetLoader {
  loadAll(manifest: AssetManifest): Promise<void>;
  getTexture(id: string): HTMLImageElement;
  getSound(id: string): AudioBuffer;
  getMap(id: string): MapJSON;
  onProgress(callback: (loaded: number, total: number) => void): void;
}

interface AssetManifest {
  textures: Record<string, string>;   // id -> path
  sounds: Record<string, string>;     // id -> path
  maps: Record<string, string>;       // id -> path
}
```
