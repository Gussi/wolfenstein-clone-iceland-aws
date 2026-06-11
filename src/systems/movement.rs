//! Player movement and wall-sliding collision (US-01, US-02, US-04).

use crate::boundary::InputState;
use crate::constants::{COLLISION_RADIUS, MOVE_SPEED, ROTATION_SPEED};
use crate::domain::Player;
use crate::domain::map::Map;
use crate::math::{Vec2, normalize_angle};

/// Whether a circle of `radius` centred at `pos` overlaps any solid tile.
///
/// The player is treated as an axis-aligned box of half-extent `radius`; this
/// guarantees the player can never be placed inside a solid cell.
pub fn blocked(map: &Map, pos: Vec2, radius: f32) -> bool {
    let min_x = (pos.x - radius).floor() as i32;
    let max_x = (pos.x + radius).floor() as i32;
    let min_y = (pos.y - radius).floor() as i32;
    let max_y = (pos.y + radius).floor() as i32;
    for gy in min_y..=max_y {
        for gx in min_x..=max_x {
            if map.is_solid(gx, gy) {
                return true;
            }
        }
    }
    false
}

/// Apply input to the player: rotate from the mouse, then move with
/// axis-independent collision so the player slides along walls.
pub fn update_player(player: &mut Player, map: &Map, input: &InputState, dt: f32) {
    // Rotation (mouse look — horizontal only, Wolf3D style).
    if input.turn_delta != 0.0 {
        player.angle = normalize_angle(player.angle + input.turn_delta * ROTATION_SPEED);
        player.sync_orientation();
    }

    // Desired movement direction in world space.
    let mut mv = Vec2::ZERO;
    if input.move_forward {
        mv = mv + player.dir;
    }
    if input.move_backward {
        mv = mv - player.dir;
    }
    // Strafe: left = (dir.y, -dir.x), right = (-dir.y, dir.x).
    if input.strafe_left {
        mv = mv + Vec2::new(player.dir.y, -player.dir.x);
    }
    if input.strafe_right {
        mv = mv + Vec2::new(-player.dir.y, player.dir.x);
    }

    if mv.length_squared() <= f32::EPSILON {
        return;
    }

    let step = mv.normalized() * (MOVE_SPEED * dt);

    // Try each axis independently → sliding along walls.
    let try_x = Vec2::new(player.pos.x + step.x, player.pos.y);
    if !blocked(map, try_x, COLLISION_RADIUS) {
        player.pos.x = try_x.x;
    }
    let try_y = Vec2::new(player.pos.x, player.pos.y + step.y);
    if !blocked(map, try_y, COLLISION_RADIUS) {
        player.pos.y = try_y.y;
    }
}

/// Reduce player health, saturating at 0.
pub fn damage_player(player: &mut Player, amount: u32) {
    player.health = player.health.saturating_sub(amount);
}

/// Restore player health, clamped to the maximum.
pub fn heal_player(player: &mut Player, amount: u32) {
    use crate::constants::MAX_HEALTH;
    player.health = (player.health + amount).min(MAX_HEALTH);
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::map::parse_map;

    // 5x3 room: solid border, open interior row at y=1.
    const ROOM: &str = r#"{
        "name": "Room", "width": 5, "height": 3,
        "grid": [[1,1,1,1,1],[1,0,0,0,1],[1,1,1,1,1]],
        "playerSpawn": { "x": 1, "y": 1, "angle": 0.0 }
    }"#;

    fn input(forward: bool) -> InputState {
        InputState {
            move_forward: forward,
            ..Default::default()
        }
    }

    #[test]
    fn moves_through_open_space() {
        let map = parse_map(ROOM).unwrap();
        let mut p = Player::new(Vec2::new(1.5, 1.5), 0.0, 100); // facing +x
        update_player(&mut p, &map, &input(true), 0.1);
        assert!(p.pos.x > 1.5, "should advance east into open space");
    }

    #[test]
    fn cannot_pass_through_wall() {
        let map = parse_map(ROOM).unwrap();
        // Facing +x near the east wall (wall at x=4).
        let mut p = Player::new(Vec2::new(3.5, 1.5), 0.0, 100);
        for _ in 0..200 {
            update_player(&mut p, &map, &input(true), 0.1);
        }
        assert!(
            p.pos.x < 4.0 - COLLISION_RADIUS + 0.001,
            "blocked by east wall"
        );
        assert!(!blocked(&map, p.pos, COLLISION_RADIUS));
    }
}
