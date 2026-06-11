//! The wooden spoon — the prototype's only weapon.

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WeaponPhase {
    Idle,
    Swinging,
    Recovering,
}

#[derive(Clone, Copy, Debug)]
pub struct Weapon {
    pub phase: WeaponPhase,
    /// Seconds elapsed in the current phase.
    pub timer: f32,
    /// Whether the mid-swing hit check has already fired this swing.
    pub hit_checked: bool,
}

impl Default for Weapon {
    fn default() -> Self {
        Self {
            phase: WeaponPhase::Idle,
            timer: 0.0,
            hit_checked: false,
        }
    }
}

impl Weapon {
    /// The spoon can start a new swing only while idle.
    pub fn is_ready(&self) -> bool {
        matches!(self.phase, WeaponPhase::Idle)
    }

    /// Sprite frame for the HUD, derived from phase + timer.
    pub fn frame(&self) -> u32 {
        use crate::constants::SWING_DURATION;
        match self.phase {
            WeaponPhase::Idle => 0,
            WeaponPhase::Swinging => {
                // 3 swing frames spread across the swing duration.
                let t = (self.timer / SWING_DURATION).clamp(0.0, 0.999);
                1 + (t * 3.0) as u32
            }
            WeaponPhase::Recovering => 1,
        }
    }
}
