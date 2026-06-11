# Component Methods — "Pots & Parliament" (Rust)

> **Design note:** This is an idiomatic Rust restructuring, not a 1:1 port of the original TypeScript interfaces. Two principles drive it:
>
> 1. **Pure logic = plain data + free functions.** Game systems (movement, AI, combat, raycasting, map animation) are functions that borrow from the owning `World`. They have no browser dependencies, so they unit/property test on the native target.
> 2. **Side-effecting boundaries = traits.** Only the things that actually touch the browser — presenting pixels, playing audio, reading input, loading assets — are abstracted behind traits, so they can be mocked in tests and implemented with `web-sys` in the browser.
>
> Full domain types are defined in `functional-design/domain-entities.md`; this document defines the call surface.

---

## App (orchestrator — replaces `GameLoop`)

The `App` owns the `World` plus the platform handles, and advances one frame per `requestAnimationFrame` callback. In wasm the rAF loop is a retained `Closure`; `App::tick` is the pure-ish step it calls.

```rust
pub struct App<S: Surface, A: AudioSink, I: InputSource> {
    world: World,
    surface: S,
    audio: A,
    input: I,
    framebuffer: Framebuffer,
    zbuffer: Vec<f32>,
    textures: TextureSet,
}

impl<S: Surface, A: AudioSink, I: InputSource> App<S, A, I> {
    pub fn new(world: World, surface: S, audio: A, input: I, textures: TextureSet) -> Self;

    /// Advance and render one frame. `now_ms` is the rAF timestamp.
    pub fn tick(&mut self, now_ms: f64);

    pub fn set_status(&mut self, status: GameStatus);
    pub fn status(&self) -> GameStatus;
}
```

> `start`/`stop` are not methods on the orchestrator: the rAF closure lifecycle is owned by the wasm entry point (`#[wasm_bindgen(start)]`), which stores the `Closure` to keep it alive and drops it to stop.

---

## Surface trait (presentation boundary — replaces `Renderer`'s canvas coupling)

Rendering is split: a **pure** raycaster writes RGBA into a `Framebuffer`; a `Surface` impl presents that buffer. The browser impl wraps it as `ImageData` and `putImageData`s onto the canvas, then scales.

```rust
pub struct Framebuffer {
    pub width: usize,
    pub height: usize,
    pub pixels: Vec<u8>, // RGBA, length = width * height * 4
}

pub trait Surface {
    /// Blit the framebuffer to the display (scaled to the canvas).
    fn present(&mut self, fb: &Framebuffer);
    /// Logical size changed (window resize / fullscreen).
    fn resize(&mut self, width: u32, height: u32);
}

// Pure rendering entry points (no browser deps — see business-logic-model.md):
pub fn cast_walls(player: &Player, map: &Map, textures: &TextureSet,
                  fb: &mut Framebuffer, zbuffer: &mut [f32]);
pub fn render_sprites(world: &World, textures: &TextureSet,
                      fb: &mut Framebuffer, zbuffer: &[f32]);
```

---

## Map system (replaces `MapSystem`)

A concrete `Map` struct with inherent methods; no trait needed. Parsing is a free function returning `Result`.

```rust
pub fn parse_map(json: &str) -> Result<Map, MapError>;

impl Map {
    pub fn tile(&self, x: usize, y: usize) -> Tile;
    pub fn is_solid(&self, x: i32, y: i32) -> bool;
    pub fn player_spawn(&self) -> SpawnPoint;
}

// Animation + interaction are free functions (need &mut, may touch other state):
pub fn animate_map(map: &mut Map, dt: f32);
pub fn open_door(map: &mut Map, id: DoorId);
pub fn activate_push_wall(map: &mut Map, id: PushWallId);
```

> The original `getDoors()/getPushWalls()/getEntitySpawns()` accessors are unnecessary: spawns are consumed once at level construction, and doors/push-walls are public `Vec` fields on `Map` iterated directly.

---

## InputSource trait (replaces `InputSystem`)

```rust
#[derive(Clone, Copy, Debug, Default)]
pub struct InputState {
    pub move_forward: bool,
    pub move_backward: bool,
    pub strafe_left: bool,
    pub strafe_right: bool,
    pub turn_delta: f32, // accumulated mouse-X this frame
    pub interact: bool,  // edge-triggered (E / Space)
    pub attack: bool,    // edge-triggered (left click)
}

pub trait InputSource {
    /// Snapshot this frame's input, clearing edge-triggered flags.
    fn poll(&mut self) -> InputState;
    fn pointer_locked(&self) -> bool;
}
```

> The browser impl registers `keydown`/`keyup`/`mousemove`/`click` listeners (via `web-sys`) that write into a `Rc<RefCell<InputState>>`; `poll` reads and resets it. The `reset()` of one-shots is folded into `poll`.

---

## Player system (replaces `Player`)

Plain functions over `&mut Player`; no methods that secretly mutate the map.

```rust
pub fn update_player(player: &mut Player, map: &Map, input: &InputState, dt: f32);

pub fn damage_player(player: &mut Player, amount: u32); // saturating_sub
pub fn heal_player(player: &mut Player, amount: u32);   // clamps to MAX_HEALTH

impl Player {
    pub fn is_alive(&self) -> bool;
    pub fn can_interact(&self, target: Vec2) -> bool; // within INTERACTION_RANGE
}
```

