//! Minimal 2D vector math used for positions, directions, and the camera plane.

use std::ops::{Add, Mul, Sub};

/// A 2D vector. World coordinates are in grid units; angles are radians.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Vec2 {
    pub x: f32,
    pub y: f32,
}

impl Vec2 {
    pub const ZERO: Vec2 = Vec2 { x: 0.0, y: 0.0 };

    pub const fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    /// Unit vector pointing along `radians` (0 = +X / East).
    pub fn from_angle(radians: f32) -> Self {
        Self::new(radians.cos(), radians.sin())
    }

    pub fn dot(self, rhs: Self) -> f32 {
        self.x * rhs.x + self.y * rhs.y
    }

    pub fn length_squared(self) -> f32 {
        self.dot(self)
    }

    pub fn length(self) -> f32 {
        self.length_squared().sqrt()
    }

    /// Euclidean distance to another point.
    pub fn distance(self, rhs: Self) -> f32 {
        (self - rhs).length()
    }

    /// Returns the unit vector, or [`Vec2::ZERO`] if the length is ~0.
    pub fn normalized(self) -> Self {
        let len = self.length();
        if len > f32::EPSILON {
            Self::new(self.x / len, self.y / len)
        } else {
            Self::ZERO
        }
    }

    /// Rotated 90° counter-clockwise. Used to derive the camera plane from `dir`.
    pub fn perp(self) -> Self {
        Self::new(-self.y, self.x)
    }
}

impl Add for Vec2 {
    type Output = Vec2;
    fn add(self, rhs: Vec2) -> Vec2 {
        Vec2::new(self.x + rhs.x, self.y + rhs.y)
    }
}

impl Sub for Vec2 {
    type Output = Vec2;
    fn sub(self, rhs: Vec2) -> Vec2 {
        Vec2::new(self.x - rhs.x, self.y - rhs.y)
    }
}

impl Mul<f32> for Vec2 {
    type Output = Vec2;
    fn mul(self, s: f32) -> Vec2 {
        Vec2::new(self.x * s, self.y * s)
    }
}

/// Normalize an angle to the range (-PI, PI].
pub fn normalize_angle(mut a: f32) -> f32 {
    use std::f32::consts::{PI, TAU};
    a %= TAU;
    if a > PI {
        a -= TAU;
    } else if a <= -PI {
        a += TAU;
    }
    a
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::f32::consts::PI;

    #[test]
    fn from_angle_is_unit_length() {
        for i in 0..16 {
            let a = i as f32 * PI / 8.0;
            assert!((Vec2::from_angle(a).length() - 1.0).abs() < 1e-5);
        }
    }

    #[test]
    fn normalized_zero_is_zero() {
        assert_eq!(Vec2::ZERO.normalized(), Vec2::ZERO);
    }

    #[test]
    fn perp_is_orthogonal() {
        let v = Vec2::new(0.6, 0.8);
        assert!(v.dot(v.perp()).abs() < 1e-6);
    }

    #[test]
    fn normalize_angle_wraps() {
        // 3π and -3π both normalize to ±π (same direction); compare by magnitude.
        assert!((normalize_angle(3.0 * PI).abs() - PI).abs() < 1e-4);
        assert!((normalize_angle(-3.0 * PI).abs() - PI).abs() < 1e-4);
        assert!(normalize_angle(0.0).abs() < 1e-6);
    }
}
