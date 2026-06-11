//! Player interactions: opening doors, triggering push-walls, collecting
//! pickups (US-03, US-12, US-23).

use crate::constants::{INTERACTION_RANGE, PICKUP_RADIUS};
use crate::domain::map::{
    DoorId, DoorState, PushWallId, PushWallState, TileKind, activate_push_wall, open_door,
};
use crate::world::World;

/// Something the player triggered this frame.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Interaction {
    OpenedDoor(DoorId),
    TriggeredPushWall(PushWallId),
}

/// Open a door or trigger a push-wall directly in front of the player, if one
/// is within interaction range and not already activated.
pub fn try_interact(world: &mut World) -> Option<Interaction> {
    let p = &world.player;
    // Probe a few points along the facing direction, out to interaction range.
    let samples = [0.6_f32, 1.0, INTERACTION_RANGE];
    for &d in &samples {
        let probe = p.pos + p.dir * d;
        let gx = probe.x.floor() as i32;
        let gy = probe.y.floor() as i32;
        if gx < 0 || gy < 0 || gx as usize >= world.map.width || gy as usize >= world.map.height {
            continue;
        }
        match world.map.tile(gx as usize, gy as usize).kind {
            TileKind::Door(id) if world.map.doors[id.0].state == DoorState::Closed => {
                open_door(&mut world.map, id);
                return Some(Interaction::OpenedDoor(id));
            }
            TileKind::PushWall(id) if world.map.push_walls[id.0].state == PushWallState::Hidden => {
                activate_push_wall(&mut world.map, id);
                return Some(Interaction::TriggeredPushWall(id));
            }
            _ => {}
        }
    }
    None
}

/// Auto-collect any pickups the player overlaps. Returns the total HP healed;
/// the orchestrator applies it via [`crate::systems::movement::heal_player`].
pub fn collect_pickups(world: &mut World) -> u32 {
    let ppos = world.player.pos;
    let mut healed = 0;
    world.pickups.retain(|pk| {
        if ppos.distance(pk.pos) <= PICKUP_RADIUS {
            healed += pk.kind.heal_amount();
            false
        } else {
            true
        }
    });
    healed
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::PickupKind;

    #[test]
    fn opens_door_in_front() {
        // Player at (1.5,1.5) facing +x; door at cell (2,1).
        let level = r#"{
            "name": "Door", "width": 4, "height": 3,
            "grid": [[1,1,1,1],[1,0,0,1],[1,1,1,1]],
            "playerSpawn": { "x": 1, "y": 1, "angle": 0.0 },
            "doors": [{ "x": 2, "y": 1, "texture": "committeeDoor", "orientation": "vertical" }]
        }"#;
        let mut w = World::load(level).unwrap();
        assert_eq!(
            try_interact(&mut w),
            Some(Interaction::OpenedDoor(DoorId(0)))
        );
        // Second interact does nothing (already opening).
        assert_eq!(try_interact(&mut w), None);
    }

    #[test]
    fn collects_overlapping_pickup() {
        let level = r#"{
            "name": "Pick", "width": 3, "height": 3,
            "grid": [[1,1,1],[1,0,1],[1,1,1]],
            "playerSpawn": { "x": 1, "y": 1, "angle": 0.0 },
            "pickups": [{ "kind": "kleinur", "x": 1, "y": 1 }]
        }"#;
        let mut w = World::load(level).unwrap();
        let healed = collect_pickups(&mut w);
        assert_eq!(healed, PickupKind::Kleinur.heal_amount());
        assert!(w.pickups.is_empty());
    }
}