---

## Entity helpers (replaces `EntitySystem`)

Entities live in `Vec`s on `World`. There is no separate manager object — querying and spawning are free functions / `World` methods.

```rust
impl World {
    pub fn spawn_from_map(&mut self, map: &MapFile);
    pub fn alive_enemy_count(&self) -> usize;
    pub fn enemies_in_range(&self, center: Vec2, radius: f32)
        -> impl Iterator<Item = &Enemy>;
}

// Removal: dispersed enemies / collected pickups are retained-out:
//   world.enemies.retain(|e| e.state != EnemyState::Dispersing || e.anim.elapsed < DISPERSE_DURATION);
```

> Returning an `impl Iterator` instead of a freshly allocated `Vec<Entity>` avoids per-frame allocation and lets callers filter lazily.

---

## Enemy AI (replaces `EnemyAI`)

```rust
pub fn update_enemies(world: &mut World, dt: f32);
pub fn can_see_player(from: Vec2, player: Vec2, map: &Map) -> bool;

/// Applied when a melee hit lands; pure given the enemy + damage.
pub fn apply_hit(enemy: &mut Enemy, damage: u32) -> HitResult;

pub struct HitResult {
    pub stunned: bool,
    pub dispersed: bool,
    pub score_awarded: u32,
}
```

> `update_enemies` borrows the whole `World` once and iterates; each enemy reads `world.player` and `world.map` and writes itself. This is the idiomatic resolution of the TS "EnemyAI depends on MapSystem and Player references" coupling.

---

## Combat (replaces `CombatSystem`)

```rust
pub fn resolve_attack(world: &mut World) -> AttackOutcome;
pub fn update_weapon(weapon: &mut Weapon, dt: f32); // advance phase timers

pub struct AttackOutcome {
    pub hit: Option<EntityId>, // closest valid enemy, single-target melee
    pub dispersed: bool,
}

impl Weapon {
    pub fn is_ready(&self) -> bool; // phase == Idle
    pub fn frame(&self) -> u32;     // current sprite frame for the HUD
}
```

---

## AudioSink trait (replaces `AudioSystem`)

```rust
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Sound {
    WeaponSwing,
    EnemyHit,
    EnemyDispersed,
    Pickup,
    DoorOpen,
    Secret,
    PlayerHurt,
}

pub trait AudioSink {
    fn play(&self, sound: Sound);
    fn play_music(&self, loop_track: bool);
    fn stop_music(&self);
    fn set_volume(&self, volume: f32); // 0.0..=1.0
    fn set_muted(&self, muted: bool);
}
```

> Sound effects are a closed `enum` rather than stringly-typed ids — the compiler guarantees every sound has a loaded buffer. The `web-sys` impl owns the `AudioContext` and the decoded `AudioBuffer`s, keyed by `Sound`.

---

## HUD rendering (replaces `HUDRenderer`)

The HUD draws into the same `Framebuffer` (or onto the canvas for crisp text via the `Surface`). It is a pure function of a small view struct.

```rust
pub struct HudView {
    pub health: u32,
    pub max_health: u32,
    pub connections: u32,
    pub weapon_frame: u32,
    pub face: FaceExpression,
    pub overlay: Option<Overlay>, // intro text, taunt, game over, victory/stats
}

pub enum Overlay {
    Text { text: String, remaining: f32 },
    Taunt { text: &'static str },
    Stats(LevelStats),
}

pub fn render_hud(view: &HudView, textures: &TextureSet, fb: &mut Framebuffer);
```

---

## AssetSource trait (replaces `AssetLoader`)

Asset loading is async (`fetch` via `web-sys` + `wasm-bindgen-futures`) and fallible, so it returns `Result` from `async fn`. Once loaded, assets are owned by plain structs (`TextureSet`, audio buffers in the `AudioSink` impl, parsed `Map`).

```rust
pub struct AssetManifest {
    pub textures: Vec<(TextureKey, String)>, // key -> url
    pub sounds: Vec<(Sound, String)>,
    pub maps: Vec<(String, String)>,
}

#[async_trait(?Send)] // wasm is single-threaded; no Send bound
pub trait AssetSource {
    async fn load_bytes(&self, url: &str) -> Result<Vec<u8>, AssetError>;
    async fn load_text(&self, url: &str) -> Result<String, AssetError>;
    fn on_progress(&self, loaded: u32, total: u32); // drives the loading bar
}

#[derive(Debug, thiserror::Error)]
pub enum AssetError {
    #[error("fetch failed for {url}: {status}")]
    Fetch { url: String, status: u16 },
    #[error("decode failed for {url}")]
    Decode { url: String },
}

/// Decoded, ready-to-sample textures held in Rust memory.
pub struct TextureSet { /* RGBA byte arrays keyed by TextureKey */ }
```

> Decoded textures are RGBA `Vec<u8>` arrays (not `HtmlImageElement`s) so the raycaster samples columns directly from wasm memory. `getTexture/getSound/getMap` accessors collapse into ownership: textures live in `TextureSet`, sounds in the `AudioSink` impl, the map in the `World`.
