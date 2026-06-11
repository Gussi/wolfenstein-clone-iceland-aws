//! Health pickups (coffee / kleinur).

use crate::domain::EntityId;
use crate::math::Vec2;
use serde::Deserialize;

#[derive(Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum PickupKind {
    Coffee,
    Kleinur,
}

impl PickupKind {
    /// HP restored when collected.
    pub const fn heal_amount(self) -> u32 {
        match self {
            PickupKind::Coffee => 15,
            PickupKind::Kleinur => 30,
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Pickup {
    pub id: EntityId,
    pub kind: PickupKind,
    pub pos: Vec2,
}
