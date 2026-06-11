//! The player entity.

use crate::constants::{CAMERA_PLANE_LENGTH, INTERACTION_RANGE};
use crate::math::Vec2;

pub struct Player {
    /// World position in grid units.
    pub pos: Vec2,
    /// Facing direction in radians (0 = East).
    pub angle: f32,
    /// Facing unit vector (kept in sync with `angle`).
    pub dir: Vec2,
    /// Camera plane, perpendicular to `dir`, scaled to the FOV.
    pub plane: Vec2,
    /// Current patience (health), 0..=MAX_HEALTH.
    pub health: u32,
}

impl Player {
    /// Create a player at `pos` facing `angle`, with derived `dir`/`plane`.
    pub fn new(pos: Vec2, angle: f32, health: u32) -> Self {
        let mut p = Self {
            pos,
            angle,
            dir: Vec2::ZERO,
            plane: Vec2::ZERO,
            health,
        };
        p.sync_orientation();
        p
    }

    /// Recompute `dir` and `plane` from `angle`. Call after any rotation.
    pub fn sync_orientation(&mut self) {
        self.dir = Vec2::from_angle(self.angle);
        // Camera plane is perpendicular to the direction, scaled by tan(FOV/2).
        self.plane = self.dir.perp() * CAMERA_PLANE_LENGTH;
    }

    pub fn is_alive(&self) -> bool {
        self.health > 0
    }

    /// Whether `target` lies within interaction reach of the player.
    pub fn can_interact(&self, target: Vec2) -> bool {
        self.pos.distance(target) <= INTERACTION_RANGE
    }
}
