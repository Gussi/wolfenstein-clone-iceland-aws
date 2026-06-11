//! The Red Tape enemy entity.

use crate::domain::{Animation, EntityId};
use crate::math::Vec2;
use serde::Deserialize;

#[derive(Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
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
    /// Playing the "poof" animation; removed when it finishes.
    Dispersing,
}

/// Floating taunt text shown above an enemy.
#[derive(Clone, Copy, Debug)]
pub struct Taunt {
    pub text: &'static str,
    pub remaining: f32,
}

pub struct Enemy {
    pub id: EntityId,
    pub kind: EnemyKind,
    pub pos: Vec2,

    // AI
    pub state: EnemyState,
    pub state_timer: f32,
    pub last_seen_player: Option<Vec2>,
    pub attack_cooldown: f32,

    // Combat
    pub stun_remaining: u32,

    // Presentation
    pub anim: Animation,
    pub taunt: Option<Taunt>,
    /// Whether this enemy has already shown its one-time taunt.
    pub has_taunted: bool,
}

impl Enemy {
    pub fn new(id: EntityId, kind: EnemyKind, pos: Vec2, stun_remaining: u32) -> Self {
        Self {
            id,
            kind,
            pos,
            state: EnemyState::Idle,
            state_timer: 0.0,
            last_seen_player: None,
            attack_cooldown: 0.0,
            stun_remaining,
            anim: Animation::default(),
            taunt: None,
            has_taunted: false,
        }
    }

    /// An enemy still counts toward "alive" until it begins dispersing.
    pub fn is_alive(&self) -> bool {
        self.state != EnemyState::Dispersing
    }

    /// Transition into a new state, resetting the state timer and animation.
    pub fn enter(&mut self, state: EnemyState) {
        self.state = state;
        self.state_timer = 0.0;
        self.anim.reset();
    }
}
