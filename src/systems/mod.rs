//! Pure game systems. Each is a free function that borrows the data it needs
//! from the [`crate::world::World`]; none depend on the browser.

pub mod ai;
pub mod combat;
pub mod hud;
pub mod interactions;
pub mod movement;
pub mod raycaster;
pub mod sprites;

pub use combat::{AttackOutcome, resolve_attack, update_weapon};
pub use interactions::{Interaction, collect_pickups, try_interact};
pub use movement::{blocked, update_player};
pub use raycaster::{Framebuffer, cast_walls};
