//! Property-based tests for vector and angle math.

use pots_and_parliament::math::{Vec2, normalize_angle};
use proptest::prelude::*;
use std::f32::consts::PI;

proptest! {
    #[test]
    fn normalize_angle_in_range(a in -1000.0f32..1000.0) {
        let n = normalize_angle(a);
        prop_assert!(n > -PI - 1e-3 && n <= PI + 1e-3, "got {n}");
    }

    #[test]
    fn normalize_angle_preserves_direction(a in -100.0f32..100.0) {
        // The normalized angle points the same way as the original.
        let v = Vec2::from_angle(a);
        let n = Vec2::from_angle(normalize_angle(a));
        prop_assert!((v.x - n.x).abs() < 1e-3 && (v.y - n.y).abs() < 1e-3);
    }

    #[test]
    fn from_angle_is_unit(a in -100.0f32..100.0) {
        prop_assert!((Vec2::from_angle(a).length() - 1.0).abs() < 1e-3);
    }

    #[test]
    fn normalized_is_unit_or_zero(x in -50.0f32..50.0, y in -50.0f32..50.0) {
        let len = Vec2::new(x, y).normalized().length();
        prop_assert!(len < 1e-3 || (len - 1.0).abs() < 1e-3, "len {len}");
    }

    #[test]
    fn perp_is_orthogonal(x in -50.0f32..50.0, y in -50.0f32..50.0) {
        let v = Vec2::new(x, y);
        prop_assert!(v.dot(v.perp()).abs() < 1e-3);
    }
}
