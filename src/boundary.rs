//! Boundary abstractions between the pure game core and the browser.
//!
//! These traits are the *only* seam where side-effects happen. Their `web-sys`
//! implementations live in `platform` (wasm-only); tests can supply mocks. The
//! core never calls the browser directly.

use crate::constants::TEXTURE_SIZE;
use crate::domain::map::WallTexture;
use crate::domain::{DecorationKind, EnemyState, FaceExpression, PickupKind};
use crate::systems::raycaster::Framebuffer;

// =========================================================================
// Input
// =========================================================================

/// A snapshot of player input for one frame. Edge-triggered actions
/// (`interact`, `attack`) are true for exactly one frame.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct InputState {
    pub move_forward: bool,
    pub move_backward: bool,
    pub strafe_left: bool,
    pub strafe_right: bool,
    pub turn_delta: f32,
    pub interact: bool,
    pub attack: bool,
    pub pause_toggle: bool,
    pub dismiss: bool, // any key — dismiss intro / restart after game over
}

/// Source of per-frame input. The browser impl wires DOM events into shared state.
pub trait InputSource {
    /// Snapshot this frame's input, clearing edge-triggered flags.
    fn poll(&mut self) -> InputState;
    fn pointer_locked(&self) -> bool;
}

// =========================================================================
// Presentation
// =========================================================================

/// Presents a rendered [`Framebuffer`] to the display.
pub trait Surface {
    /// Blit the framebuffer to the screen (scaled to the canvas).
    fn present(&mut self, fb: &Framebuffer);
    /// Logical display size changed.
    fn resize(&mut self, width: u32, height: u32);
}

// =========================================================================
// Audio
// =========================================================================

/// Closed set of sounds — guarantees every cue has a loaded buffer.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Sound {
    WeaponSwing,
    EnemyHit,
    EnemyDispersed,
    EnemyAlert,
    Pickup,
    DoorOpen,
    Secret,
    PlayerHurt,
}

pub trait AudioSink {
    fn play(&self, sound: Sound);
    fn play_music(&self, looping: bool);
    fn stop_music(&self);
    fn set_volume(&self, volume: f32);
    fn set_muted(&self, muted: bool);
}

// =========================================================================
// Assets
// =========================================================================

#[derive(Debug, thiserror::Error)]
pub enum AssetError {
    #[error("fetch failed for {url}: status {status}")]
    Fetch { url: String, status: u16 },
    #[error("decode failed for {url}")]
    Decode { url: String },
}

/// A square RGBA texture held in Rust memory for direct sampling.
#[derive(Clone)]
pub struct TextureImage {
    pub size: usize,
    pub pixels: Vec<u8>, // RGBA, size * size * 4
}

impl TextureImage {
    pub fn new(size: usize, pixels: Vec<u8>) -> Self {
        debug_assert_eq!(pixels.len(), size * size * 4);
        Self { size, pixels }
    }

    /// Sample at normalized coordinates (wraps).
    pub fn sample(&self, u: f32, v: f32) -> [u8; 4] {
        let s = self.size as f32;
        let x = ((u.rem_euclid(1.0)) * s) as usize % self.size;
        let y = ((v.rem_euclid(1.0)) * s) as usize % self.size;
        self.texel(x, y)
    }

    pub fn texel(&self, x: usize, y: usize) -> [u8; 4] {
        let i = (y * self.size + x) * 4;
        [
            self.pixels[i],
            self.pixels[i + 1],
            self.pixels[i + 2],
            self.pixels[i + 3],
        ]
    }
}

/// Identifiers for sprite art (enemies, pickups, decorations).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum SpriteId {
    RedTapeIdle,
    RedTapeWalk,
    RedTapeAttack,
    RedTapeStunned,
    RedTapeDispersed,
    Coffee,
    Kleinur,
    Desk,
    Plant,
    CoatOfArms,
}

impl SpriteId {
    pub const COUNT: usize = 10;
    pub const fn index(self) -> usize {
        self as usize
    }

    pub fn for_enemy(state: EnemyState) -> Self {
        match state {
            EnemyState::Idle | EnemyState::Alert => SpriteId::RedTapeIdle,
            EnemyState::Pursue => SpriteId::RedTapeWalk,
            EnemyState::Attack => SpriteId::RedTapeAttack,
            EnemyState::Stunned => SpriteId::RedTapeStunned,
            EnemyState::Dispersing => SpriteId::RedTapeDispersed,
        }
    }

