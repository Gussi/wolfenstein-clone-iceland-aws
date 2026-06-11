//! Domain types — the data the game logic operates on.

pub mod enemy;
pub mod map;
pub mod pickup;
pub mod player;
pub mod weapon;

pub use enemy::{Enemy, EnemyKind, EnemyState, Taunt};
pub use map::{
    Direction, Door, DoorId, DoorState, Map, MapError, MapFile, Orientation, PushWall, PushWallId,
    PushWallState, SpawnPoint, Tile, TileKind, WallTexture,
};
pub use pickup::{Pickup, PickupKind};
pub use player::Player;
pub use weapon::{Weapon, WeaponPhase};

use serde::Deserialize;

/// Stable handle for an enemy/pickup/decoration within the current level.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub struct EntityId(pub u32);

/// Generic frame ticker shared by enemies and the weapon.
#[derive(Clone, Copy, Debug, Default)]
pub struct Animation {
    pub frame: u32,
    pub elapsed: f32,
}

impl Animation {
    /// Advance the timer, stepping the frame every `frame_time` seconds and
    /// wrapping at `frame_count`.
    pub fn advance(&mut self, dt: f32, frame_time: f32, frame_count: u32) {
        if frame_count == 0 || frame_time <= 0.0 {
            return;
        }
        self.elapsed += dt;
        while self.elapsed >= frame_time {
            self.elapsed -= frame_time;
            self.frame = (self.frame + 1) % frame_count;
        }
    }

    pub fn reset(&mut self) {
        self.frame = 0;
        self.elapsed = 0.0;
    }
}

/// HUD face portrait, selected from the current health band.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FaceExpression {
    Normal,   // 75-100%
    Hurt,     // 40-74%
    Critical, // 1-39%
    Victory,  // level won
}

impl FaceExpression {
    pub fn from_health(health: u32, max: u32, won: bool) -> Self {
        if won {
            return FaceExpression::Victory;
        }
        let pct = if max == 0 {
            0.0
        } else {
            (health as f32 / max as f32) * 100.0
        };
        if pct >= 75.0 {
            FaceExpression::Normal
        } else if pct >= 40.0 {
            FaceExpression::Hurt
        } else {
            FaceExpression::Critical
        }
    }
}

/// Non-interactive scenery sprite.
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

#[derive(Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DecorationKindDef {
    Desk,
    Plant,
    CoatOfArms,
}

impl From<DecorationKindDef> for DecorationKind {
    fn from(d: DecorationKindDef) -> Self {
        match d {
            DecorationKindDef::Desk => DecorationKind::Desk,
            DecorationKindDef::Plant => DecorationKind::Plant,
            DecorationKindDef::CoatOfArms => DecorationKind::CoatOfArms,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Decoration {
    pub kind: DecorationKind,
    pub pos: crate::math::Vec2,
}
