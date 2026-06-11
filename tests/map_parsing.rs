//! Property-based tests for map parsing and validation (serialization).

use pots_and_parliament::domain::map::{MapError, parse_map};
use proptest::prelude::*;

/// Build a JSON level with a solid border and an open interior.
fn bordered_map(w: usize, h: usize) -> String {
    let mut rows = Vec::with_capacity(h);
    for y in 0..h {
        let cells: Vec<String> = (0..w)
            .map(|x| {
                let solid = x == 0 || y == 0 || x == w - 1 || y == h - 1;
                if solid {
                    "1".to_string()
                } else {
                    "0".to_string()
                }
            })
            .collect();
        rows.push(format!("[{}]", cells.join(",")));
    }
    format!(
        r#"{{"name":"G","width":{w},"height":{h},"grid":[{}],"playerSpawn":{{"x":1,"y":1,"angle":0.0}}}}"#,
        rows.join(",")
    )
}

proptest! {
    #[test]
    fn valid_maps_parse_and_have_solid_border(w in 3usize..14, h in 3usize..14) {
        let map = parse_map(&bordered_map(w, h)).expect("valid map should parse");
        prop_assert_eq!(map.width, w);
        prop_assert_eq!(map.height, h);
        prop_assert!(map.is_solid(0, 0), "corner should be solid");
        prop_assert!(!map.is_solid(1, 1), "interior should be open");
    }

    #[test]
    fn declared_height_mismatch_is_rejected(w in 3usize..10, h in 3usize..10) {
        // Claim a larger height than the number of rows actually present.
        let json = bordered_map(w, h)
            .replacen(&format!("\"height\":{h}"), &format!("\"height\":{}", h + 1), 1);
        prop_assert!(matches!(parse_map(&json), Err(MapError::Invalid(_))));
    }

    #[test]
    fn spawn_out_of_bounds_is_rejected(w in 3usize..10, h in 3usize..10) {
        let json = bordered_map(w, h).replacen(
            "\"playerSpawn\":{\"x\":1,\"y\":1",
            &format!("\"playerSpawn\":{{\"x\":{},\"y\":{}", w + 5, h + 5),
            1,
        );
        prop_assert!(matches!(parse_map(&json), Err(MapError::Invalid(_))));
    }
}

#[test]
fn garbage_is_a_json_error() {
    assert!(matches!(
        parse_map("not json at all"),
        Err(MapError::Json(_))
    ));
}