    pub fn for_pickup(kind: PickupKind) -> Self {
        match kind {
            PickupKind::Coffee => SpriteId::Coffee,
            PickupKind::Kleinur => SpriteId::Kleinur,
        }
    }

    pub fn for_decoration(kind: DecorationKind) -> Self {
        match kind {
            DecorationKind::Desk => SpriteId::Desk,
            DecorationKind::Plant => SpriteId::Plant,
            DecorationKind::CoatOfArms => SpriteId::CoatOfArms,
        }
    }
}

/// Identifiers for HUD art.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HudId {
    FaceNormal,
    FaceHurt,
    FaceCritical,
    FaceVictory,
    Spoon0,
    Spoon1,
    Spoon2,
    Spoon3,
}

impl HudId {
    pub const COUNT: usize = 8;
    pub const fn index(self) -> usize {
        self as usize
    }

    pub fn face(expr: FaceExpression) -> Self {
        match expr {
            FaceExpression::Normal => HudId::FaceNormal,
            FaceExpression::Hurt => HudId::FaceHurt,
            FaceExpression::Critical => HudId::FaceCritical,
            FaceExpression::Victory => HudId::FaceVictory,
        }
    }

    pub fn spoon(frame: u32) -> Self {
        match frame {
            0 => HudId::Spoon0,
            1 => HudId::Spoon1,
            2 => HudId::Spoon2,
            _ => HudId::Spoon3,
        }
    }
}

/// Decoded textures held in Rust memory, ready to sample.
pub struct TextureSet {
    walls: Vec<TextureImage>,   // indexed by WallTexture::atlas_index
    sprites: Vec<TextureImage>, // indexed by SpriteId::index
    hud: Vec<TextureImage>,     // indexed by HudId::index
}

impl TextureSet {
    pub fn new(
        walls: Vec<TextureImage>,
        sprites: Vec<TextureImage>,
        hud: Vec<TextureImage>,
    ) -> Self {
        Self {
            walls,
            sprites,
            hud,
        }
    }

    pub fn wall(&self, tex: WallTexture) -> &TextureImage {
        &self.walls[tex.atlas_index()]
    }

    pub fn sprite(&self, id: SpriteId) -> &TextureImage {
        &self.sprites[id.index()]
    }

    pub fn hud(&self, id: HudId) -> &TextureImage {
        &self.hud[id.index()]
    }

    /// Programmatic placeholder textures so the game runs before final art
    /// exists (see Step 15 / `assets/README.md`).
    pub fn placeholder() -> Self {
        let walls = (0..10).map(placeholder_wall).collect::<Vec<_>>();
        let sprites = placeholder_sprites();
        let hud = placeholder_hud();
        Self::new(walls, sprites, hud)
    }
}

