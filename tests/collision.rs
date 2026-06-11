//! Property-based test: player movement never ends inside a solid tile.

use pots_and_parliament::boundary::InputState;
use pots_and_parliament::constants::COLLISION_RADIUS;
use pots_and_parliament::domain::Player;
use pots_and_parliament::domain::map::parse_map;
use pots_and_parliament::math::Vec2;
use pots_and_parliament::systems::movement::{blocked, update_player};
use proptest::prelude::*;

// 8x8 room: solid border, open interior (cells 1..=6 on each axis).
const ROOM: &str = r#"{
    "name": "Room", "width": 8, "height": 8,
    "grid": [
        [1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1]
    ],
    "playerSpawn": { "x": 1, "y": 1, "angle": 0.0 }
}"#;

proptest! {
    #[test]
    fn movement_never_enters_a_wall(
        px in 1.5f32..6.5,
        py in 1.5f32..6.5,
        forward in any::<bool>(),
        backward in any::<bool>(),
        left in any::<bool>(),
        right in any::<bool>(),
        angle in -10.0f32..10.0,
    ) {
        let map = parse_map(ROOM).unwrap();
        let mut p = Player::new(Vec2::new(px, py), angle, 100);
        prop_assume!(!blocked(&map, p.pos, COLLISION_RADIUS));

        let input = InputState {
            move_forward: forward,
            move_backward: backward,
            strafe_left: left,
            strafe_right: right,
            ..Default::default()
        };

        for _ in 0..30 {
            update_player(&mut p, &map, &input, 0.1);
            prop_assert!(
                !blocked(&map, p.pos, COLLISION_RADIUS),
                "player entered a wall at ({}, {})",
                p.pos.x,
                p.pos.y
            );
        }
    }
}