/// Manifest mapping logical asset ids to URLs, used by the browser loader.
pub struct AssetManifest {
    pub walls: Vec<(WallTexture, &'static str)>,
    pub sprites: Vec<(SpriteId, &'static str)>,
    pub hud: Vec<(HudId, &'static str)>,
    pub sounds: Vec<(Sound, &'static str)>,
    pub music: &'static str,
    pub level: &'static str,
}

/// Async, fallible asset access. Single-threaded — wasm has no threads, so the
/// returned futures need not be `Send`. Uses native `async fn` in traits.
#[cfg(target_arch = "wasm32")]
#[allow(async_fn_in_trait)]
pub trait AssetSource {
    async fn load_bytes(&self, url: &str) -> Result<Vec<u8>, AssetError>;
    async fn load_text(&self, url: &str) -> Result<String, AssetError>;
    fn on_progress(&self, loaded: u32, total: u32);
}

// =========================================================================
// Placeholder texture generation (procedural, no assets required)
// =========================================================================

fn rgba(r: u8, g: u8, b: u8) -> [u8; 4] {
    [r, g, b, 255]
}

fn fill(size: usize, color: [u8; 4]) -> Vec<u8> {
    let mut v = vec![0u8; size * size * 4];
    for px in v.chunks_exact_mut(4) {
        px.copy_from_slice(&color);
    }
    v
}

/// Distinct base colours per wall texture, with darker grout lines so the
/// pixelated raycaster output reads as bricks/panels.
fn placeholder_wall(index: usize) -> TextureImage {
    let base = match index {
        0 => rgba(42, 42, 48),    // dolerite dark
        1 => rgba(226, 220, 200), // plaster cream
        2 => rgba(150, 110, 70),  // wainscot wood
        3 => rgba(96, 64, 38),    // committee door
        4 => rgba(120, 165, 205), // window (sky)
        5 => rgba(210, 205, 188), // portrait wall
        6 => rgba(110, 80, 50),   // bookshelf
        7 => rgba(58, 58, 66),    // dolerite arch
        8 => rgba(214, 208, 190), // sconce wall
        _ => rgba(28, 40, 92),    // carpet blue
    };
    let size = TEXTURE_SIZE;
    let mut pixels = fill(size, base);
    for y in 0..size {
        for x in 0..size {
            let grout = x % (size / 4) == 0 || y % (size / 4) == 0;
            if grout {
                let i = (y * size + x) * 4;
                pixels[i] = base[0].saturating_sub(40);
                pixels[i + 1] = base[1].saturating_sub(40);
                pixels[i + 2] = base[2].saturating_sub(40);
            }
        }
    }
    TextureImage::new(size, pixels)
}

/// Sprites use alpha = 0 background and a coloured ellipse foreground.
fn placeholder_blob(size: usize, color: [u8; 4]) -> TextureImage {
    let mut pixels = vec![0u8; size * size * 4]; // transparent
    let cx = size as f32 / 2.0;
    let cy = size as f32 / 2.0;
    let rx = size as f32 * 0.30;
    let ry = size as f32 * 0.42;
    for y in 0..size {
        for x in 0..size {
            let dx = (x as f32 - cx) / rx;
            let dy = (y as f32 - cy) / ry;
            if dx * dx + dy * dy <= 1.0 {
                let i = (y * size + x) * 4;
                pixels[i..i + 4].copy_from_slice(&color);
            }
        }
    }
    TextureImage::new(size, pixels)
}

fn placeholder_sprites() -> Vec<TextureImage> {
    let s = TEXTURE_SIZE;
    let mut v = Vec::with_capacity(SpriteId::COUNT);
    v.push(placeholder_blob(s, rgba(200, 40, 40))); // RedTapeIdle
    v.push(placeholder_blob(s, rgba(210, 60, 60))); // RedTapeWalk
    v.push(placeholder_blob(s, rgba(230, 30, 30))); // RedTapeAttack
    v.push(placeholder_blob(s, rgba(230, 160, 60))); // RedTapeStunned
    v.push(placeholder_blob(s, rgba(180, 120, 120))); // RedTapeDispersed
    v.push(placeholder_blob(s, rgba(110, 70, 40))); // Coffee
    v.push(placeholder_blob(s, rgba(220, 190, 120))); // Kleinur
    v.push(placeholder_blob(s, rgba(90, 60, 40))); // Desk
    v.push(placeholder_blob(s, rgba(40, 140, 60))); // Plant
    v.push(placeholder_blob(s, rgba(180, 180, 200))); // CoatOfArms
    v
}

fn placeholder_hud() -> Vec<TextureImage> {
    let s = 64;
    let mut v = Vec::with_capacity(HudId::COUNT);
    v.push(placeholder_blob(s, rgba(230, 200, 170))); // FaceNormal
    v.push(placeholder_blob(s, rgba(230, 170, 150))); // FaceHurt
    v.push(placeholder_blob(s, rgba(220, 130, 120))); // FaceCritical
    v.push(placeholder_blob(s, rgba(240, 220, 180))); // FaceVictory
    v.push(placeholder_blob(s, rgba(190, 150, 90))); // Spoon0
    v.push(placeholder_blob(s, rgba(200, 160, 95))); // Spoon1
    v.push(placeholder_blob(s, rgba(210, 170, 100))); // Spoon2
    v.push(placeholder_blob(s, rgba(220, 180, 110))); // Spoon3
    v
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn placeholder_set_has_all_textures() {
        let ts = TextureSet::placeholder();
        assert_eq!(ts.wall(WallTexture::DoleriteDark).size, TEXTURE_SIZE);
        assert_eq!(ts.sprite(SpriteId::Coffee).size, TEXTURE_SIZE);
        let _ = ts.hud(HudId::FaceNormal);
    }

    #[test]
    fn sample_wraps_in_bounds() {
        let img = TextureImage::new(2, vec![255; 2 * 2 * 4]);
        let _ = img.sample(1.5, -0.25); // must not panic
    }
}
